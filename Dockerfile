FROM node:20-alpine

# Install OpenSSL and libc compatibility for Prisma
RUN apk add --no-cache openssl libc6-compat

WORKDIR /app

# Copy dependency definitions and prisma schemas
COPY package*.json ./
COPY prisma ./prisma/

# Install dependencies
RUN npm install --legacy-peer-deps

# Copy application source code
COPY . .

# Generate Prisma client
RUN npx prisma generate

EXPOSE 5000

CMD ["node", "dist/server.js"]
