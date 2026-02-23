import { AnalyticsStore } from "./lib/analytics-store.js";
import { withInstrumentation } from "./lib/handler.js";
import type { ClickEvent } from "@url-shortener/core";

export const handler = withInstrumentation("track", async (event) => {
  for (const record of event.Records) {
    const clickEvent: ClickEvent = JSON.parse(record.Sns.Message);
    await AnalyticsStore.saveClick(clickEvent);
  }

  return { statusCode: 200, body: JSON.stringify({ processed: event.Records.length }) };
});
