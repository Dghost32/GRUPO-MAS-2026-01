import { Resource } from "sst";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, PutCommand } from "@aws-sdk/lib-dynamodb";
import { generateCode } from "@url-shortener/core";
import type { ClickEvent } from "@url-shortener/core";

const client = DynamoDBDocumentClient.from(new DynamoDBClient());

const coldStartTime = Date.now();
let isColdStart = true;

export async function handler(event: {
  Records: Array<{ Sns: { Message: string } }>;
}) {
  const startTime = Date.now();
  const wasColdStart = isColdStart;
  isColdStart = false;

  for (const record of event.Records) {
    const clickEvent: ClickEvent = JSON.parse(record.Sns.Message);
    const clickId = generateCode(12);

    await client.send(
      new PutCommand({
        TableName: Resource.AnalyticsTable.name,
        Item: {
          clickId,
          code: clickEvent.code,
          timestamp: clickEvent.timestamp,
          userAgent: clickEvent.userAgent,
          ip: clickEvent.ip,
        },
      })
    );
  }

  console.log(
    JSON.stringify({
      handler: "track",
      coldStart: wasColdStart,
      initDuration: wasColdStart ? startTime - coldStartTime : 0,
      executionDuration: Date.now() - startTime,
      recordsProcessed: event.Records.length,
    })
  );
}
