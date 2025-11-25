FROM pytorch/pytorch:2.0.1-cuda11.7-cudnn8-runtime

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    ffmpeg \
    libsm6 \
    libxext6 \
    libgl1-mesa-glx \
    git \
    wget \
    && rm -rf /var/lib/apt/lists/*

# Clone Wav2Lip
RUN git clone https://github.com/Rudrabha/Wav2Lip.git /app/Wav2Lip

# Install Wav2Lip dependencies
WORKDIR /app/Wav2Lip
RUN pip install -r requirements.txt
RUN pip install opencv-python-headless

# Create models directory
RUN mkdir -p /app/models

# Download Wav2Lip models (you need to download these manually due to licensing)
# Place wav2lip_gan.pth in /app/models/
# Download from: https://github.com/Rudrabha/Wav2Lip#getting-the-weights

# Also need face detection model
RUN mkdir -p /app/Wav2Lip/face_detection/detection/sfd
# Download s3fd.pth from the Wav2Lip repo

# Create output directory
RUN mkdir -p /app/avatar_output

# Copy assets
COPY assets /app/assets

WORKDIR /app

# Environment variables
ENV WAV2LIP_DIR=/app/Wav2Lip
ENV WAV2LIP_CHECKPOINT=/app/models/wav2lip_gan.pth
ENV AVATAR_OUTPUT_DIR=/app/avatar_output
ENV AVATAR_FACE_SOURCE=/app/assets/ai_interviewer.jpg

EXPOSE 8001

# Run a simple HTTP server to serve generated videos
CMD ["python", "-m", "http.server", "8001", "--directory", "/app/avatar_output"]
