# Deploying fin_plan to a Hostinger VPS (Traefik + Docker)

A pure client-side React/Vite SPA — no backend, no env vars, no secrets, all state in `localStorage`. `npm run build` outputs static files to `dist/`.

This VPS was provisioned from Hostinger's **Traefik** application template, so it already has Docker running and Traefik handling :80/:443 + automatic Let's Encrypt. We deploy by running a tiny `nginx:alpine` container alongside Traefik, with the built `dist/` directory bind-mounted in. Per-deploy work is just `npm run build` + `rsync`.

This guide covers (a) one-time VPS setup, (b) per-deploy workflow, (c) what's realistic for "hiding" the code.

---

## Part A — One-time VPS setup

### A.1 Confirm the environment
```bash
sudo docker ps                              # should show traefik-traefik-1
sudo docker network ls                      # bridge / host / none
sudo docker inspect traefik-traefik-1 \
  --format '{{json .Config.Cmd}}'           # entrypoints + cert resolver
```
Expected: Traefik on the default `bridge` network, entrypoints `web` (:80) and `websecure` (:443), cert resolver named `letsencrypt`.

### A.2 Harden SSH and create a deploy user (from local machine)
```bash
# Generate a key if you don't have one
ssh-keygen -t ed25519 -C "fin_plan-deploy"

# Copy public key to the VPS
ssh-copy-id root@<VPS_IP>

# SSH in and create a non-root deploy user that can run docker
ssh root@<VPS_IP>
adduser deploy
usermod -aG sudo,docker deploy
mkdir -p /home/deploy/.ssh
cp ~/.ssh/authorized_keys /home/deploy/.ssh/
chown -R deploy:deploy /home/deploy/.ssh
chmod 700 /home/deploy/.ssh && chmod 600 /home/deploy/.ssh/authorized_keys
```

Then edit `/etc/ssh/sshd_config` and set:
```
PasswordAuthentication no
PermitRootLogin no
```
Apply: `sudo systemctl restart ssh`. **Keep the original root session open while you verify the new `deploy` user can SSH in** — don't lock yourself out.

### A.3 DNS first (before starting the container)
Traefik will request a Let's Encrypt cert on first start, which only works if your domain already resolves to the VPS. Add an `A` record:

| Type | Name | Value      |
|------|------|------------|
| A    | @    | <VPS_IP>   |
| A    | www  | <VPS_IP>   |

(Or use Hostinger's default hostname `srv1479830.hstgr.cloud` if you don't have your own domain yet — it should already resolve.)

Wait for propagation: `dig your-domain.com +short` should return the VPS IP.

### A.4 Project directory on the VPS
As the `deploy` user:
```bash
mkdir -p /opt/fin_plan/dist
cd /opt/fin_plan
```

### A.5 `docker-compose.yml`
Create `/opt/fin_plan/docker-compose.yml`:

```yaml
services:
  fin_plan:
    image: nginx:alpine
    container_name: fin_plan
    restart: unless-stopped
    network_mode: bridge          # same network as Traefik
    volumes:
      - ./dist:/usr/share/nginx/html:ro
      - ./nginx.conf:/etc/nginx/conf.d/default.conf:ro
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.fin_plan.rule=Host(`your-domain.com`)"
      - "traefik.http.routers.fin_plan.entrypoints=websecure"
      - "traefik.http.routers.fin_plan.tls=true"
      - "traefik.http.routers.fin_plan.tls.certresolver=letsencrypt"
      - "traefik.http.services.fin_plan.loadbalancer.server.port=80"
```

If you want both apex and `www`, change the rule to:
```
Host(`your-domain.com`) || Host(`www.your-domain.com`)
```

Traefik's existing config auto-redirects HTTP→HTTPS, so you don't need a separate router for :80.

### A.6 `nginx.conf`
Create `/opt/fin_plan/nginx.conf`:

```nginx
server {
    listen 80;
    server_name _;
    root /usr/share/nginx/html;
    index index.html;

    # Vite hashes asset filenames → cache them forever
    location /assets/ {
        expires 1y;
        add_header Cache-Control "public, immutable";
        try_files $uri =404;
    }

    # index.html and other unhashed files → never cache
    location / {
        add_header Cache-Control "no-cache, must-revalidate";
        try_files $uri $uri/ /index.html;
    }

    gzip on;
    gzip_types text/plain text/css application/javascript application/json image/svg+xml;
    gzip_min_length 1024;
}
```

### A.7 Initial build + first start
From local:
```bash
cd /Users/hsung/Projects/fin_plan
npm run build
rsync -avz --delete dist/ deploy@<VPS_IP>:/opt/fin_plan/dist/
```

