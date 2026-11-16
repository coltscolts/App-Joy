import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import test from "node:test";
import { insertActivitySchema } from "@workspace/db";
import app from "./app";
import { DatabaseStorage } from "./storage";
import {
  isActivityDateInTrip,
  validateTripForCreate,
  validateTripForUpdate,
} from "./trip-validation";
import {
  getTransitRecommendations,
  TRANSIT_RECOMMENDATION_TIMEOUT_MS,
  type TransitRecommendation,
} from "./transit-recommendations";
import {
  validateHotelStayBatch,
  validateHotelStayRange,
} from "./hotel-stays";

process.env.NODE_ENV = "test";
const TEST_USER_ID = "user_trip_route_test";

const multiTrip = {
  name: "Ruta ibérica",
  tripType: "multi" as const,
  destination: "Se ignora al normalizar",
  startDate: "2026-06-01",
  endDate: "2026-06-06",
  adults: 2,
  children: 0,
  stops: [
    { destination: " Madrid, España ", startDate: "2026-06-01", endDate: "2026-06-03" },
    { destination: " Lisboa, Portugal ", startDate: "2026-06-04", endDate: "2026-06-06" },
  ],
};

async function withApiServer(run: (baseUrl: string) => Promise<void>) {
  const server = app.listen(0);
  await new Promise<void>((resolve) => server.once("listening", resolve));
  const address = server.address();
  if (!address || typeof address === "string") throw new Error("Test server did not expose a port");

  try {
    const originalFetch = globalThis.fetch;
    globalThis.fetch = (input, init) => {
      const headers = new Headers(init?.headers);
      if (!headers.has("x-test-user-id")) headers.set("x-test-user-id", TEST_USER_ID);
      return originalFetch(input, { ...init, headers });
    };
    try {
      await run(`http://127.0.0.1:${address.port}/api`);
    } finally {
      globalThis.fetch = originalFetch;
    }
  } finally {
    await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  }
}

test("keeps public endpoints public and rejects unauthenticated trip access", async () => {
  await withApiServer(async (apiUrl) => {
    const publicResponse = await fetch(`${apiUrl}/destinations?query=Oaxaca`);
    assert.equal(publicResponse.status, 200);

    const unauthenticatedResponse = await fetch(`${apiUrl}/trips`, {
      headers: { "x-test-user-id": "" },
    });
    assert.equal(unauthenticatedResponse.status, 401);
    assert.deepEqual(await unauthenticatedResponse.json(), { error: "Unauthorized" });
  });
});

test("scopes trip, activity, hotel, and transit data to its owner", async () => {
  await withApiServer(async (apiUrl) => {
    const ownerAHeaders = { "content-type": "application/json", "x-test-user-id": "user_owner_a" };
    const ownerBHeaders = { "content-type": "application/json", "x-test-user-id": "user_owner_b" };
    const createResponse = await fetch(`${apiUrl}/trips`, {
      method: "POST",
      headers: ownerAHeaders,
      body: JSON.stringify({ ...multiTrip, name: `Owner isolation ${randomUUID()}` }),
    });
    assert.equal(createResponse.status, 201);
    const trip = await createResponse.json() as { id: number };

    try {
      const listResponse = await fetch(`${apiUrl}/trips`, { headers: ownerBHeaders });
      assert.equal(listResponse.status, 200);
      assert.ok(!(await listResponse.json() as Array<{ id: number }>).some(({ id }) => id === trip.id));

      for (const path of [
        `/trips/${trip.id}`,
        `/trips/${trip.id}/activities`,
        `/trips/${trip.id}/transit-recommendations`,
      ]) {
        const response = await fetch(`${apiUrl}${path}`, { headers: ownerBHeaders });
        assert.equal(response.status, 404, path);
      }

      const activityResponse = await fetch(`${apiUrl}/activities`, {
        method: "POST",
        headers: ownerBHeaders,
        body: JSON.stringify({
          tripId: trip.id,
          day: "Monday",
          date: "2026-06-01",
          type: "activity",
          category: "cultural",
          title: "Cross-account activity",
        }),
      });
      assert.equal(activityResponse.status, 404);

      const hotelResponse = await fetch(`${apiUrl}/hotel-stays`, {
        method: "POST",
        headers: ownerBHeaders,
        body: JSON.stringify({
          stays: [{
            tripId: trip.id,
            day: "Monday",
            date: "2026-06-01",
            endDate: "2026-06-06",
            type: "booking",
            category: "hotel",
            title: "Cross-account hotel",
          }],
        }),
      });
      assert.equal(hotelResponse.status, 404);
    } finally {
      await fetch(`${apiUrl}/trips/${trip.id}`, { method: "DELETE", headers: ownerAHeaders });
    }
  });
});

