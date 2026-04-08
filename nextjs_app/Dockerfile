FROM node:22-alpine3.20
WORKDIR /app
#Change to production instead of development when deploying
ENV NODE_ENV development
COPY package*.json ./
RUN npm ci
COPY . .
EXPOSE 3000
CMD ["npx", "next", "dev"]
