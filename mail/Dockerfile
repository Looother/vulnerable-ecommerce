FROM lscr.io/linuxserver/openssh-server:latest

# Copy startup script to populate emails on container initialization
COPY init-mails.sh /custom-cont-init.d/01-init-mails.sh

# Grant execution permissions and run script during build to prepopulate spool file
RUN chmod +x /custom-cont-init.d/01-init-mails.sh \
    && /custom-cont-init.d/01-init-mails.sh
