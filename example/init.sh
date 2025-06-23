#!/bin/bash

echo "🚀 Initializing DynamoDB tables for DynoJS examples..."

# Wait for LocalStack to be ready
echo "⏳ Waiting for LocalStack to be ready..."
while ! curl -s http://localhost:4566/_localstack/health > /dev/null; do
  sleep 1
done

echo "✅ LocalStack is ready!"

# Create main application table with GSI and LSI
echo "📦 Creating main application table..."
awslocal dynamodb create-table \
  --table-name dynojs-app \
  --attribute-definitions \
    AttributeName=pk,AttributeType=S \
    AttributeName=sk,AttributeType=S \
    AttributeName=email,AttributeType=S \
    AttributeName=status,AttributeType=S \
    AttributeName=createdAt,AttributeType=S \
    AttributeName=category,AttributeType=S \
    AttributeName=price,AttributeType=S \
    AttributeName=userId,AttributeType=S \
    AttributeName=orderId,AttributeType=S \
    AttributeName=productId,AttributeType=S \
  --key-schema \
    AttributeName=pk,KeyType=HASH \
    AttributeName=sk,KeyType=RANGE \
  --global-secondary-indexes \
    IndexName=emailIndex,KeySchema=[{AttributeName=email,KeyType=HASH},{AttributeName=sk,KeyType=RANGE}],Projection={ProjectionType=ALL} \
    IndexName=statusIndex,KeySchema=[{AttributeName=status,KeyType=HASH},{AttributeName=createdAt,KeyType=RANGE}],Projection={ProjectionType=ALL} \
    IndexName=categoryIndex,KeySchema=[{AttributeName=category,KeyType=HASH},{AttributeName=price,KeyType=RANGE}],Projection={ProjectionType=ALL} \
    IndexName=userOrdersIndex,KeySchema=[{AttributeName=userId,KeyType=HASH},{AttributeName=orderId,KeyType=RANGE}],Projection={ProjectionType=ALL} \
    IndexName=productOrdersIndex,KeySchema=[{AttributeName=productId,KeyType=HASH},{AttributeName=orderId,KeyType=RANGE}],Projection={ProjectionType=ALL} \
  --local-secondary-indexes \
    IndexName=statusLSI,KeySchema=[{AttributeName=pk,KeyType=HASH},{AttributeName=status,KeyType=RANGE}],Projection={ProjectionType=ALL} \
    IndexName=createdAtLSI,KeySchema=[{AttributeName=pk,KeyType=HASH},{AttributeName=createdAt,KeyType=RANGE}],Projection={ProjectionType=ALL} \
  --billing-mode PAY_PER_REQUEST

# Create a separate table for testing single-table design
echo "📦 Creating single-table design table..."
awslocal dynamodb create-table \
  --table-name dynojs-single-table \
  --attribute-definitions \
    AttributeName=pk,AttributeType=S \
    AttributeName=sk,AttributeType=S \
    AttributeName=gsi1pk,AttributeType=S \
    AttributeName=gsi1sk,AttributeType=S \
    AttributeName=gsi2pk,AttributeType=S \
    AttributeName=gsi2sk,AttributeType=S \
  --key-schema \
    AttributeName=pk,KeyType=HASH \
    AttributeName=sk,KeyType=RANGE \
  --global-secondary-indexes \
    IndexName=gsi1,KeySchema=[{AttributeName=gsi1pk,KeyType=HASH},{AttributeName=gsi1sk,KeyType=RANGE}],Projection={ProjectionType=ALL} \
    IndexName=gsi2,KeySchema=[{AttributeName=gsi2pk,KeyType=HASH},{AttributeName=gsi2sk,KeyType=RANGE}],Projection={ProjectionType=ALL} \
  --billing-mode PAY_PER_REQUEST

# Create a table for testing transactions
echo "📦 Creating transaction test table..."
awslocal dynamodb create-table \
  --table-name dynojs-transactions \
  --attribute-definitions \
    AttributeName=pk,AttributeType=S \
    AttributeName=sk,AttributeType=S \
  --key-schema \
    AttributeName=pk,KeyType=HASH \
    AttributeName=sk,KeyType=RANGE \
  --billing-mode PAY_PER_REQUEST

# Wait for tables to be created
echo "⏳ Waiting for tables to be created..."
sleep 10

# Insert sample data
echo "📝 Inserting sample data..."

# Users
echo "👥 Creating sample users..."
awslocal dynamodb put-item \
  --table-name dynojs-app \
  --item '{
    "pk": {"S": "USER#1"},
    "sk": {"S": "METADATA"},
    "type": {"S": "USER"},
    "email": {"S": "john@example.com"},
    "name": {"S": "John Doe"},
    "status": {"S": "ACTIVE"},
    "createdAt": {"S": "2024-01-01T00:00:00Z"},
    "updatedAt": {"S": "2024-01-01T00:00:00Z"}
  }'

