# Serverless URL Shortener

POC for Software Architecture class — demonstrates serverless patterns, event-driven architecture, and design patterns on AWS.

## Architecture

```
Client
  |
  +-- POST /shorten ----> Lambda (create) ----> DynamoDB (UrlTable)
  |
  +-- GET /:code -------> Lambda (redirect) --> DynamoDB (UrlTable)
  |                                         \-> SNS (ClickTopic) [async]
  |                                                   |
  |                                                   v
  |                                             Lambda (track) --> DynamoDB (AnalyticsTable)
  |
  +-- GET /stats/:code -> Lambda (stats) -----> DynamoDB (AnalyticsTable via GSI)
```

## Tech Stack

| Component | Technology |
|-----------|-----------|
| Runtime | TypeScript (Node.js 22) |
| IaC | SST v3 (Ion) |
| Compute | AWS Lambda |
| API | API Gateway v2 (HTTP) |
| Database | DynamoDB (2 tables) |
| Messaging | SNS |
| Load Testing | Artillery |

## Project Structure

```
url-shortener/
├── sst.config.ts                         # All infrastructure defined here
├── packages/
│   ├── core/                             # Pure business logic (zero AWS deps)
│   │   └── src/
│   │       ├── url.ts                    # generateCode(), isValidUrl()
│   │       ├── analytics.ts              # ClickEvent, ClickRecord types
│   │       └── index.ts                  # Barrel export
│   └── functions/                        # Lambda handlers
│       └── src/
│           ├── lib/                      # Facades and utilities
│           │   ├── url-store.ts          # Facade: DynamoDB UrlTable operations
│           │   ├── analytics-store.ts    # Facade: DynamoDB AnalyticsTable operations
│           │   ├── event-publisher.ts    # Facade: SNS publish operations
│           │   ├── handler.ts            # Decorator: cold start + error handling
│           │   └── index.ts
│           ├── create.ts                 # POST /shorten (Adapter)
│           ├── redirect.ts              # GET /:code (Adapter)
│           ├── track.ts                  # SNS consumer (Adapter)
│           └── stats.ts                  # GET /stats/:code (Adapter)
├── loadtest.yml                          # Artillery load test config
└── docs/plans/                           # Design and implementation docs
```

## Design Patterns

### Structural Patterns

#### 1. Facade
**Where:** `packages/functions/src/lib/` — `UrlStore`, `AnalyticsStore`, `EventPublisher`

Simplifies complex AWS SDK interactions behind clean interfaces. Instead of each handler creating DynamoDB clients and building commands, they call simple methods:

```typescript
// Before (in each handler):
const client = DynamoDBDocumentClient.from(new DynamoDBClient());
await client.send(new PutCommand({
  TableName: Resource.UrlTable.name,
  Item: { code, originalUrl, createdAt: Date.now() },
}));

// After (with Facade):
await UrlStore.save(code, url);
```

#### 2. Decorator
**Where:** `packages/functions/src/lib/handler.ts` — `withInstrumentation()`

Wraps Lambda handlers with cross-cutting concerns (cold start timing, error handling) without modifying handler logic:

```typescript
// The decorator adds instrumentation and error handling transparently
export const handler = withInstrumentation("create", async (event) => {
  // Handler only contains business logic, no boilerplate
});
```

#### 3. Adapter
**Where:** All 4 handler files (`create.ts`, `redirect.ts`, `track.ts`, `stats.ts`)

Each handler adapts the AWS Lambda event format to our domain. They translate between the external interface (Lambda events, HTTP responses) and the internal domain (facades, core logic):

```
Lambda Event --> [Adapter/Handler] --> Facade --> AWS Service
                      |
                      v
               HTTP Response
```

### Behavioral Patterns

#### 4. Observer (Pub/Sub)
**Where:** SNS ClickTopic + track Lambda

The redirect handler publishes click events to SNS without knowing who consumes them. The track handler subscribes and processes events independently. Producer and consumer are completely decoupled:

```
redirect.ts --publish--> SNS ClickTopic --subscribe--> track.ts
(publisher)              (event bus)                    (subscriber)
```

Adding new subscribers (e.g., a real-time dashboard, fraud detection) requires zero changes to the redirect handler.

### Creational Patterns

#### 5. Singleton
**Where:** Module-level AWS SDK clients in each facade

```typescript
// Module-level = created once, reused across all Lambda invocations
const client = DynamoDBDocumentClient.from(new DynamoDBClient());
```

Lambda reuses the execution environment between warm invocations. Module-level clients act as Singletons — initialized once on cold start, reused for subsequent requests. This avoids the overhead of creating new TCP connections on every request.

## API Endpoints

### POST /shorten
Creates a shortened URL.

```bash
curl -X POST https://<API_URL>/shorten \
  -H "Content-Type: application/json" \
  -d '{"url": "https://example.com"}'
```

Response (201):
```json
{ "shortUrl": "https://<API_URL>/abc1234", "code": "abc1234" }
```

### GET /{code}
Redirects to the original URL and tracks the click asynchronously.

```bash
curl -I https://<API_URL>/abc1234
# HTTP/2 302
# Location: https://example.com
```

### GET /stats/{code}
Returns click analytics for a short code.

```bash
curl https://<API_URL>/stats/abc1234
```

Response (200):
```json
{
  "code": "abc1234",
  "totalClicks": 42,
  "recentClicks": [
    { "clickId": "...", "timestamp": 1708..., "userAgent": "...", "ip": "..." }
  ]
}
```

## DynamoDB Schema

### UrlTable
| Key | Type | Description |
|-----|------|-------------|
| `code` (PK) | String | 7-char nanoid short code |
| `originalUrl` | String | The full URL to redirect to |
| `createdAt` | Number | Unix timestamp |

### AnalyticsTable
| Key | Type | Description |
|-----|------|-------------|
| `clickId` (PK) | String | 12-char nanoid unique ID |
| `code` (GSI PK) | String | Short code this click belongs to |
| `timestamp` (GSI SK) | Number | When the click happened |
| `userAgent` | String | Browser/client user agent |
| `ip` | String | Client IP address |

**GSI `codeIndex`:** Enables efficient queries for "all clicks for code X, sorted by time" without scanning the entire table.

## Cold Start Instrumentation

Every Lambda logs structured JSON on each invocation:

```json
{
  "handler": "redirect",
  "coldStart": true,
  "initDuration": 245,
  "executionDuration": 12
}
```

- `coldStart`: Whether this was the first invocation after a new container was created
- `initDuration`: Time spent in module initialization (only on cold starts)
- `executionDuration`: Time spent in the handler logic

## Commands

```bash
# Development (live Lambda debugging)
npx sst dev

# Deploy to production
npx sst deploy --stage prod

# Remove all resources
npx sst remove --stage dev

# Run load tests
API_URL=https://<your-api> TEST_CODE=<code> npx artillery run loadtest.yml
```

## Serverless Concepts Demonstrated

| Concept | Where |
|---------|-------|
| Synchronous request-reply | POST /shorten, GET /stats/:code |
| Asynchronous event processing | SNS ClickTopic -> track Lambda |
| Cold starts | Instrumentation in every handler |
| Auto-scaling | Lambda scales automatically with load |
| Pay-per-use | No idle costs, billed per request |
| Infrastructure as Code | Single `sst.config.ts` defines everything |
