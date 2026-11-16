import assert from "node:assert/strict";
import test from "node:test";
import { dateStringToLocalDate, localDateToDateString, timePartsToValue, timeToParts } from "../lib/dateTime";

test("converts 24-hour values to 12-hour time controls and back", () => {
  assert.deepEqual(timeToParts("00:05"), { hour: "12", minute: "05", period: "AM" });
  assert.deepEqual(timeToParts("12:30"), { hour: "12", minute: "30", period: "PM" });
  assert.deepEqual(timeToParts("23:59"), { hour: "11", minute: "59", period: "PM" });
  assert.equal(timePartsToValue({ hour: "12", minute: "00", period: "AM" }), "00:00");
  assert.equal(timePartsToValue({ hour: "12", minute: "00", period: "PM" }), "12:00");
  assert.equal(timePartsToValue(null), "");
  assert.equal(timeToParts("25:00"), null);
});

test("round-trips date-only values without a timezone shift", () => {
  const date = dateStringToLocalDate("2026-01-02");
  assert.ok(date);
  assert.equal(localDateToDateString(date), "2026-01-02");
  assert.equal(dateStringToLocalDate("2026-02-31"), undefined);
  assert.equal(localDateToDateString(undefined), "");
});