test("accepts and normalizes a single-destination trip", () => {
  const trip = validateTripForCreate({
    name: "Fin de semana",
    tripType: "single",
    destination: "  Oaxaca, México  ",
    startDate: "2026-07-10",
    endDate: "2026-07-12",
    stops: [],
  });

  assert.equal(trip.destination, "Oaxaca, México");
  assert.deepEqual(trip.stops, []);
});

test("accepts shared check-out/check-in days while rejecting invalid dates and true overlaps", () => {
  assert.throws(
    () => validateTripForCreate({ ...multiTrip, stops: [{ ...multiTrip.stops[0], startDate: "2026-02-30" }, multiTrip.stops[1]] }),
    /real calendar day/,
  );
  assert.throws(
    () => validateTripForCreate({ ...multiTrip, stops: [{ ...multiTrip.stops[0], startDate: "2026-06-04", endDate: "2026-06-03" }, multiTrip.stops[1]] }),
    /end date must be on or after/,
  );
  const sharedBoundaryTrip = validateTripForCreate({
    ...multiTrip,
    stops: [multiTrip.stops[0], { ...multiTrip.stops[1], startDate: "2026-06-03" }],
  });
  assert.equal(sharedBoundaryTrip.stops[1]?.startDate, "2026-06-03");
  assert.throws(
    () => validateTripForCreate({ ...multiTrip, stops: [multiTrip.stops[0], { ...multiTrip.stops[1], startDate: "2026-06-02" }] }),
    /checkout date/,
  );
  assert.throws(
    () => insertActivitySchema.parse({
      tripId: 1,
      day: "Monday",
      date: "2026-02-30",
      type: "activity",
      category: "cultural",
      title: "Fecha imposible",
    }),
    /real calendar day/,
  );
});

test("validates complete and continuous hotel stay ranges", () => {
  const trip = {
    startDate: "2026-09-01",
    endDate: "2026-09-05",
  };
  const firstStay = {
    tripId: 1,
    day: "Tuesday",
    date: "2026-09-01",
    endDate: "2026-09-03",
    type: "booking",
    category: "hotel",
    title: "Hotel Norte",
  };
  const secondStay = {
    ...firstStay,
    day: "Thursday",
    date: "2026-09-03",
    endDate: "2026-09-05",
    title: "Hotel Sur",
  };

  assert.doesNotThrow(() => validateHotelStayRange(firstStay, trip));
  assert.doesNotThrow(() => validateHotelStayBatch([firstStay, secondStay], trip));
  assert.throws(
    () => validateHotelStayBatch([
      { ...firstStay, endDate: "2026-09-02" },
      secondStay,
    ], trip),
    /same checkout and check-in date/,
  );
  assert.throws(
    () => validateHotelStayBatch([{ ...firstStay, endDate: "2026-09-04" }], trip),
    /complete trip/,
  );
});

test("keeps hotel fields manual when Google Places is not configured", { concurrency: false }, async () => {
  const originalApiKey = process.env.GOOGLE_PLACES_API_KEY;
  delete process.env.GOOGLE_PLACES_API_KEY;
  try {
    await withApiServer(async (apiUrl) => {
      const response = await fetch(
        `${apiUrl}/hotel-suggestions?query=central&city=Oaxaca&language=es`,
      );
      assert.equal(response.status, 503);
      const payload = await response.json() as { error: string; message: string };
      assert.equal(payload.error, "not_configured");
      assert.match(payload.message, /manualmente/);
    });
  } finally {
    if (originalApiKey === undefined) delete process.env.GOOGLE_PLACES_API_KEY;
    else process.env.GOOGLE_PLACES_API_KEY = originalApiKey;
  }
});

