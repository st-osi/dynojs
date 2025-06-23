import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";
import { z } from "zod";
import { createEntity } from "../src/entity/entity";
import { Table } from "../src/table/table";

// Configure DynamoDB client for LocalStack
const client = new DynamoDBClient({
  endpoint: "http://localhost:4566",
  region: "us-east-1",
  credentials: {
    accessKeyId: "test",
    secretAccessKey: "test",
  },
});

const documentClient = DynamoDBDocumentClient.from(client, {
  marshallOptions: { removeUndefinedValues: true },
});

// Define schemas
const userSchema = z.object({
  pk: z.string(),
  sk: z.string(),
  type: z.literal("USER"),
  email: z.string().email(),
  name: z.string(),
  status: z.enum(["ACTIVE", "INACTIVE"]),
  createdAt: z.string(),
  updatedAt: z.string(),
});

const productSchema = z.object({
  pk: z.string(),
  sk: z.string(),
  type: z.literal("PRODUCT"),
  name: z.string(),
  category: z.string(),
  price: z.string(),
  status: z.enum(["ACTIVE", "INACTIVE"]),
  createdAt: z.string(),
  updatedAt: z.string(),
});

const orderSchema = z.object({
  pk: z.string(),
  sk: z.string(),
  type: z.literal("ORDER"),
  userId: z.string(),
  productId: z.string(),
  orderId: z.string(),
  amount: z.number(),
  status: z.enum(["PENDING", "COMPLETED", "CANCELLED"]),
  createdAt: z.string(),
  updatedAt: z.string(),
});

// Create table instance
const appTable = new Table({
  name: "dynojs-app",
  documentClient,
});

// Define entities in the table
const userEntity = appTable.define({
  name: "UserEntity",
  schema: userSchema,
  indexes: {
    emailIndex: {
      pk: "email",
      sk: "sk",
    },
    statusIndex: {
      pk: "status",
      sk: "createdAt",
    },
  },
});

const productEntity = appTable.define({
  name: "ProductEntity",
  schema: productSchema,
  indexes: {
    categoryIndex: {
      pk: "category",
      sk: "price",
    },
    statusIndex: {
      pk: "status",
      sk: "createdAt",
    },
  },
});

const orderEntity = appTable.define({
  name: "OrderEntity",
  schema: orderSchema,
  indexes: {
    userOrdersIndex: {
      pk: "userId",
      sk: "orderId",
    },
    productOrdersIndex: {
      pk: "productId",
      sk: "orderId",
    },
  },
});

