# Build stage
FROM node:20-alpine AS builder

WORKDIR /usr/src/app

# Install dependencies first (better caching)
COPY package*.json ./
RUN npm ci

# Copy source code
COPY . .

# Build application
RUN npm run build

# Development stage
FROM node:20-alpine AS development

WORKDIR /usr/src/app

# Install all dependencies (including dev dependencies)
COPY package*.json ./
RUN npm install

# Copy source code
COPY . .

# Expose port
EXPOSE 3005

# Start application in development mode
CMD ["npm", "run", "start:dev"]

# Production stage
FROM node:20-alpine AS production

# Add non-root user
RUN addgroup -S appgroup && adduser -S appuser -G appgroup

# Set environment variables
ARG NODE_ENV=production
ENV NODE_ENV=${NODE_ENV} \
    PORT=3005

# Create app directory
WORKDIR /usr/src/app

# Copy package files
COPY package*.json ./

# Copy production dependencies and built app from builder
COPY --from=builder /usr/src/app/node_modules ./node_modules
COPY --from=builder /usr/src/app/dist ./dist

# Set permissions
RUN chown -R appuser:appgroup /usr/src/app

# Switch to non-root user
USER appuser

# Expose port
EXPOSE 3005

# Start application
CMD ["node", "dist/main"]