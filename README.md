# E-commerce Project

Express + TypeScript + PostgreSQL application with Docker support.

## Prerequisites

- Docker and Docker Compose installed
- Node.js 18+ (for local development)

## Quick Start

1. **Clone and setup environment variables:**
   ```bash
   cp .env.example .env
   ```

2. **Build and run with Docker Compose:**
   ```bash
   docker-compose up --build
   ```

3. **Access the application:**
   - API: http://localhost:3000
   - Health check: http://localhost:3000/health
   - PostgreSQL: localhost:5432

## Development

### Local Development (without Docker)

1. Install dependencies:
   ```bash
   npm install
   ```

2. Start PostgreSQL (via Docker):
   ```bash
   docker-compose up postgres -d
   ```

3. Run development server:
   ```bash
   npm run dev
   ```

### Docker Commands

- Build containers: `npm run docker:build`
- Start containers: `npm run docker:up`
- Stop containers: `npm run docker:down`
- View logs: `npm run docker:logs`

### Manual Docker Commands

```bash
# Build and start
docker-compose up --build -d

# View logs
docker-compose logs -f app

# Stop and remove containers
docker-compose down

# Stop and remove containers with volumes
docker-compose down -v
```

## Project Structure

```
.
├── src/
│   └── index.ts          # Main application file
├── dist/                 # Compiled TypeScript output
├── Dockerfile            # Multi-stage Docker build
├── docker-compose.yml    # Docker Compose configuration
├── tsconfig.json         # TypeScript configuration
├── package.json          # Node.js dependencies
├── .env.example          # Environment variables template
└── .dockerignore         # Docker ignore file
```

## Environment Variables

See `.env.example` for all available configuration options.

## API Endpoints

- `GET /` - Welcome message
- `GET /health` - Health check with database status
