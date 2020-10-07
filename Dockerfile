FROM node:12.13-alpine As development

WORKDIR /usr/src/app

COPY package*.json ./

RUN npm ci

COPY . .

RUN npm run build

FROM node:12.13-alpine as production

WORKDIR /usr/src/app

COPY package*.json ./

RUN npm ci

COPY . .

COPY --from=development /usr/src/app/dist ./dist

CMD ["node", "dist/src/main.js"]