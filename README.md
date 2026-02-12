# E-commerce Project.

A modern e-commerce backend built with Express.js, TypeScript, PostgreSQL, and TypeORM - fully containerized with Docker.

## 🚀 Features

- ✅ **TypeScript** - Type-safe code
- ✅ **TypeORM** - Powerful ORM with migrations
- ✅ **PostgreSQL** - Reliable relational database
- ✅ **Docker** - Containerized development and deployment
- ✅ **NestJS-style Architecture** - Modular and scalable structure
- ✅ **RESTful API** - Clean API design

## 📋 Prerequisites

- Docker Desktop installed and running
- Node.js 18+ (for local development outside Docker)

## 🏗️ Project Structure

```
src/
├── config/              # Configuration files
│   └── data-source.ts   # TypeORM database configuration
├── entities/            # TypeORM entities (database models)
│   └── User.ts
├── controllers/         # Request handlers
│   └── UserController.ts
├── services/            # Business logic layer
│   └── UserService.ts
├── routes/              # API routes
│   ├── index.ts
│   └── userRoutes.ts
├── middlewares/         # Express middlewares
│   └── errorHandler.ts
├── migrations/          # Database migrations
│   └── [timestamp]-CreateUserTable.ts
├── utils/               # Utility functions
│   └── logger.ts
└── index.ts             # Application entry point
```

## 🚀 Quick Start

### 1. Setup Environment

```bash
# Copy environment variables
cp .env.example .env
```

### 2. Start with Docker

```bash
# Build and start all services
docker-compose up -d --build

# View logs
docker-compose logs -f app
```

### 3. Access the Application

- **API**: http://localhost:3000
- **Health Check**: http://localhost:3000/health
- **PostgreSQL**: localhost:5432

## 📦 Docker Commands

### Container Management

```bash
# Start containers
docker-compose up -d

# Stop containers
docker-compose down

# Rebuild containers
docker-compose up -d --build

# View logs
docker-compose logs -f app

# View all container logs
docker-compose logs -f

# Check container status
docker-compose ps
```

### Database Commands

```bash
# Access PostgreSQL shell
docker-compose exec postgres psql -U postgres -d ecommerce

# View all tables
docker-compose exec postgres psql -U postgres -d ecommerce -c "\dt"

# View table structure
docker-compose exec postgres psql -U postgres -d ecommerce -c "\d users"
```

## 🗄️ Database Migrations

### Generate Migration

```bash
# Drop existing table (if needed for testing)
docker-compose exec postgres psql -U postgres -d ecommerce -c "DROP TABLE IF EXISTS users CASCADE;"

# Generate migration from entity changes
docker-compose exec -u root app npm run typeorm migration:generate src/migrations/YourMigrationName -- -d src/config/data-source.ts

# Build TypeScript (compile migration)
docker-compose exec -u root app npm run build
```

### Run Migrations

```bash
# Run all pending migrations
docker-compose exec app npm run migration:run

# Revert last migration
docker-compose exec app npm run migration:revert
```

### Important Notes

- Migration files are automatically synced to your local `src/migrations` folder
- Always run as root user (`-u root`) when generating migrations to avoid permission issues
- Compile TypeScript after creating migrations: `npm run build`

## 🌐 API Endpoints

### Health & Status

- `GET /` - Welcome message
- `GET /health` - Health check with database status

### Users

- `GET /api/users` - Get all users
- `GET /api/users/:id` - Get user by ID
- `POST /api/users` - Create new user
- `PUT /api/users/:id` - Update user
- `DELETE /api/users/:id` - Delete user

### Example Request

```bash
# Create a new user
curl -X POST http://localhost:3000/api/users \
  -H "Content-Type: application/json" \
  -d '{
    "name": "John Doe",
    "email": "john@example.com",
    "password": "securepass123",
    "role": "customer"
  }'
```

## 🛠️ Development

### Local Development (without Docker)

```bash
# Install dependencies
npm install

# Start PostgreSQL only
docker-compose up postgres -d

# Update .env for local development
# DB_HOST=localhost (instead of postgres)

# Run development server
npm run dev
```

### NPM Scripts

```bash
# Development
npm run dev              # Start with hot-reload

# Building
npm run build            # Compile TypeScript

# Production
npm start                # Run compiled code

# TypeORM
npm run migration:generate src/migrations/Name  # Generate migration
npm run migration:run                           # Run migrations
npm run migration:revert                        # Revert last migration

# Docker shortcuts
npm run docker:dev       # Start containers
npm run docker:down      # Stop containers
npm run docker:logs      # View logs
npm run docker:shell     # Access container shell
```

## 📝 Environment Variables

```env
# PostgreSQL Configuration
POSTGRES_USER=postgres
POSTGRES_PASSWORD=postgres123
POSTGRES_DB=ecommerce
POSTGRES_PORT=5432

# Application Configuration
APP_PORT=3000
NODE_ENV=development

# Database Connection (for TypeORM)
DB_HOST=postgres         # Use 'localhost' for local dev
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=postgres123
DB_NAME=ecommerce
```

## 🔧 Troubleshooting

### Container Issues

```bash
# Remove all containers and volumes (fresh start)
docker-compose down -v

# Rebuild without cache
docker-compose build --no-cache

# Check container logs
docker-compose logs app
```

### Database Connection Issues

- Ensure PostgreSQL container is healthy: `docker-compose ps`
- Check connection settings in `.env`
- For local development, use `DB_HOST=localhost`
- For Docker development, use `DB_HOST=postgres`

### Migration Issues

- Always generate migrations as root: `docker-compose exec -u root app ...`
- Rebuild after generating: `docker-compose exec -u root app npm run build`
- Migration files auto-sync to local `src/migrations` folder

### Permission Issues

If you encounter permission errors:

```bash
# Run commands as root user
docker-compose exec -u root app npm run build
docker-compose exec -u root app npm run typeorm ...
```

## 🏗️ Architecture

This project follows a **NestJS-inspired modular architecture**:

- **Entities**: Database models with TypeORM decorators
- **Services**: Business logic and data access
- **Controllers**: HTTP request handling
- **Routes**: API endpoint definitions
- **Middlewares**: Cross-cutting concerns (error handling, logging)
- **Migrations**: Version-controlled database schema changes

## 📚 Tech Stack

- **Runtime**: Node.js 18 Alpine
- **Language**: TypeScript 5.3
- **Framework**: Express.js 4.18
- **ORM**: TypeORM 0.3
- **Database**: PostgreSQL 15
- **Containerization**: Docker & Docker Compose

## 🤝 Contributing

1. Create a feature branch
2. Make your changes
3. Generate migrations if needed
4. Test inside Docker
5. Submit a pull request

## 📄 License

ISC

.
