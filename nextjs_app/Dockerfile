FROM node:22-alpine3.20
WORKDIR /app
ENV NODE_ENV development
COPY package*.json ./
RUN npm ci
COPY . .
EXPOSE 3000
CMD ["npx", "next", "dev"]
