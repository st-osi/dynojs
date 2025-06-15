import { describe, it, expect } from "vitest";
import { z } from "zod";
import { createEntity } from "../entity";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";

describe("Schema Validation", () => {
  const client = new DynamoDBClient({});
  const documentClient = DynamoDBDocumentClient.from(client, {
    marshallOptions: { removeUndefinedValues: true },
  });

  describe("Base Schema", () => {
    const baseSchema = z.object({
      pk: z.string(),
      sk: z.string(),
      type: z.string(),
      createdAt: z.string(),
      updatedAt: z.string(),
    });

    const entity = createEntity({
      name: "BaseEntity",
      schema: baseSchema,
      table: "test-table",
      documentClient,
    });

    it("should validate required fields", () => {
      const validItem = {
        pk: "TEST#1",
        sk: "METADATA",
        type: "TEST",
        createdAt: "2024-01-01T00:00:00Z",
        updatedAt: "2024-01-01T00:00:00Z",
      };

      expect(() => baseSchema.parse(validItem)).not.toThrow();
    });

    it("should reject missing required fields", () => {
      const invalidItem = {
        pk: "TEST#1",
        sk: "METADATA",
        type: "TEST",
        // Missing createdAt and updatedAt
      };

      expect(() => baseSchema.parse(invalidItem)).toThrow();
    });
  });

  describe("Extended Schema", () => {
    const baseSchema = z.object({
      pk: z.string(),
      sk: z.string(),
      type: z.string(),
      createdAt: z.string(),
      updatedAt: z.string(),
    });

    const userSchema = baseSchema.extend({
      email: z.string().email(),
      name: z.string(),
      age: z.number().optional(),
      preferences: z
        .object({
          theme: z.enum(["light", "dark"]),
          notifications: z.boolean(),
        })
        .optional(),
    });

    const entity = createEntity({
      name: "UserEntity",
      schema: userSchema,
      table: "test-table",
      documentClient,
    });

    it("should validate extended fields", () => {
      const validItem = {
        pk: "USER#1",
        sk: "METADATA",
        type: "USER",
        createdAt: "2024-01-01T00:00:00Z",
        updatedAt: "2024-01-01T00:00:00Z",
        email: "test@example.com",
        name: "Test User",
        age: 30,
        preferences: {
          theme: "dark",
          notifications: true,
        },
      };

      expect(() => userSchema.parse(validItem)).not.toThrow();
    });

    it("should reject invalid email", () => {
      const invalidItem = {
        pk: "USER#1",
        sk: "METADATA",
        type: "USER",
        createdAt: "2024-01-01T00:00:00Z",
        updatedAt: "2024-01-01T00:00:00Z",
        email: "invalid-email",
        name: "Test User",
      };

      expect(() => userSchema.parse(invalidItem)).toThrow();
    });

    it("should validate optional fields", () => {
      const validItem = {
        pk: "USER#1",
        sk: "METADATA",
        type: "USER",
        createdAt: "2024-01-01T00:00:00Z",
        updatedAt: "2024-01-01T00:00:00Z",
        email: "test@example.com",
        name: "Test User",
        // age and preferences are optional
      };

      expect(() => userSchema.parse(validItem)).not.toThrow();
    });

    it("should validate nested objects", () => {
      const invalidItem = {
        pk: "USER#1",
        sk: "METADATA",
        type: "USER",
        createdAt: "2024-01-01T00:00:00Z",
        updatedAt: "2024-01-01T00:00:00Z",
        email: "test@example.com",
        name: "Test User",
        preferences: {
          theme: "invalid", // Should be "light" or "dark"
          notifications: true,
        },
      };

      expect(() => userSchema.parse(invalidItem)).toThrow();
    });
  });

  describe("Complex Schema", () => {
    const addressSchema = z.object({
      street: z.string(),
      city: z.string(),
      state: z.string(),
      zip: z.string(),
    });

    const orderSchema = z.object({
      pk: z.string(),
      sk: z.string(),
      type: z.literal("ORDER"),
      createdAt: z.string(),
      updatedAt: z.string(),
      customerId: z.string(),
      status: z.enum(["PENDING", "PROCESSING", "COMPLETED", "CANCELLED"]),
      items: z.array(
        z.object({
          productId: z.string(),
          quantity: z.number().int().positive(),
          price: z.number().positive(),
        })
      ),
      shippingAddress: addressSchema,
      billingAddress: addressSchema.optional(),
      metadata: z.record(z.unknown()).optional(),
    });

    const entity = createEntity({
      name: "OrderEntity",
      schema: orderSchema,
      table: "test-table",
      documentClient,
    });

    it("should validate complex nested structures", () => {
      const validItem = {
        pk: "ORDER#1",
        sk: "METADATA",
        type: "ORDER",
        createdAt: "2024-01-01T00:00:00Z",
        updatedAt: "2024-01-01T00:00:00Z",
        customerId: "CUST#1",
        status: "PENDING",
        items: [
          {
            productId: "PROD#1",
            quantity: 2,
            price: 29.99,
          },
        ],
        shippingAddress: {
          street: "123 Main St",
          city: "Anytown",
          state: "CA",
          zip: "12345",
        },
        metadata: {
          source: "web",
          campaign: "summer_sale",
        },
      };

      expect(() => orderSchema.parse(validItem)).not.toThrow();
    });

    it("should validate array items", () => {
      const invalidItem = {
        pk: "ORDER#1",
        sk: "METADATA",
        type: "ORDER",
        createdAt: "2024-01-01T00:00:00Z",
        updatedAt: "2024-01-01T00:00:00Z",
        customerId: "CUST#1",
        status: "PENDING",
        items: [
          {
            productId: "PROD#1",
            quantity: -1, // Invalid: must be positive
            price: 29.99,
          },
        ],
        shippingAddress: {
          street: "123 Main St",
          city: "Anytown",
          state: "CA",
          zip: "12345",
        },
      };

      expect(() => orderSchema.parse(invalidItem)).toThrow();
    });

    it("should validate enum values", () => {
      const invalidItem = {
        pk: "ORDER#1",
        sk: "METADATA",
        type: "ORDER",
        createdAt: "2024-01-01T00:00:00Z",
        updatedAt: "2024-01-01T00:00:00Z",
        customerId: "CUST#1",
        status: "INVALID_STATUS", // Invalid: not in enum
        items: [
          {
            productId: "PROD#1",
            quantity: 2,
            price: 29.99,
          },
        ],
        shippingAddress: {
          street: "123 Main St",
          city: "Anytown",
          state: "CA",
          zip: "12345",
        },
      };

      expect(() => orderSchema.parse(invalidItem)).toThrow();
    });
  });
});
