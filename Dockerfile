FROM node:22-alpine AS base

WORKDIR /app

# Native build deps for better-sqlite3 on Alpine
RUN apk add --no-cache python3 make g++

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npm run build

RUN mkdir -p /var/data

ENV NODE_ENV=production
ENV PORT=3000
ENV DATABASE_PATH=/var/data/ajaia-docs.db

EXPOSE 3000

CMD ["npm", "start"]
