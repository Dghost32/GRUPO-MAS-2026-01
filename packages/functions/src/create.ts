import { Resource } from "sst";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, PutCommand } from "@aws-sdk/lib-dynamodb";
import { generateCode, isValidUrl } from "@url-shortener/core";

const client = DynamoDBDocumentClient.from(new DynamoDBClient());

const coldStartTime = Date.now();
let isColdStart = true;

export async function handler(event: {
  body?: string;
  requestContext?: { domainName?: string };
}) {
  const startTime = Date.now();
  const wasColdStart = isColdStart;
  isColdStart = false;

  try {
    const body = JSON.parse(event.body || "{}");
    const { url } = body;

    if (!url || !isValidUrl(url)) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: "Invalid URL" }),
      };
    }

    const code = generateCode();
    const domain = event.requestContext?.domainName || "localhost";

    await client.send(
      new PutCommand({
        TableName: Resource.UrlTable.name,
        Item: {
          code,
          originalUrl: url,
          createdAt: Date.now(),
        },
      })
    );

    console.log(
      JSON.stringify({
        handler: "create",
        coldStart: wasColdStart,
        initDuration: wasColdStart ? startTime - coldStartTime : 0,
        executionDuration: Date.now() - startTime,
      })
    );

    return {
      statusCode: 201,
      body: JSON.stringify({
        shortUrl: `https://${domain}/${code}`,
        code,
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
