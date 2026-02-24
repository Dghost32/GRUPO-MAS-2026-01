import { UrlStore } from './lib/url-store.js';
import { EventPublisher } from './lib/event-publisher.js';
import { withInstrumentation, type LambdaResponse, type ApiGatewayEvent } from './lib/handler.js';

const CODE_REGEX = /^[A-Za-z0-9_-]{1,20}$/;

export const handler = withInstrumentation('redirect', async (raw): Promise<LambdaResponse> => {
  const event = raw as ApiGatewayEvent;
  const code = event.pathParameters?.code;
  if (code === undefined || code === '' || !CODE_REGEX.test(code)) {
    return {
      statusCode: 400,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Invalid code' }),
    };
  }

  const record = await UrlStore.findByCode(code);
  if (record === null) {
    return {
      statusCode: 404,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Not found' }),
    };
  }

  // Validate stored URL scheme before redirecting (defense-in-depth)
  let isValidScheme = false;
  try {
    const parsed = new URL(record.originalUrl);
    isValidScheme = parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    // invalid URL in DB
  }

  if (!isValidScheme) {
    return {
      statusCode: 400,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Invalid redirect target' }),
    };
  }

  await EventPublisher.publishClick({
    code,
    timestamp: Date.now(),
    userAgent: event.headers?.['user-agent'] ?? 'unknown',
    ip: event.requestContext?.http?.sourceIp ?? 'unknown',
  });

  return {
    statusCode: 302,
    headers: {
      Location: record.originalUrl,
      'Cache-Control': 'no-cache, no-store',
      'Referrer-Policy': 'no-referrer',
      'X-Content-Type-Options': 'nosniff',
    },
    body: '',
  };
});
