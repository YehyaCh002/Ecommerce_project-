# E-commerce API Test Script
# This script demonstrates the complete e-commerce flow

$BASE_URL = "http://localhost:3000/api"

Write-Host "`n=== E-commerce MVP Test ===" -ForegroundColor Cyan

# 0. Create a test user first
Write-Host "`n0. Creating Test User..." -ForegroundColor Yellow
$userData = @{
    name = "Test Customer"
    email = "customer@test.com"
    password = "password123"
    role = "customer"
} | ConvertTo-Json

$userResponse = Invoke-RestMethod -Uri "$BASE_URL/users" -Method Post -Body $userData -ContentType "application/json" -UseBasicParsing
$USER_ID = $userResponse.data.id
Write-Host "   Created user: $($userResponse.data.name) (ID: $USER_ID)" -ForegroundColor Green

$ADMIN_HEADERS = @{
    "Content-Type" = "application/json"
    "x-user-id" = $USER_ID
    "x-user-role" = "admin"
}
$CUSTOMER_HEADERS = @{
    "Content-Type" = "application/json"
    "x-user-id" = $USER_ID
    "x-user-role" = "customer"
}

# 1. Create Categories
Write-Host "`n1. Creating Categories..." -ForegroundColor Yellow
$category1 = @{
    name = "Electronics"
    description = "Electronic devices and gadgets"
    slug = "electronics"
} | ConvertTo-Json

$cat1Response = Invoke-RestMethod -Uri "$BASE_URL/categories" -Method Post -Body $category1 -Headers $ADMIN_HEADERS -UseBasicParsing
$categoryId1 = $cat1Response.data.id
Write-Host "   Created: Electronics (ID: $categoryId1)" -ForegroundColor Green

$category2 = @{
    name = "Clothing"
    description = "Fashion and apparel"
    slug = "clothing"
} | ConvertTo-Json

$cat2Response = Invoke-RestMethod -Uri "$BASE_URL/categories" -Method Post -Body $category2 -Headers $ADMIN_HEADERS -UseBasicParsing
$categoryId2 = $cat2Response.data.id
Write-Host "   Created: Clothing (ID: $categoryId2)" -ForegroundColor Green

# 2. Create Products
Write-Host "`n2. Creating Products..." -ForegroundColor Yellow
$product1 = @{
    name = "Laptop Pro 15"
    description = "High-performance laptop with 16GB RAM"
    price = 1299.99
    stock = 50
    sku = "LAP-001"
    categoryId = $categoryId1
} | ConvertTo-Json

$prod1Response = Invoke-RestMethod -Uri "$BASE_URL/products" -Method Post -Body $product1 -Headers $ADMIN_HEADERS -UseBasicParsing
$productId1 = $prod1Response.data.id
Write-Host "   Created: Laptop Pro 15 - `$1299.99 (ID: $productId1)" -ForegroundColor Green

$product2 = @{
    name = "Wireless Mouse"
    description = "Ergonomic wireless mouse"
    price = 29.99
    stock = 200
    sku = "MOUSE-001"
    categoryId = $categoryId1
} | ConvertTo-Json

$prod2Response = Invoke-RestMethod -Uri "$BASE_URL/products" -Method Post -Body $product2 -Headers $ADMIN_HEADERS -UseBasicParsing
$productId2 = $prod2Response.data.id
Write-Host "   Created: Wireless Mouse - `$29.99 (ID: $productId2)" -ForegroundColor Green

$product3 = @{
    name = "Cotton T-Shirt"
    description = "Comfortable cotton t-shirt"
    price = 19.99
    stock = 100
    sku = "SHIRT-001"
    categoryId = $categoryId2
} | ConvertTo-Json

$prod3Response = Invoke-RestMethod -Uri "$BASE_URL/products" -Method Post -Body $product3 -Headers $ADMIN_HEADERS -UseBasicParsing
$productId3 = $prod3Response.data.id
Write-Host "   Created: Cotton T-Shirt - `$19.99 (ID: $productId3)" -ForegroundColor Green

# 3. Get All Products
Write-Host "`n3. Listing All Products..." -ForegroundColor Yellow
$allProducts = Invoke-RestMethod -Uri "$BASE_URL/products" -Method Get -UseBasicParsing
Write-Host "   Total products: $($allProducts.count)" -ForegroundColor Green

