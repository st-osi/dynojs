import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";
import { z } from "zod";
import { Table } from "@/table/table";

// Create DynamoDB client
const client = new DynamoDBClient({});
const documentClient = DynamoDBDocumentClient.from(client, {
  marshallOptions: { removeUndefinedValues: true },
});

// Create table instance
const table = new Table({
  name: "my-table",
  documentClient,
  indexes: {
    gsi1: {
      pk: "GSI1PK",
      sk: "GSI1SK",
    },
  },
});

// Define base schema
const baseSchema = z.object({
  pk: z.string(),
  sk: z.string(),
  type: z.string(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

// Define user schema
const userSchema = baseSchema.extend({
  type: z.literal("USER"),
  name: z.string(),
  email: z.string().email(),
  age: z.number().optional(),
});

// Define order schema
const orderSchema = baseSchema.extend({
  type: z.literal("ORDER"),
  orderId: z.string(),
  userId: z.string(),
  amount: z.number(),
  status: z.enum(["PENDING", "COMPLETED", "CANCELLED"]),
});

// Create entities
const UserEntity = table.define({
  name: "User",
  schema: userSchema,
  indexes: {
    gsi1: {
      pk: "EMAIL",
      sk: "email",
    },
  },
});

const OrderEntity = table.define({
  name: "Order",
  schema: orderSchema,
  indexes: {
    gsi1: {
      pk: "USER",
      sk: "orderId",
    },
  },
});

// Example usage
async function example() {
  // Create a user
  const user = await UserEntity.put({
    pk: "USER#123",
    sk: "METADATA",
    type: "USER",
    name: "John Doe",
    email: "john@example.com",
    age: 30,
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  // Create an order
  const order = await OrderEntity.put({
    pk: "USER#123",
    sk: "ORDER#456",
    type: "ORDER",
    orderId: "456",
    userId: "123",
    amount: 100,
    status: "PENDING",
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  // Query user's orders
  const orders = await OrderEntity.query({
    keyCondition: {
      pk: "USER#123",
      sk: { beginsWith: "ORDER#" },
    },
    filter: {
      status: "PENDING",
    },
  });

  // Update order status
  const updatedOrder = await OrderEntity.update(
    { pk: "USER#123", sk: "ORDER#456" },
    { status: "COMPLETED" }
  );

  // Batch get orders
  const batchOrders = await OrderEntity.batchGet([
    { pk: "USER#123", sk: "ORDER#456" },
    { pk: "USER#123", sk: "ORDER#789" },
  ]);

  // Batch write operations
  await OrderEntity.batchWrite({
    put: [
      {
        pk: "USER#123",
        sk: "ORDER#789",
        type: "ORDER",
        orderId: "789",
        userId: "123",
        amount: 200,
        status: "PENDING",
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ],
    delete: [{ pk: "USER#123", sk: "ORDER#456" }],
  });
}
