import { AnalyticsStore } from "./lib/analytics-store.js";
import { withInstrumentation } from "./lib/handler.js";

const CODE_REGEX = /^[A-Za-z0-9_-]{1,20}$/;

export const handler = withInstrumentation("stats", async (event: any) => {
  const code = event.pathParameters?.code;
  if (!code || !CODE_REGEX.test(code)) {
    return {
      statusCode: 400,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ error: "Invalid code" }),
    };
  }

  const [recentClicks, totalClicks] = await Promise.all([
    AnalyticsStore.findByCode(code, 10),
    AnalyticsStore.countByCode(code),
  ]);

  return {
    statusCode: 200,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      code,
      totalClicks,
      recentClicks,
    }),
  };
});
