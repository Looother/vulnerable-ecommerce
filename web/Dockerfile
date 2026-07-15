FROM node:18-bullseye

# Install apache2, mariadb-client, sudo, GCC, and make
RUN apt-get update && apt-get install -y \
    apache2 \
    mariadb-client \
    sudo \
    gcc \
    make \
    && rm -rf /var/lib/apt/lists/*

# Enable proxy and proxy_http modules in Apache
RUN a2enmod proxy proxy_http

# Copy custom Apache VirtualHost configuration
COPY apache-vhost.conf /etc/apache2/sites-available/000-default.conf

# Copy the vulnerable C source code and compile it with protections disabled
# -fno-stack-protector: Disables canary/cookie stack protection
# -z execstack: Allows execution on the stack (NX disabled)
COPY src/legacy_status.c /tmp/legacy_status.c
RUN gcc -fno-stack-protector -z execstack -o /usr/local/bin/legacy_status /tmp/legacy_status.c \
    && rm /tmp/legacy_status.c

# Set SUID permission on legacy_status and /usr/bin/find to allow privilege escalation to root
RUN chmod u+s /usr/local/bin/legacy_status \
    && chmod u+s /usr/bin/find

WORKDIR /var/www/html

# Copy package files and install dependencies
COPY package.json ./
RUN npm install

# Copy source code
COPY src/ ./src/

# Change ownership of /var/www/html so the apache user (www-data) can read/write if necessary
RUN chown -R www-data:www-data /var/www/html

# Expose port 80 (Apache)
EXPOSE 80

# Entrypoint to start Apache in background as root, then start Node.js app as www-data
CMD service apache2 start && su -s /bin/bash www-data -c "node src/index.js"
