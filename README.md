# FitCoin API

A production-ready backend API for the FitCoin fitness reward Android app. Users earn FitCoins by walking and working out.

## Tech Stack

- **Framework**: NestJS
- **Database**: PostgreSQL
- **ORM**: Prisma
- **Authentication**: JWT + Kakao OAuth 2.0
- **Language**: TypeScript

---

## Features

- Kakao OAuth 2.0 login (primary authentication method)
- JWT-based access and refresh tokens
- Activity tracking (steps and workouts)
- Reward system with daily limits to prevent abuse
- Asset management (balance, history)
- Production-ready architecture

---

## Project Structure

```
src/
├── auth/                    # Authentication module
│   ├── dto/                 # Data transfer objects
│   ├── strategies/          # Passport strategies (JWT)
│   ├── auth.controller.ts   # Auth endpoints
│   ├── auth.service.ts      # Auth business logic
│   └── auth.module.ts
│
├── user/                    # User module
│   ├── dto/
│   ├── user.controller.ts   # User profile endpoints
│   ├── user.service.ts
│   └── user.module.ts
│
├── activity/                # Activity tracking module
│   ├── dto/
│   ├── activity.controller.ts
│   ├── activity.service.ts  # Step & workout recording logic
│   └── activity.module.ts
│
├── asset/                   # Asset/reward module
│   ├── dto/
│   ├── asset.controller.ts  # Balance & history endpoints
│   ├── asset.service.ts
│   └── asset.module.ts
│
├── common/                  # Shared utilities
│   ├── decorators/          # Custom decorators (@CurrentUser)
│   ├── filters/             # Exception filters
│   ├── guards/              # Auth guards (JWT)
│   └── prisma/              # Prisma service
│
└── main.ts                  # Application entry point
```

---

## Database Schema

### User
- `id`: UUID (primary key)
- `kakaoId`: String (unique)
- `nickname`: String
- `profileImage`: String (nullable)
- `createdAt`: DateTime
- `updatedAt`: DateTime

### Activity
- `id`: UUID (primary key)
- `userId`: UUID (foreign key)
- `type`: Enum (STEPS, WORKOUT)
- `value`: Integer (steps count or minutes)
- `createdAt`: DateTime

### Asset
- `id`: UUID (primary key)
- `userId`: UUID (foreign key)
- `amount`: Decimal
- `reason`: String
- `createdAt`: DateTime

### RefreshToken
- `id`: UUID (primary key)
- `userId`: UUID (foreign key)
- `token`: String (unique)
- `expiresAt`: DateTime
- `createdAt`: DateTime

---

## API Endpoints

### Authentication

**POST** `/api/auth/kakao`
- Login with Kakao authorization code
- Request body:
  ```json
  {
    "authorizationCode": "string"
  }
  ```
- Response:
  ```json
  {
    "accessToken": "string",
    "refreshToken": "string",
    "user": {
      "id": "string",
      "kakaoId": "string",
      "nickname": "string",
      "profileImage": "string | null"
    }
  }
  ```

**POST** `/api/auth/refresh`
- Refresh access token
- Request body:
  ```json
  {
    "refreshToken": "string"
  }
  ```
- Response:
  ```json
  {
    "accessToken": "string"
  }
  ```

### User Profile

**GET** `/api/me`
- Get current user profile (requires authentication)
- Headers: `Authorization: Bearer {accessToken}`
- Response:
  ```json
  {
    "id": "string",
    "kakaoId": "string",
    "nickname": "string",
    "profileImage": "string | null",
    "createdAt": "datetime"
  }
  ```

### Activity

**POST** `/api/activity/steps`
- Record walking steps (requires authentication)
- Headers: `Authorization: Bearer {accessToken}`
- Request body:
  ```json
  {
    "steps": 5000
  }
  ```
- Response:
  ```json
  {
    "id": "string",
    "type": "STEPS",
    "value": 5000,
    "coinsEarned": 50,
    "createdAt": "datetime",
    "message": "Great job! You earned 50 FitCoins!"
  }
  ```

**POST** `/api/activity/workout`
- Record workout minutes (requires authentication)
- Headers: `Authorization: Bearer {accessToken}`
- Request body:
  ```json
  {
    "minutes": 30
  }
  ```
- Response:
  ```json
  {
    "id": "string",
    "type": "WORKOUT",
    "value": 30,
    "coinsEarned": 150,
    "createdAt": "datetime",
    "message": "Excellent workout! You earned 150 FitCoins!"
  }
  ```

