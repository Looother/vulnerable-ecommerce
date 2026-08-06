#!/bin/bash
# Script to populate dummy emails into /var/mail/mailadmin automatically on container startup

mkdir -p /var/mail
SPOOL_FILE="/var/mail/mailadmin"

# Clear existing file to avoid duplicate appends on container restart
> "$SPOOL_FILE"

cat << "EOF" >> "$SPOOL_FILE"
From sysadmin@cinvestav.local Wed Aug 05 08:00:00 2026
From: System Administrator <sysadmin@cinvestav.local>
To: mailadmin <mailadmin@mail-server>
Subject: Welcome Mailbox Setup
Date: Wed, 05 Aug 2026 08:00:00 -0600

Welcome to the internal mail server. System setup completed successfully.

From hr@cinvestav.local Wed Aug 05 08:30:00 2026
From: Human Resources <hr@cinvestav.local>
To: mailadmin <mailadmin@mail-server>
Subject: Reminder: Update Your Contact Info
Date: Wed, 05 Aug 2026 08:30:00 -0600

Please update your emergency contact details in the intranet portal before Friday.

From monitoring@cinvestav.local Wed Aug 05 09:00:00 2026
From: Infrastructure Monitoring <monitoring@cinvestav.local>
To: mailadmin <mailadmin@mail-server>
Subject: Weekly Server Health Report
Date: Wed, 05 Aug 2026 09:00:00 -0600

All systems operating within normal parameters. Disk usage: 42%. Memory load: 28%.

From devops@cinvestav.local Wed Aug 05 09:45:00 2026
From: DevOps Team <devops@cinvestav.local>
To: mailadmin <mailadmin@mail-server>
Subject: Scheduled Maintenance Notification
Date: Wed, 05 Aug 2026 09:45:00 -0600

Maintenance scheduled for Sunday at 02:00 UTC. Brief service interruption expected on red_privada.

From it-helpdesk@cinvestav.local Wed Aug 05 10:15:00 2026
From: IT Helpdesk <it-helpdesk@cinvestav.local>
To: mailadmin <mailadmin@mail-server>
Subject: IT Security Policy Update
Date: Wed, 05 Aug 2026 10:15:00 -0600

Reminder to all staff: Do not share plain passwords or tokens via unencrypted chat channels.

From qa-team@cinvestav.local Wed Aug 05 11:00:00 2026
From: QA Automation <qa-team@cinvestav.local>
To: mailadmin <mailadmin@mail-server>
Subject: E-Commerce Store Test Orders
Date: Wed, 05 Aug 2026 11:00:00 -0600

Automated test runs completed. 15 dummy transactions created in the MariaDB database.

From noreply@github.local Wed Aug 05 11:30:00 2026
From: CI/CD Pipeline <noreply@github.local>
To: mailadmin <mailadmin@mail-server>
Subject: Build Succeeded: vulnerable-ecommerce main branch
Date: Wed, 05 Aug 2026 11:30:00 -0600

Pipeline #1042 completed in 1m 24s. All unit tests passed cleanly.

From support@cinvestav.local Wed Aug 05 12:00:00 2026
From: Technical Support <support@cinvestav.local>
To: mailadmin <mailadmin@mail-server>
Subject: Customer Ticket #8821 Closed
Date: Wed, 05 Aug 2026 12:00:00 -0600

User reported login timeout issue on /admin page. Issue resolved by restarting Node process.

From network-ops@cinvestav.local Wed Aug 05 12:30:00 2026
From: Network Operations <network-ops@cinvestav.local>
To: mailadmin <mailadmin@mail-server>
Subject: Subnet Configuration Logs
Date: Wed, 05 Aug 2026 12:30:00 -0600

Interface eth0 assigned internal IP 172.20.0.3 (red_privada). Bridge routing enabled.

