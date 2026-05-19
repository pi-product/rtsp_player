FROM node:20-alpine AS build
WORKDIR /app

# Install workspace deps
COPY package*.json ./
COPY packages/client/package*.json ./packages/client/
COPY packages/server/package*.json ./packages/server/
RUN npm install

# Build the client
COPY packages/client ./packages/client
COPY packages/server ./packages/server
RUN npm run build --workspace=packages/client

# Serve with nginx
FROM nginx:alpine
COPY --from=build /app/packages/client/dist /usr/share/nginx/html
COPY packages/client/nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
