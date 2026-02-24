import { Resource } from "sst";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, PutCommand, QueryCommand } from "@aws-sdk/lib-dynamodb";
import { generateCode } from "@url-shortener/core";
import type { ClickEvent, ClickRecord } from "@url-shortener/core";

const client = DynamoDBDocumentClient.from(new DynamoDBClient());

export const AnalyticsStore = {
  async saveClick(event: ClickEvent): Promise<void> {
    const clickId = generateCode(12);
    await client.send(
      new PutCommand({
        TableName: Resource.AnalyticsTable.name,
        Item: { clickId, ...event },
      })
    );
  },

  async findByCode(code: string, limit = 10): Promise<ClickRecord[]> {
    const result = await client.send(
      new QueryCommand({
        TableName: Resource.AnalyticsTable.name,
        IndexName: "codeIndex",
        KeyConditionExpression: "code = :code",
        ExpressionAttributeValues: { ":code": code },
        ScanIndexForward: false,
        Limit: limit,
      })
    );
    return (result.Items as ClickRecord[]) || [];
  },

  async countByCode(code: string): Promise<number> {
    const result = await client.send(
      new QueryCommand({
        TableName: Resource.AnalyticsTable.name,
        IndexName: "codeIndex",
        KeyConditionExpression: "code = :code",
        ExpressionAttributeValues: { ":code": code },
        Select: "COUNT",
      })
    );
    return result.Count || 0;
  },
};
