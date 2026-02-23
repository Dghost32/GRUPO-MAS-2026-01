import { AnalyticsStore } from "./lib/analytics-store.js";
import { withInstrumentation } from "./lib/handler.js";

export const handler = withInstrumentation("stats", async (event) => {
  const code = event.pathParameters?.code;
  if (!code) {
    return { statusCode: 400, body: JSON.stringify({ error: "Missing code" }) };
  }

  const clicks = await AnalyticsStore.findByCode(code);

  return {
    statusCode: 200,
    body: JSON.stringify({
      code,
      totalClicks: clicks.length,
      recentClicks: clicks.slice(0, 10),
    }),
  };
});
