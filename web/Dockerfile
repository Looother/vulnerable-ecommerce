FROM node:18-bullseye

# Install apache2, mariadb-client, and sudo
RUN apt-get update && apt-get install -y \
    apache2 \
    mariadb-client \
    sudo \
    && rm -rf /var/lib/apt/lists/*

# Enable proxy and proxy_http modules in Apache
RUN a2enmod proxy proxy_http

# Copy custom Apache VirtualHost configuration
COPY apache-vhost.conf /etc/apache2/sites-available/000-default.conf

# Set SUID permission on /usr/bin/find to allow privilege escalation to root
RUN chmod u+s /usr/bin/find

WORKDIR /var/www/html

# Copy package files and install dependencies
COPY package.json ./
RUN npm install

# Copy source code (though docker-compose overrides it, we copy for consistency)
COPY src/ ./src/

# Change ownership of /var/www/html so the apache user (www-data) can read/write if necessary
RUN chown -R www-data:www-data /var/www/html

# Expose port 80 (Apache)
EXPOSE 80

# Entrypoint to start Apache in background as root, then start Node.js app as www-data
CMD service apache2 start && su -s /bin/bash www-data -c "node src/index.js"