### Assets

**GET** `/api/assets`
- Get asset summary (requires authentication)
- Headers: `Authorization: Bearer {accessToken}`
- Response:
  ```json
  {
    "totalBalance": 500,
    "totalEarned": 500,
    "earnedToday": 100
  }
  ```

**GET** `/api/assets/history?page=1&limit=20`
- Get asset transaction history (requires authentication)
- Headers: `Authorization: Bearer {accessToken}`
- Query params:
  - `page`: number (default: 1)
  - `limit`: number (default: 20)
- Response:
  ```json
  {
    "items": [
      {
        "id": "string",
        "amount": 50,
        "reason": "Walked 5000 steps",
        "createdAt": "datetime"
      }
    ],
    "total": 100,
    "page": 1,
    "limit": 20
  }
  ```

---

## Reward Logic

### Steps
- **Reward**: 10 FitCoins per 1,000 steps (configurable)
- **Daily Limit**: 100 FitCoins from steps (configurable)
- **Example**: 5,000 steps = 50 FitCoins

### Workout
- **Reward**: 5 FitCoins per minute (configurable)
- **Daily Limit**: 100 FitCoins from workouts (configurable)
- **Example**: 30 minutes workout = 150 FitCoins (capped at 100)

All limits reset daily at midnight to prevent abuse.

---

## Local Development

### Prerequisites

- Node.js 18+
- PostgreSQL
- npm or yarn

### Quick Start

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Set up environment variables**:
   ```bash
   cp .env.example .env
   # Edit .env with your values
   ```

3. **Run database migrations**:
   ```bash
   npx prisma migrate dev
   ```

4. **Start development server**:
   ```bash
   npm run start:dev
   ```

5. **Access the API**:
   ```
   http://localhost:3000/api
   ```

### Available Scripts

```bash
# Development
npm run start:dev      # Start with hot reload

# Production
npm run build          # Build for production
npm run start:prod     # Run production build

# Database
npx prisma studio      # Open Prisma Studio (database GUI)
npx prisma migrate dev # Create and apply migrations
npx prisma generate    # Generate Prisma Client

# Code Quality
npm run lint           # Run ESLint
npm run format         # Format with Prettier
```

---

## Kakao OAuth Setup

1. Go to [Kakao Developers Console](https://developers.kakao.com/)
2. Create a new application
3. Navigate to **Kakao Login** settings
4. Enable Kakao Login
5. Add redirect URI: `http://localhost:3000/api/auth/kakao/callback`
6. Get your **REST API Key** (Client ID)
7. Get your **Client Secret** (in Security settings)
8. Update `.env` with your credentials

---

## Environment Variables

See `.env.example` for all required variables:

- **DATABASE_URL**: PostgreSQL connection string
- **JWT_ACCESS_SECRET**: Secret for access tokens
- **JWT_REFRESH_SECRET**: Secret for refresh tokens
- **KAKAO_CLIENT_ID**: Kakao REST API key
- **KAKAO_CLIENT_SECRET**: Kakao client secret
- **Reward settings**: Configurable reward amounts and limits

---

## Deployment

See [DEPLOYMENT.md](./DEPLOYMENT.md) for detailed AWS deployment instructions.

Quick summary:
- Deploy to AWS EC2 + RDS PostgreSQL
- Use PM2 for process management
- NGINX for reverse proxy
- SSL/TLS with Let's Encrypt
- CloudWatch for monitoring

---

## Security Features

- JWT-based authentication
- Refresh token rotation
- Input validation with class-validator
- SQL injection protection (Prisma)
- CORS configuration
- Rate limiting via daily reward caps
- Environment variable management

---

## Production Considerations

### Already Implemented
- Database transactions for atomicity
- Input validation
- Error handling
- Environment-based configuration
- Secure JWT implementation
- Daily limits to prevent abuse

### Future Enhancements
- Rate limiting (API level)
- Logging (Winston, DataDog)
- API documentation (Swagger)
- Unit and integration tests
- Caching (Redis)
- CI/CD pipeline

---

## License
Copyright (c) 2026 ssoit \
For inquiries, contact: ssoitworks@gmail.com

---

## Support

For deployment help, see [DEPLOYMENT.md](./DEPLOYMENT.md).

For API questions, see the API endpoints section above.
