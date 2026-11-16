import assert from "node:assert/strict";
import test from "node:test";
import app from "./app";
import { MAX_BOOKINGS, normalizeExtraction } from "./booking-extraction";

process.env.NODE_ENV = "test";

test("normalizes model output: valid fields kept, invalid ones nulled", () => {
  const bookings = normalizeExtraction({
    bookings: [
      {
        kind: "flight",
        title: "  AM 401  Mexico City → Madrid ",
        date: "2026-12-03",
        endDate: "2026-12-04",
        time: "9:05",
        location: "MEX → MAD",
        city: "Ciudad de México",
        flightNumber: "am 401",
        confirmationNumber: "XK7P2Q",
        details: "Asiento 23A",
      },
      { kind: "hotel", title: "Hotel Ritz", date: "2026-02-30", endDate: "2026-12-01", time: "25:00", flightNumber: "IB1" },
      { kind: "spaceship", title: "Algo raro", date: "2026-12-10", endDate: "2026-12-09" },
      { kind: "restaurant", title: "   " },
      "not an object",
    ],
  });

  assert.equal(bookings.length, 3);
  assert.deepEqual(bookings[0], {
    kind: "flight",
    title: "AM 401 Mexico City → Madrid",
    date: "2026-12-03",
    endDate: "2026-12-04",
    time: "09:05",
    location: "MEX → MAD",
    city: "Ciudad de México",
    flightNumber: "AM401",
    confirmationNumber: "XK7P2Q",
    details: "Asiento 23A",
  });
  // Fecha imposible y hora inválida se descartan; número de vuelo solo en vuelos.
  assert.equal(bookings[1].date, null);
  assert.equal(bookings[1].time, null);
  assert.equal(bookings[1].flightNumber, null);
  // Tipo desconocido → general; fin anterior al inicio → null.
  assert.equal(bookings[2].kind, "general");
  assert.equal(bookings[2].endDate, null);
});

test("returns an empty list for malformed output and caps the number of bookings", () => {
  assert.deepEqual(normalizeExtraction(null), []);
  assert.deepEqual(normalizeExtraction({ bookings: "nope" }), []);
  const many = normalizeExtraction({ bookings: Array.from({ length: 20 }, (_, i) => ({ kind: "tour", title: `Tour ${i}` })) });
  assert.equal(many.length, MAX_BOOKINGS);
});

test("extraction endpoint requires auth, validates the image and reports missing AI", async () => {
  const savedKeys = [process.env.OPENAI_API_KEY, process.env.AI_INTEGRATIONS_OPENAI_API_KEY];
  delete process.env.OPENAI_API_KEY;
  delete process.env.AI_INTEGRATIONS_OPENAI_API_KEY;
  const server = app.listen(0);
  await new Promise<void>((resolve) => server.once("listening", resolve));
  const address = server.address();
  if (!address || typeof address === "string") throw new Error("no port");
  const url = `http://127.0.0.1:${address.port}/api/bookings/extract`;
  const post = (body: unknown, user = "user_extract_test") =>
    fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json", "x-test-user-id": user },
      body: JSON.stringify(body),
    });
  try {
    assert.equal((await post({ imageBase64: "aGVsbG8=", mimeType: "image/jpeg", language: "es" }, "")).status, 401);
    assert.equal((await post({ imageBase64: "aGVsbG8=", mimeType: "image/gif", language: "es" })).status, 400);
    assert.equal((await post({ imageBase64: "<script>", mimeType: "image/jpeg", language: "es" })).status, 400);
    assert.equal((await post({ imageBase64: "aGVsbG8=", mimeType: "image/jpeg", language: "es" })).status, 503);
    // Una imagen grande (≈3 MB) pasa el límite del cuerpo JSON.
    const big = "A".repeat(4_000_000);
    assert.equal((await post({ imageBase64: big, mimeType: "image/jpeg", language: "es" })).status, 503);
  } finally {
    await new Promise<void>((resolve) => server.close(() => resolve()));
    if (savedKeys[0]) process.env.OPENAI_API_KEY = savedKeys[0];
    if (savedKeys[1]) process.env.AI_INTEGRATIONS_OPENAI_API_KEY = savedKeys[1];
  }
});
