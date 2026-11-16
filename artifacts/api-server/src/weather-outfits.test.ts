import { test } from "node:test";
import assert from "node:assert/strict";
import { summarizeDaily, type StopWeather } from "./weather";
import { ruleBasedOutfit } from "./outfits";

const base: StopWeather = {
  city: "Cancún", startDate: "2027-03-01", endDate: "2027-03-04", source: "forecast",
  avgHigh: 31, avgLow: 23, maxTemp: 33, minTemp: 22, rainyDays: 0, totalDays: 4, current: null,
};

test("summarizeDaily averages forecast and counts rain by probability", () => {
  const s = summarizeDaily({
    time: ["a", "b", "c", "d"],
    temperature_2m_max: [20, 22, null, 24],
    temperature_2m_min: [10, 12, 14, 16],
    precipitation_probability_max: [10, 60, 80, 0],
  }, "forecast");
  assert.equal(s?.avgHigh, 22);
  assert.equal(s?.avgLow, 13);
  assert.equal(s?.rainyDays, 2);
  assert.equal(s?.totalDays, 4);
});

test("summarizeDaily averages typical climate across years", () => {
  const s = summarizeDaily({
    time: ["a", "b", "a", "b", "a", "b"],
    temperature_2m_max: [10, 10, 12, 12, 14, 14],
    temperature_2m_min: [0, 0, 2, 2, 4, 4],
    precipitation_sum: [5, 0, 3, 0, 0, 0],
  }, "typical", 3);
  assert.equal(s?.totalDays, 2);
  assert.equal(s?.rainyDays, 1);
  assert.equal(s?.avgHigh, 12);
});

test("summarizeDaily returns null without data", () => {
  assert.equal(summarizeDaily({}, "forecast"), null);
});

test("hot weather suggests light clothes and sun protection", () => {
  const o = ruleBasedOutfit(base, "es");
  assert.match(o.summary, /Calor · 23°–31°C/);
  assert.ok(o.items.some((i) => /Traje de baño/.test(i)));
  assert.ok(o.tips.some((t) => /Hidrátate/.test(t)));
});

test("cold rainy typical weather adds rain gear and typical note", () => {
  const o = ruleBasedOutfit({ ...base, source: "typical", avgHigh: 6, avgLow: -1, rainyDays: 2, totalDays: 4 }, "en");
  assert.match(o.summary, /^Cold with some rainy days/);
  assert.ok(o.items.includes("Hooded rain jacket"));
  assert.ok(o.tips.some((t) => /typical weather/.test(t)));
  assert.ok(o.tips.some((t) => /extra socks/.test(t)));
});
