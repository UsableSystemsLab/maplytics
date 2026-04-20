FROM node:25-alpine3.22
WORKDIR /app
COPY package*.json ./
ENV NODE_ENV development
RUN npm ci
COPY . .
EXPOSE 4000
CMD ["npm", "run", "dev"]
