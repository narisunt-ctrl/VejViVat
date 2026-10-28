FROM python:3.11-slim

# libgomp/libgl are needed by PaddlePaddle and OpenCV on slim images
RUN apt-get update && apt-get install -y --no-install-recommends libgomp1 libgl1 libglib2.0-0 && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY ocr_engines.py app.py ./
# Download the PP-OCRv5 Thai models at build time so the first request is not slow
RUN PADDLE_PDX_DISABLE_MODEL_SOURCE_CHECK=True python -c "from ocr_engines import ENGINES; import numpy as np; ENGINES['paddleocr'].run(np.full((64,256,3),255,np.uint8),'raw')"

ENV PADDLE_PDX_DISABLE_MODEL_SOURCE_CHECK=True
EXPOSE 8000
CMD ["uvicorn", "app:app", "--host", "0.0.0.0", "--port", "8000"]
