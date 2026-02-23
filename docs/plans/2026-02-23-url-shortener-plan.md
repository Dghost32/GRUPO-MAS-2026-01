# URL Shortener Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a serverless URL shortener with event-driven analytics on AWS using SST v3.

**Architecture:** Four Lambda handlers (create, redirect, track, stats) behind API Gateway v2, two DynamoDB tables (URLs and analytics), SNS topic decoupling redirects from analytics writes. Core logic separated from AWS handlers.

**Tech Stack:** TypeScript, SST v3 (Ion), AWS Lambda, API Gateway v2, DynamoDB, SNS, nanoid, Artillery

---

### Task 1: Project Scaffolding

**Files:**
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `packages/core/package.json`
- Create: `packages/core/tsconfig.json`
- Create: `packages/functions/package.json`
- Create: `packages/functions/tsconfig.json`

**Step 1: Initialize the SST project**

```bash
cd /Users/carlosjimenez/unisabana/2026-1/POC_Serverless
npx sst@latest init
```

Select AWS as the provider when prompted. This creates `sst.config.ts` and base `package.json`.

**Step 2: Set up npm workspaces**

Update root `package.json` to add workspaces:

```json
{
  "name": "url-shortener",
  "private": true,
  "workspaces": ["packages/*"],
  "scripts": {
    "dev": "sst dev",
    "deploy": "sst deploy",
    "remove": "sst remove"
  }
}
```

**Step 3: Create core package**

`packages/core/package.json`:
```json
{
  "name": "@url-shortener/core",
  "version": "0.0.1",
  "private": true,
  "type": "module",
  "main": "src/index.ts",
  "dependencies": {
    "nanoid": "^5.1.5"
  }
}
```

`packages/core/tsconfig.json`:
```json
{
  "extends": "../../tsconfig.json",
  "compilerOptions": {
    "outDir": "./dist",
    "rootDir": "./src"
  },
  "include": ["src/**/*"]
}
```

**Step 4: Create functions package**

`packages/functions/package.json`:
```json
{
  "name": "@url-shortener/functions",
  "version": "0.0.1",
  "private": true,
  "type": "module",
  "dependencies": {
    "@url-shortener/core": "*",
    "@aws-sdk/client-dynamodb": "^3.800.0",
    "@aws-sdk/lib-dynamodb": "^3.800.0",
    "@aws-sdk/client-sns": "^3.800.0",
    "sst": "^3.19.0"
  }
}
```

`packages/functions/tsconfig.json`:
```json
{
  "extends": "../../tsconfig.json",
  "compilerOptions": {
    "outDir": "./dist",
    "rootDir": "./src"
  },
  "include": ["src/**/*"]
}
```

**Step 5: Create root tsconfig.json**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "outDir": "./dist",
    "rootDir": "."
  },
  "exclude": ["node_modules", "dist"]
}
```

**Step 6: Install dependencies**

```bash
npm install
```

**Step 7: Commit**

```bash
git add -A
git commit -m "feat: scaffold project with npm workspaces and SST v3"
```

---

### Task 2: Core Business Logic

**Files:**
- Create: `packages/core/src/url.ts`
- Create: `packages/core/src/analytics.ts`
- Create: `packages/core/src/index.ts`

**Step 1: Create url.ts**

```typescript
import { nanoid } from "nanoid";

export function generateCode(length = 7): string {
  return nanoid(length);
}

export function isValidUrl(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}
```

**Step 2: Create analytics.ts**

```typescript
export interface ClickEvent {
  code: string;
  timestamp: number;
  userAgent: string;
  ip: string;
}

export interface ClickRecord extends ClickEvent {
  clickId: string;
}
```

**Step 3: Create index.ts barrel export**

```typescript
export { generateCode, isValidUrl } from "./url.js";
export type { ClickEvent, ClickRecord } from "./analytics.js";
```

**Step 4: Verify it compiles**

```bash
npx tsc --noEmit -p packages/core/tsconfig.json
```

Expected: No errors.

**Step 5: Commit**

```bash
git add packages/core/
git commit -m "feat: add core business logic (url helpers, analytics types)"
```

---

### Task 3: SST Infrastructure

**Files:**
- Modify: `sst.config.ts`

**Step 1: Define all infrastructure in sst.config.ts**

```typescript
/// <reference path="./.sst/platform/config.d.ts" />

