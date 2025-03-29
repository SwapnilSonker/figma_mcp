# # Use Node.js LTS version
# FROM node:18-alpine

# # Set working directory
# WORKDIR /app

# # Install dependencies required for node-gyp and other build tools
# RUN apk add --no-cache python3 make g++

# # Install pnpm and other required global packages
# RUN npm install -g pnpm cross-env tsup

# # Copy package files first
# COPY package.json ./

# # Install app dependencies with legacy peer deps flag
# RUN pnpm install --no-frozen-lockfile

# # Copy app source
# COPY . .

# # Build the application
# RUN pnpm build

# # Use non-root user
# USER node

# # Expose port
# EXPOSE 3000

# # Start the development server
# CMD ["pnpm", "run", "dev"]
# Use Node.js LTS version
FROM node:18-alpine

# Set working directory
WORKDIR /app

# Install pnpm globally
RUN npm install -g pnpm

# Copy package files first
COPY package.json ./

# Install app dependencies
RUN pnpm install

# Copy app source
COPY . .

# Create dist directory and set permissions
RUN mkdir -p dist && \
    chown -R node:node .

# Use non-root user
USER node

# Expose port
EXPOSE 3000

# Start the development server
CMD ["pnpm", "run", "dev"]
