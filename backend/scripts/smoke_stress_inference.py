import os
import numpy as np

from app.infrastructure.services.stress_inference_from_bvp import infer_stress_from_bvp


def main() -> None:
    # Synthetic BVP-like waveform for runtime smoke test.
    fps = 30.0
    duration_sec = 30.0
    t = np.arange(0, duration_sec, 1.0 / fps)
    signal = (
        0.8 * np.sin(2 * np.pi * 1.2 * t)
        + 0.2 * np.sin(2 * np.pi * 2.4 * t)
        + 0.05 * np.random.default_rng(42).normal(size=t.shape)
    ).astype(np.float64)

    model_path = os.path.join(os.path.dirname(__file__), "..", "ml_models", "8features_to_stress.pkl")
    model_path = os.path.abspath(model_path)

    result = infer_stress_from_bvp(signal, fps=fps, model_path=model_path)
    print({"model_path": model_path, **result})


if __name__ == "__main__":
    main()
