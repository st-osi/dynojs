# DynoJS Example with LocalStack

This example demonstrates how to use DynoJS with LocalStack for local DynamoDB development and testing. It showcases all the APIs we've built including entities, tables, indexes, CRUD operations, queries, scans, batch operations, and more.

## 🚀 Quick Start

### Prerequisites

- Docker and Docker Compose
- Node.js 18+ and npm/pnpm/yarn
- AWS CLI (optional, for manual testing)

### Setup

1. **Clone and navigate to the example directory:**

   ```bash
   cd example
   ```

2. **Install dependencies:**

   ```bash
   npm install
   # or
   pnpm install
   # or
   yarn install
   ```

3. **Start LocalStack with DynamoDB:**

   ```bash
   npm run setup
   # or
   docker-compose up -d
   ```

4. **Run the demo:**
   ```bash
   npm run demo
   ```

## 📊 Available Services

### LocalStack DynamoDB

- **Endpoint:** http://localhost:4566
- **Region:** us-east-1
- **Credentials:** test/test

### DynamoDB Admin UI (Optional)

- **URL:** http://localhost:8001
- **Start with:** `npm run demo:admin`

## 🏗️ Infrastructure

The example creates three DynamoDB tables:

### 1. `dynojs-app` (Main Application Table)

**Primary Key:** `pk` (HASH), `sk` (RANGE)

**Global Secondary Indexes (GSI):**

- `emailIndex`: `email` (HASH), `sk` (RANGE)
- `statusIndex`: `status` (HASH), `createdAt` (RANGE)
- `categoryIndex`: `category` (HASH), `price` (RANGE)
- `userOrdersIndex`: `userId` (HASH), `orderId` (RANGE)
- `productOrdersIndex`: `productId` (HASH), `orderId` (RANGE)

**Local Secondary Indexes (LSI):**

- `statusLSI`: `pk` (HASH), `status` (RANGE)
- `createdAtLSI`: `pk` (HASH), `createdAt` (RANGE)

### 2. `dynojs-single-table` (Single-Table Design)

**Primary Key:** `pk` (HASH), `sk` (RANGE)

**Global Secondary Indexes:**

- `gsi1`: `gsi1pk` (HASH), `gsi1sk` (RANGE)
- `gsi2`: `gsi2pk` (HASH), `gsi2sk` (RANGE)

### 3. `dynojs-transactions` (Transaction Testing)

**Primary Key:** `pk` (HASH), `sk` (RANGE)

## 📝 Sample Data

The initialization script creates sample data including:

- **Users:** John Doe, Jane Smith, Alice Johnson
- **Products:** Laptop, Phone, Tablet, Headphones
- **Orders:** Various orders linking users and products

## 🔧 API Examples

### 1. CRUD Operations

```typescript
// Create
const user = await userEntity.put({
  pk: "USER#1",
  sk: "METADATA",
  type: "USER",
  email: "john@example.com",
  name: "John Doe",
  status: "ACTIVE",
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
});

// Read
const user = await userEntity.get({ pk: "USER#1", sk: "METADATA" });

// Update
const updatedUser = await userEntity.update(
  { pk: "USER#1", sk: "METADATA" },
  { name: "John Doe Updated", status: "INACTIVE" }
);

// Delete
await userEntity.delete({ pk: "USER#1", sk: "METADATA" });
```

### 2. Query Operations

```typescript
// Query by primary key
const users = await userEntity.query({
  keyCondition: {
    pk: "USER#1",
    sk: { beginsWith: "METADATA" },
  },
});

// Query using GSI
const userByEmail = await userEntity.query({
  keyCondition: {
    email: "john@example.com",
    sk: "METADATA",
  },
  index: "emailIndex",
});

// Query with filter
const activeUsers = await userEntity.query({
  keyCondition: {
    pk: "USER#1",
    sk: { beginsWith: "METADATA" },
  },
  filter: {
    status: "ACTIVE",
  },
});
```

### 3. Scan Operations

```typescript
// Scan all items
const allUsers = await userEntity.scan();

// Scan with filter
const activeUsers = await userEntity.scan({
  filter: {
    status: "ACTIVE",
  },
});

// Scan using GSI
const usersByStatus = await userEntity.scan({
  index: "statusIndex",
  filter: {
    status: "ACTIVE",
  },
});
```

### 4. Batch Operations

