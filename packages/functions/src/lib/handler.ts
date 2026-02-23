type LambdaHandler = (event: any) => Promise<{
  statusCode: number;
  headers?: Record<string, string>;
  body: string;
}>;

export function withInstrumentation(name: string, fn: LambdaHandler): LambdaHandler {
  const coldStartTime = Date.now();
  let isColdStart = true;

  return async (event) => {
    const startTime = Date.now();
    const wasColdStart = isColdStart;
    isColdStart = false;

    try {
      const result = await fn(event);

      console.log(
        JSON.stringify({
          handler: name,
          coldStart: wasColdStart,
          initDuration: wasColdStart ? startTime - coldStartTime : 0,
          executionDuration: Date.now() - startTime,
        })
      );

      return result;
    } catch (err) {
      console.error(err);
      return {
        statusCode: 500,
        body: JSON.stringify({ error: "Internal server error" }),
      };
    }
  };
}
