import {
  DynamoDBDocumentClient,
  GetCommand,
  PutCommand,
  UpdateCommand,
  DeleteCommand,
  QueryCommand,
  ScanCommand,
  BatchGetCommand,
  BatchWriteCommand,
} from "@aws-sdk/lib-dynamodb";
import { z } from "zod";
import type { Entity, EntityConfig, QueryOptions } from "./types";

export function createEntity<T>(config: EntityConfig<T>): Entity<T> {
  return new EntityImpl(config);
}

class EntityImpl<T> implements Entity<T> {
  constructor(private config: EntityConfig<T>) {}

  get name(): string {
    return this.config.name;
  }

  get schema(): z.ZodType<T> {
    return this.config.schema;
  }

  get table(): string {
    return this.config.table;
  }

  get indexes(): EntityConfig<T>["indexes"] {
    return this.config.indexes;
  }

  get documentClient(): DynamoDBDocumentClient {
    return this.config.documentClient;
  }

  async get(key: { pk: string; sk: string }): Promise<T | undefined> {
    const command = new GetCommand({
      TableName: this.table,
      Key: key,
    });

    const response = await this.documentClient.send(command);
    if (!response.Item) return undefined;

    return this.schema.parse(response.Item);
  }

  async put(item: T): Promise<T> {
    const validatedItem = this.schema.parse(item);

    const command = new PutCommand({
      TableName: this.table,
      Item: validatedItem as Record<string, any>,
    });

    await this.documentClient.send(command);
    return validatedItem;
  }

  async update(
    key: { pk: string; sk: string },
    updates: Partial<T>
  ): Promise<T> {
    const updateExpressions: string[] = [];
    const expressionAttributeNames: Record<string, string> = {};
    const expressionAttributeValues: Record<string, any> = {};

    Object.entries(updates).forEach(([key, value]) => {
      const attributeName = `#${key}`;
      const attributeValue = `:${key}`;

      updateExpressions.push(`${attributeName} = ${attributeValue}`);
      expressionAttributeNames[attributeName] = key;
      expressionAttributeValues[attributeValue] = value;
    });

    const command = new UpdateCommand({
      TableName: this.table,
      Key: key,
      UpdateExpression: `SET ${updateExpressions.join(", ")}`,
      ExpressionAttributeNames: expressionAttributeNames,
      ExpressionAttributeValues: expressionAttributeValues,
      ReturnValues: "ALL_NEW",
    });

    const response = await this.documentClient.send(command);
    return this.schema.parse(response.Attributes);
  }

  async delete(key: { pk: string; sk: string }): Promise<void> {
    const command = new DeleteCommand({
      TableName: this.table,
      Key: key,
    });

    await this.documentClient.send(command);
  }

  async query(options: QueryOptions): Promise<T[]> {
    const { keyCondition, filter, limit, scanIndexForward } = options;

    const command = new QueryCommand({
      TableName: this.table,
      KeyConditionExpression: this.buildKeyConditionExpression(keyCondition),
      FilterExpression: filter ? this.buildFilterExpression(filter) : undefined,
      ExpressionAttributeValues: this.buildExpressionAttributeValues(
        keyCondition,
        filter
      ),
      Limit: limit,
      ScanIndexForward: scanIndexForward,
    });

    const response = await this.documentClient.send(command);
    return (response.Items || []).map((item) => this.schema.parse(item));
  }

  async scan(options?: Omit<QueryOptions, "keyCondition">): Promise<T[]> {
    const { filter, limit } = options || {};

    const command = new ScanCommand({
      TableName: this.table,
      FilterExpression: filter ? this.buildFilterExpression(filter) : undefined,
      ExpressionAttributeValues: filter
        ? this.buildExpressionAttributeValues(undefined, filter)
        : undefined,
      Limit: limit,
    });

    const response = await this.documentClient.send(command);
    return (response.Items || []).map((item) => this.schema.parse(item));
  }

  async batchGet(keys: { pk: string; sk: string }[]): Promise<T[]> {
    const command = new BatchGetCommand({
      RequestItems: {
        [this.table]: {
          Keys: keys,
        },
      },
    });

    const response = await this.documentClient.send(command);
    return (response.Responses?.[this.table] || []).map((item) =>
      this.schema.parse(item)
    );
  }

  async batchWrite(items: {
    put?: T[];
    delete?: { pk: string; sk: string }[];
  }): Promise<void> {
    const requestItems: Record<string, any>[] = [];

    if (items.put) {
      requestItems.push(
        ...items.put.map((item) => ({
          PutRequest: {
            Item: this.schema.parse(item),
          },
        }))
      );
    }

    if (items.delete) {
      requestItems.push(
        ...items.delete.map((key) => ({
          DeleteRequest: {
            Key: key,
          },
        }))
      );
    }

    const command = new BatchWriteCommand({
      RequestItems: {
        [this.table]: requestItems,
      },
    });

    await this.documentClient.send(command);
  }

  private buildKeyConditionExpression(
    keyCondition?: QueryOptions["keyCondition"]
  ): string | undefined {
    if (!keyCondition) return undefined;

    const conditions: string[] = [];
    conditions.push("pk = :pk");

    if (keyCondition.sk) {
      if (typeof keyCondition.sk === "string") {
        conditions.push("sk = :sk");
      } else if ("beginsWith" in keyCondition.sk) {
        conditions.push("begins_with(sk, :sk)");
      } else if ("between" in keyCondition.sk) {
        conditions.push("sk BETWEEN :skStart AND :skEnd");
      }
    }

    return conditions.join(" AND ");
  }

  private buildFilterExpression(
    filter?: Record<string, any>
  ): string | undefined {
    if (!filter) return undefined;

    return Object.entries(filter)
      .map(([key, value]) => {
        if (typeof value === "object" && value !== null) {
          if ("gt" in value) return `${key} > :${key}`;
          if ("gte" in value) return `${key} >= :${key}`;
          if ("lt" in value) return `${key} < :${key}`;
          if ("lte" in value) return `${key} <= :${key}`;
          if ("between" in value)
            return `${key} BETWEEN :${key}Start AND :${key}End`;
        }
        return `${key} = :${key}`;
      })
      .join(" AND ");
  }

  private buildExpressionAttributeValues(
    keyCondition?: QueryOptions["keyCondition"],
    filter?: Record<string, any>
  ): Record<string, any> | undefined {
    const values: Record<string, any> = {};

    if (keyCondition) {
      values[":pk"] = keyCondition.pk;

      if (keyCondition.sk) {
        if (typeof keyCondition.sk === "string") {
          values[":sk"] = keyCondition.sk;
        } else if ("beginsWith" in keyCondition.sk) {
          values[":sk"] = keyCondition.sk.beginsWith;
        } else if ("between" in keyCondition.sk) {
          values[":skStart"] = keyCondition.sk.between[0];
          values[":skEnd"] = keyCondition.sk.between[1];
        }
      }
    }

    if (filter) {
      Object.entries(filter).forEach(([key, value]) => {
        if (typeof value === "object" && value !== null) {
          if ("gt" in value) values[`:${key}`] = value.gt;
          else if ("gte" in value) values[`:${key}`] = value.gte;
          else if ("lt" in value) values[`:${key}`] = value.lt;
          else if ("lte" in value) values[`:${key}`] = value.lte;
          else if ("between" in value) {
            values[`:${key}Start`] = value.between[0];
            values[`:${key}End`] = value.between[1];
          }
        } else {
          values[`:${key}`] = value;
        }
      });
    }

    return Object.keys(values).length > 0 ? values : undefined;
  }
}
