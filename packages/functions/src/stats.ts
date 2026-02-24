import { AnalyticsStore } from './lib/analytics-store.js';
import { withInstrumentation, type ApiGatewayEvent } from './lib/handler.js';

const CODE_REGEX = /^[A-Za-z0-9_-]{1,20}$/;

export const handler = withInstrumentation('stats', async (raw) => {
  const event = raw as ApiGatewayEvent;
  const code = event.pathParameters?.code;
  if (code === undefined || code === '' || !CODE_REGEX.test(code)) {
    return {
      statusCode: 400,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Invalid code' }),
    };
  }

  const [recentClicks, totalClicks] = await Promise.all([
    AnalyticsStore.findByCode(code, 10),
    AnalyticsStore.countByCode(code),
  ]);

  return {
    statusCode: 200,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      code,
      totalClicks,
      recentClicks,
    }),
  };
});
