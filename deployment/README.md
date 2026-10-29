# Intervista Platform — Docker Deployment

Self-contained Docker deployment package for running the Intervista interview platform on DigitalOcean Droplets behind a Load Balancer with an Autoscale Pool.

## Architecture

```
Internet → Cloudflare → DO Load Balancer
                              │
                         Nginx :80
                              │
                    Docker Compose Network
                              │
        ┌─────────────────────┼──────────────────────┐
        │                     │                      │
   .NET APIs            Node.js APIs          Python APIs
  (User, Company,      (Mail, Data,         (Coding, Interview,
   Transaction)         Screening)           Communication,
        │                     │              Aptitude, Proctors)
        └─────────────────────┼──────────────────────┘
                              │
                     External Services
                     (Supabase, Groq, Azure, Judge0)
```

Each Droplet runs the **complete application stack** identically.  
Only Nginx port 80 is exposed to the host. All backend services communicate via Docker's internal network.

## Directory Structure

```
deployment/
├── docker-compose.yml          # Main deployment compose file
├── .env.example                # Environment variable template (DO NOT commit .env)
├── .gitignore                  # Excludes .env from source control
├── nginx/
│   └── nginx.conf              # Deployment Nginx configuration
├── dockerfiles/
│   ├── Dockerfile.frontend     # Frontend build (nginx.conf bind-mounted at runtime)
│   └── Dockerfile.mail         # Mail server (includes src/ directory)
├── scripts/
│   ├── start.sh                # Automated build + start script
│   └── health-check.sh         # Health check script
└── README.md                   # This file
```

## Quick Start

### 1. Create Environment File

```bash
cp deployment/.env.example deployment/.env
```

Edit `deployment/.env` and fill in all required values. See the template for documentation of each variable.

### 2. Build Images

```bash
docker compose -f deployment/docker-compose.yml build
```

### 3. Start the Stack

```bash
docker compose -f deployment/docker-compose.yml --env-file deployment/.env up -d
```

Or use the automated start script:

```bash
chmod +x deployment/scripts/start.sh
./deployment/scripts/start.sh
```

### 4. Verify

```bash
# Check all containers are running
docker compose -f deployment/docker-compose.yml ps

# Check Nginx health endpoint
curl http://localhost/health

# Run health checks on known endpoints
chmod +x deployment/scripts/health-check.sh
./deployment/scripts/health-check.sh
```

## Common Operations

### View Logs

```bash
# All services (follow mode)
docker compose -f deployment/docker-compose.yml logs -f

# Specific service
docker compose -f deployment/docker-compose.yml logs -f interview-service

# Last 100 lines
docker compose -f deployment/docker-compose.yml logs --tail=100
```

### Restart a Service

```bash
docker compose -f deployment/docker-compose.yml restart coding-service
```

### Rebuild a Single Service

```bash
docker compose -f deployment/docker-compose.yml build coding-service
docker compose -f deployment/docker-compose.yml up -d coding-service
```

### Stop the Stack

```bash
docker compose -f deployment/docker-compose.yml down
```

### Rebuild Everything from Scratch

```bash
docker compose -f deployment/docker-compose.yml down
docker compose -f deployment/docker-compose.yml build --no-cache
docker compose -f deployment/docker-compose.yml --env-file deployment/.env up -d
```

## Services

| Service | Image | Internal Port | Technology | Build Source |
|---------|-------|:---:|------------|-------------|
| `frontend` | `intervista/frontend` | 80 | Nginx + React/Vite | Local build |
| `mail-server` | `intervista/mail-server` | 5000 | Node.js/Express | Local build |
| `supabase-user-api` | `intervista/user-api` | 8080 | .NET 8 / ASP.NET Core | Local build |
| `supabase-company-api` | `intervista/company-api` | 8080 | .NET 8 / ASP.NET Core | Local build |
| `supabase-transaction-api` | `intervista/transaction-api` | 8080 | .NET 8 / ASP.NET Core | Local build |
| `data-service` | `intervista/data-service` | 5003 | Node.js/Express | Local build |
| `coding-service` | `intervista/coding-service` | 8000 | Python/FastAPI + Gunicorn | Local build |
| `interview-service` | `intervista/interview-service` | 8001 | Python/FastAPI + Uvicorn | Local build |
| `communication-service` | `intervista/communication-service` | 8002 | Python/FastAPI + Uvicorn | Local build |
| `aptitude-service` | `intervista/aptitude-service` | 5000 | Python/Flask | Local build |
| `screening-service` | `shailesh06/screening-service` | 5001 | Node.js | **Pre-built image** |
| `face-proctor-service` | `shailesh06/face-proctor-service` | 8004 | Python | **Pre-built image** |
| `live-proctor-service` | `shailesh06/live-proctor-service` | 8005 | Python | **Pre-built image** |

### Pre-built Images

Three services use pre-built Docker Hub images (`shailesh06/*`) because their source code is not available in this repository:

- `shailesh06/screening-service:latest` — Node.js screening module
- `shailesh06/face-proctor-service:latest` — Python face verification proctoring
- `shailesh06/live-proctor-service:latest` — Python live gaze tracking proctoring

These are pulled automatically on `docker compose up`.

### Host Port Exposure

