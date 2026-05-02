FROM node:22-alpine AS build

WORKDIR /app

RUN apk add --no-cache libc6-compat

COPY package.json ./
COPY backend/package.json backend/package.json
COPY frontend/package.json frontend/package.json
RUN npm install

COPY . .
RUN npm run build

FROM node:22-alpine AS runtime

WORKDIR /app
ENV NODE_ENV=production

RUN apk add --no-cache libc6-compat

COPY package.json ./
COPY backend/package.json backend/package.json
COPY frontend/package.json frontend/package.json
RUN npm install --omit=dev

COPY --from=build /app/backend/dist backend/dist
COPY --from=build /app/frontend/dist frontend/dist
COPY backend/storage backend/storage

EXPOSE 4000
CMD ["npm", "run", "start", "--workspace", "backend"]
