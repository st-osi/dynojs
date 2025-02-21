import type { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";
import type { ZodString, ZodNumber } from "zod";

export interface TableConstructor {
  name: string;
  documentClient: DynamoDBDocumentClient;
  pk: {
    name: string;
    type: ZodString | ZodNumber; //Todo: Need to support binary key
  };
}

export class Table {
  constructor(private tableConstructor: TableConstructor) {}
  get() {
    return this.tableConstructor;
  }
}
