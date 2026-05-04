# PostgreSQL Setup for C404-blog Production

This guide installs PostgreSQL 16 + the `pgvector` extension on a fresh Ubuntu/Debian VPS and provisions the two databases the application needs.

> **Why two databases?** The Go backend's main DB (blog posts, users, comments) is migrated by GORM. The AI service writes a separate knowledge-graph DB with pgvector embeddings. Sharing one instance is fine — separate databases keep migrations from stepping on each other and let you back them up independently.

---

## 1. Install PostgreSQL 16 + pgvector

```bash
# PostgreSQL official APT repo (Debian / Ubuntu)
sudo apt-get install -y curl ca-certificates gnupg lsb-release
sudo install -d /usr/share/postgresql-common/pgdg
sudo curl -fsS https://www.postgresql.org/media/keys/ACCC4CF8.asc \
  -o /usr/share/postgresql-common/pgdg/apt.postgresql.org.asc
echo "deb [signed-by=/usr/share/postgresql-common/pgdg/apt.postgresql.org.asc] \
  https://apt.postgresql.org/pub/repos/apt $(lsb_release -cs)-pgdg main" \
  | sudo tee /etc/apt/sources.list.d/pgdg.list

sudo apt-get update
sudo apt-get install -y postgresql-16 postgresql-16-pgvector
```

Verify:

```bash
sudo -u postgres psql -c 'SELECT version();'
sudo -u postgres psql -c "SELECT * FROM pg_available_extensions WHERE name = 'vector';"
```

## 2. Bind to localhost only (default)

Open `/etc/postgresql/16/main/postgresql.conf` and confirm:

```conf
listen_addresses = 'localhost'
```

Open `/etc/postgresql/16/main/pg_hba.conf` and ensure local + host entries use `scram-sha-256`:

```conf
# TYPE  DATABASE  USER       ADDRESS         METHOD
local   all       all                        scram-sha-256
host    all       all        127.0.0.1/32    scram-sha-256
host    all       all        ::1/128         scram-sha-256
```

Reload:

```bash
sudo systemctl reload postgresql
```

> **Remote access?** Do NOT open 5432 to the internet. Either:
> - SSH-tunnel from the operator's laptop: `ssh -L 5432:127.0.0.1:5432 deploy@host`
> - Use Tailscale / WireGuard and add the VPN subnet to `pg_hba.conf` with `scram-sha-256` (never `trust`).

## 3. Create roles and databases

```bash
sudo -u postgres psql <<'SQL'
-- Roles (use \password to set; or pass PGPASSWORD; never inline plaintext in a script you commit)
CREATE ROLE blog       LOGIN PASSWORD 'CHANGE_ME_main';
CREATE ROLE blog_graph LOGIN PASSWORD 'CHANGE_ME_graph';

-- Main blog DB
CREATE DATABASE blog OWNER blog
  ENCODING 'UTF8' LC_COLLATE 'C.UTF-8' LC_CTYPE 'C.UTF-8' TEMPLATE template0;
GRANT CONNECT ON DATABASE blog TO blog;

-- Knowledge-graph DB (with pgvector)
CREATE DATABASE blog_graph OWNER blog_graph
  ENCODING 'UTF8' LC_COLLATE 'C.UTF-8' LC_CTYPE 'C.UTF-8' TEMPLATE template0;
GRANT CONNECT ON DATABASE blog_graph TO blog_graph;
SQL

# Enable pgvector extension on the graph DB only.
sudo -u postgres psql -d blog_graph -c "CREATE EXTENSION IF NOT EXISTS vector;"
```

> Replace `CHANGE_ME_main` / `CHANGE_ME_graph` with random passwords (e.g. `openssl rand -base64 32`). Save them to a password manager — they go into the `.env` files in the next step.

## 4. Wire the app DSNs

`/var/www/blog/apps/backend/.env`:

```env
DB_TYPE=postgres
DATABASE_URL=postgres://blog:CHANGE_ME_main@127.0.0.1:5432/blog?sslmode=verify-full
POSTGRES_DSN=postgres://blog_graph:CHANGE_ME_graph@127.0.0.1:5432/blog_graph?sslmode=verify-full
```

`/var/www/blog/apps/ai-service/.env`:

```env
GRAPH_DATABASE_URL=postgresql://blog_graph:CHANGE_ME_graph@127.0.0.1:5432/blog_graph?sslmode=verify-full
```

## 5. TLS for in-host connections (optional but recommended)

Even on `127.0.0.1`, TLS prevents accidental exposure if firewalls misconfigure later.

```bash
sudo -u postgres mkdir -p /var/lib/postgresql/16/certs
cd /var/lib/postgresql/16/certs

# Self-signed; for a real domain use Let's Encrypt + symlink.
sudo -u postgres openssl req -new -x509 -days 365 -nodes -text \
  -out server.crt -keyout server.key \
  -subj "/CN=$(hostname -f)"
sudo -u postgres chmod 600 server.key
```

In `postgresql.conf`:

```conf
ssl = on
ssl_cert_file = '/var/lib/postgresql/16/certs/server.crt'
ssl_key_file  = '/var/lib/postgresql/16/certs/server.key'
```

`sudo systemctl restart postgresql`. Then either:

- Use `sslmode=require` in the DSN (encrypts but does not verify the cert).
- Use `sslmode=verify-full` and copy `server.crt` to a path the app trusts (e.g. `/etc/ssl/certs/pg-server.crt`), then add `sslrootcert=/etc/ssl/certs/pg-server.crt` to the DSN.

## 6. First migration (smoke test)

```bash
cd /var/www/blog/apps/backend
sudo -u www-data ./bin/server &  # start the backend; GORM AutoMigrate runs on first connect
# Watch logs, then check tables exist:
sudo -u postgres psql -d blog       -c '\dt'
sudo -u postgres psql -d blog_graph -c '\dt'
```

Both should show migrated tables. Stop the backend and continue with `systemctl start blog-backend`.

## 7. Backup / restore

See `deploy/scripts/backup_db.sh` and `restore_db.sh`. Cron it daily:

```cron
30 3 * * * /var/www/blog/deploy/scripts/backup_db.sh >> /var/log/blog-backup.log 2>&1
```

## 8. Hardening checklist

- [ ] `listen_addresses = 'localhost'` in `postgresql.conf`
- [ ] No `trust` rows in `pg_hba.conf`; only `scram-sha-256`
- [ ] Both DB passwords are random (>=24 chars), saved in a password manager
- [ ] Backup cron present and tested with a restore-to-staging
- [ ] OS firewall (`ufw` or `iptables`) blocks `5432` from external interfaces
- [ ] Logging: `log_min_duration_statement = 500` (slow queries) and `log_connections = on`
