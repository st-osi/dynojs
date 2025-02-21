import { Table } from "@/table/table";
import { ZodSchema } from "zod";
import { describe, it, expect, beforeEach } from "vitest";
import { Entity, type EntityConstructor } from "./entity";

describe("Entity", () => {
  let mockTable: Table;
  let mockSchema: ZodSchema;
  let entityConstructor: EntityConstructor;

  beforeEach(() => {
    mockTable = {} as Table;
    mockSchema = {} as ZodSchema;
    entityConstructor = {
      name: "TestEntity",
      table: mockTable,
      schema: mockSchema,
    };
  });

  it("should create an instance with constructor params", () => {
    const entity = new Entity(entityConstructor);
    expect(entity).toBeInstanceOf(Entity);
  });

  it("should have private entityPrefix property", () => {
    const entity = new Entity(entityConstructor);
    expect((entity as any).entityPrefix).toBe("_et");
  });

  it("should store entityConstructor properly", () => {
    const entity = new Entity(entityConstructor);
    expect((entity as any).entityConstructor).toEqual(entityConstructor);
  });
});
