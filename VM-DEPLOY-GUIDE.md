# Gaming Center — Ubuntu VM Deployment Guide

Send this file to your teammate. She can copy and paste each block into the terminal.

---

## Before you start

Replace these values everywhere they appear:

| Variable | Example | Your value |
|----------|---------|------------|
| **VM1 IP** (Web + Backend) | `192.168.1.10` | __________ |
| **VM2 IP** (PostgreSQL) | `192.168.1.20` | __________ |
| **DB password** | `StrongPassword123!` | __________ |
| **GitHub repo** | `https://github.com/ChhanunHean/gamming.git` | __________ |

**VM roles:**
- **VM1** = Public website + Staff portal + Backend API + Nginx
- **VM2** = PostgreSQL database only

---

# PART A — VM2 (Database Server)

SSH into **VM2** first.

---

## A1. Install PostgreSQL

```bash
sudo apt update
sudo apt install -y postgresql postgresql-contrib
sudo systemctl enable postgresql
sudo systemctl start postgresql
sudo systemctl status postgresql
```

---

## A2. Create database and user

Run this block (change the password if you want):

```bash
sudo -u postgres psql <<'EOF'
CREATE USER gaming_user WITH PASSWORD 'StrongPassword123!';
CREATE DATABASE gaming_center OWNER gaming_user;
GRANT ALL PRIVILEGES ON DATABASE gaming_center TO gaming_user;
\q
EOF
```

If you see `role "gaming_user" already exists`, that is OK — continue.

---

## A3. Allow VM1 to connect to PostgreSQL

Replace `192.168.1.10` with your **VM1 IP**.

### Step 1 — Edit postgresql.conf

```bash
sudo sed -i "s/#listen_addresses = 'localhost'/listen_addresses = '*'/" /etc/postgresql/*/main/postgresql.conf
```

Or open manually:

```bash
sudo nano /etc/postgresql/*/main/postgresql.conf
```

Find and set:

```conf
listen_addresses = '*'
```

### Step 2 — Edit pg_hba.conf

```bash
sudo nano /etc/postgresql/*/main/pg_hba.conf
```

Add this line at the **end** (change VM1 IP):

```conf
host    gaming_center    gaming_user    192.168.1.10/32    scram-sha-256
```

### Step 3 — Restart PostgreSQL

```bash
sudo systemctl restart postgresql
```

### Step 4 — Firewall (only allow VM1)

```bash
sudo ufw allow OpenSSH
sudo ufw allow from 192.168.1.10 to any port 5432
sudo ufw enable
sudo ufw status
```

---

## A4. Test from VM2 (local)

```bash
sudo -u postgres psql -d gaming_center -c "SELECT version();"
```

You should see PostgreSQL version info.

---

# PART B — VM1 (Web + Backend Server)

SSH into **VM1**.

---

## B1. Install Node.js, Git, Nginx, PM2

```bash
sudo apt update
sudo apt install -y git curl nginx
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
sudo npm install -g pm2
node -v
npm -v
```

---

## B2. Clone project from GitHub

```bash
cd /var/www
sudo git clone https://github.com/ChhanunHean/gamming.git
sudo chown -R $USER:$USER gamming
cd gamming
git pull origin main
```

---

## B3. Install dependencies

```bash
cd /var/www/gamming
npm run install:all
```

---

## B4. Create backend .env file

Replace `192.168.1.20` with your **VM2 IP**. Change passwords and secrets!

```bash
cat > /var/www/gamming/backend/.env <<'EOF'
PORT=3001
NODE_ENV=production

JWT_SECRET=change-this-to-a-very-long-random-secret-key
PENDING_SECRET=change-this-to-another-very-long-random-secret

DB_HOST=192.168.1.20
DB_PORT=5432
DB_NAME=gaming_center
DB_USER=gaming_user
DB_PASSWORD=StrongPassword123!
DB_SSL=false
EOF
```

---

## B5. Test database connection from VM1

Install psql client (optional but helpful):

```bash
sudo apt install -y postgresql-client
psql -h 192.168.1.20 -U gaming_user -d gaming_center -c "SELECT 1;"
```

Enter password when asked. If it works, database connection is OK.

---

## B6. Seed database (staff accounts + gaming stations)

```bash
cd /var/www/gamming
npm run seed
```

**IMPORTANT:** Save the output! It shows:
- Staff usernames and passwords
- **2FA secrets** for Google Authenticator

