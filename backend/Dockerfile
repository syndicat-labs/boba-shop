FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1

WORKDIR /app

COPY pyproject.toml ./
COPY config ./config
COPY core ./core
COPY api ./api
COPY adapters ./adapters
COPY manage.py ./

RUN pip install --upgrade pip && pip install -e .

EXPOSE 8000

CMD ["sh", "-c", "python manage.py migrate && daphne -b 0.0.0.0 -p 8000 config.asgi:application"]