awslocal dynamodb put-item \
  --table-name dynojs-app \
  --item '{
    "pk": {"S": "USER#2"},
    "sk": {"S": "METADATA"},
    "type": {"S": "USER"},
    "email": {"S": "jane@example.com"},
    "name": {"S": "Jane Smith"},
    "status": {"S": "ACTIVE"},
    "createdAt": {"S": "2024-01-02T00:00:00Z"},
    "updatedAt": {"S": "2024-01-02T00:00:00Z"}
  }'

# Products
echo "🛍️ Creating sample products..."
awslocal dynamodb put-item \
  --table-name dynojs-app \
  --item '{
    "pk": {"S": "PRODUCT#1"},
    "sk": {"S": "METADATA"},
    "type": {"S": "PRODUCT"},
    "name": {"S": "Laptop"},
    "category": {"S": "ELECTRONICS"},
    "price": {"S": "999.99"},
    "status": {"S": "ACTIVE"},
    "createdAt": {"S": "2024-01-01T00:00:00Z"},
    "updatedAt": {"S": "2024-01-01T00:00:00Z"}
  }'

awslocal dynamodb put-item \
  --table-name dynojs-app \
  --item '{
    "pk": {"S": "PRODUCT#2"},
    "sk": {"S": "METADATA"},
    "type": {"S": "PRODUCT"},
    "name": {"S": "Phone"},
    "category": {"S": "ELECTRONICS"},
    "price": {"S": "599.99"},
    "status": {"S": "ACTIVE"},
    "createdAt": {"S": "2024-01-01T00:00:00Z"},
    "updatedAt": {"S": "2024-01-01T00:00:00Z"}
  }'

# Orders
echo "📦 Creating sample orders..."
awslocal dynamodb put-item \
  --table-name dynojs-app \
  --item '{
    "pk": {"S": "ORDER#1"},
    "sk": {"S": "METADATA"},
    "type": {"S": "ORDER"},
    "userId": {"S": "USER#1"},
    "productId": {"S": "PRODUCT#1"},
    "orderId": {"S": "ORDER#1"},
    "amount": {"N": "999.99"},
    "status": {"S": "PENDING"},
    "createdAt": {"S": "2024-01-01T00:00:00Z"},
    "updatedAt": {"S": "2024-01-01T00:00:00Z"}
  }'

awslocal dynamodb put-item \
  --table-name dynojs-app \
  --item '{
    "pk": {"S": "ORDER#2"},
    "sk": {"S": "METADATA"},
    "type": {"S": "ORDER"},
    "userId": {"S": "USER#2"},
    "productId": {"S": "PRODUCT#2"},
    "orderId": {"S": "ORDER#2"},
    "amount": {"N": "599.99"},
    "status": {"S": "COMPLETED"},
    "createdAt": {"S": "2024-01-02T00:00:00Z"},
    "updatedAt": {"S": "2024-01-02T00:00:00Z"}
  }'

# Single-table design data
echo "🔗 Creating single-table design data..."
awslocal dynamodb put-item \
  --table-name dynojs-single-table \
  --item '{
    "pk": {"S": "USER#1"},
    "sk": {"S": "METADATA"},
    "type": {"S": "USER"},
    "gsi1pk": {"S": "USER#1"},
    "gsi1sk": {"S": "METADATA"},
    "gsi2pk": {"S": "USER"},
    "gsi2sk": {"S": "2024-01-01T00:00:00Z"},
    "email": {"S": "john@example.com"},
    "name": {"S": "John Doe"}
  }'

awslocal dynamodb put-item \
  --table-name dynojs-single-table \
  --item '{
    "pk": {"S": "USER#1"},
    "sk": {"S": "ORDER#1"},
    "type": {"S": "ORDER"},
    "gsi1pk": {"S": "USER#1"},
    "gsi1sk": {"S": "ORDER#1"},
    "gsi2pk": {"S": "ORDER"},
    "gsi2sk": {"S": "2024-01-01T00:00:00Z"},
    "amount": {"N": "999.99"},
    "status": {"S": "PENDING"}
  }'

echo "✅ DynamoDB initialization complete!"
echo "🌐 LocalStack endpoint: http://localhost:4566"
echo "📊 DynamoDB Admin UI: http://localhost:8001 (run with --profile admin)"
echo "📋 Available tables:"
echo "   - dynojs-app (main application table with GSI/LSI)"
echo "   - dynojs-single-table (single-table design example)"
echo "   - dynojs-transactions (transaction testing)" 