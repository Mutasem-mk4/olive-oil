import { app, HttpRequest as AzureReq, HttpResponseInit, InvocationContext } from '@azure/functions';
import analyzeHandler from '../analyze/index.js';
import historyHandler from '../history/index.js';
import certificateHandler from '../certificate/index.js';
import verifyHandler from '../verify/index.js';

// Helper to run custom handler with Azure Functions v4 context/req
async function runHandler(
  context: InvocationContext,
  req: AzureReq,
  handler: (ctx: { log: (...args: unknown[]) => void }, request: any) => Promise<any>
): Promise<HttpResponseInit> {
  const method = req.method;
  let body: any = undefined;
  
  if (method === 'POST') {
    try {
      body = await req.json();
    } catch (e) {
      body = undefined;
    }
  }

  // Parse query parameters
  const query: Record<string, string> = {};
  req.query.forEach((value, key) => {
    query[key] = value;
  });

  // Parse route parameters
  const params: Record<string, string> = {};
  for (const [key, value] of Object.entries(req.params)) {
    if (value) params[key] = value;
  }

  const customReq = {
    method,
    body,
    query,
    params,
  };

  const customCtx = {
    log: (...args: unknown[]) => {
      context.log(...args);
    },
  };

  try {
    const response = await handler(customCtx, customReq);
    return {
      status: response.status,
      headers: response.headers,
      body: response.body,
    };
  } catch (error) {
    context.error('Error running function handler:', error);
    return {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify({
        error: 'Internal Server Error',
        message: error instanceof Error ? error.message : String(error),
      }),
    };
  }
}

app.http('analyze', {
  methods: ['POST', 'OPTIONS'],
  authLevel: 'anonymous',
  handler: async (request, context) => {
    return runHandler(context, request, analyzeHandler);
  },
});

app.http('history', {
  methods: ['GET', 'OPTIONS'],
  authLevel: 'anonymous',
  handler: async (request, context) => {
    return runHandler(context, request, historyHandler);
  },
});

app.http('certificate', {
  methods: ['POST', 'OPTIONS'],
  authLevel: 'anonymous',
  handler: async (request, context) => {
    return runHandler(context, request, certificateHandler);
  },
});

app.http('verify', {
  methods: ['GET', 'OPTIONS'],
  route: 'verify/{id}',
  authLevel: 'anonymous',
  handler: async (request, context) => {
    return runHandler(context, request, verifyHandler);
  },
});
