import assert from "node:assert/strict";
import test from "node:test";
import { getCityName, getDestinationForDate, getStopForDate } from "./itinerary";

const route = {
  tripType: "multi",
  destination: "Madrid, España, Lisboa, Portugal",
  startDate: "2026-06-01",
  endDate: "2026-06-06",
  stops: [
    { destination: " Madrid, España ", startDate: "2026-06-01", endDate: "2026-06-03" },
    { destination: "Lisboa, Portugal", startDate: "2026-06-04", endDate: "2026-06-06" },
  ],
};

test("maps each itinerary date to the city of its ordered stop", () => {
  assert.equal(getCityName(getDestinationForDate("2026-06-02", route) ?? ""), "Madrid");
  assert.equal(getCityName(getDestinationForDate("2026-06-05", route) ?? ""), "Lisboa");
  assert.equal(getStopForDate("2026-06-07", route), undefined);
});

test("assigns a shared check-out/check-in date to the next stop", () => {
  const sharedBoundaryRoute = {
    ...route,
    stops: [
      { destination: "Madrid, España", startDate: "2026-06-01", endDate: "2026-06-03" },
      { destination: "Lisboa, Portugal", startDate: "2026-06-03", endDate: "2026-06-06" },
    ],
  };

  assert.equal(getDestinationForDate("2026-06-03", sharedBoundaryRoute), "Lisboa, Portugal");
});

test("maps each single-destination itinerary date to its trip city", () => {
  const trip = {
    tripType: "single",
    destination: "Oaxaca, México",
    startDate: "2026-08-10",
    endDate: "2026-08-12",
  };

  assert.equal(getCityName(getDestinationForDate("2026-08-11", trip) ?? ""), "Oaxaca");
  assert.equal(getDestinationForDate("2026-08-13", trip), undefined);
});