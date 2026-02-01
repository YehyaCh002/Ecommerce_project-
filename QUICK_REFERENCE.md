# Quick Reference - E-commerce MVP

## Start/Stop Commands

```bash
# Start everything
docker-compose up -d

# Stop everything
docker-compose down

# Rebuild after code changes
docker-compose down
docker-compose build --no-cache
docker-compose up -d

# View logs
docker logs ecommerce_app -f

# Run migrations
docker exec ecommerce_app npm run migration:run
```

## Test the System

```powershell
# Run complete test
.\test-api.ps1

# Quick health check
curl http://localhost:3000/health
```

## Access Points

- **API:** http://localhost:3000
- **Database:** localhost:5432
  - User: postgres
  - Password: postgres123
  - Database: ecommerce

## Sample API Calls

### Create User
```bash
curl -X POST http://localhost:3000/api/users \
  -H "Content-Type: application/json" \
  -d '{"name":"John Doe","email":"john@test.com","password":"pass123","role":"customer"}'
```

### Create Category (Admin)
```bash
curl -X POST http://localhost:3000/api/categories \
  -H "Content-Type: application/json" \
  -H "x-user-id: YOUR_USER_ID" \
  -H "x-user-role: admin" \
  -d '{"name":"Electronics","description":"Electronic devices"}'
```

### Create Product (Admin)
```bash
curl -X POST http://localhost:3000/api/products \
  -H "Content-Type: application/json" \
  -H "x-user-id: YOUR_USER_ID" \
  -H "x-user-role: admin" \
  -d '{"name":"Laptop","price":999.99,"stock":50,"categoryId":"CATEGORY_ID"}'
```

### Get All Products
```bash
curl http://localhost:3000/api/products
```

### Add to Cart
```bash
curl -X POST http://localhost:3000/api/cart/items \
  -H "Content-Type: application/json" \
  -H "x-user-id: YOUR_USER_ID" \
  -H "x-user-role: customer" \
  -d '{"productId":"PRODUCT_ID","quantity":1}'
```

### View Cart
```bash
curl http://localhost:3000/api/cart \
  -H "x-user-id: YOUR_USER_ID" \
  -H "x-user-role: customer"
```

### Create Order
```bash
curl -X POST http://localhost:3000/api/orders \
  -H "Content-Type: application/json" \
  -H "x-user-id: YOUR_USER_ID" \
  -H "x-user-role: customer" \
  -d '{"shippingAddress":"123 Main St","paymentMethod":"credit_card"}'
```

### Get My Orders
```bash
curl http://localhost:3000/api/orders/my-orders \
  -H "x-user-id: YOUR_USER_ID" \
  -H "x-user-role: customer"
```

## Database Access

```bash
# Connect to PostgreSQL
docker exec -it ecommerce_postgres psql -U postgres -d ecommerce

# List tables
\dt

# Query products
SELECT * FROM products;

# Query orders with items
SELECT o.id, o.status, o."totalAmount", u.email 
FROM orders o 
JOIN users u ON o."userId" = u.id;

# Exit
\q
```

## Common Issues

### Port Already in Use
```bash
# Stop other services using port 3000 or 5432
docker-compose down
netstat -ano | findstr :3000
```

### Database Connection Failed
```bash
# Wait for PostgreSQL to be healthy
docker-compose ps
# Should show "healthy" status
```

### Migration Errors
```bash
# Check migration status
docker exec ecommerce_app npm run typeorm migration:show -d dist/config/data-source.js

# Revert last migration
docker exec ecommerce_app npm run migration:revert
```

## File Structure Quick Reference

```
src/
├── entities/        # Database models (User, Product, Order, etc.)
├── services/        # Business logic (ProductService, OrderService, etc.)
├── controllers/     # API handlers (ProductController, OrderController, etc.)
├── routes/          # Route definitions (productRoutes.ts, orderRoutes.ts, etc.)
├── middlewares/     # auth.ts, validation.ts, errorHandler.ts
├── migrations/      # Database migrations
└── config/          # data-source.ts (DB config)
```

## Environment Variables

Check `.env.example` or set in docker-compose.yml:
- `DB_HOST` - Database host (default: postgres)
- `DB_PORT` - Database port (default: 5432)
- `DB_USER` - Database user (default: postgres)
- `DB_PASSWORD` - Database password
- `DB_NAME` - Database name (default: ecommerce)
- `PORT` - Application port (default: 3000)
- `NODE_ENV` - Environment (development/production)
