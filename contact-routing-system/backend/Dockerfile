FROM python:3.10-slim

WORKDIR /app

# Make sure this file exists
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

ENV FLASK_APP=app.py
ENV FLASK_DEBUG=0

# Render assigns a PORT environment variable
EXPOSE ${PORT:-5000}

# Use $PORT variable for Render
CMD ["sh", "-c", "gunicorn --bind 0.0.0.0:${PORT:-5000} app:app"]