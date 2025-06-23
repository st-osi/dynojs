import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  DynamoDBDocumentClient,
  TransactWriteCommand,
} from "@aws-sdk/lib-dynamodb";
import { z } from "zod";
import { createEntity } from "../src/entity/entity";

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

// Define schemas for transaction example
const accountSchema = z.object({
  pk: z.string(),
  sk: z.string(),
  type: z.literal("ACCOUNT"),
  accountId: z.string(),
  balance: z.number(),
  status: z.enum(["ACTIVE", "SUSPENDED"]),
  createdAt: z.string(),
  updatedAt: z.string(),
});

const transactionSchema = z.object({
  pk: z.string(),
  sk: z.string(),
  type: z.literal("TRANSACTION"),
  transactionId: z.string(),
  fromAccountId: z.string(),
  toAccountId: z.string(),
  amount: z.number(),
  status: z.enum(["PENDING", "COMPLETED", "FAILED"]),
  createdAt: z.string(),
  updatedAt: z.string(),
});

// Create entities
const accountEntity = createEntity({
  name: "AccountEntity",
  schema: accountSchema,
  table: "dynojs-transactions",
  documentClient,
});

const transactionEntity = createEntity({
  name: "TransactionEntity",
  schema: transactionSchema,
  table: "dynojs-transactions",
  documentClient,
});

async function transactionDemo() {
  console.log("💰 Starting Transaction Demo...\n");

  try {
    // Create initial accounts
    console.log("📝 1. Creating initial accounts...");

    const account1 = await accountEntity.put({
      pk: "ACCOUNT#1",
      sk: "METADATA",
      type: "ACCOUNT",
      accountId: "ACCOUNT#1",
      balance: 1000,
      status: "ACTIVE",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    const account2 = await accountEntity.put({
      pk: "ACCOUNT#2",
      sk: "METADATA",
      type: "ACCOUNT",
      accountId: "ACCOUNT#2",
      balance: 500,
      status: "ACTIVE",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    console.log("✅ Account 1 balance:", account1.balance);
    console.log("✅ Account 2 balance:", account2.balance);

    // Perform a money transfer transaction
    console.log("\n💸 2. Performing money transfer transaction...");

    const transferAmount = 200;
    const transactionId = `TXN#${Date.now()}`;
    const now = new Date().toISOString();

    // Create transaction record
    const transaction = {
      pk: `TRANSACTION#${transactionId}`,
      sk: "METADATA",
      type: "TRANSACTION" as const,
      transactionId,
      fromAccountId: "ACCOUNT#1",
      toAccountId: "ACCOUNT#2",
      amount: transferAmount,
      status: "PENDING" as const,
      createdAt: now,
      updatedAt: now,
    };

    // Perform the transaction using TransactWriteCommand
    const transactCommand = new TransactWriteCommand({
      TransactItems: [
        // Update sender account (decrease balance)
        {
          Update: {
            TableName: "dynojs-transactions",
            Key: {
              pk: "ACCOUNT#1",
              sk: "METADATA",
            },
            UpdateExpression:
              "SET balance = balance - :amount, updatedAt = :updatedAt",
            ExpressionAttributeValues: {
              ":amount": transferAmount,
              ":updatedAt": now,
            },
            ConditionExpression: "balance >= :amount",
          },
        },
        // Update receiver account (increase balance)
        {
          Update: {
            TableName: "dynojs-transactions",
            Key: {
              pk: "ACCOUNT#2",
              sk: "METADATA",
            },
            UpdateExpression:
              "SET balance = balance + :amount, updatedAt = :updatedAt",
            ExpressionAttributeValues: {
              ":amount": transferAmount,
              ":updatedAt": now,
            },
          },
        },
        // Create transaction record
        {
          Put: {
            TableName: "dynojs-transactions",
            Item: {
              ...transaction,
              status: "COMPLETED",
              updatedAt: now,
            },
          },
        },
      ],
    });

    await documentClient.send(transactCommand);
    console.log("✅ Transaction completed successfully!");

    // Verify the results
    console.log("\n🔍 3. Verifying transaction results...");

    const updatedAccount1 = await accountEntity.get({
      pk: "ACCOUNT#1",
      sk: "METADATA",
    });
    const updatedAccount2 = await accountEntity.get({
      pk: "ACCOUNT#2",
      sk: "METADATA",
    });
    const createdTransaction = await transactionEntity.get({
      pk: `TRANSACTION#${transactionId}`,
      sk: "METADATA",
    });

    console.log("✅ Account 1 new balance:", updatedAccount1?.balance);
    console.log("✅ Account 2 new balance:", updatedAccount2?.balance);
    console.log("✅ Transaction status:", createdTransaction?.status);

    // Demonstrate transaction failure (insufficient funds)
    console.log(
      "\n❌ 4. Demonstrating transaction failure (insufficient funds)..."
    );

    const largeTransferAmount = 2000; // More than account balance
    const failedTransactionId = `TXN#${Date.now()}`;

    try {
      const failedTransactCommand = new TransactWriteCommand({
        TransactItems: [
          {
            Update: {
              TableName: "dynojs-transactions",
              Key: {
                pk: "ACCOUNT#1",
                sk: "METADATA",
              },
              UpdateExpression:
                "SET balance = balance - :amount, updatedAt = :updatedAt",
              ExpressionAttributeValues: {
                ":amount": largeTransferAmount,
                ":updatedAt": new Date().toISOString(),
              },
              ConditionExpression: "balance >= :amount",
            },
          },
          {
            Update: {
              TableName: "dynojs-transactions",
              Key: {
                pk: "ACCOUNT#2",
                sk: "METADATA",
              },
              UpdateExpression:
                "SET balance = balance + :amount, updatedAt = :updatedAt",
              ExpressionAttributeValues: {
                ":amount": largeTransferAmount,
                ":updatedAt": new Date().toISOString(),
              },
            },
          },
        ],
      });

      await documentClient.send(failedTransactCommand);
    } catch (error) {
      console.log("✅ Transaction failed as expected (insufficient funds)");
      console.log(
        "   Error:",
        error instanceof Error ? error.message : "Unknown error"
      );
    }

    // Verify balances remained unchanged
    const finalAccount1 = await accountEntity.get({
      pk: "ACCOUNT#1",
      sk: "METADATA",
    });
    const finalAccount2 = await accountEntity.get({
      pk: "ACCOUNT#2",
      sk: "METADATA",
    });

    console.log("✅ Account 1 final balance:", finalAccount1?.balance);
    console.log("✅ Account 2 final balance:", finalAccount2?.balance);

    console.log("\n🎉 Transaction demo completed successfully!");
  } catch (error) {
    console.error("❌ Transaction demo failed:", error);
    process.exit(1);
  }
}

// Run the transaction demo
if (require.main === module) {
  transactionDemo();
}

export { transactionDemo };