On the VPS:
```bash
cd /opt/fin_plan
docker compose up -d
docker compose logs -f fin_plan        # confirm it boots
docker logs traefik-traefik-1 --tail 50 # watch for cert issuance
```

Traefik should detect the new container via Docker labels within a few seconds and request a Let's Encrypt cert. First request can take 30–60 seconds.

### A.8 Firewall (if not already configured)
```bash
sudo ufw allow OpenSSH
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable
```

---

## Part B — Per-deploy workflow (from local)

```bash
cd /Users/hsung/Projects/fin_plan
npm run build
rsync -avz --delete dist/ deploy@<VPS_IP>:/opt/fin_plan/dist/
```

That's it. The `dist/` is bind-mounted read-only into nginx, so the new files are served immediately — no container restart needed. The long-cache `/assets/*` headers are safe because Vite hashes every filename, and `index.html`'s `no-cache` header ensures browsers always pick up the new hashes.

**Optional convenience** — add an `~/.ssh/config` alias so you can type a short name instead of the IP:
```
Host fin_plan-vps
    HostName <VPS_IP>
    User deploy
    IdentityFile ~/.ssh/id_ed25519
```
Then: `rsync -avz --delete dist/ fin_plan-vps:/opt/fin_plan/dist/`.

---

## Part C — About hiding the code

Client-side JavaScript is fundamentally inspectable. Anyone who opens DevTools can see your bundle. The choices are about *cost of reading*, not *prevention*.

What you already have with default Vite:
- Minification (short variable names, dead code elimination)
- No source maps in production (Vite default — already off)
- Tree-shaking removes unused code

This is industry-standard for SPAs. Reading minified Vite output is annoying but not hard for someone who cares.

**Why heavier obfuscation isn't worth it for this app**:
- The "secret sauce" is `src/engine/*` — tax brackets (public IRS data), withdrawal math (published finance literature). There's nothing proprietary an obfuscator can hide that a competent reader couldn't reproduce from a textbook.
- Obfuscation costs: 2–3× bundle size, measurable runtime slowdown, harder for *you* to debug production issues, and occasionally introduces bugs of its own.

**If you ever want real protection**: move the engine to a backend API (server runs the math, browser sends inputs and receives a result). Easy to add later given the Traefik setup — you'd just run a second container with a label `traefik.http.routers.api.rule=Host(`api.your-domain.com`)` and proxy traffic to it. For a personal finance planner, the trade-off doesn't pencil out.

---

## Part D — Analytics (self-hosted Umami)

