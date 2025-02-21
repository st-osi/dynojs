import { Table } from "@/table/table";
import { ZodSchema } from "zod";

export interface EntityConstructor {
  name: string;
  table: Table;
  schema: ZodSchema; // TODO: Need to add support for keys
}

export class Entity {
  private entityPrefix = "_et";
  constructor(private entityConstructor: EntityConstructor) {}
  get() {
    return this.entityConstructor;
  }
}