From backup-bot@cinvestav.local Wed Aug 05 13:00:00 2026
From: Backup Bot <backup-bot@cinvestav.local>
To: mailadmin <mailadmin@mail-server>
Subject: Daily MariaDB Backup Log
Date: Wed, 05 Aug 2026 13:00:00 -0600

Database backup ecommerce_20260805.sql created successfully (size: 4.2MB).

From facility@cinvestav.local Wed Aug 05 13:30:00 2026
From: Facility Services <facility@cinvestav.local>
To: mailadmin <mailadmin@mail-server>
Subject: Office Air Conditioning Maintenance
Date: Wed, 05 Aug 2026 13:30:00 -0600

Maintenance team will be servicing server room AC units tomorrow at 09:00 AM.

From analytics@cinvestav.local Wed Aug 05 14:00:00 2026
From: Analytics Engine <analytics@cinvestav.local>
To: mailadmin <mailadmin@mail-server>
Subject: Monthly Web Traffic Overview
Date: Wed, 05 Aug 2026 14:00:00 -0600

Web traffic increased by 15% this month. Top queried landing endpoint: /search.

From ciso-alerts@cinvestav.local Wed Aug 05 14:30:00 2026
From: CISO Alert System <ciso-alerts@cinvestav.local>
To: mailadmin <mailadmin@mail-server>
Subject: Security Advisory: Component Vulnerability Audit
Date: Wed, 05 Aug 2026 14:30:00 -0600

Routine audit flagged plain HTTP usage and exposed environment files in production builds.

From devops@cinvestav.local Wed Aug 05 15:00:00 2026
From: DevOps Team <devops@cinvestav.local>
To: mailadmin <mailadmin@mail-server>
Subject: Node.js Dependencies Updated
Date: Wed, 05 Aug 2026 15:00:00 -0600

Express and MariaDB connector dependencies updated to specified lab revisions.

From it-helpdesk@cinvestav.local Wed Aug 05 15:30:00 2026
From: IT Helpdesk <it-helpdesk@cinvestav.local>
To: mailadmin <mailadmin@mail-server>
Subject: Printer Room Toner Replacement
Date: Wed, 05 Aug 2026 15:30:00 -0600

New cyan and magenta toner cartridges installed in 2nd floor workroom.

From lead-sec@cinvestav.local Wed Aug 05 16:00:00 2026
From: Lead Security Engineer <lead-sec@cinvestav.local>
To: mailadmin <mailadmin@mail-server>
Subject: [CONFIDENTIAL] Database Root Credentials & Recovery Key
Date: Wed, 05 Aug 2026 16:00:00 -0600

[CONFIDENTIAL]
Mailadmin,
Here is the secondary MariaDB root recovery password in case of system lockouts:
Root Pass: SuperSecureRootPassword123!
Master Encryption Key: EncKey_992837110293
Do not store this message on unencrypted media.

From cto@cinvestav.local Wed Aug 05 16:15:00 2026
From: Chief Technology Officer <cto@cinvestav.local>
To: mailadmin <mailadmin@mail-server>
Subject: [CONFIDENTIAL] Penetration Test Scope & Vulnerability Audit
Date: Wed, 05 Aug 2026 16:15:00 -0600

[CONFIDENTIAL]
Note for Audit Team:
We intentionally left SQL injection active on /search endpoint for the pentest lab.
Also note that .env file listing is enabled on web server root (/src/.env).
Do not leak this document to unauthorized personnel.

From sysadmin@cinvestav.local Wed Aug 05 16:30:00 2026
From: System Administrator <sysadmin@cinvestav.local>
To: mailadmin <mailadmin@mail-server>
Subject: [CONFIDENTIAL] SUID Privilege Escalation Flag Details
Date: Wed, 05 Aug 2026 16:30:00 -0600

[CONFIDENTIAL]
The /usr/bin/find binary on ecommerce-web has SUID bit set intentionally.
Local users can run: find . -exec whoami \; to obtain root privileges.
Root Flag: FLAG{SUID_FIND_ELEVATION_SUCCESS_2026}

