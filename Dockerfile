FROM node

COPY . /src
WORKDIR /src

RUN npm install

CMD ["node", "cli.js"]


