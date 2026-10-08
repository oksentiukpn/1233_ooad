// Cloudflare Pages Function: Reverse Proxy for /api/* to AWS Lambda Function URL
// Eliminates CORS issues and provides same-origin API access under 1233.pp.ua

interface Env {
  BACKEND_URL?: string;
}

const DEFAULT_BACKEND_URL =
  "https://g72hlurxy25btyitkuad2c4n2q0epdub.lambda-url.eu-central-1.on.aws";

export async function onRequest(context: { request: Request; env?: Env }) {
  const backendBase = context.env?.BACKEND_URL || DEFAULT_BACKEND_URL;
  const url = new URL(context.request.url);
  const targetUrl = new URL(url.pathname + url.search, backendBase);

  const headers = new Headers(context.request.headers);
  // Important: Remove original host so fetch uses the Lambda Function URL domain host
  headers.delete("host");
  headers.set("x-forwarded-host", "1233.pp.ua");
  headers.set("x-forwarded-proto", "https");

  const isGetOrHead =
    context.request.method === "GET" || context.request.method === "HEAD";

  const response = await fetch(targetUrl.toString(), {
    method: context.request.method,
    headers: headers,
    body: isGetOrHead ? undefined : context.request.body,
    redirect: "manual",
  });

  // Pass 301/302 redirects (such as OAuth login) directly through to the client
  if (
    response.status >= 300 &&
    response.status < 400 &&
    response.headers.has("Location")
  ) {
    return new Response(null, {
      status: response.status,
      headers: response.headers,
    });
  }

  return response;
}
