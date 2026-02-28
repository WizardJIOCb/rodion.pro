# Activity Monitoring Setup for rodion.pro

## Overview
Complete activity monitoring system with privacy controls, real-time updates, and public/private views.

## Components Implemented

### 1. Activity Agent (Windows)
- Located in `activity-agent/` directory
- Collects active window, AFK status, and input counts
- Sends data to server every 10 seconds (configurable)
- Implements privacy controls (blacklists, category-only mode)
- Written in TypeScript with Windows PowerShell integration

### 2. Database Schema
- **activity_devices**: Registered devices with hashed API keys
- **activity_minute_agg**: Aggregated activity data by minute
- **activity_now**: Current state per device

### 3. API Endpoints
- `POST /api/activity/v1/ingest`: Receive activity data from agents
- `GET /api/activity/v1/now`: Current activity state (private)
- `GET /api/activity/v1/stats`: Historical statistics (private)
- `GET /api/activity/v1/stream`: SSE stream for live updates (private)
- `GET /api/activity/v1/public`: Safe public view (no app names)

### 4. Frontend Pages
- `/activity`: Private dashboard with live updates
- `/activity/public`: Public view with aggregated data only

### 5. Security & Privacy
- Device authentication with API keys
- Admin token authentication for private endpoints
- Blacklisting of sensitive applications/titles
- Category-based reporting (no app names in public view)

## Setup Instructions

### 1. Database Setup
Run the migrations to create activity tables:
```bash
# The migrations are already in drizzle/0002_activity_monitoring.sql
```

### 2. Register Device
Use the registration script to add your device:
```bash
node register-device.js
```

### 3. Configure Activity Agent
Update `activity-agent/config.json`:
```json
{
  "serverBaseUrl": "https://rodion.pro",
  "deviceId": "pc-main",
  "deviceKey": "your-secret-key",
  "pollIntervalSec": 10,
  "privacy": {
    "blacklistApps": ["keepass.exe", "1password.exe"],
    "blacklistTitlePatterns": []
  },
  "categories": [
    { "match": "code\\.exe|Code\\.exe", "category": "coding" },
    { "match": "chrome\\.exe", "category": "browser" }
  ]
}
```

### 4. Server Configuration
Add to nginx config:
```
location /api/activity/ {
    proxy_pass http://127.0.0.1:4010/;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_read_timeout 3600;
    proxy_buffering off;
}
```

### 5. Run the Agent
```bash
cd activity-agent
npm install
npm start
```

## Features

### Privacy Controls
- Application blacklisting (password managers, etc.)
- Category-only reporting mode
- No window titles in public view
- Configurable privacy rules

### Real-time Updates
- Server-Sent Events (SSE) for live dashboard updates
- Automatic refresh for public view
- WebSocket-like functionality over HTTP

### Data Aggregation
- Minute-level aggregation to prevent DB bloat
- Daily summaries for current state
- Retention policies (configurable)

### Dashboard Views
- **Private**: Detailed app names, window titles, full statistics
- **Public**: Categories only, aggregated data, no privacy-sensitive information

## Security

### Authentication
- Device authentication via API keys (hashed on server)
- Admin authentication via tokens for private endpoints
- Session-based auth for logged-in admins

### Rate Limiting
- Built-in rate limiting per device
- Configurable limits to prevent spam

### Data Protection
- No sensitive content collected (no keystrokes, no passwords)
- Client-side privacy filtering
- Encrypted transport (HTTPS)

## Technical Details

### Data Flow
1. Agent collects activity data via Windows APIs
2. Data is filtered based on privacy rules
3. Data is sent to server via secure endpoint
4. Server validates device and stores in DB
5. SSE updates are broadcast to connected dashboards
6. Frontend displays live and historical data

### Storage Strategy
- Raw events aggregated to minute-level to save space
- Current state maintained separately for fast access
- Historical data available by date range
- Configurable retention periods

## API Contract

### Ingest Endpoint
```
POST /api/activity/v1/ingest
Headers:
- X-Device-Id: device-identifier
- X-Device-Key: secret-api-key

Body:
{
  "sentAt": "2026-02-28T12:34:56.000Z",
  "intervalSec": 10,
  "now": {
    "app": "code.exe",
    "category": "coding",
    "isAfk": false
  },
  "counts": {
    "keys": 42,
    "clicks": 3,
    "scroll": 5
  }
}
```

### Response
```
200 { "ok": true }
401 { "error": "Invalid device credentials" }
503 { "error": "DB not configured" }
```

## Monitoring & Maintenance

### Health Checks
- `/health` endpoint for service monitoring
- Database connectivity checks
- Performance metrics

### Logging
- Structured logs for debugging
- Performance monitoring
- Error tracking

## Troubleshooting

### Agent Issues
- Check PowerShell execution policy: `Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser`
- Verify network connectivity to server
- Confirm device registration in database

### Server Issues
- Check database connection
- Verify API endpoint accessibility
- Review authentication credentials

### Frontend Issues
- Ensure SSE connection is established
- Check CORS configuration
- Verify authentication tokens