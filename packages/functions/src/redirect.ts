import { UrlStore } from "./lib/url-store.js";
import { EventPublisher } from "./lib/event-publisher.js";
import { withInstrumentation } from "./lib/handler.js";

export const handler = withInstrumentation("redirect", async (event) => {
  const code = event.pathParameters?.code;
  if (!code) {
    return { statusCode: 400, body: JSON.stringify({ error: "Missing code" }) };
  }

  const record = await UrlStore.findByCode(code);
  if (!record) {
    return { statusCode: 404, body: JSON.stringify({ error: "Not found" }) };
  }

  EventPublisher.publishClick({
    code,
    timestamp: Date.now(),
    userAgent: event.headers?.["user-agent"] || "unknown",
    ip: event.requestContext?.http?.sourceIp || "unknown",
  });

  return {
    statusCode: 302,
    headers: { Location: record.originalUrl },
    body: "",
  };
});
