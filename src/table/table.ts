import type { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";
import { z } from "zod";
import { createEntity } from "../entity/entity";
import type { Entity } from "@/entity/types";

export interface TableConfig {
  name: string;
  documentClient: DynamoDBDocumentClient;
  indexes?: {
    [key: string]: {
      pk: string;
      sk?: string;
    };
  };
}

export class Table {
  private entities: Map<string, Entity> = new Map();

  constructor(private config: TableConfig) {}

  /**
   * Define a new entity in the table
   */
  define<T extends z.ZodType>(options: {
    name: string;
    schema: T;
    indexes?: {
      [key: string]: {
        pk: string;
        sk?: string;
      };
    };
  }): Entity<z.infer<T>> {
    const entity = createEntity({
      name: options.name,
      schema: options.schema,
      table: this.config.name,
      indexes: {
        ...this.config.indexes,
        ...options.indexes,
      },
      documentClient: this.config.documentClient,
    });

    this.entities.set(options.name, entity);
    return entity;
  }

  /**
   * Get an entity by name
   */
  getEntity<T>(name: string): Entity<T> | undefined {
    return this.entities.get(name) as Entity<T> | undefined;
  }

  /**
   * Get all entities in the table
   */
  getEntities(): Entity<any>[] {
    return Array.from(this.entities.values());
  }

  /**
   * Get table configuration
   */
  getConfig(): TableConfig {
    return this.config;
  }
}
