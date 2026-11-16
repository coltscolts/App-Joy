import assert from "node:assert/strict";
import test from "node:test";
import app from "./app";
import { toPlaceContact } from "./place-contact";

process.env.NODE_ENV = "test";

test("normalizes Google Places data and only keeps https links", () => {
  assert.deepEqual(toPlaceContact({
    displayName: { text: " Sobrino de Botín " },
    formattedAddress: "C. de Cuchilleros, 17, Madrid",
    internationalPhoneNumber: "+34 913 66 42 17",
    websiteUri: "https://botin.es/",
    googleMapsUri: "https://maps.google.com/?cid=1",
    reservable: true,
    rating: 4.5,
    userRatingCount: 30000,
  }), {
    name: "Sobrino de Botín",
    address: "C. de Cuchilleros, 17, Madrid",
    phone: "+34 913 66 42 17",
    website: "https://botin.es/",
    mapsUrl: "https://maps.google.com/?cid=1",
    reservable: true,
    rating: 4.5,
    ratingCount: 30000,
  });
  const insecure = toPlaceContact({ displayName: { text: "Bar" }, websiteUri: "javascript:alert(1)", nationalPhoneNumber: "913 00 00 00" });
  assert.equal(insecure?.website, null);
  assert.equal(insecure?.phone, "913 00 00 00");
  assert.equal(insecure?.reservable, null);
  assert.equal(toPlaceContact(undefined), null);
  assert.equal(toPlaceContact({ formattedAddress: "sin nombre" }), null);
});

test("contact endpoint requires a session and reports when Places is not configured", async () => {
  const saved = process.env.GOOGLE_PLACES_API_KEY;
  delete process.env.GOOGLE_PLACES_API_KEY;
  const server = app.listen(0);
  await new Promise<void>((resolve) => server.once("listening", resolve));
  const address = server.address();
  if (!address || typeof address === "string") throw new Error("no port");
  const url = `http://127.0.0.1:${address.port}/api/places/contact?name=Botin&city=Madrid&language=es`;
  try {
    assert.equal((await fetch(url, { headers: { "x-test-user-id": "" } })).status, 401);
    assert.equal((await fetch(url, { headers: { "x-test-user-id": "user_contact" } })).status, 503);
    const bad = await fetch(url.replace("language=es", "language=fr"), { headers: { "x-test-user-id": "user_contact" } });
    assert.equal(bad.status, 400);
  } finally {
    await new Promise<void>((resolve) => server.close(() => resolve()));
    if (saved) process.env.GOOGLE_PLACES_API_KEY = saved;
  }
});