| Port | Service | Publicly Exposed? |
|:----:|---------|:-:|
| 80 | Nginx (frontend) | **Yes** — this is the only host-exposed port |
| 5000 | mail-server | No — internal only |
| 5001 | screening-service | No — internal only |
| 5003 | data-service | No — internal only |
| 8000 | coding-service | No — internal only |
| 8001 | interview-service | No — internal only |
| 8002 | communication-service | No — internal only |
| 8004 | face-proctor-service | No — internal only |
| 8005 | live-proctor-service | No — internal only |
| 8080 | .NET APIs (x3) | No — internal only |

## Environment Variables

| Variable | Required By | Required? |
|----------|-------------|:-:|
| `FRONTEND_URL` | All services (CORS, email links) | Yes |
| `DB_CONNECTION_STRING_DOTNET` | .NET APIs (User, Company, Transaction) | Yes |
| `DATABASE_URL` | data-service | Yes |
| `CODING_DATABASE_URL` | coding-service | Yes |
| `INTERVIEW_DATABASE_URL` | interview-service | Yes |
| `COMMUNICATION_DATABASE_URL` | communication-service | Yes |
| `SUPABASE_URL` | mail-server, user-api, coding, communication, aptitude | Yes |
| `SUPABASE_SERVICE_ROLE_KEY` | mail-server, user-api, coding, communication | Yes |
| `SUPABASE_ANON_KEY` | aptitude-service | Yes |
| `JWT_SECRET_KEY` | .NET APIs, coding-service | Yes |
| `GROQ_API_KEY` | interview-service, communication-service | Yes |
| `AZURE_SPEECH_KEY` | interview-service, communication-service | Yes |
| `AZURE_SPEECH_REGION` | interview-service, communication-service | No (default: `centralindia`) |
| `JUDGE0_URL` | coding-service | Yes |
| `JUDGE0_API_KEY` | coding-service | No |
| `BREVO_API_KEY` | mail-server | Yes |
| `BREVO_SENDER_EMAIL` | mail-server | Yes |
| `BREVO_SENDER_NAME` | mail-server | No (default: `Intervista`) |
| `EMAIL_USER` | mail-server (legacy fallback) | No |
| `EMAIL_PASS` | mail-server (legacy fallback) | No |
| `ADMIN_SECRET_KEY` | coding-service | No (default: `admin123`) |
| `RAZORPAY_KEY_ID` | transaction-api | No (optional) |
| `RAZORPAY_KEY_SECRET` | transaction-api | No (optional) |
| `RAZORPAY_WEBHOOK_SECRET` | transaction-api | No (optional) |

## Nginx Routes

| Route | Backend Service | Port | Method |
|-------|----------------|:----:|--------|
| `/health` | Nginx direct | — | Static JSON `{"status":"healthy"}` |
| `/` | Static files | — | Frontend SPA (React) |
| `/api/user/*` | `supabase-user-api` | 8080 | Pass-through |
| `/api/company/*` | `supabase-company-api` | 8080 | Pass-through |
| `/api/transaction/*` | `supabase-transaction-api` | 8080 | Pass-through |
| `/api/send-verification` | `mail-server` | 5000 | Pass-through |
| `/api/check-verification` | `mail-server` | 5000 | Pass-through |
| `/api/verify` | `mail-server` | 5000 | Pass-through |
| `/api/auth/*` | `mail-server` | 5000 | Pass-through |
| `/api/contact` | `mail-server` | 5000 | Pass-through |
| `/api/reset-password` | `mail-server` | 5000 | Pass-through |
| `/api/verification/*` | `data-service` | 5003 | Strip prefix |
| `/api/coding/*` | `coding-service` | 8000 | Strip prefix |
| `/api/interview/*` | `interview-service` | 8001 | Strip prefix |
| `/api/communication/*` | `communication-service` | 8002 | Strip prefix |
| `/api/aptitude/*` | `aptitude-service` | 5000 | Strip prefix |
| `/api/screening/*` | `screening-service` | 5001 | Strip prefix |
| `/api/proctor/face/*` | `face-proctor-service` | 8004 | Strip prefix |
| `/api/proctor/live/*` | `live-proctor-service` | 8005 | Strip prefix |

## Troubleshooting

### Container won't start

```bash
# Check container logs
docker compose -f deployment/docker-compose.yml logs <service-name>

# Check if image exists
docker images | grep intervista

# Rebuild the image
docker compose -f deployment/docker-compose.yml build <service-name>
```

### Nginx returns 502 Bad Gateway

The upstream service is unreachable. Check:

1. Is the backend container running? → `docker compose -f deployment/docker-compose.yml ps`
2. Is it listening on the correct port? → `docker compose -f deployment/docker-compose.yml logs <service>`
3. Is it on the same Docker network? → `docker network inspect deployment_platform-network`

### Database connection fails

1. Verify `.env` contains the correct connection string
2. Verify the Droplet can reach the Supabase database host (check firewall/security group)
3. Check service logs: `docker compose -f deployment/docker-compose.yml logs data-service`

### Service keeps restarting

```bash
# Check logs for crash reason
docker compose -f deployment/docker-compose.yml logs --tail=50 <service-name>

# Check if it's a health check failure
docker inspect <container-id> --format='{{json .State.Health}}'
```

### View all container statuses

```bash
docker compose -f deployment/docker-compose.yml ps -a
```

## Autoscale Pool Notes

- Each Droplet runs the **complete** application stack
- All Droplets connect to the **same external** Supabase database
- The `interview-service` uses **in-memory session state** — the DO Load Balancer must use **sticky sessions**
- No local persistent state is required on any Droplet
- A new Droplet can start from scratch with just the deployment files + `.env`
- No container depends on another Droplet
- The deployment is identical across all Droplets (no host-specific configuration)
