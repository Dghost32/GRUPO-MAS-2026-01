export type LambdaResponse = {
  statusCode: number;
  headers?: Record<string, string>;
  body: string;
};

type LambdaHandler = (event: unknown) => Promise<LambdaResponse>;

interface InstrumentationOptions {
  rethrow?: boolean;
}

export function withInstrumentation(
  name: string,
  fn: LambdaHandler,
  opts?: InstrumentationOptions
): LambdaHandler {
  const coldStartTime = Date.now();
  let isColdStart = true;

  return async (event) => {
    const startTime = Date.now();
    const wasColdStart = isColdStart;
    isColdStart = false;
    let success = true;

    try {
      const result = await fn(event);
      return result;
    } catch (err) {
      success = false;
      if (opts?.rethrow) throw err;
      console.error(
        JSON.stringify({
          handler: name,
          coldStart: wasColdStart,
          error: err instanceof Error ? err.message : String(err),
          stack: err instanceof Error ? err.stack : undefined,
          executionDuration: Date.now() - startTime,
        })
      );
      return {
        statusCode: 500,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ error: "Internal server error" }),
      };
    } finally {
      console.log(
        JSON.stringify({
          handler: name,
          coldStart: wasColdStart,
          initDuration: wasColdStart ? startTime - coldStartTime : 0,
          executionDuration: Date.now() - startTime,
          success,
        })
      );
    }
  };
}