test("maps Google Places hotel results without exposing provider data", { concurrency: false }, async () => {
  const originalFetch = globalThis.fetch;
  const originalApiKey = process.env.GOOGLE_PLACES_API_KEY;
  process.env.GOOGLE_PLACES_API_KEY = "test-key";
  const uniqueQuery = `hotel-${randomUUID()}`;
  globalThis.fetch = async (input, init) => {
    const url = typeof input === "string"
      ? input
      : input instanceof URL
        ? input.href
        : input.url;
    if (!url.startsWith("https://places.googleapis.com/")) {
      return originalFetch(input, init);
    }
    assert.equal(init?.method, "POST");
    assert.doesNotMatch(String(init?.body), /test-key/);
    return new Response(JSON.stringify({
      places: [{
        id: "places/test-hotel",
        displayName: { text: "Hotel Reforma" },
        formattedAddress: "Av. Reforma 100, Ciudad de México",
        addressComponents: [{ longText: "Ciudad de México", types: ["locality"] }],
      }],
    }));
  };

  try {
    await withApiServer(async (apiUrl) => {
      const response = await fetch(
        `${apiUrl}/hotel-suggestions?query=${encodeURIComponent(uniqueQuery)}&city=Ciudad%20de%20México&language=es`,
      );
      assert.equal(response.status, 200);
      assert.deepEqual(await response.json(), [{
        placeId: "places/test-hotel",
        name: "Hotel Reforma",
        address: "Av. Reforma 100, Ciudad de México",
        city: "Ciudad de México",
      }]);
    });
  } finally {
    globalThis.fetch = originalFetch;
    if (originalApiKey === undefined) delete process.env.GOOGLE_PLACES_API_KEY;
    else process.env.GOOGLE_PLACES_API_KEY = originalApiKey;
  }
});

test("builds a clear transport recommendation for every consecutive stop", async () => {
  const recommendations = await getTransitRecommendations([
    { destination: "Pueblo de origen, País", startDate: "2026-08-01", endDate: "2026-08-03" },
    { destination: "Ciudad de destino, País", startDate: "2026-08-03", endDate: "2026-08-06" },
    { destination: "Última parada, País", startDate: "2026-08-06", endDate: "2026-08-08" },
  ], "es");

  assert.equal(recommendations.length, 2);
  assert.equal(recommendations[0]?.travelDate, "2026-08-03");
  assert.match(recommendations[0]?.recommendationReason ?? "", /Recomendamos/);
  assert.deepEqual(recommendations[0]?.options.map((option) => option.mode), ["flight", "train", "bus"]);
  assert.ok(recommendations[0]?.options.every((option) => option.isEstimated));
  assert.ok(recommendations[0]?.options.every((option) => option.source === "Estimación de ruta"));
});

test("localizes transport recommendations in English without changing route data", async () => {
  const [recommendation] = await getTransitRecommendations([
    { destination: "Origin City, Country", startDate: "2026-08-01", endDate: "2026-08-03" },
    { destination: "Destination City, Country", startDate: "2026-08-03", endDate: "2026-08-06" },
  ]);

  assert.equal(recommendation?.origin, "Origin City");
  assert.equal(recommendation?.destination, "Destination City");
  assert.match(recommendation?.recommendationReason ?? "", /We recommend/);
  assert.ok(recommendation?.options.every((option) => option.source === "Route estimate"));
  assert.deepEqual(recommendation?.options.map((option) => option.label), ["Flight", "Train", "Bus"]);
});

test("keeps a flight estimated when the provider does not return a complete schedule", async () => {
  const originalFetch = globalThis.fetch;
  const originalApiKey = process.env.AVIATIONSTACK_API_KEY;
  process.env.AVIATIONSTACK_API_KEY = "test-key";
  globalThis.fetch = async () => new Response(JSON.stringify({
    data: [{
      airline: { name: "Proveedor de prueba" },
      flight: { iata: "TP101" },
      departure: { scheduled: "2026-11-12T08:00:00+00:00" },
      arrival: {},
    }],
  }));

  try {
    const [recommendation] = await getTransitRecommendations([
      { destination: "Madrid, España", startDate: "2026-11-10", endDate: "2026-11-12" },
      { destination: "Lisboa, Portugal", startDate: "2026-11-12", endDate: "2026-11-14" },
    ]);
    const flight = recommendation?.options.find((option) => option.mode === "flight");

    assert.equal(flight?.isEstimated, true);
    assert.equal(flight?.source, "Route estimate");
    assert.equal(flight?.departureTime, null);
    assert.equal(flight?.arrivalTime, null);
  } finally {
    globalThis.fetch = originalFetch;
    if (originalApiKey === undefined) delete process.env.AVIATIONSTACK_API_KEY;
    else process.env.AVIATIONSTACK_API_KEY = originalApiKey;
  }
});

