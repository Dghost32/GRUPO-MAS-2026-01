import { generateCode, isValidUrl } from "@url-shortener/core";
import { UrlStore } from "./lib/url-store.js";
import { withInstrumentation } from "./lib/handler.js";

export const handler = withInstrumentation("create", async (event) => {
  const body = JSON.parse(event.body || "{}");
  const { url } = body;

  if (!url || !isValidUrl(url)) {
    return { statusCode: 400, body: JSON.stringify({ error: "Invalid URL" }) };
  }

  const code = generateCode();
  const domain = event.requestContext?.domainName || "localhost";
  await UrlStore.save(code, url);

  return {
    statusCode: 201,
    body: JSON.stringify({ shortUrl: `https://${domain}/${code}`, code }),
  };
});
