import { Resource } from "sst";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, GetCommand } from "@aws-sdk/lib-dynamodb";
import { SNSClient, PublishCommand } from "@aws-sdk/client-sns";

const dynamo = DynamoDBDocumentClient.from(new DynamoDBClient());
const sns = new SNSClient();

const coldStartTime = Date.now();
let isColdStart = true;

export async function handler(event: {
  pathParameters?: { code?: string };
  headers?: Record<string, string>;
  requestContext?: { http?: { sourceIp?: string } };
}) {
  const startTime = Date.now();
  const wasColdStart = isColdStart;
  isColdStart = false;

  const code = event.pathParameters?.code;
  if (!code) {
    return { statusCode: 400, body: JSON.stringify({ error: "Missing code" }) };
  }

  try {
    const result = await dynamo.send(
      new GetCommand({
        TableName: Resource.UrlTable.name,
        Key: { code },
      })
    );

    if (!result.Item) {
      return { statusCode: 404, body: JSON.stringify({ error: "Not found" }) };
    }

    const response = {
      statusCode: 302,
      headers: { Location: result.Item.originalUrl },
      body: "",
    };

    // Fire-and-forget: publish click event to SNS, don't block redirect
    sns
      .send(
        new PublishCommand({
          TopicArn: Resource.ClickTopic.arn,
          Message: JSON.stringify({
            code,
            timestamp: Date.now(),
            userAgent: event.headers?.["user-agent"] || "unknown",
            ip: event.requestContext?.http?.sourceIp || "unknown",
          }),
        })
      )
      .catch((err) => console.error("SNS publish failed:", err));

    console.log(
      JSON.stringify({
        handler: "redirect",
        coldStart: wasColdStart,
        initDuration: wasColdStart ? startTime - coldStartTime : 0,
        executionDuration: Date.now() - startTime,
      })
    );

    return response;
  } catch (err) {
    console.error(err);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Internal server error" }),
    };
  }
}
