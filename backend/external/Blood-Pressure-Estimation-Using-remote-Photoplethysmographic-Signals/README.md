# Blood-Pressure-Estimation-Using-remote-Photoplethysmographic-Signals

# Overview
This project develops a deep learning system for cuff-less blood pressure (BP) estimation. It uses Photoplethysmogram (PPG) signals to predict systolic and diastolic BP, enabling continuous, non-invasive monitoring. We also implemented a secondary pipeline to extract remote PPG (rPPG) from facial videos (using MediaPipe and OpenCV), demonstrating camera-based BP estimation feasibility.
# Data
MIMIC-III Waveform Database: We used a subset of MIMIC-III (ICU data) containing synchronized PPG and arterial blood pressure signals. Millions of PPG waveform samples (7-second windows) with corresponding SBP/DBP labels form our training and validation data.

UBFC-rPPG Dataset: For video-based rPPG, we used the “Dataset 2 (realistic)” of UBFC-rPPG
sites.google.com
sites.google.com
. It consists of 42 videos (640×480@30fps) of subjects playing a math game to elevate heart rate (introducing realistic motion/lighting). Ground-truth fingertip PPG and heart rate (CMS50E oximeter) were recorded synchronously.

# Methodology
PPG based Blood Pressure Estimation    Raw PPG signals were segmented into fixed 7-second windows. Each segment was preprocessed: bandpass filtering to 0.5–8 Hz, baseline trend removal, and normalization. The 875-sample segment was downsampled to 438 samples. These cleaned segments serve as input features.

# Model Architecture
We implemented a 1D Residual Neural Network (ResNet) to capture temporal patterns in the PPG waveform. The network uses multiple 1D convolutions (kernel size 3) with batch normalization and ReLU activations, organized into residual blocks with skip connections to allow deep architectures without vanishing gradients. Max-pooling layers reduce sequence length. The final dense layer outputs two continuous values (SBP and DBP). The model was trained with mean squared error loss (MSE) and optimized with Adam.

# rPPG Extraction Pipeline
For video-based estimation, each frame is processed by MediaPipe Face Mesh to detect 468 facial landmarks in real-time. Forehead and cheeks regions are dynamically localized from these landmarks. Using OpenCV, each ROI is cropped, upscaled, and the mean green-channel intensity is computed (pixel-wise) to form the raw rPPG signal. This yields three signals (forehead, left cheek, right cheek) sampled at 30 fps. The raw signals are detrended (removing slow illumination drift) and bandpass-filtered to isolate cardiac pulse frequencies.

# Running the Code
The project is implemented in Python using TensorFlow/Keras. We provide Jupyter/Colab notebooks that perform preprocessing, model training, and evaluation. The notebooks can be run on Google Colab (we used a Tesla T4 GPU) or a local Jupyter environment. To run, open the notebook and execute cells sequentially. All data loading, training, and analysis steps are included.
