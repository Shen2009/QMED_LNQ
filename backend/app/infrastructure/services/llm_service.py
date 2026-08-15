import os
import time
import threading
import asyncio
import logging
import shutil
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
        self.model_id = "google/medgemma-4b-it"
        self.tokenizer = None
        self.model = None
        self._load_lock = threading.Lock()
        self._loading = False
        self._load_error = None

    @property
    def is_loading(self):
        return self._loading

    @property
    def load_error(self):
        return self._load_error

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
            if self._load_error:
                raise RuntimeError(f"MedGemma is unavailable: {self._load_error}")
            self._loading = True

        try:
                cache_root = Path(os.getenv("HF_HOME", Path.home() / ".cache" / "huggingface"))
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

                logger.info("Loading tokenizer %s...", self.model_id)
                self.tokenizer = AutoTokenizer.from_pretrained(
                    self.model_id,
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

                    logger.info("Loading %s onto GPU in 4-bit...", self.model_id)
                    self.model = AutoModelForImageTextToText.from_pretrained(
                        self.model_id,
                        quantization_config=bnb_config,
                        device_map="auto",
                        token=hf_token
                    )
                else:
                    dtype = torch.float16 if use_cuda else torch.float32
                    device_map = "auto" if use_cuda else "cpu"
                    logger.info("Loading %s with dtype=%s device_map=%s...", self.model_id, dtype, device_map)
                    self.model = AutoModelForImageTextToText.from_pretrained(
                        self.model_id,
                        torch_dtype=dtype,
                        device_map=device_map,
                        token=hf_token
                    )
                logger.info("%s loaded successfully!", self.model_id)
        except Exception as e:
            self._load_error = str(e)
            logger.error("Error loading model: %s", e)
            raise RuntimeError(f"Failed to load LLM model: {e}") from e
        finally:
            self._loading = False

    def _generate_sync(self, messages, max_new_tokens=512, temperature=0.7):
        if self.model is None:
            if self._loading:
                raise RuntimeError("MedGemma is still loading. Please try again shortly.")
            if self._load_error:
                raise RuntimeError(f"MedGemma is unavailable: {self._load_error}")
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

            with torch.inference_mode():
                outputs = self.model.generate(
                    **inputs,
                    max_new_tokens=max_new_tokens,
                    do_sample=temperature > 0,
                    temperature=temperature if temperature > 0 else 1.0,
                    top_p=0.9,
                )

            # Slice off the prompt, decode only generated tokens
            generated_ids = outputs[0][input_len:]
            response_text = self.tokenizer.decode(generated_ids, skip_special_tokens=True)
            return response_text.strip()
        except Exception as e:
            logger.error("Inference error: %s", e)
            raise RuntimeError(f"Inference error: {str(e)}") from e

    async def generate_response(self, messages, max_new_tokens=512, temperature=0.7):
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
