// This class is used to build the condition expression with javascript/typescript chain methods
// functions like `eq`, `gt`, `lt`, `gte`, `lte`, `between`, `in`, `exists`, `beginsWith`, `contains`, `size`
// and conditional functions like `and`, `or`, `not`

import { z, ZodSchema, infer as ZodInfer } from "zod";

// reference: https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/Expressions.OperatorsAndFunctions.html
export class ConditionBuilder {
  private conditionExpression: string = "";
  private expressionAttributeNames: Record<string, string> = {};
  private expressionAttributeValues: Record<string, any> = {};
  private conditionCounter: number = 0;

  private addConditionExpression(operator: string, key: string, value: any) {
    const expressionName = `#c${this.conditionCounter}`;
    const expressionValue = `:v${this.conditionCounter}`;
    this.conditionCounter += 1;

    this.conditionExpression += ` ${operator} ${expressionName} ${
      value ? expressionValue : ""
    }`;
    this.expressionAttributeNames[expressionName] = key;
    if (value) {
      this.expressionAttributeValues[expressionValue] = value;
    }
  }

  eq(key: string, value: any) {
    this.addConditionExpression("=", key, value);
    return this;
  }

  ne(key: string, value: any) {
    this.addConditionExpression("<>", key, value);
    return this;
  }

  gt(key: string, value: any) {
    this.addConditionExpression(">", key, value);
    return this;
  }

  lt(key: string, value: any) {
    this.addConditionExpression("<", key, value);
    return this;
  }

  gte(key: string, value: any) {
    this.addConditionExpression(">=", key, value);
    return this;
  }

  lte(key: string, value: any) {
    this.addConditionExpression("<=", key, value);
    return this;
  }

  #countCondition() {
    const expName = `#c${this.conditionCounter}`;
    const expValue = `:v${this.conditionCounter}`;
    this.conditionCounter += 1;
    return { expName, expValue };
  }

  between(key: string, value1: any, value2: any) {
    const expressionName1 = `#c${this.conditionCounter}`;
    const expressionValue1 = `:v${this.conditionCounter}`;
    this.conditionCounter += 1;

    const expressionName2 = `#c${this.conditionCounter}`;
    const expressionValue2 = `:v${this.conditionCounter}`;
    this.conditionCounter += 1;

    this.conditionExpression += ` BETWEEN ${expressionName1} AND ${expressionName2}`;
    this.expressionAttributeNames[expressionName1] = key;
    this.expressionAttributeValues[expressionValue1] = value1;
    this.expressionAttributeNames[expressionName2] = key;
    this.expressionAttributeValues[expressionValue2] = value2;

    return this;
  }

  in(key: string, values: any[]) {
    const expressionName = `#c${this.conditionCounter}`;
    const expressionValue = `:v${this.conditionCounter}`;
    this.conditionCounter += 1;

    this.conditionExpression += ` IN (${expressionValue})`;
    this.expressionAttributeNames[expressionName] = key;
    this.expressionAttributeValues[expressionValue] = values;
    return this;
  }

  exists(key: string) {
    this.addConditionExpression("attribute_exists", key, null);
    return this;
  }

  beginsWith(key: string, value: any) {
    this.addConditionExpression("begins_with", key, value);
    return this;
  }

  contains(key: string, value: any) {
    this.addConditionExpression("contains", key, value);
    return this;
  }

  size(key: string) {
    this.addConditionExpression("size", key, null);
    return this;
  }

  and() {
    this.conditionExpression += " AND";
    return this;
  }

  or() {
    this.conditionExpression += " OR";
    return this;
  }

  not() {
    this.conditionExpression += " NOT";
    return this;
  }

  build() {
    return {
      conditionExpression: this.conditionExpression,
      expressionAttributeNames: this.expressionAttributeNames,
      expressionAttributeValues: this.expressionAttributeValues,
    };
  }
}

class ConditionBuilderWithSchema<T extends ZodSchema> extends ConditionBuilder {
  private conditions: Condition<T>;
  constructor(private schema: ZodSchema) {
    super();
    this.conditions = new Condition<T>(this.schema);
  }
  get c() {
    return this.conditions;
  }

  and(...condtions: Condition<T>[]) {
    super.and();
    return this;
  }

  or(...condtions: Condition<T>[]) {
    super.or();
    return this;
  }

  not(...condtions: Condition<T>[]) {
    super.not();
    return this;
  }
}

type NestedKeyOf<ObjectType extends object> = {
  [Key in keyof ObjectType & (string | number)]: ObjectType[Key] extends object
    ? `${Key}` | `${Key}.${NestedKeyOf<ObjectType[Key]>}`
    : `${Key}`;
}[keyof ObjectType & (string | number)];

export class Condition<T extends ZodSchema> {
  private schema: ZodSchema;
  constructor(schema: ZodSchema) {
    this.schema = schema;
  }

  eq<Key extends NestedKeyOf<ZodInfer<T>>>(key: Key, value: unknown) {
    // implementation
    return this;
  }
  ne<Key extends NestedKeyOf<ZodInfer<T>>>(key: Key, value: unknown) {
    // implementation
    return this;
  }
}

const someZodSchema = z.object({
  key1: z.string(),
  key2: z.number(),
  key3: z.boolean(),
  key4: z.object({
    nestedKey: z.string(),
  }),
  key5: z.object({
    nestedKey2: z.object({
      nestedKey3: z.string(),
    }),
  }),
  key6: z.array(z.string()), // still need to think about hwo to handle with arrays
});

const builder = new ConditionBuilderWithSchema<typeof someZodSchema>(
  someZodSchema
); // pass schema here
const cond = builder.c; // this is the condition object

builder
  .and(cond.ne("key1", 10).eq("key2", 100))
  .or(
    builder.c
      .eq("key4.nestedKey", "value")
      .ne("key5.nestedKey2.nestedKey3", "10")
  );

// what about only one condition?
// builder.cond.eq("key1", 10);
