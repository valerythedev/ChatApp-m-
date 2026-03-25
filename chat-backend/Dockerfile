FROM node:20-bookworm-slim

# Prisma engines expect OpenSSL; slim image omits it by default
RUN apt-get update -y && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package.json package-lock.json* ./
# postinstall runs `prisma generate`, but schema/config are not copied yet — skip lifecycle scripts here
RUN npm ci --ignore-scripts

COPY prisma ./prisma
COPY prisma.config.ts ./
COPY tsconfig.json ./
COPY src ./src

# prisma.config.ts uses env("DATABASE_URL"); generate does not connect, but the var must exist to load config
RUN DATABASE_URL="postgresql://build:build@127.0.0.1:5432/build" npm run build

ENV NODE_ENV=production
EXPOSE 5550

CMD sh -c "npx prisma migrate deploy && node dist/server.js"
