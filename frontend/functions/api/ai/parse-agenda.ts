// Cloudflare Pages Function: Reverse Proxy for /api/ai/parse-agenda to agenda-parser Lambda
// Provides seamless same-origin access under 1233.pp.ua without cross-origin friction

interface Env {
  AGENDA_PARSER_URL?: string;
}

const DEFAULT_PARSER_URL =
  "https://7gpgni7udgcs7ska552xppw6f40dghjv.lambda-url.us-east-1.on.aws/";

export async function onRequest(context: { request: Request; env?: Env }) {
  const parserBase = context.env?.AGENDA_PARSER_URL || DEFAULT_PARSER_URL;
  const targetUrl = new URL(parserBase);

  const headers = new Headers(context.request.headers);
  headers.delete("host");
  headers.set("x-forwarded-host", "1233.pp.ua");
  headers.set("x-forwarded-proto", "https");

  const isGetOrHead =
    context.request.method === "GET" || context.request.method === "HEAD";

  return fetch(targetUrl.toString(), {
    method: context.request.method,
    headers: headers,
    body: isGetOrHead ? undefined : context.request.body,
  });
}
