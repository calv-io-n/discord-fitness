# Stage 1: Build frontend static files
FROM oven/bun:latest AS frontend-build
WORKDIR /app/frontend
COPY frontend/package.json frontend/bun.lock ./
RUN bun install --frozen-lockfile
COPY frontend/ .
RUN bun run build

# Stage 2: API server (dashboard)
FROM oven/bun:latest AS api
WORKDIR /app
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile --production
COPY src/ src/
COPY tsconfig.json .
CMD ["bun", "run", "src/dashboard/run.ts"]

# Stage 3: MCP server
FROM oven/bun:latest AS mcp
WORKDIR /app
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile --production
COPY src/ src/
COPY tsconfig.json .
CMD ["bun", "run", "src/mcp-server/run.ts"]

# Stage 4: Web (nginx serving static frontend)
FROM nginx:alpine AS web
COPY --from=frontend-build /app/frontend/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
