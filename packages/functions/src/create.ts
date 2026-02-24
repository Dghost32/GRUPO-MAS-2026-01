import { generateCode, isValidUrl } from "@url-shortener/core";
import { UrlStore } from "./lib/url-store.js";
import { withInstrumentation } from "./lib/handler.js";

const CODE_REGEX = /^[A-Za-z0-9_-]+$/;

export const handler = withInstrumentation("create", async (event: any) => {
  let body: { url?: string };
  try {
    body = JSON.parse(event.body || "{}");
  } catch {
    return {
      statusCode: 400,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ error: "Invalid JSON body" }),
    };
  }

  const { url } = body;

  if (!url || !isValidUrl(url)) {
    return {
      statusCode: 400,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ error: "Invalid URL" }),
    };
  }

  const code = generateCode();
  const domain = event.requestContext?.domainName || "localhost";
  await UrlStore.save(code, url);

  return {
    statusCode: 201,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ shortUrl: `https://${domain}/${code}`, code }),
  };
});
