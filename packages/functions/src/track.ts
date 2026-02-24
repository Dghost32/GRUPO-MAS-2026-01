import { AnalyticsStore } from './lib/analytics-store.js';
import { withInstrumentation, type SnsEvent } from './lib/handler.js';
import type { ClickEvent } from '@url-shortener/core';

export const handler = withInstrumentation(
  'track',
  async (raw) => {
    const event = raw as SnsEvent;
    const results = await Promise.allSettled(
      event.Records.map(async (record) => {
        try {
          const clickEvent = JSON.parse(record.Sns.Message) as ClickEvent;

          // Runtime validation of required fields
          if (
            typeof clickEvent.code !== 'string' ||
            typeof clickEvent.timestamp !== 'number' ||
            typeof clickEvent.userAgent !== 'string' ||
            typeof clickEvent.ip !== 'string'
          ) {
            console.error('Invalid click event shape', { raw: record.Sns.Message });
            return;
          }

          await AnalyticsStore.saveClick(clickEvent);
        } catch (err) {
          console.error('Failed to process click event', {
            message: record.Sns.Message,
            error: err instanceof Error ? err.message : String(err),
          });
        }
      }),
    );

    const failed = results.filter((r) => r.status === 'rejected').length;
    if (failed > 0) {
      throw new Error(`${String(failed)}/${String(results.length)} records failed`);
    }

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ processed: event.Records.length }),
    };
  },
  { rethrow: true },
);