From infra@cinvestav.local Wed Aug 05 16:45:00 2026
From: Infrastructure Team <infra@cinvestav.local>
To: mailadmin <mailadmin@mail-server>
Subject: [CONFIDENTIAL] SSH Master Access Keys & Shared Passwords
Date: Wed, 05 Aug 2026 16:45:00 -0600

[CONFIDENTIAL]
User mailadmin password is configured as 'cinvestav123'.
This is identical to DB_PASSWORD in .env file (credential reuse vulnerability).

From dev-lead@cinvestav.local Wed Aug 05 17:00:00 2026
From: Development Lead <dev-lead@cinvestav.local>
To: mailadmin <mailadmin@mail-server>
Subject: [CONFIDENTIAL] API Gateway Tokens & Staging Keys
Date: Wed, 05 Aug 2026 17:00:00 -0600

[CONFIDENTIAL]
Internal API secret token: sec_token_live_8910293847561029
Staging Webhook secret: whsec_abc123xyz4567890

From security-team@cinvestav.local Wed Aug 05 17:15:00 2026
From: Security Operations <security-team@cinvestav.local>
To: mailadmin <mailadmin@mail-server>
Subject: [CONFIDENTIAL] Network Packet Sniffing (HTTP Vulnerability)
Date: Wed, 05 Aug 2026 17:15:00 -0600

[CONFIDENTIAL]
All web traffic runs over unencrypted HTTP (Port 80).
Credentials passed in request headers are exposed to Wireshark / tcpdump on the host.

From audit@cinvestav.local Wed Aug 05 17:30:00 2026
From: Internal Audit Team <audit@cinvestav.local>
To: mailadmin <mailadmin@mail-server>
Subject: [CONFIDENTIAL] Internal Flag #2 - Lateral Movement
Date: Wed, 05 Aug 2026 17:30:00 -0600

[CONFIDENTIAL]
Congratulations on pivoting to mail-server via SSH!
Mail Server Flag: FLAG{LATERAL_MOVEMENT_MAIL_ADMIN_SSH_ACCESSED}

From ciso@cinvestav.local Wed Aug 05 17:45:00 2026
From: Chief Information Security Officer <ciso@cinvestav.local>
To: mailadmin <mailadmin@mail-server>
Subject: [CONFIDENTIAL] Disaster Recovery Master Plan
Date: Wed, 05 Aug 2026 17:45:00 -0600

[CONFIDENTIAL]
In case of severe compromise, shut down red_publica bridge interface immediately.
Backup Vault Location: /var/backups/vault_master.tar.gz

From netadmin@cinvestav.local Wed Aug 05 18:00:00 2026
From: Network Administrator <netadmin@cinvestav.local>
To: mailadmin <mailadmin@mail-server>
Subject: [CONFIDENTIAL] Internal Subnet Firewall Bypass Notes
Date: Wed, 05 Aug 2026 18:00:00 -0600

[CONFIDENTIAL]
The db-server (3306) and mail-server (22) are reachable only from red_privada.
Compromising ecommerce-web grants full subnet reachability.

From ceo@cinvestav.local Wed Aug 05 18:15:00 2026
From: Chief Executive Officer <ceo@cinvestav.local>
To: mailadmin <mailadmin@mail-server>
Subject: [CONFIDENTIAL] Lab Executive Summary & Grading Sheet
Date: Wed, 05 Aug 2026 18:15:00 -0600

[CONFIDENTIAL]
Lab Objectives:
1. Extract .env credentials from Web Server.
2. Exploit SQL Injection on /search.
3. Elevate privileges via SUID find.
4. Pivot to Mail Server using SSH credential reuse.
5. Retrieve confidential emails from /var/mail/mailadmin.

EOF

# Ensure user mailadmin (PUID 1000) owns the mail spool
chown -R 1000:1000 /var/mail
chmod 600 "$SPOOL_FILE"
echo "[INIT] Populated 25 dummy emails into $SPOOL_FILE"
