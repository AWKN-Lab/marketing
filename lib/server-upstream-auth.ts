export function upstreamIdentityHeaders(request: Request, serviceToken?: string) {
  const headers: Record<string, string> = {};
  const cookie = request.headers.get("cookie");
  if (cookie) headers.cookie = cookie;
  const incomingAuthorization = request.headers.get("authorization");
  if (serviceToken) headers.authorization = `Bearer ${serviceToken}`;
  else if (incomingAuthorization) headers.authorization = incomingAuthorization;
  const requestId = request.headers.get("x-request-id");
  if (requestId) headers["x-request-id"] = requestId;
  return headers;
}
