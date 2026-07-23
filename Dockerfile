FROM node:22-alpine AS build
WORKDIR /app
COPY package.json tsconfig.base.json ./
COPY shared/package.json shared/tsconfig.json ./shared/
COPY server/package.json server/tsconfig.json ./server/
COPY client/package.json client/tsconfig.json client/vite.config.ts client/tailwind.config.ts client/postcss.config.js ./client/
RUN npm install
COPY shared ./shared
COPY server ./server
COPY client ./client
RUN npm run build

FROM node:22-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000
ENV CLIENT_DIST=/app/client/dist
COPY package.json ./
COPY shared/package.json ./shared/
COPY server/package.json ./server/
RUN npm install --omit=dev --workspaces
COPY --from=build /app/shared/dist ./shared/dist
COPY --from=build /app/server/dist ./server/dist
COPY --from=build /app/client/dist ./client/dist
EXPOSE 3000
CMD ["npm", "run", "start", "-w", "server"]
