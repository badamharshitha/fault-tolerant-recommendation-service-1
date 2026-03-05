# FROM node:18-alpine
# WORKDIR /usr/src/app
# COPY package*.json ./
# RUN npm install --omit=dev
# COPY . .
# EXPOSE 8081
# CMD ["npm", "start"]
FROM node:18-alpine

RUN apk add --no-cache curl

WORKDIR /usr/src/app
COPY package*.json ./
RUN npm install

COPY . .

EXPOSE 8081
CMD ["node", "index.js"]