test("returns estimated options for every leg before the global deadline when the flight provider stalls", { concurrency: false }, async () => {
  const originalFetch = globalThis.fetch;
  const originalApiKey = process.env.AVIATIONSTACK_API_KEY;
  process.env.AVIATIONSTACK_API_KEY = "test-key";
  globalThis.fetch = async (input, init) => {
    const url = typeof input === "string"
      ? input
      : input instanceof URL
        ? input.href
        : input.url;
    if (!url.startsWith("https://api.aviationstack.com/")) {
      return originalFetch(input, init);
    }

    return new Promise<Response>((_resolve, reject) => {
      const signal = init?.signal;
      const rejectWhenAborted = () => reject(signal?.reason ?? new DOMException("Aborted", "AbortError"));
      if (signal?.aborted) {
        rejectWhenAborted();
      } else {
        signal?.addEventListener("abort", rejectWhenAborted, { once: true });
      }
    });
  };

  try {
    await withApiServer(async (apiUrl) => {
      const createTripResponse = await fetch(`${apiUrl}/trips`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          name: `Proveedor lento ${randomUUID()}`,
          tripType: "multi",
          destination: "Se normaliza desde las paradas",
          startDate: "2026-12-01",
          endDate: "2026-12-06",
          adults: 2,
          children: 0,
          stops: [
            { destination: "Madrid, España", startDate: "2026-12-01", endDate: "2026-12-02" },
            { destination: "Lisboa, Portugal", startDate: "2026-12-02", endDate: "2026-12-03" },
            { destination: "París, Francia", startDate: "2026-12-03", endDate: "2026-12-04" },
            { destination: "Roma, Italia", startDate: "2026-12-04", endDate: "2026-12-05" },
            { destination: "Berlín, Alemania", startDate: "2026-12-05", endDate: "2026-12-06" },
          ],
        }),
      });
      assert.equal(createTripResponse.status, 201);
      const trip = await createTripResponse.json() as { id: number };

      try {
        const startedAt = performance.now();
        const recommendationsResponse = await fetch(`${apiUrl}/trips/${trip.id}/transit-recommendations`);
        const elapsedMs = performance.now() - startedAt;
        assert.equal(recommendationsResponse.status, 200);
        const recommendations = await recommendationsResponse.json() as TransitRecommendation[];

        assert.ok(
          elapsedMs < TRANSIT_RECOMMENDATION_TIMEOUT_MS + 1000,
          `Recommendations took ${Math.round(elapsedMs)} ms`,
        );
        assert.equal(recommendations.length, 4);
        assert.ok(recommendations.every((recommendation) => recommendation.options.length === 3));
        assert.ok(recommendations.every((recommendation) => recommendation.options.every((option) => option.isEstimated)));
        assert.ok(recommendations.every((recommendation) => recommendation.options.every((option) => option.source === "Route estimate")));
      } finally {
        await fetch(`${apiUrl}/trips/${trip.id}`, { method: "DELETE" });
      }
    });
  } finally {
    globalThis.fetch = originalFetch;
    if (originalApiKey === undefined) delete process.env.AVIATIONSTACK_API_KEY;
    else process.env.AVIATIONSTACK_API_KEY = originalApiKey;
  }
});

test("keeps ordered stops after saving, reloading, and updating a multi-destination trip", async () => {
  const storage = new DatabaseStorage();
  const preparedTrip = validateTripForCreate({
    ...multiTrip,
    name: `Ruta de prueba ${randomUUID()}`,
  });
  const created = await storage.createTrip(preparedTrip, TEST_USER_ID);

  try {
    const reloaded = await storage.getTrip(created.id, TEST_USER_ID);
    assert.ok(reloaded);
    assert.deepEqual(reloaded.stops, [
      { destination: "Madrid, España", startDate: "2026-06-01", endDate: "2026-06-03" },
      { destination: "Lisboa, Portugal", startDate: "2026-06-04", endDate: "2026-06-06" },
    ]);

    const updated = validateTripForUpdate(reloaded, { name: "Ruta actualizada" });
    await storage.updateTrip(created.id, TEST_USER_ID, updated);
    const reloadedAfterUpdate = await storage.getTrip(created.id, TEST_USER_ID);

    assert.deepEqual(reloadedAfterUpdate?.stops, reloaded.stops);
    assert.equal(isActivityDateInTrip("2026-06-02", reloaded), true);
    assert.equal(isActivityDateInTrip("2026-06-05", reloaded), true);
    assert.equal(isActivityDateInTrip("2026-06-07", reloaded), false);
  } finally {
    await storage.deleteTrip(created.id, TEST_USER_ID);
  }
});