[Umami](https://umami.is/) is open source, cookie-less, and runs as two containers (Umami + Postgres) on the same VPS, fronted by Traefik on a `stats.<your-domain>` subdomain. No tracking script ever leaves your VPS, no third party sees visitors, no consent banner needed.

### D.1 DNS — add a subdomain
Add another `A` record pointing at the VPS:

| Type | Name  | Value      |
|------|-------|------------|
| A    | stats | <VPS_IP>   |

Wait for `dig stats.your-domain.com +short` to return the VPS IP before continuing (Traefik needs DNS to resolve to request the cert).

### D.2 Project directory
```bash
mkdir -p /opt/umami
cd /opt/umami
```

### D.3 `docker-compose.yml`
Create `/opt/umami/docker-compose.yml`. **Before starting**, generate two strong secrets and substitute them below (`openssl rand -hex 32` is fine for both):

```yaml
services:
  umami:
    image: ghcr.io/umami-software/umami:postgresql-latest
    container_name: umami
    restart: unless-stopped
    network_mode: bridge
    environment:
      DATABASE_URL: postgresql://umami:REPLACE_DB_PASSWORD@umami-db:5432/umami
      DATABASE_TYPE: postgresql
      APP_SECRET: REPLACE_APP_SECRET
    depends_on:
      - umami-db
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.umami.rule=Host(`stats.your-domain.com`)"
      - "traefik.http.routers.umami.entrypoints=websecure"
      - "traefik.http.routers.umami.tls=true"
      - "traefik.http.routers.umami.tls.certresolver=letsencrypt"
      - "traefik.http.services.umami.loadbalancer.server.port=3000"

  umami-db:
    image: postgres:16-alpine
    container_name: umami-db
    restart: unless-stopped
    network_mode: bridge
    environment:
      POSTGRES_DB: umami
      POSTGRES_USER: umami
      POSTGRES_PASSWORD: REPLACE_DB_PASSWORD
    volumes:
      - ./pgdata:/var/lib/postgresql/data
```

Both services use `network_mode: bridge` so Traefik (also on `bridge`) can reach `umami:3000` via Docker DNS, matching the existing `fin_plan` pattern.

### D.4 First start
```bash
cd /opt/umami
docker compose up -d
docker compose logs -f umami      # wait for "Listening on port 3000"
```

### D.5 Initial admin login
1. Open `https://stats.your-domain.com`.
2. Log in with `admin` / `umami`.
3. **Immediately change the password** under "Profile → Change password" — this account is internet-reachable.
4. Settings → Websites → **Add website** → name "fin_plan", domain "your-domain.com" → Save.
5. Click the website's **"Edit"** → copy the **Website ID** (a UUID).

### D.6 Wire the tracking script
Edit `index.html` in the repo and replace the placeholders inside the Umami `<script>` tag near the top:

- `STATS_DOMAIN` → `stats.your-domain.com`
- `WEBSITE_ID` → the UUID from D.5

Then rebuild and redeploy (Part B).

### D.7 Verify
- Load `https://your-domain.com` → in Umami's **Realtime** view, you should appear within ~30 seconds.
- DevTools → Network: `https://stats.your-domain.com/api/send` returns 200 on page load and on each tracked action (preset loaded, plan created, theme toggled, drawer opened, export, import, auto-balance, history opened).
- DevTools → Application → Cookies: empty for both `your-domain.com` and `stats.your-domain.com` — Umami is cookie-less by design.

### D.8 Custom events at a glance
The app sends these events (see `src/utils/analytics.ts` for the wrapper and `src/App.tsx` for the call sites):

| Event              | Where it fires                              |
|--------------------|---------------------------------------------|
| `preset_loaded`    | Welcome screen → preset chosen (Coast/Mid/Approaching) |
| `plan_built`       | Welcome screen → "Build" button             |
| `skip_to_advanced` | Welcome → "Skip to advanced"                |
| `plan_created`     | New scenario tab                            |
| `profile_created`  | New profile                                 |
| `auto_balance_run` | Auto-balance button                         |
| `drawer_opened`    | Any of the editor drawers (with `{ kind }`) |
| `history_opened`   | Switching to the History page               |
| `export_downloaded`| Export modal → Download                     |
| `import_applied`   | Import modal → Apply                        |
| `theme_toggled`    | Theme switch (with `{ theme }`)             |

All `track()` calls no-op if `window.umami` isn't loaded (script blocked, dev server, network failure), so analytics can never break the app.

---

## Verification

1. **Build smoke test (local)**:
   ```bash
   npm run build
   npx vite preview        # serves dist/ on http://localhost:4173
   ```
   Click around (add a profile, run a simulation, toggle history).

2. **First deploy + cert**:
   - `docker compose up -d` on the VPS should produce no errors.
   - `docker logs traefik-traefik-1 | grep -i acme` should show successful certificate issuance.
   - `https://your-domain.com` loads with a valid cert (no browser warning).
   - `http://your-domain.com` redirects to HTTPS (Traefik's built-in redirect).

3. **Headers + caching**:
   - DevTools → Network: assets in `/assets/` show `Cache-Control: public, immutable`.
   - `index.html` shows `Cache-Control: no-cache, must-revalidate`.
   - Response includes `Content-Encoding: gzip` for text resources.

4. **State persistence**:
   - DevTools → Application → Local Storage: confirm app state survives a hard refresh.

5. **Re-deploy smoke test**:
   - Make a trivial UI change (e.g., a label), rebuild, rsync, hard-refresh. New bundle hash, new content visible. Old asset files in `/opt/fin_plan/dist/assets/` cleaned up by `rsync --delete`.

6. **Container health**:
   ```bash
   docker compose ps                # fin_plan should be "running"
   docker compose logs --tail 50 fin_plan
   ```

---

## Troubleshooting

**Cert doesn't issue / 404 from Traefik**:
- `dig your-domain.com +short` returns the VPS IP? If not, DNS hasn't propagated.
- `docker logs traefik-traefik-1 --tail 100` — look for ACME errors. The most common cause is the domain not resolving yet.
- The label `Host()` value must match exactly what's in the browser URL bar (including/excluding `www`).

**`docker compose` not found**:
- Older Docker installs use `docker-compose` (with hyphen). Both work; if neither is installed, `sudo apt install docker-compose-plugin`.

**Permission denied on rsync target**:
- The `/opt/fin_plan` directory must be owned by `deploy` (`sudo chown -R deploy:deploy /opt/fin_plan`).

**Need to restart the container**:
- You almost never need to. `rsync` updates the bind-mounted files in place and nginx picks them up. Only restart if you edit `nginx.conf` or `docker-compose.yml`: `docker compose up -d` (re-creates only what changed).
