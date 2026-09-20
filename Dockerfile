FROM node:24-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
COPY apps/cli/package.json apps/cli/package.json
COPY apps/server/package.json apps/server/package.json
COPY apps/web/package.json apps/web/package.json
COPY packages/protocol/package.json packages/protocol/package.json
RUN npm ci
COPY . .
RUN npm run build
RUN npm prune --omit=dev

FROM node:24-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production
ENV SIGNALROOM_HOST=0.0.0.0
ENV SIGNALROOM_PORT=8080
COPY --from=build /app/package.json /app/package-lock.json ./
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/apps/cli/dist ./apps/cli/dist
COPY --from=build /app/apps/cli/package.json ./apps/cli/package.json
COPY --from=build /app/apps/server/dist ./apps/server/dist
COPY --from=build /app/apps/server/package.json ./apps/server/package.json
COPY --from=build /app/apps/web/dist ./apps/web/dist
COPY --from=build /app/apps/web/package.json ./apps/web/package.json
COPY --from=build /app/packages/protocol/dist ./packages/protocol/dist
COPY --from=build /app/packages/protocol/package.json ./packages/protocol/package.json
EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -q -O - http://127.0.0.1:8080/health || exit 1
CMD ["node", "apps/cli/dist/index.js", "start", "--host", "0.0.0.0", "--port", "8080"]
