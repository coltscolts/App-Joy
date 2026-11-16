import assert from "node:assert/strict";
import test from "node:test";
import { customFetch, setAuthTokenGetter } from "./custom-fetch";

test("sends the configured bearer token and includes browser credentials", { concurrency: false }, async () => {
  const originalFetch = globalThis.fetch;
  let capturedInit: RequestInit | undefined;

  globalThis.fetch = (async (_input, init) => {
    capturedInit = init;
    return new Response(JSON.stringify([]), {
      status: 200,
      headers: { "content-type": "application/json" },
    });
  }) as typeof fetch;
  setAuthTokenGetter(async () => "test-session-token");

  try {
    await customFetch("/api/trips", { responseType: "json" });
    const headers = new Headers(capturedInit?.headers);
    assert.equal(headers.get("authorization"), "Bearer test-session-token");
    assert.equal(capturedInit?.credentials, "include");
  } finally {
    setAuthTokenGetter(null);
    globalThis.fetch = originalFetch;
  }
});