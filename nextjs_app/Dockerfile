FROM node:22-alpine3.20
WORKDIR /app
ENV NODE_ENV development
COPY package*.json ./
RUN npm ci
COPY . .
COPY next.config.mjs ./next.config.mjs
ARG PORT=3000
ENV PORT $PORT
EXPOSE $PORT
CMD ["npx", "nodemon", "--exec", "npm ci && npm run dev", "--watch", "package.json", "--watch", "package-lock.json"]
