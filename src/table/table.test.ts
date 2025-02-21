import type { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";
import { describe, it, expect } from "vitest";
import { Table, TableConstructor } from "./table";
import { string } from "zod";

describe("Table", () => {
  const mockDocumentClient = {} as DynamoDBDocumentClient;

  it("should create a Table instance with constructor params", () => {
    const tableParams: TableConstructor = {
      name: "test-table",
      documentClient: mockDocumentClient,
      pk: {
        name: "id",
        type: string(),
      },
    };

    const table = new Table(tableParams);
    expect(table).toBeInstanceOf(Table);
  });
});
