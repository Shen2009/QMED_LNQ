import numpy as np
class BaseLoader:
    @staticmethod
    def diff_normalize_data(data):
        data = data.astype(np.float32)
        diff = np.zeros(data.shape, dtype=np.float32)
        diff[1:] = (data[1:] - data[:-1]) / (data[1:] + data[:-1] + 1e-8)
        return diff

    @staticmethod
    def standardized_data(data):
        data = data.astype(np.float32)
        data = data - np.mean(data, axis=0)
        data = data / (np.std(data, axis=0) + 1e-8)
        return data
