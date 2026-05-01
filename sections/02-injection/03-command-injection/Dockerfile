FROM node:24-slim
RUN apt-get update && apt-get install -y python3 make g++ && rm -rf /var/lib/apt/lists/*
WORKDIR /workspace
COPY package*.json ./
RUN npm install
COPY app ./app
COPY scripts ./scripts
COPY bin/wkhtmltopdf-linux-amd64 bin/wkhtmltopdf-linux-arm64 ./bin/
CMD ["node", "--watch", "app/server.js"]
