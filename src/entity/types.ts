import { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";
import { z } from "zod";

export interface IndexConfig {
  pk: string;
  sk: string;
}

export interface EntityConfig<T> {
  name: string;
  schema: z.ZodType<T>;
  table: string;
  indexes?: Record<string, IndexConfig>;
  documentClient: DynamoDBDocumentClient;
}

export interface KeyCondition {
  [key: string]:
    | string
    | { beginsWith: string }
    | { between: [string, string] }
    | undefined;
}

export interface QueryOptions {
  keyCondition: KeyCondition;
  filter?: Record<string, any>;
  limit?: number;
  index?: string;
  scanIndexForward?: boolean;
}

export interface ScanOptions {
  filter?: Record<string, any>;
  limit?: number;
  index?: string;
}

export interface BatchGetOptions {
  keys: Record<string, any>[];
  index?: string;
}

export interface BatchWriteOptions {
  put?: Record<string, any>[];
  delete?: Record<string, any>[];
  index?: string;
}

export interface Entity<T> {
  name: string;
  schema: z.ZodType<T>;
  table: string;
  indexes?: EntityConfig<T>["indexes"];
  documentClient: DynamoDBDocumentClient;

  // CRUD Operations
  get(key: Record<string, any>): Promise<T | undefined>;
  put(item: T): Promise<T>;
  update(key: Record<string, any>, updates: Partial<T>): Promise<T>;
  delete(key: Record<string, any>): Promise<void>;

  // Query Operations
  query(options: QueryOptions): Promise<T[]>;
  scan(options?: ScanOptions): Promise<T[]>;

  // Batch Operations
  batchGet(options: BatchGetOptions): Promise<T[]>;
  batchWrite(options: BatchWriteOptions): Promise<void>;
}
