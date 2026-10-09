# Multi-runtime Dockerfile for Node.js Express + Python InsightFace AI
FROM node:20-bookworm-slim

# Install Python 3.11, pip, and required system libraries
RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 \
    python3-pip \
    python3-dev \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Install Python dependencies
COPY requirements.txt ./
RUN pip3 install --no-cache-dir --break-system-packages -r requirements.txt

# Install Node dependencies
COPY package*.json ./
RUN npm install --production

# Copy application source code
COPY . .

# Set default environment variables
ENV NODE_ENV=production
ENV PYTHON_PATH=python3
ENV PYTHON_SERVICE_PORT=5001

# Expose Render default port
EXPOSE 10000

# Start Express server (which auto-spawns Python microservice)
CMD ["node", "server.js"]
