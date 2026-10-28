FROM node:22-alpine AS base

ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable

WORKDIR /app

# Copy workspace package manifests
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json turbo.json ./
COPY services/core/package.json ./services/core/package.json
COPY apps/web/package.json ./apps/web/package.json

# Install dependencies
RUN pnpm install --frozen-lockfile --filter @drape/core...

# Copy core source files
COPY services/core ./services/core

WORKDIR /app/services/core

# Compile TypeScript
RUN pnpm build

EXPOSE 4000

ENV PORT=4000
ENV HOST=0.0.0.0

CMD ["node", "dist/server.js"]
