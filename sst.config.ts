/// <reference path="./.sst/platform/config.d.ts" />

export default $config({
  app(input) {
    return {
      name: "url-shortener",
      removal: input?.stage === "production" ? "retain" : "remove",
      protect: ["production"].includes(input?.stage || ""),
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
