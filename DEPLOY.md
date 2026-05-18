# Deploying fin_plan to a Hostinger VPS

A pure client-side React/Vite SPA — no backend, no env vars, no secrets, all state in `localStorage`. `npm run build` outputs static files to `dist/`; serve them with nginx.

This guide covers (a) one-time VPS setup, (b) per-deploy workflow, (c) what's realistic for "hiding" the code.

---

## Part A — One-time VPS setup

### A.1 Provision the box
In Hostinger's hPanel, ensure the VPS is running a recent Ubuntu LTS (24.04 is current) with SSH enabled. Note the public IPv4 address.

### A.2 Harden SSH (from local machine)
```bash
# Generate a key if you don't have one
ssh-keygen -t ed25519 -C "fin_plan-deploy"

# Copy public key to the VPS (use root or whatever default user Hostinger gave you)
ssh-copy-id root@<VPS_IP>

# SSH in and create a non-root deploy user
ssh root@<VPS_IP>
adduser deploy
usermod -aG sudo deploy
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
Apply: `sudo systemctl restart ssh`. (Keep the original root session open while you verify the new `deploy` user can SSH in — don't lock yourself out.)

### A.3 Install nginx
```bash
sudo apt update && sudo apt install -y nginx
sudo systemctl enable --now nginx
```

### A.4 Create site directory
```bash
sudo mkdir -p /var/www/fin_plan
sudo chown -R deploy:deploy /var/www/fin_plan
```

### A.5 nginx server block
Create `/etc/nginx/sites-available/fin_plan`:

```nginx
server {
    listen 80;
    listen [::]:80;
    server_name your-domain.com www.your-domain.com;   # or _ for IP-only access

    root /var/www/fin_plan;
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

    # Compression
    gzip on;
    gzip_types text/plain text/css application/javascript application/json image/svg+xml;
    gzip_min_length 1024;

    # Sensible security headers
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-Frame-Options "DENY" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
}
```

Then enable and reload:
```bash
sudo ln -s /etc/nginx/sites-available/fin_plan /etc/nginx/sites-enabled/
sudo rm /etc/nginx/sites-enabled/default
sudo nginx -t && sudo systemctl reload nginx
```

### A.6 DNS + HTTPS
1. In your DNS provider (Hostinger or wherever), add an `A` record for `your-domain.com` → VPS IP. Wait for propagation (`dig your-domain.com`).
2. Install certbot and get a cert:
   ```bash
   sudo apt install -y certbot python3-certbot-nginx
   sudo certbot --nginx -d your-domain.com -d www.your-domain.com
   ```
   Certbot will edit the nginx block to add HTTPS and HTTP→HTTPS redirect, and set up auto-renewal.

### A.7 Firewall
```bash
sudo ufw allow OpenSSH
sudo ufw allow 'Nginx Full'
sudo ufw enable
```

---

## Part B — Per-deploy workflow (from local)

Two-step ritual:

```bash
cd /Users/hsung/Projects/fin_plan
npm run build
rsync -avz --delete dist/ deploy@<VPS_IP>:/var/www/fin_plan/
```

That's it. nginx serves the new files immediately. The long-cache headers on `/assets/*` are safe because Vite hashes every filename, and `index.html`'s `no-cache` header ensures browsers always pick up the new hashes.

**Optional convenience**: an `~/.ssh/config` alias means you can type a short name instead of the IP:

```
Host fin_plan-vps
    HostName <VPS_IP>
    User deploy
    IdentityFile ~/.ssh/id_ed25519
```

After which: `rsync -avz --delete dist/ fin_plan-vps:/var/www/fin_plan/`.

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

**If you ever want real protection**: move the engine to a backend API (server runs the math, browser sends inputs and receives a result). That requires a Node/Python process on the VPS, an endpoint behind nginx as a reverse proxy, network round-trips per simulation, backend secrets, monitoring, etc. For a personal finance planner, the trade-off doesn't pencil out.

---

## Verification

1. **Build smoke test (local)**:
   ```bash
   npm run build
   npx vite preview   # serves dist/ on http://localhost:4173
   ```
   Open the URL, click around (add a profile, run a simulation, toggle history).

2. **Initial deploy**:
   ```bash
   rsync -avz --delete dist/ deploy@<VPS_IP>:/var/www/fin_plan/
   ```
   Visit `http://<VPS_IP>/` (before DNS) — should load the app.

3. **Post-DNS / TLS**:
   - `dig your-domain.com` resolves to the VPS IP.
   - `https://your-domain.com` loads with a valid Let's Encrypt cert.
   - DevTools → Network: assets served with `Cache-Control: public, immutable`, `index.html` with `no-cache`.
   - DevTools → Application → Local Storage: confirm app state persists across reloads.

4. **Re-deploy smoke test**:
   - Make a trivial UI change (e.g., a label), rebuild, rsync, hard-refresh. New bundle hash, new content visible. Old assets in `/assets/` are cleaned up by `rsync --delete`.

5. **Cert renewal**:
   ```bash
   sudo certbot renew --dry-run
   ```
   Should report success without prompting.
