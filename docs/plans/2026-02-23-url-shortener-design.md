# Serverless URL Shortener — Design Document

**Date:** 2026-02-23
**Purpose:** POC for software architecture class demonstrating serverless patterns

## Tech Stack

- **Runtime:** TypeScript (Node.js 18+)
- **IaC:** SST v3 (Ion) — TypeScript-native, single `sst.config.ts`
- **Cloud:** AWS (Lambda, API Gateway v2, DynamoDB, SNS)
- **Package Manager:** npm workspaces
- **Utilities:** nanoid (short codes), Artillery (load testing)

## Architecture

```
Client
  │
  ├─ POST /shorten ──► Lambda (create) ──► DynamoDB (UrlTable)
  │
  ├─ GET /:code ─────► Lambda (redirect) ─► DynamoDB (UrlTable)
  │                                        └─► SNS (ClickTopic) [fire-and-forget]
  │                                                  │
  │                                                  ▼
  │                                            Lambda (track) ──► DynamoDB (AnalyticsTable)
  │
  └─ GET /stats/:code ► Lambda (stats) ──► DynamoDB (AnalyticsTable via GSI)
```

### Key Patterns

- **Synchronous request-reply:** POST /shorten, GET /stats/:code
- **Asynchronous event processing:** redirect publishes to SNS, track consumes
- **Fire-and-forget:** SNS publish does NOT block the 302 redirect response
- **Cold start instrumentation:** module-level timing in every handler

## Project Structure

```
url-shortener/
├── sst.config.ts              # All infrastructure
├── packages/
│   ├── core/                  # Pure logic, zero AWS deps
│   │   └── src/
│   │       ├── url.ts         # generateCode(), isValidUrl()
│   │       └── analytics.ts   # ClickEvent, ClickRecord types
│   └── functions/             # Thin Lambda handlers
│       └── src/
│           ├── create.ts      # POST /shorten
│           ├── redirect.ts    # GET /:code
│           ├── track.ts       # SNS consumer
│           └── stats.ts       # GET /stats/:code
├── loadtest.yml               # Artillery config
├── package.json
└── tsconfig.json
```

**Core vs Functions separation:** `core/` is testable pure logic with no AWS SDK imports. `functions/` are thin adapters that wire core logic to AWS services.

## DynamoDB Tables

### UrlTable
- **PK:** `code` (String)
- **Attributes:** `code`, `originalUrl`, `createdAt`

### AnalyticsTable
- **PK:** `clickId` (String)
- **GSI `codeIndex`:** PK = `code` (String), SK = `timestamp` (Number)
- **Attributes:** `clickId`, `code`, `timestamp`, `userAgent`, `ip`

The GSI enables efficient queries for "all clicks for a given code, sorted by time" without scanning the entire table.

## API Endpoints

### POST /shorten
- Input: `{ "url": "https://example.com" }`
- Validates URL with `new URL()`
- Generates 7-char code with nanoid
- Stores in UrlTable
- Returns 201: `{ "shortUrl": "https://{domain}/{code}", "code": "{code}" }`
- Returns 400: `{ "error": "Invalid URL" }`

### GET /{code}
- Looks up code in UrlTable
- If found: returns 302 with `Location` header, publishes click event to SNS (fire-and-forget)
- If not found: returns 404

### GET /stats/{code}
- Queries AnalyticsTable GSI by code
- Returns 200: `{ "code", "totalClicks", "recentClicks" }`

### SNS Consumer (track)
- Triggered by ClickTopic messages
- Parses event, generates clickId, writes to AnalyticsTable

## Cold Start Measurement

Module-level `Date.now()` captures init time. Each invocation logs structured JSON:

```json
{
  "coldStart": true,
  "initDuration": 245,
  "executionDuration": 12
}
```

## Load Testing

Artillery config with 30s sustained load at 50 requests/sec against the redirect endpoint.

## Prerequisites

- AWS CLI installed and configured with credentials
- SST v3 (already installed: v3.19.3)
- Node.js 18+ (already installed: v22.20.0)