async function demo() {
  console.log("🚀 Starting DynoJS Demo...\n");

  try {
    // ===== CRUD Operations =====
    console.log("📝 1. CRUD Operations");
    console.log("=====================");

    // Create a new user
    console.log("\n1.1 Creating a new user...");
    const newUser = await userEntity.put({
      pk: "USER#3",
      sk: "METADATA",
      type: "USER",
      email: "alice@example.com",
      name: "Alice Johnson",
      status: "ACTIVE",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
    console.log("✅ User created:", newUser.name);

    // Get user
    console.log("\n1.2 Getting user...");
    const user = await userEntity.get({ pk: "USER#1", sk: "METADATA" });
    console.log("✅ User retrieved:", user?.name);

    // Update user
    console.log("\n1.3 Updating user...");
    const updatedUser = await userEntity.update(
      { pk: "USER#1", sk: "METADATA" },
      { name: "John Doe Updated", status: "INACTIVE" }
    );
    console.log("✅ User updated:", updatedUser.name, updatedUser.status);

    // ===== Query Operations =====
    console.log("\n\n🔍 2. Query Operations");
    console.log("=====================");

    // Query by primary key
    console.log("\n2.1 Querying users by primary key...");
    const users = await userEntity.query({
      keyCondition: {
        pk: "USER#1",
        sk: { beginsWith: "METADATA" },
      },
    });
    console.log("✅ Users found:", users.length);

    // Query using GSI
    console.log("\n2.2 Querying users by email (GSI)...");
    const userByEmail = await userEntity.query({
      keyCondition: {
        email: "jane@example.com",
        sk: "METADATA",
      },
      index: "emailIndex",
    });
    console.log("✅ User found by email:", userByEmail[0]?.name);

    // Query with filter
    console.log("\n2.3 Querying active users with filter...");
    const activeUsers = await userEntity.query({
      keyCondition: {
        pk: "USER#1",
        sk: { beginsWith: "METADATA" },
      },
      filter: {
        status: "ACTIVE",
      },
    });
    console.log("✅ Active users found:", activeUsers.length);

    // ===== Scan Operations =====
    console.log("\n\n🔍 3. Scan Operations");
    console.log("====================");

    // Scan all users
    console.log("\n3.1 Scanning all users...");
    const allUsers = await userEntity.scan();
    console.log("✅ Total users:", allUsers.length);

    // Scan with filter
    console.log("\n3.2 Scanning users with status filter...");
    const usersByStatus = await userEntity.scan({
      filter: {
        status: "ACTIVE",
      },
    });
    console.log("✅ Active users found:", usersByStatus.length);

    // Scan using GSI
    console.log("\n3.3 Scanning users by status (GSI)...");
    const usersByStatusGSI = await userEntity.scan({
      index: "statusIndex",
      filter: {
        status: "ACTIVE",
      },
    });
    console.log("✅ Active users via GSI:", usersByStatusGSI.length);

    // ===== Batch Operations =====
    console.log("\n\n📦 4. Batch Operations");
    console.log("=====================");

    // Batch get
    console.log("\n4.1 Batch getting users...");
    const batchUsers = await userEntity.batchGet({
      keys: [
        { pk: "USER#1", sk: "METADATA" },
        { pk: "USER#2", sk: "METADATA" },
      ],
    });
    console.log("✅ Batch users retrieved:", batchUsers.length);

    // Batch write
    console.log("\n4.2 Batch writing products...");
    await productEntity.batchWrite({
      put: [
        {
          pk: "PRODUCT#3",
          sk: "METADATA",
          type: "PRODUCT",
          name: "Tablet",
          category: "ELECTRONICS",
          price: "299.99",
          status: "ACTIVE",
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        {
          pk: "PRODUCT#4",
          sk: "METADATA",
          type: "PRODUCT",
          name: "Headphones",
          category: "ELECTRONICS",
          price: "99.99",
          status: "ACTIVE",
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ],
    });
    console.log("✅ Products batch written");

    // ===== Table Operations =====
    console.log("\n\n🏗️ 5. Table Operations");
    console.log("=====================");

    // Get entities from table
    console.log("\n5.1 Getting all entities from table...");
    const allEntities = appTable.getEntities();
    console.log("✅ Entities in table:", allEntities.length);

    // Get specific entity
    console.log("\n5.2 Getting user entity from table...");
    const tableUserEntity = appTable.getEntity("UserEntity");
    console.log("✅ User entity retrieved:", tableUserEntity ? "Yes" : "No");

    // Get table configuration
    console.log("\n5.3 Getting table configuration...");
    const tableConfig = appTable.getConfig();
    console.log("✅ Table name:", tableConfig.name);

    // ===== Advanced Query Examples =====
    console.log("\n\n🚀 6. Advanced Query Examples");
    console.log("=============================");

    // Query products by category with price range
    console.log("\n6.1 Querying products by category and price range...");
    const electronicsProducts = await productEntity.query({
      keyCondition: {
        category: "ELECTRONICS",
        price: { between: ["100", "1000"] },
      },
      index: "categoryIndex",
    });
    console.log(
      "✅ Electronics products in price range:",
      electronicsProducts.length
    );

    // Query orders by user
    console.log("\n6.2 Querying orders by user...");
    const userOrders = await orderEntity.query({
      keyCondition: {
        userId: "USER#1",
        orderId: { beginsWith: "ORDER#" },
      },
      index: "userOrdersIndex",
    });
    console.log("✅ User orders found:", userOrders.length);

    // Query orders by product
    console.log("\n6.3 Querying orders by product...");
    const productOrders = await orderEntity.query({
      keyCondition: {
        productId: "PRODUCT#1",
        orderId: { beginsWith: "ORDER#" },
      },
      index: "productOrdersIndex",
    });
    console.log("✅ Product orders found:", productOrders.length);

    // ===== Error Handling =====
    console.log("\n\n⚠️ 7. Error Handling");
    console.log("===================");

    // Try to get non-existent user
    console.log("\n7.1 Getting non-existent user...");
    const nonExistentUser = await userEntity.get({
      pk: "USER#999",
      sk: "METADATA",
    });
    console.log("✅ Non-existent user result:", nonExistentUser);

    // Try to put invalid data
    console.log("\n7.2 Trying to put invalid user data...");
    try {
      await userEntity.put({
        pk: "USER#4",
        sk: "METADATA",
        type: "USER",
        email: "invalid-email", // Invalid email
        name: "Invalid User",
        status: "ACTIVE",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
    } catch (error) {
      console.log(
        "✅ Validation error caught:",
        error instanceof Error ? error.message : "Unknown error"
      );
    }

    // ===== Performance Examples =====
    console.log("\n\n⚡ 8. Performance Examples");
    console.log("=========================");

    // Query with limit
    console.log("\n8.1 Querying with limit...");
    const limitedUsers = await userEntity.query({
      keyCondition: {
        pk: "USER#1",
        sk: { beginsWith: "METADATA" },
      },
      limit: 1,
    });
    console.log("✅ Limited users:", limitedUsers.length);

    // Scan with limit
    console.log("\n8.2 Scanning with limit...");
    const limitedScan = await userEntity.scan({ limit: 2 });
    console.log("✅ Limited scan results:", limitedScan.length);

    console.log("\n\n🎉 Demo completed successfully!");
    console.log("📊 Check DynamoDB Admin UI at: http://localhost:8001");
    console.log("🌐 LocalStack endpoint: http://localhost:4566");
  } catch (error) {
    console.error("❌ Demo failed:", error);
    process.exit(1);
  }
}

// Run the demo
if (require.main === module) {
  demo();
}

export { demo };
