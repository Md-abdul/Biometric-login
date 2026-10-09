# Multi-runtime Dockerfile for Node.js Express + Python InsightFace AI
# Used when Render Root Directory is repository root
FROM node:20-bookworm-slim

# Install Python 3.11, pip, libgomp1 (required for onnxruntime OpenMP), and curl
RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 \
    python3-pip \
    libgomp1 \
    curl \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Install Python dependencies using pre-built binary wheels
COPY server/requirements.txt ./
RUN pip3 install --no-cache-dir --prefer-binary --break-system-packages -r requirements.txt

# Install Node dependencies
COPY server/package*.json ./
RUN npm install --production

# Copy server application source code
COPY server/ .

# Set default environment variables
ENV NODE_ENV=production
ENV PYTHON_PATH=python3
ENV PYTHON_SERVICE_PORT=5001

# Expose Render default port
EXPOSE 10000

# Start Express server (which auto-spawns Python microservice)
CMD ["node", "server.js"]
