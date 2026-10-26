# The backend for Cloud Run (docs/deploy-firebase.md). The kiosk itself is served by Firebase Hosting.
FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1 PYTHONUNBUFFERED=1
WORKDIR /app

# installed in place (-e), so the app finds assets/ and models/ beside it as it does locally
COPY pyproject.toml ./
COPY app ./app
RUN pip install --no-cache-dir -e .

COPY assets ./assets
COPY models ./models
# the matting model (179 MB) goes into the image, so a new instance never waits to download it
RUN python -m app.services.matte

CMD exec uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8080}
