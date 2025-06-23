import { describe, it, expect, beforeEach, vi } from "vitest";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";
import { z } from "zod";
import { createEntity } from "../entity";

describe("Entity", () => {
  let entity: ReturnType<typeof createEntity>;
  let documentClient: DynamoDBDocumentClient;
  let mockSend: any;

  const schema = z.object({
    pk: z.string(),
    sk: z.string(),
    type: z.string(),
    name: z.string(),
    age: z.number().optional(),
  });

  beforeEach(() => {
    mockSend = vi.fn();
    const client = new DynamoDBClient({});
    documentClient = DynamoDBDocumentClient.from(client, {
      marshallOptions: { removeUndefinedValues: true },
    });
    vi.spyOn(documentClient, "send").mockImplementation(mockSend);

    entity = createEntity({
      name: "TestEntity",
      schema,
      table: "test-table",
      documentClient,
    });
  });

  describe("get", () => {
    it("should return undefined when item not found", async () => {
      mockSend.mockResolvedValueOnce({});

      const result = await entity.get({ pk: "TEST#1", sk: "METADATA" });
      expect(result).toBeUndefined();
    });

    it("should return parsed item when found", async () => {
      const item = {
        pk: "TEST#1",
        sk: "METADATA",
        type: "TEST",
        name: "Test Item",
        age: 30,
      };

      mockSend.mockResolvedValueOnce({ Item: item });

      const result = await entity.get({ pk: "TEST#1", sk: "METADATA" });
      expect(result).toEqual(item);
    });

    it("should throw on schema validation error", async () => {
      const invalidItem = {
        pk: "TEST#1",
        sk: "METADATA",
        type: "TEST",
        name: "Test Item",
        age: "invalid", // Should be number
      };

      mockSend.mockResolvedValueOnce({ Item: invalidItem });

      await expect(
        entity.get({ pk: "TEST#1", sk: "METADATA" })
      ).rejects.toThrow();
    });
  });

  describe("put", () => {
    it("should put valid item", async () => {
      const item = {
        pk: "TEST#1",
        sk: "METADATA",
        type: "TEST",
        name: "Test Item",
        age: 30,
      };

      mockSend.mockResolvedValueOnce({});

      const result = await entity.put(item);
      expect(result).toEqual(item);
      expect(mockSend).toHaveBeenCalledWith(
        expect.objectContaining({
          input: expect.objectContaining({
            TableName: "test-table",
            Item: item,
          }),
        })
      );
    });

    it("should throw on invalid item", async () => {
      const invalidItem = {
        pk: "TEST#1",
        sk: "METADATA",
        type: "TEST",
        name: "Test Item",
        age: "invalid", // Should be number
      };

      await expect(entity.put(invalidItem)).rejects.toThrow();
    });
  });

  describe("update", () => {
    it("should update item", async () => {
      const key = { pk: "TEST#1", sk: "METADATA" };
      const updates = { name: "Updated Name", age: 31 };
      const updatedItem = {
        pk: "TEST#1",
        sk: "METADATA",
        type: "TEST",
        name: "Updated Name",
        age: 31,
      };

      mockSend.mockResolvedValueOnce({ Attributes: updatedItem });

      const result = await entity.update(key, updates);
      expect(result).toEqual(updatedItem);
      expect(mockSend).toHaveBeenCalledWith(
        expect.objectContaining({
          input: expect.objectContaining({
            TableName: "test-table",
            Key: key,
            UpdateExpression: expect.stringContaining("SET"),
            ExpressionAttributeNames: expect.any(Object),
            ExpressionAttributeValues: expect.any(Object),
          }),
        })
      );
    });
  });

  describe("delete", () => {
    it("should delete item", async () => {
      const key = { pk: "TEST#1", sk: "METADATA" };

      mockSend.mockResolvedValueOnce({});

      await entity.delete(key);
      expect(mockSend).toHaveBeenCalledWith(
        expect.objectContaining({
          input: expect.objectContaining({
            TableName: "test-table",
            Key: key,
          }),
        })
      );
    });
  });

  describe("query", () => {
    it("should query items with key condition", async () => {
      const items = [
        {
          pk: "TEST#1",
          sk: "ITEM#1",
          type: "TEST",
          name: "Item 1",
          age: 30,
        },
        {
          pk: "TEST#1",
          sk: "ITEM#2",
          type: "TEST",
          name: "Item 2",
          age: 31,
        },
      ];

      mockSend.mockResolvedValueOnce({ Items: items });

      const result = await entity.query({
        keyCondition: {
          pk: "TEST#1",
          sk: { beginsWith: "ITEM#" },
        },
      });

      expect(result).toEqual(items);
      expect(mockSend).toHaveBeenCalledWith(
        expect.objectContaining({
          input: expect.objectContaining({
            TableName: "test-table",
            KeyConditionExpression: "pk = :pk AND begins_with(sk, :sk)",
            ExpressionAttributeValues: {
              ":pk": "TEST#1",
              ":sk": "ITEM#",
            },
          }),
        })
      );
    });

    it("should query items with filter", async () => {
      const items = [
        {
          pk: "TEST#1",
          sk: "ITEM#1",
          type: "TEST",
          name: "Item 1",
          age: 30,
        },
      ];

      mockSend.mockResolvedValueOnce({ Items: items });

      const result = await entity.query({
        keyCondition: {
          pk: "TEST#1",
          sk: { beginsWith: "ITEM#" },
        },
        filter: {
          age: { gt: 25 },
        },
      });

      expect(result).toEqual(items);
      expect(mockSend).toHaveBeenCalledWith(
        expect.objectContaining({
          input: expect.objectContaining({
            TableName: "test-table",
            KeyConditionExpression: "pk = :pk AND begins_with(sk, :sk)",
            FilterExpression: "age > :age",
            ExpressionAttributeValues: {
              ":pk": "TEST#1",
              ":sk": "ITEM#",
              ":age": 25,
            },
          }),
        })
      );
    });

    it("should query items with simple key condition", async () => {
      const items = [
        {
          pk: "TEST#1",
          sk: "METADATA",
          type: "TEST",
          name: "Item 1",
          age: 30,
        },
      ];

      mockSend.mockResolvedValueOnce({ Items: items });

      const result = await entity.query({
        keyCondition: {
          pk: "TEST#1",
          sk: "METADATA",
        },
      });

      expect(result).toEqual(items);
      expect(mockSend).toHaveBeenCalledWith(
        expect.objectContaining({
          input: expect.objectContaining({
            TableName: "test-table",
            KeyConditionExpression: "pk = :pk AND sk = :sk",
            ExpressionAttributeValues: {
              ":pk": "TEST#1",
              ":sk": "METADATA",
            },
          }),
        })
      );
    });
  });

  describe("scan", () => {
    it("should scan items", async () => {
      const items = [
        {
          pk: "TEST#1",
          sk: "ITEM#1",
          type: "TEST",
          name: "Item 1",
          age: 30,
        },
        {
          pk: "TEST#2",
          sk: "ITEM#2",
          type: "TEST",
          name: "Item 2",
          age: 31,
        },
      ];

      mockSend.mockResolvedValueOnce({ Items: items });

      const result = await entity.scan();
      expect(result).toEqual(items);
      expect(mockSend).toHaveBeenCalledWith(
        expect.objectContaining({
          input: expect.objectContaining({
            TableName: "test-table",
          }),
        })
      );
    });

    it("should scan items with filter", async () => {
      const items = [
        {
          pk: "TEST#1",
          sk: "ITEM#1",
          type: "TEST",
          name: "Item 1",
          age: 30,
        },
      ];

      mockSend.mockResolvedValueOnce({ Items: items });

      const result = await entity.scan({
        filter: {
          age: { gt: 25 },
        },
      });

      expect(result).toEqual(items);
      expect(mockSend).toHaveBeenCalledWith(
        expect.objectContaining({
          input: expect.objectContaining({
            TableName: "test-table",
            FilterExpression: "age > :age",
            ExpressionAttributeValues: {
              ":age": 25,
            },
          }),
        })
      );
    });
  });

  describe("batchGet", () => {
    it("should get multiple items", async () => {
      const keys = [
        { pk: "TEST#1", sk: "ITEM#1" },
        { pk: "TEST#1", sk: "ITEM#2" },
      ];

      const items = [
        {
          pk: "TEST#1",
          sk: "ITEM#1",
          type: "TEST",
          name: "Item 1",
          age: 30,
        },
        {
          pk: "TEST#1",
          sk: "ITEM#2",
          type: "TEST",
          name: "Item 2",
          age: 31,
        },
      ];

      mockSend.mockResolvedValueOnce({
        Responses: {
          "test-table": items,
        },
      });

      const result = await entity.batchGet({ keys });

      expect(result).toEqual(items);
      expect(mockSend).toHaveBeenCalledWith(
        expect.objectContaining({
          input: expect.objectContaining({
            RequestItems: {
              "test-table": {
                Keys: [
                  {
                    pk: "TEST#1",
                    sk: "ITEM#1",
                  },
                  {
                    pk: "TEST#1",
                    sk: "ITEM#2",
                  },
                ],
              },
            },
          }),
        })
      );
    });

    it("should handle empty responses", async () => {
      const keys = [
        { pk: "TEST#1", sk: "ITEM#1" },
        { pk: "TEST#1", sk: "ITEM#2" },
      ];

      mockSend.mockResolvedValueOnce({
        Responses: {
          "test-table": [],
        },
      });

      const result = await entity.batchGet({ keys });

      expect(result).toEqual([]);
      expect(mockSend).toHaveBeenCalledWith(
        expect.objectContaining({
          input: expect.objectContaining({
            RequestItems: {
              "test-table": {
                Keys: keys,
              },
            },
          }),
        })
      );
    });

    it("should handle batch get errors", async () => {
      const keys = [
        { pk: "TEST#1", sk: "ITEM#1" },
        { pk: "TEST#1", sk: "ITEM#2" },
      ];

      mockSend.mockRejectedValueOnce(new Error("Batch get failed"));

      await expect(entity.batchGet({ keys })).rejects.toThrow(
        "Batch get failed"
      );
    });
  });

  describe("batchWrite", () => {
    it("should perform batch write operations", async () => {
      const putItems = [
        {
          pk: "TEST#1",
          sk: "ITEM#1",
          type: "TEST",
          name: "Item 1",
          age: 30,
        },
      ];

      const deleteKeys = [{ pk: "TEST#1", sk: "ITEM#2" }];

      mockSend.mockResolvedValueOnce({});

      await entity.batchWrite({
        put: putItems,
        delete: deleteKeys,
      });

      expect(mockSend).toHaveBeenCalledWith(
        expect.objectContaining({
          input: expect.objectContaining({
            RequestItems: {
              "test-table": expect.arrayContaining([
                expect.objectContaining({
                  PutRequest: {
                    Item: putItems[0],
                  },
                }),
                expect.objectContaining({
                  DeleteRequest: {
                    Key: deleteKeys[0],
                  },
                }),
              ]),
            },
          }),
        })
      );
    });
  });
});
