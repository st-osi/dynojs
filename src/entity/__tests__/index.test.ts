import { describe, it, expect, beforeEach, vi } from "vitest";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";
import { z } from "zod";
import { createEntity } from "../entity";

describe("Index Management", () => {
  let documentClient: DynamoDBDocumentClient;
  let mockSend: any;

  const schema = z.object({
    pk: z.string(),
    sk: z.string(),
    type: z.string(),
    email: z.string().email(),
    name: z.string(),
    status: z.enum(["ACTIVE", "INACTIVE"]),
    createdAt: z.string(),
    updatedAt: z.string(),
  });

  beforeEach(() => {
    mockSend = vi.fn();
    const client = new DynamoDBClient({});
    documentClient = DynamoDBDocumentClient.from(client, {
      marshallOptions: { removeUndefinedValues: true },
    });
    vi.spyOn(documentClient, "send").mockImplementation(mockSend);
  });

  describe("Global Secondary Indexes", () => {
    let entity: ReturnType<typeof createEntity>;

    beforeEach(() => {
      entity = createEntity({
        name: "UserEntity",
        schema,
        table: "test-table",
        documentClient,
        indexes: {
          emailIndex: {
            pk: "email",
            sk: "type",
          },
          statusIndex: {
            pk: "status",
            sk: "createdAt",
          },
        },
      });
    });

    it("should query using GSI", async () => {
      const items = [
        {
          pk: "USER#1",
          sk: "METADATA",
          type: "USER",
          email: "test@example.com",
          name: "Test User",
          status: "ACTIVE",
          createdAt: "2024-01-01T00:00:00Z",
          updatedAt: "2024-01-01T00:00:00Z",
        },
      ];

      mockSend.mockResolvedValueOnce({ Items: items });

      const result = await entity.query({
        keyCondition: {
          email: "test@example.com",
          type: "USER",
        },
        index: "emailIndex",
      });

      expect(result).toEqual(items);
      expect(mockSend).toHaveBeenCalledWith(
        expect.objectContaining({
          input: expect.objectContaining({
            IndexName: "emailIndex",
            KeyConditionExpression: expect.stringContaining("email"),
          }),
        })
      );
    });

    it("should scan using GSI", async () => {
      const items = [
        {
          pk: "USER#1",
          sk: "METADATA",
          type: "USER",
          email: "test@example.com",
          name: "Test User",
          status: "ACTIVE",
          createdAt: "2024-01-01T00:00:00Z",
          updatedAt: "2024-01-01T00:00:00Z",
        },
      ];

      mockSend.mockResolvedValueOnce({ Items: items });

      const result = await entity.scan({
        index: "statusIndex",
        filter: {
          status: "ACTIVE",
        },
      });

      expect(result).toEqual(items);
      expect(mockSend).toHaveBeenCalledWith(
        expect.objectContaining({
          input: expect.objectContaining({
            IndexName: "statusIndex",
          }),
        })
      );
    });
  });

  describe("Local Secondary Indexes", () => {
    let entity: ReturnType<typeof createEntity>;

    beforeEach(() => {
      entity = createEntity({
        name: "OrderEntity",
        schema,
        table: "test-table",
        documentClient,
        indexes: {
          statusIndex: {
            pk: "pk",
            sk: "status",
          },
          createdAtIndex: {
            pk: "pk",
            sk: "createdAt",
          },
        },
      });
    });

    it("should query using LSI", async () => {
      const items = [
        {
          pk: "ORDER#1",
          sk: "METADATA",
          type: "ORDER",
          email: "test@example.com",
          name: "Test Order",
          status: "ACTIVE",
          createdAt: "2024-01-01T00:00:00Z",
          updatedAt: "2024-01-01T00:00:00Z",
        },
      ];

      mockSend.mockResolvedValueOnce({ Items: items });

      const result = await entity.query({
        keyCondition: {
          pk: "ORDER#1",
          status: "ACTIVE",
        },
        index: "statusIndex",
      });

      expect(result).toEqual(items);
      expect(mockSend).toHaveBeenCalledWith(
        expect.objectContaining({
          input: expect.objectContaining({
            IndexName: "statusIndex",
            KeyConditionExpression: expect.stringContaining("pk"),
          }),
        })
      );
    });

    it("should query using LSI with range key", async () => {
      const items = [
        {
          pk: "ORDER#1",
          sk: "METADATA",
          type: "ORDER",
          email: "test@example.com",
          name: "Test Order",
          status: "ACTIVE",
          createdAt: "2024-01-01T00:00:00Z",
          updatedAt: "2024-01-01T00:00:00Z",
        },
      ];

      mockSend.mockResolvedValueOnce({ Items: items });

      const result = await entity.query({
        keyCondition: {
          pk: "ORDER#1",
          createdAt: { beginsWith: "2024" },
        },
        index: "createdAtIndex",
      });

      expect(result).toEqual(items);
      expect(mockSend).toHaveBeenCalledWith(
        expect.objectContaining({
          input: expect.objectContaining({
            IndexName: "createdAtIndex",
            KeyConditionExpression: expect.stringContaining("begins_with"),
          }),
        })
      );
    });
  });

  describe("Composite Indexes", () => {
    let entity: ReturnType<typeof createEntity>;

    beforeEach(() => {
      entity = createEntity({
        name: "ProductEntity",
        schema,
        table: "test-table",
        documentClient,
        indexes: {
          categoryIndex: {
            pk: "category",
            sk: "price",
          },
          statusCategoryIndex: {
            pk: "status",
            sk: "category",
          },
        },
      });
    });

    it("should query using composite index", async () => {
      const items = [
        {
          pk: "PROD#1",
          sk: "METADATA",
          type: "PRODUCT",
          email: "test@example.com",
          name: "Test Product",
          status: "ACTIVE",
          createdAt: "2024-01-01T00:00:00Z",
          updatedAt: "2024-01-01T00:00:00Z",
        },
      ];

      mockSend.mockResolvedValueOnce({ Items: items });

      const result = await entity.query({
        keyCondition: {
          status: "ACTIVE",
          category: { beginsWith: "ELEC" },
        },
        index: "statusCategoryIndex",
      });

      expect(result).toEqual(items);
      expect(mockSend).toHaveBeenCalledWith(
        expect.objectContaining({
          input: expect.objectContaining({
            IndexName: "statusCategoryIndex",
            KeyConditionExpression: expect.stringContaining("begins_with"),
          }),
        })
      );
    });

    it("should query using composite index with range condition", async () => {
      const items = [
        {
          pk: "PROD#1",
          sk: "METADATA",
          type: "PRODUCT",
          email: "test@example.com",
          name: "Test Product",
          status: "ACTIVE",
          createdAt: "2024-01-01T00:00:00Z",
          updatedAt: "2024-01-01T00:00:00Z",
        },
      ];

      mockSend.mockResolvedValueOnce({ Items: items });

      const result = await entity.query({
        keyCondition: {
          category: "ELECTRONICS",
          price: { between: ["100", "1000"] },
        },
        index: "categoryIndex",
      });

      expect(result).toEqual(items);
      expect(mockSend).toHaveBeenCalledWith(
        expect.objectContaining({
          input: expect.objectContaining({
            IndexName: "categoryIndex",
            KeyConditionExpression: expect.stringContaining("between"),
          }),
        })
      );
    });
  });
});