export default $config({
  app(input) {
    return {
      name: "url-shortener",
      removal: input?.stage === "production" ? "retain" : "remove",
      home: "aws",
    };
  },
  async run() {
    // DynamoDB: URL mappings
    const urlTable = new sst.aws.Dynamo("UrlTable", {
      fields: {
        code: "string",
      },
      primaryIndex: { hashKey: "code" },
    });

    // DynamoDB: Click analytics with GSI for querying by code
    const analyticsTable = new sst.aws.Dynamo("AnalyticsTable", {
      fields: {
        clickId: "string",
        code: "string",
        timestamp: "number",
      },
      primaryIndex: { hashKey: "clickId" },
      globalIndexes: {
        codeIndex: { hashKey: "code", rangeKey: "timestamp" },
      },
    });

    // SNS: Decouples redirect from analytics tracking
    const clickTopic = new sst.aws.SnsTopic("ClickTopic");

    // SNS subscriber: writes click events to AnalyticsTable
    clickTopic.subscribe("TrackSubscriber", {
      handler: "packages/functions/src/track.handler",
      link: [analyticsTable],
    });

    // API Gateway v2
    const api = new sst.aws.ApiGatewayV2("Api");

    api.route("POST /shorten", {
      handler: "packages/functions/src/create.handler",
      link: [urlTable],
    });

    api.route("GET /{code}", {
      handler: "packages/functions/src/redirect.handler",
      link: [urlTable, clickTopic],
    });

    api.route("GET /stats/{code}", {
      handler: "packages/functions/src/stats.handler",
      link: [analyticsTable],
    });

    return {
      api: api.url,
    };
  },
});
```

**Step 2: Verify SST config parses**

```bash
npx sst diff
```

This should show the resources to be created (may require AWS credentials — skip if not configured yet).

**Step 3: Commit**

```bash
git add sst.config.ts
git commit -m "feat: define SST infrastructure (DynamoDB, SNS, API Gateway)"
```

---

### Task 4: POST /shorten Handler

**Files:**
- Create: `packages/functions/src/create.ts`

**Step 1: Write the handler**

```typescript
import { Resource } from "sst";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, PutCommand } from "@aws-sdk/lib-dynamodb";
import { generateCode, isValidUrl } from "@url-shortener/core";

const client = DynamoDBDocumentClient.from(new DynamoDBClient());

const coldStartTime = Date.now();
let isColdStart = true;

export async function handler(event: {
  body?: string;
  requestContext?: { domainName?: string };
}) {
  const startTime = Date.now();
  const wasColdStart = isColdStart;
  isColdStart = false;

  try {
    const body = JSON.parse(event.body || "{}");
    const { url } = body;

    if (!url || !isValidUrl(url)) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: "Invalid URL" }),
      };
    }

    const code = generateCode();
    const domain = event.requestContext?.domainName || "localhost";

    await client.send(
      new PutCommand({
        TableName: Resource.UrlTable.name,
        Item: {
          code,
          originalUrl: url,
          createdAt: Date.now(),
        },
      })
    );

    console.log(
      JSON.stringify({
        handler: "create",
        coldStart: wasColdStart,
        initDuration: wasColdStart ? startTime - coldStartTime : 0,
        executionDuration: Date.now() - startTime,
      })
    );

    return {
      statusCode: 201,
      body: JSON.stringify({
        shortUrl: `https://${domain}/${code}`,
        code,
      }),
    };
  } catch (err) {
    console.error(err);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Internal server error" }),
    };
  }
}
```

**Step 2: Commit**

```bash
git add packages/functions/src/create.ts
git commit -m "feat: add POST /shorten handler"
```

---

### Task 5: GET /{code} Redirect Handler

**Files:**
- Create: `packages/functions/src/redirect.ts`

**Step 1: Write the handler**

```typescript
import { Resource } from "sst";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, GetCommand } from "@aws-sdk/lib-dynamodb";
import { SNSClient, PublishCommand } from "@aws-sdk/client-sns";

