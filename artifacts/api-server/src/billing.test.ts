import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import test from "node:test";
import app from "./app";
import { checkLimit, FREE_LIMITS, incrementUsage, setProStatusResolver } from "./billing";

process.env.NODE_ENV = "test";

const trip = (startDate: string, endDate: string) => ({
  name: "Viaje", tripType: "single", destination: "Lisboa, Portugal", startDate, endDate, adults: 2, children: 0, stops: [],
});
const future = (days: number) => new Date(Date.now() + days * 86_400_000).toISOString().slice(0, 10);

async function withServer(run: (api: string) => Promise<void>) {
  const server = app.listen(0);
  await new Promise<void>((resolve) => server.once("listening", resolve));
  const address = server.address();
  if (!address || typeof address === "string") throw new Error("no port");
  try {
    await run(`http://127.0.0.1:${address.port}/api`);
  } finally {
    await new Promise<void>((resolve) => server.close(() => resolve()));
  }
}

async function withBilling(enabled: boolean, run: () => Promise<void>) {
  const saved = process.env.REVENUECAT_SECRET_API_KEY;
  if (enabled) process.env.REVENUECAT_SECRET_API_KEY = "sk_test_dummy";
  else delete process.env.REVENUECAT_SECRET_API_KEY;
  try {
    await run();
  } finally {
    if (saved) process.env.REVENUECAT_SECRET_API_KEY = saved;
    else delete process.env.REVENUECAT_SECRET_API_KEY;
    setProStatusResolver(null);
  }
}

test("free plan: only one active trip; past trips do not count; Pro is unlimited", async () => {
  await withBilling(true, async () => {
    const proUsers = new Set<string>();
    setProStatusResolver(async (userId) => ({ isPro: proUsers.has(userId), expiresAt: null }));
    await withServer(async (api) => {
      const user = `user_free_${randomUUID()}`;
      const post = (body: unknown) => fetch(`${api}/trips`, {
        method: "POST",
        headers: { "content-type": "application/json", "x-test-user-id": user },
        body: JSON.stringify(body),
      });

      assert.equal((await post(trip("2020-01-01", "2020-01-05"))).status, 201, "a past trip is allowed");
      assert.equal((await post(trip(future(10), future(15)))).status, 201, "first active trip");
      const blocked = await post(trip(future(20), future(25)));
      assert.equal(blocked.status, 402);
      assert.deepEqual(await blocked.json(), { error: "Free plan limit reached", code: "LIMIT_TRIPS", limit: FREE_LIMITS.activeTrips });

      const plan = await (await fetch(`${api}/me/plan`, { headers: { "x-test-user-id": user } })).json() as {
        billingEnabled: boolean; isPro: boolean; usage: { activeTrips: number };
      };
      assert.equal(plan.billingEnabled, true);
      assert.equal(plan.isPro, false);
      assert.equal(plan.usage.activeTrips, 1);

      proUsers.add(user);
      await fetch(`${api}/me/plan/refresh`, { method: "POST", headers: { "x-test-user-id": user } });
      assert.equal((await post(trip(future(20), future(25)))).status, 201, "Pro can create more trips");
    });
  });
});

test("monthly AI limits count per user and reset nothing for other users", async () => {
  await withBilling(true, async () => {
    setProStatusResolver(async () => ({ isPro: false, expiresAt: null }));
    const user = `user_ai_${randomUUID()}`;
    for (let i = 0; i < FREE_LIMITS.scans; i += 1) {
      assert.deepEqual(await checkLimit(user, "scans"), { allowed: true });
      await incrementUsage(user, "scans");
    }
    assert.deepEqual(await checkLimit(user, "scans"), { allowed: false, code: "LIMIT_SCANS", limit: FREE_LIMITS.scans });
    assert.deepEqual(await checkLimit(user, "ideas"), { allowed: true });
    assert.deepEqual(await checkLimit(`user_other_${randomUUID()}`, "scans"), { allowed: true });
  });
});

test("without billing configured nothing is limited", async () => {
  await withBilling(false, async () => {
    const user = `user_nobilling_${randomUUID()}`;
    for (let i = 0; i < 5; i += 1) await incrementUsage(user, "ideas");
    assert.deepEqual(await checkLimit(user, "ideas"), { allowed: true });
    assert.deepEqual(await checkLimit(user, "activeTrips"), { allowed: true });
  });
});

test("AI suggestions now require a signed-in user", async () => {
  await withServer(async (api) => {
    const response = await fetch(`${api}/suggestions`, {
      method: "POST",
      headers: { "content-type": "application/json", "x-test-user-id": "" },
      body: JSON.stringify({ destination: "Madrid", adults: 1, children: 0, category: "any", date: "2030-01-01", language: "es" }),
    });
    assert.equal(response.status, 401);
  });
});
