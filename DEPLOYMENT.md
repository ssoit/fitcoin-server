# FitCoin API - Deployment Guide

## Prerequisites

- Node.js 18+ and npm
- PostgreSQL database
- Kakao Developers account with OAuth app configured

---

## Local Development Setup

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Environment Variables

Copy `.env.example` to `.env` and configure:

```bash
cp .env.example .env
```

Edit `.env` with your values:

```env
# Database - Use your local PostgreSQL connection
DATABASE_URL="postgresql://username:password@localhost:5432/fitcoin?schema=public"

# Application
NODE_ENV=development
PORT=3000
API_PREFIX=api

# JWT - Generate strong secrets for production
JWT_ACCESS_SECRET=your-super-secret-jwt-access-key
JWT_REFRESH_SECRET=your-super-secret-jwt-refresh-key
JWT_ACCESS_EXPIRATION=15m
JWT_REFRESH_EXPIRATION=7d

# Kakao OAuth - Get from Kakao Developers Console
KAKAO_CLIENT_ID=your-kakao-rest-api-key
KAKAO_CLIENT_SECRET=your-kakao-client-secret
KAKAO_REDIRECT_URI=http://localhost:3000/api/auth/kakao/callback

# Reward Settings
REWARD_PER_1000_STEPS=10
REWARD_PER_WORKOUT_MINUTE=5
MAX_DAILY_STEP_REWARDS=100
MAX_DAILY_WORKOUT_REWARDS=100
```

### 3. Set Up Database

Run Prisma migrations:

```bash
npx prisma migrate dev --name init
```

This will:
- Create the database if it doesn't exist
- Run all migrations
- Generate Prisma Client

### 4. Run the Application

Development mode (with hot reload):

```bash
npm run start:dev
```

The API will be available at: `http://localhost:3000/api`

### 5. Test the API

You can test using curl or Postman:

```bash
# Health check
curl http://localhost:3000/api

# Login with Kakao (requires authorization code from Kakao)
curl -X POST http://localhost:3000/api/auth/kakao \
  -H "Content-Type: application/json" \
  -d '{"authorizationCode": "YOUR_KAKAO_AUTH_CODE"}'
```

---

## Production Deployment (AWS)

### Architecture

- **EC2**: Application server running Node.js
- **RDS**: PostgreSQL database
- **Application Load Balancer**: SSL/TLS termination and load balancing
- **CloudWatch**: Logging and monitoring

### 1. Set Up RDS PostgreSQL

1. Create RDS PostgreSQL instance:
   - Engine: PostgreSQL 15+
   - Instance class: db.t3.micro (for MVP) or larger
   - Storage: 20GB GP3 (adjust as needed)
   - Enable automated backups
   - Multi-AZ for high availability (optional for MVP)

2. Security Group:
   - Inbound: PostgreSQL (5432) from EC2 security group
   - Outbound: All traffic

3. Note down:
   - Endpoint URL
   - Port (default 5432)
   - Database name
   - Master username and password

### 2. Set Up EC2 Instance

1. Launch EC2 instance:
   - AMI: Amazon Linux 2023 or Ubuntu 22.04 LTS
   - Instance type: t3.small (for MVP) or larger
   - Security Group:
     - SSH (22) from your IP
     - HTTP (80) from anywhere (if using ALB) or your IPs
     - HTTPS (443) from anywhere (if using ALB) or your IPs
     - Custom TCP (3000) from ALB security group

2. Connect to EC2 via SSH:

```bash
ssh -i your-key.pem ec2-user@your-ec2-ip
```

3. Install Node.js and dependencies:

```bash
# For Amazon Linux 2023
sudo yum update -y
sudo yum install -y git

# Install Node.js 18+
curl -fsSL https://rpm.nodesource.com/setup_18.x | sudo bash -
sudo yum install -y nodejs

# Verify installation
node --version
npm --version
```

4. Clone and set up the application:

```bash
# Clone your repository
git clone https://github.com/your-repo/fitcoin-server.git
cd fitcoin-server

# Install dependencies
npm ci --only=production

# Install PM2 for process management
sudo npm install -g pm2
```

### 3. Configure Environment Variables

Create `.env` file on EC2:

```bash
nano .env
```

Add production values:

