FROM python:3.10-slim

WORKDIR /app

# Instead of copying a file, create it directly in the Dockerfile
RUN echo "flask\npandas\nnumpy\nscikit-learn\nopenpyxl\ngunicorn\nmatplotlib\npython-dotenv
\nflask-cors" > requirements.txt
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY . .

# Expose the port your app runs on
EXPOSE ${PORT:-5000}

# Command to run the application
CMD ["sh", "-c", "gunicorn --bind 0.0.0.0:${PORT:-5000} app:app"]