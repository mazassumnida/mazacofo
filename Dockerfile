# STEP 1: Install dependencies
FROM node:22.12-alpine AS deps
WORKDIR /app
COPY package.json yarn.lock ./
RUN yarn --frozen-lockfile

# STEP 2: Build
FROM node:22.12-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN yarn build

# Step 3: Expose
FROM node:22.12-alpine AS runner
RUN apk add --no-cache tzdata vim
ENV TZ=Asia/Seoul
RUN cp /usr/share/zoneinfo/$TZ /etc/localtime
ENV NODE_ENV=production

WORKDIR /app
COPY --from=builder /app/dist ./dist
COPY --from=deps /app/node_modules ./node_modules
COPY package.json yarn.lock tsconfig.* .env ./

CMD ["sh", "-c", "yarn mikro-orm migration:up --config './dist/database/mikro-orm.config.js' ; yarn start:prod"]
