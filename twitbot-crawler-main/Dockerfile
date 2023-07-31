FROM node:14-slim as build-stage
RUN apt-get update \
    && apt-get install -y wget gnupg \
    && wget -q -O - https://dl-ssl.google.com/linux/linux_signing_key.pub | apt-key add - \
    && sh -c 'echo "deb [arch=amd64] http://dl.google.com/linux/chrome/deb/ stable main" >> /etc/apt/sources.list.d/google.list' \
    && apt-get update \
    && apt-get install -y google-chrome-stable fonts-ipafont-gothic fonts-wqy-zenhei fonts-thai-tlwg fonts-kacst fonts-freefont-ttf libxss1 python3-pip curl\
    --no-install-recommends \
    && rm -rf /var/lib/apt/lists/*
RUN apt-get update && apt-get install libxshmfence1 libglu1 -y
RUN pip3 install requests
WORKDIR /app
# ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser
COPY . .
EXPOSE 3000
RUN yarn && yarn build && cp -r src/libs/ build/
ENTRYPOINT ["node", "./build/index.js"]
