import { describe, expect, test, beforeEach } from "vitest";
import { ConditionBuilder } from "./condition";

describe("ConditionBuilder", () => {
  let builder: ConditionBuilder;

  beforeEach(() => {
    builder = new ConditionBuilder();
  });

  test("and with other conditions", () => {
    const b = new ConditionBuilder();
    const result = builder.and(b.gt("somekey", 10)).build();
  });

  test("eq operator", () => {
    const result = builder.eq("name", "test").build();
    expect(result.conditionExpression).toBe(" = #c0 :v0");
    expect(result.expressionAttributeNames).toEqual({ "#c0": "name" });
    expect(result.expressionAttributeValues).toEqual({ ":v0": "test" });
  });

  test("gt operator", () => {
    const result = builder.gt("age", 18).build();
    expect(result.conditionExpression).toBe(" > #c0 :v0");
    expect(result.expressionAttributeNames).toEqual({ "#c0": "age" });
    expect(result.expressionAttributeValues).toEqual({ ":v0": 18 });
  });

  test("lt operator", () => {
    const result = builder.lt("price", 100).build();
    expect(result.conditionExpression).toBe(" < #c0 :v0");
    expect(result.expressionAttributeNames).toEqual({ "#c0": "price" });
    expect(result.expressionAttributeValues).toEqual({ ":v0": 100 });
  });

  test("gte operator", () => {
    const result = builder.gte("count", 5).build();
    expect(result.conditionExpression).toBe(" >= #c0 :v0");
    expect(result.expressionAttributeNames).toEqual({ "#c0": "count" });
    expect(result.expressionAttributeValues).toEqual({ ":v0": 5 });
  });

  test("lte operator", () => {
    const result = builder.lte("amount", 1000).build();
    expect(result.conditionExpression).toBe(" <= #c0 :v0");
    expect(result.expressionAttributeNames).toEqual({ "#c0": "amount" });
    expect(result.expressionAttributeValues).toEqual({ ":v0": 1000 });
  });

  test("between operator", () => {
    const result = builder.between("score", 1, 10).build();
    expect(result.conditionExpression).toBe(" BETWEEN #c0 AND #c1");
    expect(result.expressionAttributeNames).toEqual({
      "#c0": "score",
      "#c1": "score",
    });
    expect(result.expressionAttributeValues).toEqual({ ":v0": 1, ":v1": 10 });
  });

  test("in operator", () => {
    const result = builder.in("status", ["active", "pending"]).build();
    expect(result.conditionExpression).toBe(" IN (:v0)");
    expect(result.expressionAttributeNames).toEqual({ "#c0": "status" });
    expect(result.expressionAttributeValues).toEqual({
      ":v0": ["active", "pending"],
    });
  });

  test("exists operator", () => {
    const result = builder.exists("email").build();
    expect(result.conditionExpression).toBe(" attribute_exists #c0 ");
    expect(result.expressionAttributeNames).toEqual({ "#c0": "email" });
    expect(result.expressionAttributeValues).toEqual({});
  });

  test("beginsWith operator", () => {
    const result = builder.beginsWith("title", "Mr").build();
    expect(result.conditionExpression).toBe(" begins_with #c0 :v0");
    expect(result.expressionAttributeNames).toEqual({ "#c0": "title" });
    expect(result.expressionAttributeValues).toEqual({ ":v0": "Mr" });
  });

  test("contains operator", () => {
    const result = builder.contains("description", "test").build();
    expect(result.conditionExpression).toBe(" contains #c0 :v0");
    expect(result.expressionAttributeNames).toEqual({ "#c0": "description" });
    expect(result.expressionAttributeValues).toEqual({ ":v0": "test" });
  });

  test("size operator", () => {
    const result = builder.size("items").build();
    expect(result.conditionExpression).toBe(" size #c0 ");
    expect(result.expressionAttributeNames).toEqual({ "#c0": "items" });
    expect(result.expressionAttributeValues).toEqual({});
  });

  test("and operator", () => {
    const result = builder.eq("name", "test").and().eq("age", 18).build();
    expect(result.conditionExpression).toBe(" = #c0 :v0 AND = #c1 :v1");
    expect(result.expressionAttributeNames).toEqual({
      "#c0": "name",
      "#c1": "age",
    });
    expect(result.expressionAttributeValues).toEqual({
      ":v0": "test",
      ":v1": 18,
    });
  });

  test("or operator", () => {
    const result = builder
      .eq("status", "active")
      .or()
      .eq("status", "pending")
      .build();
    expect(result.conditionExpression).toBe(" = #c0 :v0 OR = #c1 :v1");
    expect(result.expressionAttributeNames).toEqual({
      "#c0": "status",
      "#c1": "status",
    });
    expect(result.expressionAttributeValues).toEqual({
      ":v0": "active",
      ":v1": "pending",
    });
  });

  test("not operator", () => {
    const result = builder.not().eq("deleted", true).build();
    expect(result.conditionExpression).toBe(" NOT = #c0 :v0");
    expect(result.expressionAttributeNames).toEqual({ "#c0": "deleted" });
    expect(result.expressionAttributeValues).toEqual({ ":v0": true });
  });

  test("complex condition", () => {
    const result = builder
      .eq("type", "user")
      .and()
      .not()
      .eq("status", "deleted")
      .and()
      .between("age", 18, 65)
      .or()
      .in("role", ["admin", "moderator"])
      .build();

    expect(result.conditionExpression).toBe(
      " = #c0 :v0 AND NOT = #c1 :v1 AND BETWEEN #c2 AND #c3 OR IN (:v4)",
    );
    expect(result.expressionAttributeNames).toEqual({
      "#c0": "type",
      "#c1": "status",
      "#c2": "age",
      "#c3": "age",
      "#c4": "role",
    });
    expect(result.expressionAttributeValues).toEqual({
      ":v0": "user",
      ":v1": "deleted",
      ":v2": 18,
      ":v3": 65,
      ":v4": ["admin", "moderator"],
    });
  });

  test("empty builder", () => {
    const result = builder.build();
    expect(result.conditionExpression).toBe("");
    expect(result.expressionAttributeNames).toEqual({});
    expect(result.expressionAttributeValues).toEqual({});
  });
});
