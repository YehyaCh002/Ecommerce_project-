# E-commerce API Documentation

## Overview

This is a complete e-commerce MVP with products, categories, shopping cart, and order management.

## Authentication

For this MVP, authentication is simplified using headers:
- `x-user-id`: The user's UUID
- `x-user-role`: User role (customer or admin)

**Example:**
```
x-user-id: 123e4567-e89b-12d3-a456-426614174000
x-user-role: customer
```

## API Endpoints

### Categories

#### GET /api/categories
Get all categories with their products.
- **Auth:** Not required
- **Response:** Array of categories

#### GET /api/categories/:id
Get a single category by ID.
- **Auth:** Not required
- **Response:** Category object

#### POST /api/categories
Create a new category.
- **Auth:** Admin only
- **Body:**
```json
{
  "name": "Electronics",
  "description": "Electronic products",
  "slug": "electronics"
}
```

#### PUT /api/categories/:id
Update a category.
- **Auth:** Admin only
- **Body:** Same as POST

#### DELETE /api/categories/:id
Delete a category.
- **Auth:** Admin only

---

### Products

#### GET /api/products
Get all products with optional filters.
- **Auth:** Not required
- **Query Parameters:**
  - `categoryId`: Filter by category UUID
  - `search`: Search in name and description
  - `minPrice`: Minimum price
  - `maxPrice`: Maximum price
  - `isActive`: Filter by active status (true/false)
- **Response:** Array of products

#### GET /api/products/:id
Get a single product by ID.
- **Auth:** Not required
- **Response:** Product object with category

#### POST /api/products
Create a new product.
- **Auth:** Admin only
- **Body:**
```json
{
  "name": "Laptop",
  "description": "High-performance laptop",
  "price": 999.99,
  "stock": 50,
  "imageUrl": "https://example.com/laptop.jpg",
  "sku": "LAP-001",
  "categoryId": "category-uuid-here"
}
```

#### PUT /api/products/:id
Update a product.
- **Auth:** Admin only
- **Body:** Same as POST (partial updates allowed)

#### DELETE /api/products/:id
Delete a product.
- **Auth:** Admin only

#### PATCH /api/products/:id/stock
Update product stock.
- **Auth:** Admin only
- **Body:**
```json
{
  "quantity": 100
}
```

---

### Cart

#### GET /api/cart
Get current user's cart with all items.
- **Auth:** Required
- **Response:** Cart object with items and product details

#### GET /api/cart/total
Get cart total amount.
- **Auth:** Required
- **Response:**
```json
{
  "success": true,
  "data": {
    "total": 1299.98
  }
}
```

#### POST /api/cart/items
Add item to cart.
- **Auth:** Required
- **Body:**
```json
{
  "productId": "product-uuid-here",
  "quantity": 2
}
```

#### PUT /api/cart/items/:itemId
Update cart item quantity.
- **Auth:** Required
- **Body:**
```json
{
  "quantity": 3
}
```

#### DELETE /api/cart/items/:itemId
Remove item from cart.
- **Auth:** Required

#### DELETE /api/cart
Clear entire cart.
- **Auth:** Required

---

### Orders

#### POST /api/orders
Create order from cart.
- **Auth:** Required
- **Body:**
```json
{
  "shippingAddress": "123 Main St, City, State 12345",
  "paymentMethod": "credit_card",
  "notes": "Please deliver in the morning"
}
```
- **Note:** This will:
  - Create order from current cart
  - Decrease product stock
  - Clear the cart

#### GET /api/orders/my-orders
Get all orders for current user.
- **Auth:** Required
- **Response:** Array of orders with items

#### GET /api/orders/:id
Get order details.
- **Auth:** Required (owner or admin)
- **Response:** Order object with items and products

#### GET /api/orders
Get all orders (admin).
- **Auth:** Admin only
- **Response:** Array of all orders

#### PATCH /api/orders/:id/status
Update order status.
- **Auth:** Admin only
- **Body:**
```json
{
  "status": "processing"
}
```
- **Valid statuses:** pending, processing, shipped, delivered, cancelled

#### POST /api/orders/:id/cancel
Cancel an order.
- **Auth:** Required (owner only)
- **Note:** Cannot cancel shipped or delivered orders. Stock will be restored.

---

## Order Status Flow

1. **pending** - Order created, awaiting payment
2. **processing** - Payment received, preparing order
3. **shipped** - Order shipped to customer
4. **delivered** - Order delivered successfully
5. **cancelled** - Order cancelled

---

## Response Format

### Success Response
```json
{
  "success": true,
  "data": { /* response data */ }
}
```

### Error Response
```json
{
  "success": false,
  "message": "Error message here"
}
```

---

## Testing the API

### 1. Create Categories
```bash
curl -X POST http://localhost:3000/api/categories \
  -H "Content-Type: application/json" \
  -H "x-user-id: your-user-id" \
  -H "x-user-role: admin" \
  -d '{"name": "Electronics", "description": "Electronic devices"}'
```

### 2. Create Products
```bash
curl -X POST http://localhost:3000/api/products \
  -H "Content-Type: application/json" \
  -H "x-user-id: your-user-id" \
  -H "x-user-role: admin" \
  -d '{"name": "Laptop", "price": 999.99, "stock": 10, "categoryId": "category-id"}'
```

### 3. Add to Cart
```bash
curl -X POST http://localhost:3000/api/cart/items \
  -H "Content-Type: application/json" \
  -H "x-user-id: your-user-id" \
  -H "x-user-role: customer" \
  -d '{"productId": "product-id", "quantity": 1}'
```

### 4. Create Order
```bash
curl -X POST http://localhost:3000/api/orders \
  -H "Content-Type: application/json" \
  -H "x-user-id: your-user-id" \
  -H "x-user-role: customer" \
  -d '{"shippingAddress": "123 Main St", "paymentMethod": "credit_card"}'
```

---

## Database Schema

### Users
- id (UUID)
- name
- email (unique)
- password
- role (customer/admin)

### Categories
- id (UUID)
- name (unique)
- description
- slug

### Products
- id (UUID)
- name
- description
- price
- stock
- imageUrl
- sku
- isActive
- categoryId (FK)

### Carts
- id (UUID)
- userId (FK)
- isActive

### CartItems
- id (UUID)
- cartId (FK)
- productId (FK)
- quantity

### Orders
- id (UUID)
- userId (FK)
- status
- totalAmount
- shippingAddress
- paymentMethod
- notes

### OrderItems
- id (UUID)
- orderId (FK)
- productId (FK)
- quantity
- price (snapshot at order time)
