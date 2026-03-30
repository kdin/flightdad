# ─── flightdad backend — development image ────────────────────────────────────
# Build context: repository root (required to access packages/shared)
# Usage: docker compose up --build
# ──────────────────────────────────────────────────────────────────────────────
FROM node:20-alpine

WORKDIR /app

# Copy workspace manifests first so npm install is cached as a layer.
# All three workspaces must be present before `npm ci` runs.
COPY package.json package-lock.json ./
COPY packages/shared/package.json   ./packages/shared/
COPY services/backend/package.json  ./services/backend/
COPY apps/mobile/package.json       ./apps/mobile/

# Install all workspace dependencies (includes devDependencies for ts-node).
RUN npm ci

# Source code is bind-mounted at runtime by docker compose.
# node_modules is kept in a named Docker volume so the container's install
# is never overwritten by the (absent) host node_modules.

EXPOSE 3000