```env
DATABASE_URL="postgresql://username:password@your-rds-endpoint:5432/fitcoin?schema=public"

NODE_ENV=production
PORT=3000
API_PREFIX=api

# Generate strong secrets (use: openssl rand -base64 32)
JWT_ACCESS_SECRET=your-production-secret-key
JWT_REFRESH_SECRET=your-production-refresh-key
JWT_ACCESS_EXPIRATION=15m
JWT_REFRESH_EXPIRATION=7d

KAKAO_CLIENT_ID=your-kakao-rest-api-key
KAKAO_CLIENT_SECRET=your-kakao-client-secret
KAKAO_REDIRECT_URI=https://api.yourdomain.com/api/auth/kakao/callback

REWARD_PER_1000_STEPS=10
REWARD_PER_WORKOUT_MINUTE=5
MAX_DAILY_STEP_REWARDS=100
MAX_DAILY_WORKOUT_REWARDS=100
```

### 4. Run Database Migrations

```bash
npx prisma migrate deploy
```

### 5. Build and Start the Application

```bash
# Build the application
npm run build

# Start with PM2
pm2 start dist/main.js --name fitcoin-api

# Set PM2 to restart on reboot
pm2 startup
pm2 save

# Check status
pm2 status
pm2 logs fitcoin-api
```

### 6. Set Up NGINX (Optional, Recommended)

Install and configure NGINX as reverse proxy:

```bash
sudo yum install nginx -y

# Create NGINX config
sudo nano /etc/nginx/conf.d/fitcoin.conf
```

Add configuration:

```nginx
server {
    listen 80;
    server_name api.yourdomain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

Start NGINX:

```bash
sudo systemctl start nginx
sudo systemctl enable nginx
```

### 7. SSL/TLS with Let's Encrypt (Optional, Recommended)

```bash
# Install certbot
sudo yum install -y certbot python3-certbot-nginx

# Get SSL certificate
sudo certbot --nginx -d api.yourdomain.com

# Auto-renewal is set up automatically
```

### 8. Application Load Balancer (Optional, for Scaling)

1. Create Target Group:
   - Target type: Instances
   - Protocol: HTTP
   - Port: 3000 (or 80 if using NGINX)
   - Health check path: `/api`

2. Create Application Load Balancer:
   - Scheme: Internet-facing
   - Listeners: HTTP (80), HTTPS (443)
   - SSL certificate from ACM

3. Configure SSL certificate in AWS Certificate Manager

---

## Monitoring and Maintenance

### Application Logs

```bash
# View PM2 logs
pm2 logs fitcoin-api

# View specific lines
pm2 logs fitcoin-api --lines 100
```

### Database Backup

RDS automated backups are enabled by default. For manual backup:

```bash
# From local machine with PostgreSQL client
pg_dump -h your-rds-endpoint -U username -d fitcoin > backup.sql
```

### Updating the Application

```bash
cd fitcoin-server
git pull
npm ci --only=production
npm run build
npx prisma migrate deploy
pm2 restart fitcoin-api
```

### Health Monitoring

Set up CloudWatch alarms for:
- EC2 CPU utilization
- RDS connections
- Application logs (errors)
- API response times

---

## Security Checklist

- [ ] Strong JWT secrets generated
- [ ] Database credentials secured
- [ ] EC2 security groups restricted to necessary IPs
- [ ] RDS not publicly accessible
- [ ] SSL/TLS enabled
- [ ] Environment variables not in source control
- [ ] Regular security updates applied
- [ ] Rate limiting configured (consider using NGINX or AWS WAF)
- [ ] CORS properly configured for production domains
- [ ] Kakao OAuth redirect URIs whitelisted

---

## Cost Optimization

For MVP/Solo founder:

- **EC2**: t3.micro or t3.small ($8-17/month)
- **RDS**: db.t3.micro ($15-20/month)
- **Data Transfer**: ~$0.09/GB
- **Total estimate**: ~$30-50/month for low traffic

Scale up as user base grows.

---

## Troubleshooting

### Can't connect to database

```bash
# Test database connection
npx prisma db pull
```

Check:
- RDS security group allows EC2 IP
- DATABASE_URL is correct
- RDS is running

### Application crashes

```bash
# Check PM2 logs
pm2 logs fitcoin-api --err

# Restart
pm2 restart fitcoin-api
```

### CORS errors

Update main.ts CORS configuration:

```typescript
app.enableCors({
  origin: ['https://yourdomain.com'], // Your Android app domain
  credentials: true,
});
```

---

## Support

For issues, check:
- Application logs: `pm2 logs`
- Database status: RDS console
- EC2 health: CloudWatch metrics

---

## Next Steps (Post-MVP)

- [ ] Set up CI/CD pipeline (GitHub Actions)
- [ ] Add rate limiting
- [ ] Implement proper logging (Winston, DataDog)
- [ ] Add API documentation (Swagger)
- [ ] Set up monitoring (New Relic, Sentry)
- [ ] Implement caching (Redis)
- [ ] Add unit and integration tests
