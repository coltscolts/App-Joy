import assert from 'node:assert/strict';
import test from 'node:test';
import { formatTime12, isoDateTimeToTime24, time24ToParts, timePartsTo24 } from './dateTime';

test('converts stored 24-hour times into 12-hour picker parts', () => {
  assert.deepEqual(time24ToParts('00:05'), { hour: 12, minute: 5, period: 'AM' });
  assert.deepEqual(time24ToParts('12:30'), { hour: 12, minute: 30, period: 'PM' });
  assert.deepEqual(time24ToParts('23:59'), { hour: 11, minute: 59, period: 'PM' });
  assert.equal(formatTime12('18:07'), '6:07 PM');
});

test('converts separate picker parts back to the API HH:mm format', () => {
  assert.equal(timePartsTo24(12, 0, 'AM'), '00:00');
  assert.equal(timePartsTo24(12, 0, 'PM'), '12:00');
  assert.equal(timePartsTo24(7, 5, 'PM'), '19:05');
  assert.equal(timePartsTo24(13, 0, 'AM'), '');
});

test('normalizes flight timestamps to the same local time in canonical HH:mm', () => {
  assert.equal(isoDateTimeToTime24('2026-11-13T18:07:00'), '18:07');
  assert.equal(isoDateTimeToTime24('not-a-date'), '');
  assert.equal(isoDateTimeToTime24(undefined), '');
});