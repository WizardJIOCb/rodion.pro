# rodion.pro

Personal website with soft cyberpunk aesthetics, blog, projects, changelog, and community features.

## Features

- **i18n**: Russian and English with route prefixes (`/ru/*`, `/en/*`)
- **5 Color Themes**: Soft Neon Teal, Violet Rain, Amber Terminal, Ice Cyan, Mono Green
- **Blog**: MDX-based with tags and reactions
- **Projects**: Showcase with stack and status
- **Changelog**: Auto-populated from GitHub webhooks
- **Community**: Comments and reactions with Google OAuth
- **Command Palette**: Quick navigation (Ctrl+K)
- **Admin**: Moderation panel for comments

## Tech Stack

- Astro 5 (SSR with Node adapter)
- React 19 (islands)
- TypeScript
- Tailwind CSS
- PostgreSQL + Drizzle ORM
- Google OAuth 2.0

## Local Development

### Prerequisites

- Node.js 20+
- PostgreSQL 15+
- Google OAuth credentials

### Setup

1. Clone the repository:
```bash
git clone https://github.com/WizardJIOCb/rodion.pro.git
cd rodion.pro
```

2. Install dependencies:
```bash
npm install
```

3. Create `.env` file:
```bash
cp .env.example .env
# Edit .env with your values
```

4. Set up the database:
```bash
# Create database
createdb rodion_pro

# Run migrations
psql -d rodion_pro -f drizzle/0001_initial.sql

# Or use Drizzle Kit
npm run db:push
```

5. Start development server:
```bash
npm run dev
```

Site will be available at http://localhost:4321

## Production Deployment

### Server Requirements

- Ubuntu 22.04+ or similar
- Node.js 20+
- PostgreSQL 15+
- nginx
- pm2

### Deployment Steps

1. **Clone to server:**
```bash
cd /var/www
git clone https://github.com/WizardJIOCb/rodion.pro.git rodion.pro
cd rodion.pro
```

2. **Install dependencies:**
```bash
npm ci --production=false
```

3. **Create production `.env`:**
```bash
nano .env
# Add all required environment variables
```

4. **Run database migrations:**
```bash
psql -d rodion_pro -f drizzle/0001_initial.sql
```

5. **Build the application:**
```bash
npm run build
```

6. **Start with pm2:**
```bash
pm2 start npm --name rodion-pro -- run start
pm2 save
pm2 startup
```

7. **Configure nginx:**
```nginx
server {
    listen 80;
    listen [::]:80;
    server_name rodion.pro www.rodion.pro;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name rodion.pro www.rodion.pro;

    ssl_certificate /etc/letsencrypt/live/rodion.pro/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/rodion.pro/privkey.pem;

    location / {
        proxy_pass http://127.0.0.1:3100;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

8. **Test and reload nginx:**
```bash
sudo nginx -t
sudo systemctl reload nginx
```

## GitHub Webhook Setup

1. Go to your GitHub repository Settings → Webhooks → Add webhook

2. Configure webhook:
   - **Payload URL**: `https://rodion.pro/api/webhooks/github`
   - **Content type**: `application/json`
   - **Secret**: Same as `GITHUB_WEBHOOK_SECRET` in `.env`
   - **Events**: Select "Pushes" and "Releases"

3. Test webhook by pushing a commit with conventional prefix:
```bash
git commit -m "feat: add new feature"
git push
```

## Deploy Event API

Send deploy events to the changelog:

```bash
curl -X POST https://rodion.pro/api/events/deploy \
  -H "Authorization: Bearer YOUR_DEPLOY_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "project": "rodion.pro",
    "version": "1.0.0",
    "environment": "production",
    "message": "Deployed v1.0.0 to production"
  }'
```

## Google OAuth Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing
3. Enable Google+ API
4. Go to Credentials → Create Credentials → OAuth 2.0 Client ID
5. Configure:
   - **Application type**: Web application
   - **Authorized redirect URIs**: `https://rodion.pro/api/auth/google/callback`
6. Copy Client ID and Client Secret to `.env`

## Project Structure

```
src/
├── components/       # Astro and React components
├── content/          # MDX content (blog posts)
├── data/             # Static data (projects)
├── db/               # Database schema and connection
├── i18n/             # Translations
├── layouts/          # Page layouts
├── lib/              # Utilities (auth, etc.)
├── pages/            # Routes and API endpoints
│   ├── api/          # API routes
│   ├── ru/           # Russian pages
│   ├── en/           # English pages
│   └── admin/        # Admin pages
└── styles/           # Global CSS
```

## Commands

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Build for production |
| `npm run start` | Start production server |
| `npm run db:push` | Push schema to database |
| `npm run db:studio` | Open Drizzle Studio |

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `SITE_URL` | Yes | Production URL |
| `DATABASE_URL` | Yes | PostgreSQL connection string |
| `GITHUB_WEBHOOK_SECRET` | Yes | Secret for GitHub webhook verification |
| `DEPLOY_TOKEN` | Yes | Token for deploy event API |
| `GOOGLE_CLIENT_ID` | Yes | Google OAuth client ID |
| `GOOGLE_CLIENT_SECRET` | Yes | Google OAuth client secret |
| `ADMIN_EMAILS` | Yes | Comma-separated admin emails |
| `TURNSTILE_SITEKEY` | No | Cloudflare Turnstile site key |
| `TURNSTILE_SECRET` | No | Cloudflare Turnstile secret |

## License

MIT
