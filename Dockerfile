FROM node:18
WORKDIR /home/ubuntu/node
COPY package.json yarn.lock ./
RUN yarn install
COPY . .
CMD ["yarn", "start"]
EXPOSE 2021
