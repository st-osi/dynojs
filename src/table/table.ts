import { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";
import type { ZodUnion, ZodString, ZodNumber, ZodSchema } from "zod";

export interface TableConstructor {
  name: string;
  documentClient: DynamoDBDocumentClient;
  pk: {
    name: string;
    type: ZodString | ZodNumber;
  };
}

export class Table {
  constructor(private tableConstructor: TableConstructor) {}
  get() {
    return this.tableConstructor;
  }
}
