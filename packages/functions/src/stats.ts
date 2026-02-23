import { Resource } from "sst";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, QueryCommand } from "@aws-sdk/lib-dynamodb";

const client = DynamoDBDocumentClient.from(new DynamoDBClient());

const coldStartTime = Date.now();
let isColdStart = true;

export async function handler(event: {
  pathParameters?: { code?: string };
}) {
  const startTime = Date.now();
  const wasColdStart = isColdStart;
  isColdStart = false;

  const code = event.pathParameters?.code;
  if (!code) {
    return { statusCode: 400, body: JSON.stringify({ error: "Missing code" }) };
  }

  try {
    const result = await client.send(
      new QueryCommand({
        TableName: Resource.AnalyticsTable.name,
        IndexName: "codeIndex",
        KeyConditionExpression: "code = :code",
        ExpressionAttributeValues: { ":code": code },
        ScanIndexForward: false, // newest first
      })
    );

    const items = result.Items || [];

    console.log(
      JSON.stringify({
        handler: "stats",
        coldStart: wasColdStart,
        initDuration: wasColdStart ? startTime - coldStartTime : 0,
        executionDuration: Date.now() - startTime,
      })
    );

    return {
      statusCode: 200,
      body: JSON.stringify({
        code,
        totalClicks: items.length,
        recentClicks: items.slice(0, 10),
      }),
    };
  } catch (err) {
    console.error(err);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Internal server error" }),
    };
  }
}
