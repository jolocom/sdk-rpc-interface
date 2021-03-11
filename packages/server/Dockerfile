FROM node:10
WORKDIR /usr/src/app
COPY package.json yarn.lock ./
RUN yarn install

ADD . /usr/src/app
RUN yarn build

EXPOSE 4040

CMD ["yarn", "run", "start"]
