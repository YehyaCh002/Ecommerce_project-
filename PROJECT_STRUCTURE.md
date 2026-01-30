# E-commerce Project Structure

This project follows a clean architecture pattern with separation of concerns.

## Project Structure

```
src/
├── config/          # Configuration files (database, etc.)
├── entities/        # TypeORM entities (database models)
├── controllers/     # Request handlers
├── services/        # Business logic layer
├── routes/          # API routes
├── middlewares/     # Express middlewares
├── migrations/      # Database migrations
├── utils/           # Utility functions and helpers
└── index.ts         # Application entry point
```

## Layer Responsibilities

### Entities
- Define database schema using TypeORM decorators
- Represent database tables as classes
- Located in `src/entities/`

### Controllers
- Handle HTTP requests and responses
- Validate request data
- Call services for business logic
- Located in `src/controllers/`

### Services
- Contain business logic
- Interact with repositories
- Handle data transformation
- Located in `src/services/`

### Routes
- Define API endpoints
- Map URLs to controller methods
- Located in `src/routes/`

### Middlewares
- Handle cross-cutting concerns (error handling, logging, auth)
- Located in `src/middlewares/`

## Getting Started

1. Install dependencies:
```bash
npm install
```

2. Set up your `.env` file with DATABASE_URL

3. Run migrations:
```bash
npm run migration:run
```

4. Start development server:
```bash
npm run dev
```

## API Endpoints

### Users
- GET    /api/users      - Get all users
- GET    /api/users/:id  - Get user by ID
- POST   /api/users      - Create new user
- PUT    /api/users/:id  - Update user
- DELETE /api/users/:id  - Delete user

## Adding New Features

1. Create an entity in `src/entities/`
2. Create a service in `src/services/`
3. Create a controller in `src/controllers/`
4. Create routes in `src/routes/`
5. Add routes to `src/routes/index.ts`
6. Generate and run migrations
