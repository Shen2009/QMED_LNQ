import os
import time
import threading
import asyncio
import logging
import shutil
import json
from pathlib import Path

import torch
from transformers import AutoTokenizer, AutoModelForImageTextToText, BitsAndBytesConfig

logger = logging.getLogger(__name__)


class MedGemmaService:
    _instance = None
    _class_lock = threading.Lock()

    @classmethod
    def get_instance(cls):
        with cls._class_lock:
            if cls._instance is None:
                cls._instance = cls()
        return cls._instance

    def __init__(self):
        self.model_id = os.getenv("MEDGEMMA_MODEL_ID", "google/medgemma-4b-it")
        configured_path = os.getenv("MEDGEMMA_MODEL_PATH")
        default_local_path = Path(__file__).resolve().parents[3] / "ml_models" / "medgemma-4b-it"
        if configured_path:
            candidate = Path(configured_path)
            if not candidate.is_absolute():
                candidate = Path(__file__).resolve().parents[3] / candidate
            self.model_source = str(candidate.resolve())
        elif (default_local_path / "config.json").exists():
            self.model_source = str(default_local_path)
        else:
            self.model_source = self.model_id
        self.tokenizer = None
        self.model = None
        self._load_lock = threading.Lock()
        self._inference_lock = threading.Lock()
        self._loading = False
        self._load_error = None

    @property
    def is_loading(self):
        return self._loading

    @property
    def load_error(self):
        return self._load_error

    def local_snapshot_complete(self) -> bool:
        """Return whether a configured local sharded checkpoint is complete."""
        source = Path(self.model_source)
        if not source.is_dir():
            return True
        index_path = source / "model.safetensors.index.json"
        if not index_path.exists():
            return (source / "model.safetensors").exists()
        try:
            index = json.loads(index_path.read_text(encoding="utf-8"))
            shard_names = set(index.get("weight_map", {}).values())
            if not shard_names:
                return False

            # Hugging Face's local tree manifest stores the actual LFS object
            # size for every shard. The safetensors index `total_size` only
            # counts tensor payload bytes and excludes file headers, so it
            # cannot be compared for exact equality with file sizes.
            tree_dir = source / ".cache" / "huggingface" / "trees"
            for tree_path in tree_dir.glob("*.json") if tree_dir.exists() else []:
                tree = json.loads(tree_path.read_text(encoding="utf-8"))
                files = tree.get("files", {})
                if all(name in files for name in shard_names):
                    return all(
                        (source / name).is_file()
                        and (source / name).stat().st_size
                        == int(files[name].get("lfs_size", files[name].get("size", -1)))
                        for name in shard_names
                    )

            expected_payload = int(index.get("metadata", {}).get("total_size", 0))
            actual_total = sum((source / name).stat().st_size for name in shard_names)
            return expected_payload > 0 and actual_total >= expected_payload
        except (OSError, ValueError, TypeError):
            return False

    def load_model(self):
        # Fast path — already loaded (no lock needed for read)
        if self.model is not None:
            return

        # Acquire lock so only one thread ever loads the model (double-checked locking)
        with self._load_lock:
            if self.model is not None:
                return
            if self._loading:
                raise RuntimeError("MedGemma is still loading. Please try again shortly.")
            self._loading = True
            # A previous failure can be transient (network, incomplete download,
            # temporary memory pressure). A new request is allowed to retry.
            self._load_error = None

        try:
                source_is_local = Path(self.model_source).is_dir()
                if source_is_local and not self.local_snapshot_complete():
                    raise RuntimeError(
                        f"Local MedGemma snapshot is incomplete: {self.model_source}"
                    )
                if not source_is_local:
                    cache_root = Path(os.getenv("HF_HOME", Path.home() / ".cache" / "huggingface"))
                    cache_root.mkdir(parents=True, exist_ok=True)
                    free_bytes = shutil.disk_usage(cache_root).free
                    required_bytes = 10 * 1024 * 1024 * 1024
                    if free_bytes < required_bytes:
                        raise RuntimeError(
                            "Not enough disk space for MedGemma. "
                            f"Need about 10 GB free, found {free_bytes / (1024 ** 3):.1f} GB."
                        )
                # Requires HuggingFace token — MedGemma is a gated model.
                # Accept terms on HuggingFace and set HF_TOKEN env var before running.
                hf_token = os.getenv("HF_TOKEN")

                logger.info("Loading tokenizer from %s...", self.model_source)
                self.tokenizer = AutoTokenizer.from_pretrained(
                    self.model_source,
                    token=hf_token
                )

                # 4-bit bitsandbytes requires a CUDA-capable runtime. On CPU, use
                # a regular float32 model instead of failing during quantization.
                use_cuda = torch.cuda.is_available()
                use_4bit = (
                    os.getenv("USE_4BIT", "true").lower() == "true"
                    and use_cuda
                )

                if use_4bit:
                    logger.info("Initializing BitsAndBytesConfig for 4-bit quantization (to save VRAM)...")
                    bnb_config = BitsAndBytesConfig(
                        load_in_4bit=True,
                        bnb_4bit_compute_dtype=torch.float16,
                        bnb_4bit_quant_type="nf4",
                    )

                    logger.info("Loading %s onto GPU in 4-bit...", self.model_source)
                    self.model = AutoModelForImageTextToText.from_pretrained(
                        self.model_source,
                        quantization_config=bnb_config,
                        device_map="auto",
                        token=hf_token,
                        low_cpu_mem_usage=True,
                    )
                else:
                    # The checkpoint is bfloat16. Keeping that dtype on CPU makes
                    # the 4B model fit in a 16 GB machine; float32 needs ~16 GB
                    # for weights alone and commonly crashes during startup.
                    dtype = torch.float16 if use_cuda else torch.bfloat16
                    device_map = "auto" if use_cuda else "cpu"
                    logger.info("Loading %s with dtype=%s device_map=%s...", self.model_source, dtype, device_map)
                    self.model = AutoModelForImageTextToText.from_pretrained(
                        self.model_source,
                        dtype=dtype,
                        device_map=device_map,
                        token=hf_token,
                        low_cpu_mem_usage=True,
                    )
                logger.info("%s loaded successfully!", self.model_id)
        except Exception as e:
            self._load_error = str(e)
            logger.error("Error loading model: %s", e)
            raise RuntimeError(f"Failed to load LLM model: {e}") from e
        finally:
            self._loading = False

    def _generate_sync(self, messages, max_new_tokens=96, temperature=0.7):
        if self.model is None:
            if self._loading:
                raise RuntimeError("MedGemma is still loading. Please try again shortly.")
            logger.warning("Model is not loaded. Loading now (blocking)...")
            self.load_model()

        try:
            # apply_chat_template expects the full messages list (system + conversation)
            # MedGemma 1.5 uses Gemma 3 chat format which supports a system role slot.
            inputs = self.tokenizer.apply_chat_template(
                messages,
                add_generation_prompt=True,
                tokenize=True,
                return_dict=True,
                return_tensors="pt",
            ).to(self.model.device)

            input_len = inputs["input_ids"].shape[-1]

            # Serialise generation: two simultaneous CPU requests can otherwise
            # exhaust RAM and bring down the whole API process.
            with self._inference_lock, torch.inference_mode():
                generation_args = {
                    "max_new_tokens": max_new_tokens,
                    # CPU inference is slow. A hard wall-clock budget prevents
                    # MedGemma from monopolising the API while measurements run.
                    "max_time": float(os.getenv("MEDGEMMA_MAX_INFERENCE_SECONDS", "75")),
                    "do_sample": temperature > 0,
                }
                if temperature > 0:
                    generation_args.update({"temperature": temperature, "top_p": 0.9})
                outputs = self.model.generate(**inputs, **generation_args)

            # Slice off the prompt, decode only generated tokens
            generated_ids = outputs[0][input_len:]
            response_text = self.tokenizer.decode(generated_ids, skip_special_tokens=True)
            return response_text.strip()
        except Exception as e:
            logger.error("Inference error: %s", e)
            raise RuntimeError(f"Inference error: {str(e)}") from e

    async def generate_response(self, messages, max_new_tokens=96, temperature=0.7):
        """
        Run the generation in a background thread to prevent blocking FastAPI's async event loop.
        """
        return await asyncio.to_thread(
            self._generate_sync,
            messages,
            max_new_tokens,
            temperature
        )


# Singleton accessor
llm_service = MedGemmaService.get_instance()
