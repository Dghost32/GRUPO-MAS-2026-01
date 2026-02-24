import { AnalyticsStore } from "./lib/analytics-store.js";
import { withInstrumentation } from "./lib/handler.js";
import type { ClickEvent } from "@url-shortener/core";

export const handler = withInstrumentation(
  "track",
  async (event: any) => {
    const results = await Promise.allSettled(
      event.Records.map(async (record: { Sns: { Message: string } }) => {
        try {
          const clickEvent: ClickEvent = JSON.parse(record.Sns.Message);

          // Runtime validation of required fields
          if (
            typeof clickEvent.code !== "string" ||
            typeof clickEvent.timestamp !== "number" ||
            typeof clickEvent.userAgent !== "string" ||
            typeof clickEvent.ip !== "string"
          ) {
            console.error("Invalid click event shape", { raw: record.Sns.Message });
            return;
          }

          await AnalyticsStore.saveClick(clickEvent);
        } catch (err) {
          console.error("Failed to process click event", {
            message: record.Sns.Message,
            error: err instanceof Error ? err.message : String(err),
          });
        }
      })
    );

    const failed = results.filter((r) => r.status === "rejected").length;
    if (failed > 0) {
      throw new Error(`${failed}/${results.length} records failed`);
    }

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ processed: event.Records.length }),
    };
  },
  { rethrow: true }
);
