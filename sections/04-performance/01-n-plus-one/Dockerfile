FROM node:24-slim
RUN apt-get update && apt-get install -y python3 make g++ && rm -rf /var/lib/apt/lists/*
WORKDIR /workspace
COPY package*.json ./
RUN npm install
COPY app ./app
COPY scripts ./scripts
CMD ["node", "app/server.js"]
