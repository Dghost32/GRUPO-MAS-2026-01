import { Resource } from "sst";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, PutCommand, GetCommand } from "@aws-sdk/lib-dynamodb";

const client = DynamoDBDocumentClient.from(new DynamoDBClient());

export interface UrlRecord {
  code: string;
  originalUrl: string;
  createdAt: number;
}

export const UrlStore = {
  async save(code: string, originalUrl: string): Promise<void> {
    await client.send(
      new PutCommand({
        TableName: Resource.UrlTable.name,
        Item: { code, originalUrl, createdAt: Date.now() },
      })
    );
  },

  async findByCode(code: string): Promise<UrlRecord | null> {
    const result = await client.send(
      new GetCommand({
        TableName: Resource.UrlTable.name,
        Key: { code },
      })
    );
    return (result.Item as UrlRecord) || null;
  },
};
