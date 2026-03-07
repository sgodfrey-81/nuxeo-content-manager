# Build stage
FROM node:20-alpine AS build

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .

RUN npm run build

# Production stage - runs the Express server which serves both the API proxy and static frontend
FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --omit=dev

COPY --from=build /app/dist ./dist

ENV NODE_ENV=production
ENV PORT=3000

# Configure these environment variables to point to your local Nuxeo instance:
# NUXEO_URL - Base URL of your Nuxeo server (default: http://localhost:8080/nuxeo)
# NUXEO_AUTH - Authorization header value (default: Basic base64(Administrator:Administrator))

EXPOSE 3000

CMD ["node", "dist/index.cjs"]