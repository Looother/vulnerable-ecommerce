FROM node:18-bullseye

# Install maria-db client (useful for the lab to test connection) and other utilities
RUN apt-get update && apt-get install -y \
    mariadb-client \
    && rm -rf /var/lib/apt/lists/*

# Set SUID permission on /usr/bin/find to allow privilege escalation from node to root
RUN chmod u+s /usr/bin/find

WORKDIR /var/www/html

# Copy package files
COPY package.json ./

# Install dependencies
RUN npm install

# Copy source code (though docker-compose mounts it, we copy for completeness)
COPY src/ ./src/

# Change ownership of the app files to the node user
RUN chown -R node:node /var/www/html

# Expose port 80
EXPOSE 80

# Run the application as the non-root 'node' user so SUID privilege escalation can be practiced
USER node

CMD ["npm", "start"]