test("stores and updates an activity city independently from its location", async () => {
  await withApiServer(async (apiUrl) => {
    const createTripResponse = await fetch(`${apiUrl}/trips`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ ...multiTrip, name: `Activity city ${randomUUID()}` }),
    });
    assert.equal(createTripResponse.status, 201);
    const trip = await createTripResponse.json() as { id: number };

    try {
      const createActivityResponse = await fetch(`${apiUrl}/activities`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          tripId: trip.id,
          day: "Saturday",
          date: "2026-06-05",
          type: "activity",
          category: "cultural",
          title: "Museo de prueba",
          city: "Lisboa, Portugal",
          location: "Museu Nacional do Azulejo",
        }),
      });
      assert.equal(createActivityResponse.status, 201);
      const created = await createActivityResponse.json() as { id: number; city: string | null; location: string | null };
      assert.equal(created.city, "Lisboa, Portugal");
      assert.equal(created.location, "Museu Nacional do Azulejo");

      const updateActivityResponse = await fetch(`${apiUrl}/activities/${created.id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ city: "Oporto, Portugal" }),
      });
      assert.equal(updateActivityResponse.status, 200);
      const updated = await updateActivityResponse.json() as { city: string | null; location: string | null };
      assert.equal(updated.city, "Oporto, Portugal");
      assert.equal(updated.location, "Museu Nacional do Azulejo");
    } finally {
      await fetch(`${apiUrl}/trips/${trip.id}`, { method: "DELETE" });
    }
  });
});

test("creates two continuous hotel stays together and stores checkout details", async () => {
  await withApiServer(async (apiUrl) => {
    const createTripResponse = await fetch(`${apiUrl}/trips`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        name: `Hotel stays ${randomUUID()}`,
        tripType: "single",
        destination: "Oaxaca, México",
        startDate: "2026-09-01",
        endDate: "2026-09-05",
        adults: 2,
        children: 0,
        stops: [],
      }),
    });
    assert.equal(createTripResponse.status, 201);
    const trip = await createTripResponse.json() as { id: number };

    const firstStay = {
      tripId: trip.id,
      day: "Tuesday",
      date: "2026-09-01",
      endDate: "2026-09-03",
      type: "booking",
      category: "hotel",
      title: "Hotel Centro",
      location: "Calle Central 1",
      city: "Oaxaca, México",
      placeId: "places/hotel-centro",
      reminderEnabled: false,
    };
    const secondStay = {
      ...firstStay,
      day: "Thursday",
      date: "2026-09-03",
      endDate: "2026-09-05",
      title: "Hotel Norte",
      location: "Calle Norte 2",
      placeId: null,
    };

    try {
      const genericHotelResponse = await fetch(`${apiUrl}/activities`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(firstStay),
      });
      assert.equal(genericHotelResponse.status, 400);
      assert.match(
        (await genericHotelResponse.json() as { error: string }).error,
        /POST \/hotel-stays/,
      );

      const invalidResponse = await fetch(`${apiUrl}/hotel-stays`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          stays: [
            { ...firstStay, endDate: "2026-09-02" },
            secondStay,
          ],
        }),
      });
      assert.equal(invalidResponse.status, 400);

      const createResponse = await fetch(`${apiUrl}/hotel-stays`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ stays: [firstStay, secondStay] }),
      });
      assert.equal(createResponse.status, 201);
      const stays = await createResponse.json() as Array<{
        id: number;
        title: string;
        endDate: string | null;
        placeId: string | null;
      }>;
      assert.equal(stays.length, 2);
      assert.deepEqual(stays.map((stay) => stay.endDate), ["2026-09-03", "2026-09-05"]);
      assert.deepEqual(stays.map((stay) => stay.placeId), ["places/hotel-centro", null]);

      const listResponse = await fetch(`${apiUrl}/trips/${trip.id}/activities`);
      assert.equal(listResponse.status, 200);
      const stored = await listResponse.json() as Array<{ category: string; title: string }>;
      assert.deepEqual(stored.map((stay) => stay.title), ["Hotel Centro", "Hotel Norte"]);
      assert.ok(stored.every((stay) => stay.category === "hotel"));
    } finally {
      await fetch(`${apiUrl}/trips/${trip.id}`, { method: "DELETE" });
    }
  });
});

test("edits a hotel whose check-in falls between destination ranges", async () => {
  await withApiServer(async (apiUrl) => {
    const createTripResponse = await fetch(`${apiUrl}/trips`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        name: `Hotel gap edit ${randomUUID()}`,
        tripType: "multi",
        destination: "Madrid, España",
        startDate: "2026-06-01",
        endDate: "2026-06-06",
        adults: 2,
        children: 0,
        stops: [
          { destination: "Madrid, España", startDate: "2026-06-01", endDate: "2026-06-02" },
          { destination: "Lisboa, Portugal", startDate: "2026-06-05", endDate: "2026-06-06" },
        ],
      }),
    });
    assert.equal(createTripResponse.status, 201);
    const trip = await createTripResponse.json() as { id: number };

    try {
      const createStaysResponse = await fetch(`${apiUrl}/hotel-stays`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          stays: [
            {
              tripId: trip.id,
              day: "Monday",
              date: "2026-06-01",
              endDate: "2026-06-03",
              type: "booking",
              category: "hotel",
              title: "Hotel Madrid",
              location: "Calle Mayor 1",
              city: "Madrid, España",
              reminderEnabled: false,
            },
            {
              tripId: trip.id,
              day: "Wednesday",
              date: "2026-06-03",
              endDate: "2026-06-06",
              type: "booking",
              category: "hotel",
              title: "Hotel de tránsito",
              location: "Ruta 2",
              city: "Entre destinos",
              reminderEnabled: false,
            },
          ],
        }),
      });
      assert.equal(createStaysResponse.status, 201);
      const stays = await createStaysResponse.json() as Array<{ id: number }>;

      const updateResponse = await fetch(`${apiUrl}/activities/${stays[1].id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          title: "Hotel de tránsito actualizado",
          reminderEnabled: true,
        }),
      });
      assert.equal(updateResponse.status, 200);
      const updated = await updateResponse.json() as {
        title: string;
        reminderEnabled: boolean;
        date: string;
      };
      assert.equal(updated.title, "Hotel de tránsito actualizado");
      assert.equal(updated.reminderEnabled, true);
      assert.equal(updated.date, "2026-06-03");

      const renameTripResponse = await fetch(`${apiUrl}/trips/${trip.id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name: "Viaje con hotel de tránsito" }),
      });
      assert.equal(renameTripResponse.status, 200);

      const shortenTripResponse = await fetch(`${apiUrl}/trips/${trip.id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          stops: [
            { destination: "Madrid, España", startDate: "2026-06-01", endDate: "2026-06-02" },
            { destination: "Lisboa, Portugal", startDate: "2026-06-05", endDate: "2026-06-05" },
          ],
        }),
      });
      assert.equal(shortenTripResponse.status, 400);
      assert.match(
        (await shortenTripResponse.json() as { error: string }).error,
        /Hotel de tránsito actualizado.*outside its route/,
      );
    } finally {
      await fetch(`${apiUrl}/trips/${trip.id}`, { method: "DELETE" });
    }
  });
});

