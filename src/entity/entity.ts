import { Table } from "@/table/table";

// we will have entity class here
interface EntityConstructor {
  name: string;
  table: Table;
  pk: string;
  sk: string;
  indexes?: {
    [key: string]: string;
  };
}
export class Entity {
  constructor(private entityConstructor: EntityConstructor) {}
}
