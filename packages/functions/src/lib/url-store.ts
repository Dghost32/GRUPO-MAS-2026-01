import { Resource } from 'sst';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand, GetCommand } from '@aws-sdk/lib-dynamodb';

const client = DynamoDBDocumentClient.from(new DynamoDBClient());

export interface UrlRecord {
  code: string;
  originalUrl: string;
  createdAt: number;
}

// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
const urlTableName: string = Resource.UrlTable.name;

export const UrlStore = {
  async save(code: string, originalUrl: string): Promise<void> {
    await client.send(
      new PutCommand({
        TableName: urlTableName,
        Item: { code, originalUrl, createdAt: Date.now() },
        ConditionExpression: 'attribute_not_exists(code)',
      }),
    );
  },

  async findByCode(code: string): Promise<UrlRecord | null> {
    const result = await client.send(
      new GetCommand({
        TableName: urlTableName,
        Key: { code },
      }),
    );
    return (result.Item as UrlRecord | undefined) ?? null;
  },
};