test("rejects a route update that would orphan an existing activity", async () => {
  await withApiServer(async (apiUrl) => {
    const uniqueName = `Route update ${randomUUID()}`;
    const createTripResponse = await fetch(`${apiUrl}/trips`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ ...multiTrip, name: uniqueName }),
    });
    assert.equal(createTripResponse.status, 201);
    const trip = await createTripResponse.json() as { id: number; stops: unknown[] };

    try {
      const createActivityResponse = await fetch(`${apiUrl}/activities`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          tripId: trip.id,
          day: "Saturday",
          date: "2026-06-05",
          type: "activity",
          category: "cultural",
          title: "Actividad en Lisboa",
        }),
      });
      assert.equal(createActivityResponse.status, 201);

      const updateResponse = await fetch(`${apiUrl}/trips/${trip.id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          stops: [
            multiTrip.stops[0],
            { ...multiTrip.stops[1], endDate: "2026-06-04" },
          ],
        }),
      });
      assert.equal(updateResponse.status, 400);
      assert.match((await updateResponse.json() as { error: string }).error, /outside its route/);

      const reloadedResponse = await fetch(`${apiUrl}/trips/${trip.id}`);
      assert.equal(reloadedResponse.status, 200);
      const reloaded = await reloadedResponse.json() as { stops: unknown[] };
      assert.deepEqual(reloaded.stops, [
        { destination: "Madrid, España", startDate: "2026-06-01", endDate: "2026-06-03" },
        { destination: "Lisboa, Portugal", startDate: "2026-06-04", endDate: "2026-06-06" },
      ]);
    } finally {
      await fetch(`${apiUrl}/trips/${trip.id}`, { method: "DELETE" });
    }
  });
});