import { describe, it, expect, beforeEach } from "vitest";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";
import { z } from "zod";
import { Table } from "../table";

describe("Table", () => {
  let table: Table;
  let documentClient: DynamoDBDocumentClient;

  beforeEach(() => {
    const client = new DynamoDBClient({});
    documentClient = DynamoDBDocumentClient.from(client, {
      marshallOptions: { removeUndefinedValues: true },
    });

    table = new Table({
      name: "test-table",
      documentClient,
      indexes: {
        gsi1: {
          pk: "GSI1PK",
          sk: "GSI1SK",
        },
      },
    });
  });

  describe("define", () => {
    it("should create an entity with schema", () => {
      const schema = z.object({
        pk: z.string(),
        sk: z.string(),
        type: z.string(),
      });

      const entity = table.define({
        name: "TestEntity",
        schema,
      });

      expect(entity).toBeDefined();
      expect(entity.name).toBe("TestEntity");
      expect(entity.schema).toBe(schema);
      expect(entity.table).toBe("test-table");
    });

    it("should merge table and entity indexes", () => {
      const schema = z.object({
        pk: z.string(),
        sk: z.string(),
        type: z.string(),
      });

      const entity = table.define({
        name: "TestEntity",
        schema,
        indexes: {
          gsi2: {
            pk: "GSI2PK",
            sk: "GSI2SK",
          },
        },
      });

      expect(entity.indexes).toEqual({
        gsi1: {
          pk: "GSI1PK",
          sk: "GSI1SK",
        },
        gsi2: {
          pk: "GSI2PK",
          sk: "GSI2SK",
        },
      });
    });
  });

  describe("getEntity", () => {
    it("should return undefined for non-existent entity", () => {
      const entity = table.getEntity("NonExistentEntity");
      expect(entity).toBeUndefined();
    });

    it("should return entity by name", () => {
      const schema = z.object({
        pk: z.string(),
        sk: z.string(),
        type: z.string(),
      });

      const createdEntity = table.define({
        name: "TestEntity",
        schema,
      });

      const retrievedEntity = table.getEntity("TestEntity");
      expect(retrievedEntity).toBe(createdEntity);
    });
  });

  describe("getEntities", () => {
    it("should return empty array when no entities defined", () => {
      const entities = table.getEntities();
      expect(entities).toEqual([]);
    });

    it("should return all defined entities", () => {
      const schema1 = z.object({
        pk: z.string(),
        sk: z.string(),
        type: z.string(),
      });

      const schema2 = z.object({
        pk: z.string(),
        sk: z.string(),
        type: z.string(),
      });

      const entity1 = table.define({
        name: "Entity1",
        schema: schema1,
      });

      const entity2 = table.define({
        name: "Entity2",
        schema: schema2,
      });

      const entities = table.getEntities();
      expect(entities).toHaveLength(2);
      expect(entities).toContain(entity1);
      expect(entities).toContain(entity2);
    });
  });

  describe("getConfig", () => {
    it("should return table configuration", () => {
      const config = table.getConfig();
      expect(config).toEqual({
        name: "test-table",
        documentClient,
        indexes: {
          gsi1: {
            pk: "GSI1PK",
            sk: "GSI1SK",
          },
        },
      });
    });
  });
});
