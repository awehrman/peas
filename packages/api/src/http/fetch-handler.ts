import {
  type ApolloServer,
  type BaseContext,
  type HTTPGraphQLRequest,
  type HTTPGraphQLResponse,
  HeaderMap,
} from "@apollo/server";

/**
 * Apollo Server 5 has no Fetch-API integration, so this adapter turns a standard Request into Apollo's HTTPGraphQLRequest and the result back into a Response. Non-JSON POST bodies are passed as `undefined` so Apollo's CSRF prevention rejects them, as Apollo requires of integrations.
 *
 * @example
 * const handle = createFetchHandler(server, async (request) => ({ viewer: await resolveViewer(request) }));
 * export const POST = ({ request }: { request: Request }) => handle(request);
 */
export function createFetchHandler<TContext extends BaseContext>(
  server: ApolloServer<TContext>,
  context: (request: Request) => Promise<TContext>
): (request: Request) => Promise<Response> {
  server.startInBackgroundHandlingStartupErrorsByLoggingAndFailingAllRequests();

  return async function handleGraphQLRequest(request) {
    const parsedBody = await parseBody(request);
    if (!parsedBody.isValid) return parsedBody.response;

    const httpGraphQLRequest: HTTPGraphQLRequest = {
      method: request.method.toUpperCase(),
      headers: toHeaderMap(request.headers),
      search: new URL(request.url).search,
      body: parsedBody.body,
    };

    const response = await server.executeHTTPGraphQLRequest({
      httpGraphQLRequest,
      context: () => context(request),
    });
    return toFetchResponse(response);
  };
}

type ParsedBody =
  { isValid: true; body: unknown } | { isValid: false; response: Response };

function toHeaderMap(headers: Headers): HeaderMap {
  const headerMap = new HeaderMap();
  headers.forEach((value, key) => headerMap.set(key, value));
  return headerMap;
}

function isJsonContentType(contentType: string | null): boolean {
  return (
    contentType?.split(";")[0]?.trim().toLowerCase() === "application/json"
  );
}

async function parseBody(request: Request): Promise<ParsedBody> {
  if (request.method.toUpperCase() !== "POST")
    return { isValid: true, body: undefined };
  if (!isJsonContentType(request.headers.get("content-type")))
    return { isValid: true, body: undefined };

  const text = await request.text();
  if (text.length === 0) return { isValid: true, body: undefined };

  try {
    return { isValid: true, body: JSON.parse(text) as unknown };
  } catch {
    return {
      isValid: false,
      response: Response.json(
        { errors: [{ message: "Malformed JSON in request body." }] },
        { status: 400 }
      ),
    };
  }
}

function toFetchResponse({
  status,
  headers,
  body,
}: HTTPGraphQLResponse): Response {
  const responseHeaders = new Headers();
  for (const [key, value] of headers) responseHeaders.set(key, value);
  const init: ResponseInit = {
    status: status ?? 200,
    headers: responseHeaders,
  };

  if (body.kind === "complete") return new Response(body.string, init);

  const { asyncIterator } = body;
  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    async pull(controller) {
      const { value, done } = await asyncIterator.next();
      if (done) {
        controller.close();
        return;
      }
      controller.enqueue(encoder.encode(value));
    },
    async cancel() {
      await asyncIterator.return?.();
    },
  });
  return new Response(stream, init);
}
