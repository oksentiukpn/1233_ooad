// Cloudflare Pages Function: Reverse Proxy for /api/* to AWS App Runner
// Eliminates CORS issues and provides same-origin API access under 1233.pp.ua

const BACKEND_URL = "https://pxrirjxvdx.eu-central-1.awsapprunner.com";

export async function onRequest(context: { request: Request }) {
  const url = new URL(context.request.url);
  const targetUrl = new URL(url.pathname + url.search, BACKEND_URL);

  const headers = new Headers(context.request.headers);
  headers.set("x-forwarded-host", "1233.pp.ua");
  headers.set("x-forwarded-proto", "https");

  const modifiedRequest = new Request(targetUrl.toString(), {
    method: context.request.method,
    headers: headers,
    body: context.request.body,
    redirect: "manual",
  });

  return fetch(modifiedRequest);
}
