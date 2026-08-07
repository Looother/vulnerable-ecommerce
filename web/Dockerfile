FROM node

# Install apache2, mariadb-client, sudo, GCC, make, and rustc
RUN apt-get update && apt-get install -y \
    apache2 \
    mariadb-client \
    sudo \
    gcc \
    make \
    rustc \
    sshpass \
    openssh-client \
    && rm -rf /var/lib/apt/lists/*

# Enable proxy and proxy_http modules in Apache
RUN a2enmod proxy proxy_http

# Copy custom Apache VirtualHost configuration
COPY apache-vhost.conf /etc/apache2/sites-available/000-default.conf

# Copy Rust source code and compile it into a memory-safe binary
COPY src/legacy_status.rs /tmp/legacy_status.rs
RUN rustc -O -o /usr/local/bin/legacy_status /tmp/legacy_status.rs \
    && rm /tmp/legacy_status.rs

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
