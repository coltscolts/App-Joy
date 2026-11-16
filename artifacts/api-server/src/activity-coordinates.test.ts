import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import test from "node:test";
import app from "./app";

process.env.NODE_ENV = "test";

test("activities store, update and validate map coordinates", async () => {
  const server = app.listen(0);
  await new Promise<void>((resolve) => server.once("listening", resolve));
  const address = server.address();
  if (!address || typeof address === "string") throw new Error("no port");
  const api = `http://127.0.0.1:${address.port}/api`;
  const headers = { "content-type": "application/json", "x-test-user-id": `user_map_${randomUUID()}` };
  try {
    const trip = await (await fetch(`${api}/trips`, {
      method: "POST", headers,
      body: JSON.stringify({ name: "Madrid", tripType: "single", destination: "Madrid, España", startDate: "2030-05-01", endDate: "2030-05-03", adults: 2, children: 0, stops: [] }),
    })).json() as { id: number };

    const created = await fetch(`${api}/activities`, {
      method: "POST", headers,
      body: JSON.stringify({ tripId: trip.id, day: "miércoles", date: "2030-05-01", type: "cultural", category: "cultural", title: "Museo del Prado", location: "Paseo del Prado", latitude: 40.4138, longitude: -3.6921 }),
    });
    assert.equal(created.status, 201);
    const activity = await created.json() as { id: number; latitude: number; longitude: number };
    assert.equal(activity.latitude, 40.4138);
    assert.equal(activity.longitude, -3.6921);

    const patched = await fetch(`${api}/activities/${activity.id}`, { method: "PATCH", headers, body: JSON.stringify({ latitude: 40.4153, longitude: -3.6845 }) });
    assert.equal(patched.status, 200);
    assert.equal((await patched.json() as { latitude: number }).latitude, 40.4153);

    const invalid = await fetch(`${api}/activities/${activity.id}`, { method: "PATCH", headers, body: JSON.stringify({ latitude: 200 }) });
    assert.equal(invalid.status, 400);
  } finally {
    await new Promise<void>((resolve) => server.close(() => resolve()));
  }
});
