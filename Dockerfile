# Build: compiles the Angular client, SSR and the bundled Nest API into dist/
FROM node:26.12-alpine3.24 AS build
WORKDIR /usr/src/app
# No git hooks inside the image build (the `prepare` script installs husky)
ENV HUSKY=0
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund
COPY . .
# Build info compiled into the app (scripts/build-ssr.mjs); the build context has no .git, so pass
#   --build-arg GIT_SHA=$(git rev-parse --short HEAD) --build-arg BUILD_DATE=$(date -u +%F)
ARG GIT_SHA=dev
ARG BUILD_DATE=
RUN GIT_SHA=$GIT_SHA BUILD_DATE=$BUILD_DATE npm run build:ssr
# The bundle keeps only a few packages external (angular.json externalDependencies); of those,
# only pg is imported at runtime. Pin it to the lockfile version.
RUN node -e "const p = require('./package-lock.json').packages; \
  require('fs').writeFileSync('runtime-package.json', JSON.stringify({ name: 'eshop-runtime', private: true, \
  dependencies: { pg: p['node_modules/pg'].version } }))"

# Runtime dependencies only (no Angular/Nest sources, no dev tooling)
FROM node:26.12-alpine3.24 AS runtime-deps
WORKDIR /usr/src/app
COPY --from=build /usr/src/app/runtime-package.json ./package.json
RUN npm install --omit=dev --no-audit --no-fund && npm cache clean --force

FROM node:26.12-alpine3.24
ARG GIT_SHA=dev
ARG BUILD_DATE=
LABEL org.opencontainers.image.title="eshop_mean" \
  org.opencontainers.image.revision="$GIT_SHA" \
  org.opencontainers.image.created="$BUILD_DATE"
# tini as PID 1 forwards SIGTERM/SIGINT to node, so `docker stop` doesn't wait for the kill timeout
RUN apk add --no-cache tini
WORKDIR /usr/src/app
COPY --from=runtime-deps /usr/src/app/node_modules ./node_modules
COPY --from=build /usr/src/app/dist ./dist
# Applied by the app at startup (server/src/db/startup.ts)
COPY --from=build /usr/src/app/server/db/migrations ./server/db/migrations
USER node
EXPOSE 4000
# Run node directly (not via npm) so signals reach the app.
# Configuration is passed at runtime (--env-file / -e); PORT defaults to nothing, so set it.
ENTRYPOINT ["/sbin/tini", "--"]
CMD ["node", "dist/eshop/server/server.mjs"]