Example accounts:
- Manager: `manager` / `Manager@123`
- Staff: `staff1` / `Staff@123` (and staff2, staff3, staff4)

---

## B7. Build frontend apps

```bash
cd /var/www/gamming/public-site
npm run build

cd /var/www/gamming/staff-portal
npm run build
```

---

## B8. Start backend with PM2

```bash
cd /var/www/gamming/backend
pm2 start src/index.js --name gaming-api
pm2 save
pm2 startup
```

Copy and run the command that `pm2 startup` prints (starts PM2 on boot).

Check status:

```bash
pm2 status
pm2 logs gaming-api --lines 30
```

Test API locally:

```bash
curl http://localhost:3001/api/health
```

Expected response:

```json
{"status":"ok","service":"gaming-center-api","database":"postgresql"}
```

---

## B9. Configure Nginx

Replace `192.168.1.10` with your VM1 IP if needed.

```bash
sudo tee /etc/nginx/sites-available/gaming <<'EOF'
server {
    listen 80;
    server_name 192.168.1.10;

    # Public website
    location / {
        root /var/www/gamming/public-site/dist;
        try_files $uri $uri/ /index.html;
    }

    # Staff portal
    location /staff/ {
        alias /var/www/gamming/staff-portal/dist/;
        try_files $uri $uri/ /staff/index.html;
    }

    # Backend API
    location /api/ {
        proxy_pass http://127.0.0.1:3001;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }
}
EOF
```

Enable site:

```bash
sudo ln -sf /etc/nginx/sites-available/gaming /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t
sudo systemctl restart nginx
sudo ufw allow 'Nginx Full'
sudo ufw allow OpenSSH
sudo ufw enable
```

---

## B10. Open in browser

Replace with your VM1 IP:

| App | URL |
|-----|-----|
| Public website | http://192.168.1.10/ |
| Staff portal | http://192.168.1.10/staff/ |
| API health check | http://192.168.1.10/api/health |

---

# PART C — Staff login (after seed)

1. Open **Staff portal**: `http://VM1_IP/staff/`
2. Login with username + password from seed output
3. Open **Google Authenticator** app on phone
4. Add account → Enter setup key → paste **2FA Secret** from seed output
5. Enter the 6-digit code on the 2FA screen

---

# PART D — Useful commands later

## Restart backend after code update

```bash
cd /var/www/gamming
git pull origin main
npm run install:all
cd public-site && npm run build
cd ../staff-portal && npm run build
cd ../backend
pm2 restart gaming-api
```

## View backend logs

```bash
pm2 logs gaming-api
```

## Restart Nginx

```bash
sudo systemctl restart nginx
```

## Check PostgreSQL on VM2

```bash
sudo systemctl status postgresql
sudo -u postgres psql -d gaming_center -c "\dt"
```

---

# Troubleshooting

## Cannot connect to database from VM1

```bash
# On VM1 — test port
nc -zv 192.168.1.20 5432

# On VM2 — check PostgreSQL is listening
sudo ss -tlnp | grep 5432
```

Check:
- VM2 firewall allows VM1 IP on port 5432
- `pg_hba.conf` has correct VM1 IP
- Password in `.env` matches VM2

## API returns 500 errors

```bash
pm2 logs gaming-api --lines 50
```

## Staff portal page is blank

Rebuild staff portal:

```bash
cd /var/www/gamming/staff-portal
npm run build
sudo systemctl restart nginx
```

## 403 / permission denied on git push (Mac)

Use GitHub account **ChhanunHean** credentials, not another account.

---

# Quick checklist

- [ ] VM2: PostgreSQL installed and running
- [ ] VM2: Database `gaming_center` + user `gaming_user` created
- [ ] VM2: VM1 IP allowed in `pg_hba.conf` and firewall
- [ ] VM1: Project cloned to `/var/www/gamming`
- [ ] VM1: `backend/.env` configured with VM2 IP
- [ ] VM1: `npm run seed` completed (save 2FA secrets!)
- [ ] VM1: Frontends built (`npm run build`)
- [ ] VM1: PM2 running `gaming-api`
- [ ] VM1: Nginx configured and running
- [ ] Browser: Public site + Staff portal + API health all work

---

**Project:** Gaming Center Management System  
**Repo:** https://github.com/ChhanunHean/gamming  
**Stack:** React + Express + PostgreSQL + Nginx + PM2