```typescript
// Batch get
const users = await userEntity.batchGet({
  keys: [
    { pk: "USER#1", sk: "METADATA" },
    { pk: "USER#2", sk: "METADATA" },
  ],
});

// Batch write
await productEntity.batchWrite({
  put: [
    { pk: "PRODUCT#1", sk: "METADATA" /* ... */ },
    { pk: "PRODUCT#2", sk: "METADATA" /* ... */ },
  ],
  delete: [{ pk: "PRODUCT#3", sk: "METADATA" }],
});
```

### 5. Advanced Queries

```typescript
// Query with range conditions
const products = await productEntity.query({
  keyCondition: {
    category: "ELECTRONICS",
    price: { between: ["100", "1000"] },
  },
  index: "categoryIndex",
});

// Query with beginsWith
const orders = await orderEntity.query({
  keyCondition: {
    userId: "USER#1",
    orderId: { beginsWith: "ORDER#" },
  },
  index: "userOrdersIndex",
});
```

### 6. Table Operations

```typescript
// Create table with entities
const table = new Table({
  name: "dynojs-app",
  documentClient,
});

// Define entities in table
const userEntity = table.define({
  name: "UserEntity",
  schema: userSchema,
  indexes: {
    emailIndex: { pk: "email", sk: "sk" },
  },
});

// Get entities from table
const entities = table.getEntities();
const userEntity = table.getEntity("UserEntity");
```

## 🛠️ Available Scripts

```bash
# Start LocalStack
npm run start

# Start with DynamoDB Admin UI
npm run demo:admin

# Run the demo
npm run demo

# View logs
npm run logs

# Stop services
npm run stop

# Clean up (removes volumes)
npm run clean

# Restart services
npm run restart
```

## 🔍 Manual Testing

### Using AWS CLI

```bash
# List tables
aws dynamodb list-tables --endpoint-url http://localhost:4566

# Describe table
aws dynamodb describe-table --table-name dynojs-app --endpoint-url http://localhost:4566

# Query items
aws dynamodb query \
  --table-name dynojs-app \
  --key-condition-expression "pk = :pk" \
  --expression-attribute-values '{":pk":{"S":"USER#1"}}' \
  --endpoint-url http://localhost:4566
```

### Using DynamoDB Admin UI

1. Start with admin profile: `npm run demo:admin`
2. Open http://localhost:8001
3. Browse tables, view data, and run queries

## 📚 Features Demonstrated

- ✅ **Entity Management** with Zod schema validation
- ✅ **CRUD Operations** (Create, Read, Update, Delete)
- ✅ **Query Operations** with key conditions and filters
- ✅ **Scan Operations** with optional filters
- ✅ **Batch Operations** (BatchGet, BatchWrite)
- ✅ **Index Management** (GSI, LSI)
- ✅ **Table Operations** with multiple entities
- ✅ **Error Handling** and validation
- ✅ **Performance Optimization** (limits, pagination)
- ✅ **Type Safety** with TypeScript and Zod

## 🏗️ Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   LocalStack    │    │   DynoJS        │    │   DynamoDB      │
│   (DynamoDB)    │◄──►│   (Entity/Table)│◄──►│   (Tables)      │
│   Port: 4566    │    │   (Zod Schema)  │    │   (Indexes)     │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         │                       │                       │
         ▼                       ▼                       ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   DynamoDB      │    │   TypeScript    │    │   Sample Data   │
│   Admin UI      │    │   Demo App      │    │   (Users,       │
│   Port: 8001    │    │   (demo.ts)     │    │    Products,    │
└─────────────────┘    └─────────────────┘    │    Orders)      │
                                              └─────────────────┘
```

## 🐛 Troubleshooting

### Common Issues

1. **Port already in use:**

   ```bash
   # Check what's using the port
   lsof -i :4566
   # Kill the process or change ports in docker-compose.yml
   ```

2. **LocalStack not starting:**

   ```bash
   # Check logs
   docker-compose logs localstack
   # Restart
   docker-compose restart localstack
   ```

3. **Tables not created:**
   ```bash
   # Check init script
   docker-compose exec localstack cat /etc/localstack/init/ready.d/init.sh
   # Manually run init
   docker-compose exec localstack /etc/localstack/init/ready.d/init.sh
   ```

### Reset Everything

```bash
# Stop and remove everything
docker-compose down -v
# Remove images
docker rmi localstack/localstack aaronshaf/dynamodb-admin
# Start fresh
npm run setup
```

## 📖 References

- [LocalStack Documentation](https://docs.localstack.cloud/)
- [DynamoDB Toolbox](https://www.dynamodbtoolbox.com/)
- [AWS DynamoDB Documentation](https://docs.aws.amazon.com/dynamodb/)
- [Zod Documentation](https://zod.dev/)

## 🤝 Contributing

Feel free to submit issues and enhancement requests!
