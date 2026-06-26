FROM python:3.11-slim

WORKDIR /app

# Install Python deps
COPY backend/requirements.txt ./requirements.txt
RUN pip install --no-cache-dir -r requirements.txt

# Copy backend source
COPY backend/app ./app

# Copy pre-built React frontend (run `npm run build` in frontend/ first)
COPY frontend/dist ./app/static

ENV HOST=0.0.0.0
ENV PORT=8000
ENV DB_PATH=/data/traffic.db

EXPOSE 8000

CMD ["python", "-m", "uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