const dynamo = DynamoDBDocumentClient.from(new DynamoDBClient());
const sns = new SNSClient();

const coldStartTime = Date.now();
let isColdStart = true;

export async function handler(event: {
  pathParameters?: { code?: string };
  headers?: Record<string, string>;
  requestContext?: { http?: { sourceIp?: string } };
}) {
  const startTime = Date.now();
  const wasColdStart = isColdStart;
  isColdStart = false;

  const code = event.pathParameters?.code;
  if (!code) {
    return { statusCode: 400, body: JSON.stringify({ error: "Missing code" }) };
  }

  try {
    const result = await dynamo.send(
      new GetCommand({
        TableName: Resource.UrlTable.name,
        Key: { code },
      })
    );

    if (!result.Item) {
      return { statusCode: 404, body: JSON.stringify({ error: "Not found" }) };
    }

    const response = {
      statusCode: 302,
      headers: { Location: result.Item.originalUrl },
      body: "",
    };

    // Fire-and-forget: publish click event to SNS, don't block redirect
    sns
      .send(
        new PublishCommand({
          TopicArn: Resource.ClickTopic.arn,
          Message: JSON.stringify({
            code,
            timestamp: Date.now(),
            userAgent: event.headers?.["user-agent"] || "unknown",
            ip: event.requestContext?.http?.sourceIp || "unknown",
          }),
        })
      )
      .catch((err) => console.error("SNS publish failed:", err));

    console.log(
      JSON.stringify({
        handler: "redirect",
        coldStart: wasColdStart,
        initDuration: wasColdStart ? startTime - coldStartTime : 0,
        executionDuration: Date.now() - startTime,
      })
    );

    return response;
  } catch (err) {
    console.error(err);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Internal server error" }),
    };
  }
}
```

**Step 2: Commit**

```bash
git add packages/functions/src/redirect.ts
git commit -m "feat: add GET /{code} redirect handler with fire-and-forget SNS"
```

---

### Task 6: SNS Consumer (track handler)

**Files:**
- Create: `packages/functions/src/track.ts`

**Step 1: Write the handler**

```typescript
import { Resource } from "sst";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, PutCommand } from "@aws-sdk/lib-dynamodb";
import { generateCode } from "@url-shortener/core";
import type { ClickEvent } from "@url-shortener/core";

const client = DynamoDBDocumentClient.from(new DynamoDBClient());

const coldStartTime = Date.now();
let isColdStart = true;

export async function handler(event: {
  Records: Array<{ Sns: { Message: string } }>;
}) {
  const startTime = Date.now();
  const wasColdStart = isColdStart;
  isColdStart = false;

  for (const record of event.Records) {
    const clickEvent: ClickEvent = JSON.parse(record.Sns.Message);
    const clickId = generateCode(12);

    await client.send(
      new PutCommand({
        TableName: Resource.AnalyticsTable.name,
        Item: {
          clickId,
          code: clickEvent.code,
          timestamp: clickEvent.timestamp,
          userAgent: clickEvent.userAgent,
          ip: clickEvent.ip,
        },
      })
    );
  }

  console.log(
    JSON.stringify({
      handler: "track",
      coldStart: wasColdStart,
      initDuration: wasColdStart ? startTime - coldStartTime : 0,
      executionDuration: Date.now() - startTime,
      recordsProcessed: event.Records.length,
    })
  );
}
```

**Step 2: Commit**

```bash
git add packages/functions/src/track.ts
git commit -m "feat: add SNS consumer handler for click analytics"
```

---

### Task 7: GET /stats/{code} Handler

**Files:**
- Create: `packages/functions/src/stats.ts`

**Step 1: Write the handler**

```typescript
import { Resource } from "sst";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, QueryCommand } from "@aws-sdk/lib-dynamodb";

