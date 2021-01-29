FROM node:12-alpine
WORKDIR /home/ubuntu/node
COPY package*.json ./
RUN npm install -g
COPY . .
CMD ["npm", "start"]
EXPOSE 2021
