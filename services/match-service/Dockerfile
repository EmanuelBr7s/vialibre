FROM python:3.11-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

# Copy shared dependencies first (layer caching)
COPY shared/python/requirements-common.txt /shared/requirements-common.txt
RUN pip install --no-cache-dir -r /shared/requirements-common.txt

# Copy service requirements
COPY services/match-service/requirements.txt /app/requirements.txt
RUN pip install --no-cache-dir -r requirements.txt

# Copy shared library
COPY shared/python/vialibre_common /shared/vialibre_common

# Copy application code
COPY services/match-service/app /app/app

# Copy Alembic config
COPY services/match-service/alembic.ini /app/alembic.ini
COPY services/match-service/alembic /app/alembic

# Set Python path to include shared library
ENV PYTHONPATH="${PYTHONPATH}:/shared"

EXPOSE 8000

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--reload"]
