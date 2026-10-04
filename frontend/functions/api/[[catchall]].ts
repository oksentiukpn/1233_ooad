// Cloudflare Pages Function: Reverse Proxy for /api/* to AWS App Runner
// Eliminates CORS issues and provides same-origin API access under 1233.pp.ua

const BACKEND_URL = "https://pxrirjxvdx.eu-central-1.awsapprunner.com";

export async function onRequest(context: { request: Request }) {
  const url = new URL(context.request.url);
  const targetUrl = new URL(url.pathname + url.search, BACKEND_URL);

  const headers = new Headers(context.request.headers);
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

  // Pass 301/302 redirects (such as Google OAuth login) directly through to the client
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