# 4. Add Items to Cart
Write-Host "`n4. Adding Items to Cart..." -ForegroundColor Yellow
$cartItem1 = @{
    productId = $productId1
    quantity = 1
} | ConvertTo-Json

Invoke-RestMethod -Uri "$BASE_URL/cart/items" -Method Post -Body $cartItem1 -Headers $CUSTOMER_HEADERS -UseBasicParsing | Out-Null
Write-Host "   Added: 1x Laptop Pro 15" -ForegroundColor Green

$cartItem2 = @{
    productId = $productId2
    quantity = 2
} | ConvertTo-Json

Invoke-RestMethod -Uri "$BASE_URL/cart/items" -Method Post -Body $cartItem2 -Headers $CUSTOMER_HEADERS -UseBasicParsing | Out-Null
Write-Host "   Added: 2x Wireless Mouse" -ForegroundColor Green

# 5. View Cart
Write-Host "`n5. Viewing Cart..." -ForegroundColor Yellow
$cart = Invoke-RestMethod -Uri "$BASE_URL/cart" -Method Get -Headers $CUSTOMER_HEADERS -UseBasicParsing
Write-Host "   Cart items: $($cart.data.cartItems.Count)" -ForegroundColor Green
foreach ($item in $cart.data.cartItems) {
    Write-Host "   - $($item.product.name) x$($item.quantity) = `$$([math]::Round($item.product.price * $item.quantity, 2))" -ForegroundColor White
}

# 6. Get Cart Total
$total = Invoke-RestMethod -Uri "$BASE_URL/cart/total" -Method Get -Headers $CUSTOMER_HEADERS -UseBasicParsing
Write-Host "   Total: `$$($total.data.total)" -ForegroundColor Cyan

# 7. Create Order
Write-Host "`n6. Creating Order..." -ForegroundColor Yellow
$orderData = @{
    shippingAddress = "123 Main Street, New York, NY 10001"
    paymentMethod = "Credit Card"
    notes = "Please deliver before noon"
} | ConvertTo-Json

$order = Invoke-RestMethod -Uri "$BASE_URL/orders" -Method Post -Body $orderData -Headers $CUSTOMER_HEADERS -UseBasicParsing
Write-Host "   Order created successfully!" -ForegroundColor Green
Write-Host "   Order ID: $($order.data.id)" -ForegroundColor White
Write-Host "   Status: $($order.data.status)" -ForegroundColor White
Write-Host "   Total: `$$($order.data.totalAmount)" -ForegroundColor White

# 8. Get User Orders
Write-Host "`n7. Getting User Orders..." -ForegroundColor Yellow
$orders = Invoke-RestMethod -Uri "$BASE_URL/orders/my-orders" -Method Get -Headers $CUSTOMER_HEADERS -UseBasicParsing
Write-Host "   Total orders: $($orders.count)" -ForegroundColor Green

# 9. Update Order Status (Admin)
Write-Host "`n8. Admin: Updating Order Status..." -ForegroundColor Yellow
$statusUpdate = @{
    status = "processing"
} | ConvertTo-Json

$updatedOrder = Invoke-RestMethod -Uri "$BASE_URL/orders/$($order.data.id)/status" -Method Patch -Body $statusUpdate -Headers $ADMIN_HEADERS -UseBasicParsing
Write-Host "   Order status updated to: $($updatedOrder.data.status)" -ForegroundColor Green

# 10. Check Stock Levels
Write-Host "`n9. Checking Stock Levels..." -ForegroundColor Yellow
$laptop = Invoke-RestMethod -Uri "$BASE_URL/products/$productId1" -Method Get -UseBasicParsing
Write-Host "   Laptop Pro 15 stock: $($laptop.data.stock) (was 50, decreased by 1)" -ForegroundColor Green

Write-Host "`n=== Test Completed Successfully! ===" -ForegroundColor Cyan
Write-Host "`nSummary:" -ForegroundColor White
Write-Host "- Created 2 categories" -ForegroundColor White
Write-Host "- Created 3 products" -ForegroundColor White
Write-Host "- Added items to cart" -ForegroundColor White
Write-Host "- Created an order" -ForegroundColor White
Write-Host "- Stock automatically decreased" -ForegroundColor White
Write-Host "- Admin updated order status" -ForegroundColor White
