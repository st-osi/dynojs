// this file will have implementation for table scan operation

import { Entity } from "@/entity/entity";
import { Table } from "./table";
import { string, type ZodType, enum as enum_, any } from "zod";
import { ScanCommand, type ScanCommandInput } from "@aws-sdk/lib-dynamodb";

type ComparisonOperator =
  | "EQ"
  | "NE"
  | "IN"
  | "LE"
  | "LT"
  | "GE"
  | "GT"
  | "BETWEEN"
  | "NOT_NULL"
  | "NULL"
  | "CONTAINS"
  | "NOT_CONTAINS"
  | "BEGINS_WITH";

interface ICondition {
  target: string;
  operator: ComparisonOperator;
  value: ZodType;
}

const ConditionSchema = {
  attr: string(),
  op: enum_(["EQ", "NE"]), // update this
  value: any(),
};

interface ScanOptions {
  entities?: Entity[];
  attributes?: Array<keyof Entity | string>;
  limit?: number;
  filter?: string; // map to filter expression
  filters?: Record<keyof Entity | string, ICondition>;
}

// can have two params options and schemas
interface ScanParams {
  table: Table;
  index?: string;
  options?: ScanOptions;
}

// TODO: will parse type and value based on the schema of the entity
// or type of the value
// or take the type in the schema
function getAttributeTypeAndValue(value: any) {
  if (typeof value === "string") {
    return "S";
  } else if (typeof value === "number") {
    return "N";
  }
  return "S";
}

export function scan(scanProps: ScanParams) {
  const input: ScanCommandInput = {
    TableName: scanProps.table.get().name,
    IndexName: scanProps.index,
    Limit: scanProps.options?.limit,
    FilterExpression: scanProps.options?.filter,
    AttributesToGet: scanProps.options?.attributes,
  };

  let ScanFilter: ScanCommandInput["ScanFilter"] = {};

  if (scanProps.options?.filters) {
    Object.entries(scanProps.options.filters).map(([key, cond]) => {
      const attributeType = getAttributeTypeAndValue(cond.value);
      const expression = {
        ComparisonOperator: cond.operator,
        AttributeValueList: [
          {
            [attributeType]: cond.value,
          },
        ],
      };
      ScanFilter[key] = expression;
    });

    input.ScanFilter = ScanFilter;
  }

  const command = new ScanCommand(input);
}
