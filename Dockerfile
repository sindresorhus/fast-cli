FROM node:latest

RUN apt update && \
    apt install libnss3-dev libatk-bridge2.0-0 libcups2 libdrm2 \
    libxkbcommon-dev libxcomposite-dev libxdamage-dev libxrandr-dev libgbm-dev libasound-dev -y

RUN npm install --global fast-cli

CMD ["fast"]