const client = DynamoDBDocumentClient.from(new DynamoDBClient());

const coldStartTime = Date.now();
let isColdStart = true;

export async function handler(event: {
  pathParameters?: { code?: string };
}) {
  const startTime = Date.now();
  const wasColdStart = isColdStart;
  isColdStart = false;

  const code = event.pathParameters?.code;
  if (!code) {
    return { statusCode: 400, body: JSON.stringify({ error: "Missing code" }) };
  }

  try {
    const result = await client.send(
      new QueryCommand({
        TableName: Resource.AnalyticsTable.name,
        IndexName: "codeIndex",
        KeyConditionExpression: "code = :code",
        ExpressionAttributeValues: { ":code": code },
        ScanIndexForward: false, // newest first
      })
    );

    const items = result.Items || [];

    console.log(
      JSON.stringify({
        handler: "stats",
        coldStart: wasColdStart,
        initDuration: wasColdStart ? startTime - coldStartTime : 0,
        executionDuration: Date.now() - startTime,
      })
    );

    return {
      statusCode: 200,
      body: JSON.stringify({
        code,
        totalClicks: items.length,
        recentClicks: items.slice(0, 10),
      }),
    };
  } catch (err) {
    console.error(err);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Internal server error" }),
    };
  }
}
```

**Step 2: Commit**

```bash
git add packages/functions/src/stats.ts
git commit -m "feat: add GET /stats/{code} handler with GSI query"
```

---

### Task 8: Load Testing Config

**Files:**
- Create: `loadtest.yml`

**Step 1: Create Artillery load test config**

```yaml
config:
  target: "{{ $processEnvironment.API_URL }}"
  phases:
    - duration: 30
      arrivalRate: 10
      name: "Warm up"
    - duration: 30
      arrivalRate: 50
      name: "Sustained load"
  defaults:
    headers:
      Content-Type: "application/json"

scenarios:
  - name: "Create and redirect"
    flow:
      - post:
          url: "/shorten"
          json:
            url: "https://example.com"
          capture:
            - json: "$.code"
              as: "code"
      - get:
          url: "/{{ code }}"
          followRedirect: false

  - name: "Redirect only"
    flow:
      - get:
          url: "/{{ $processEnvironment.TEST_CODE }}"
          followRedirect: false
```

**Step 2: Commit**

```bash
git add loadtest.yml
git commit -m "feat: add Artillery load test config"
```

---

### Task 9: AWS CLI Setup & Deploy

**Step 1: Install AWS CLI**

```bash
brew install awscli
```

**Step 2: Configure AWS credentials**

```bash
aws configure
```

Enter: Access Key ID, Secret Access Key, region (us-east-1), output format (json).

**Step 3: Verify credentials**

```bash
aws sts get-caller-identity
```

Expected: JSON with Account, UserId, Arn.

**Step 4: Deploy with SST**

```bash
npx sst deploy --stage dev
```

Expected: Outputs the API URL.

**Step 5: Test the endpoints**

```bash
# Create a short URL
curl -X POST https://{API_URL}/shorten \
  -H "Content-Type: application/json" \
  -d '{"url": "https://example.com"}'

# Test redirect
curl -I https://{API_URL}/{code}

# Check stats
curl https://{API_URL}/stats/{code}
```

**Step 6: Commit any generated files**

```bash
git add -A
git commit -m "chore: post-deploy configuration"
```

---

### Task 10: Run Load Tests & Collect Metrics

**Step 1: Run Artillery**

```bash
API_URL=https://{your-api-url} TEST_CODE={your-test-code} npx artillery run loadtest.yml
```

**Step 2: Check CloudWatch for cold start metrics**

```bash
aws logs filter-log-events \
  --log-group-name "/aws/lambda/url-shortener-dev-{function-name}" \
  --filter-pattern '"coldStart"' \
  --limit 50
```

**Step 3: Document results for presentation**

Record: p50/p95/p99 latency, cold start counts, cold start duration, total cost.
