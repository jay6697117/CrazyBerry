import test from 'node:test';
import assert from 'node:assert/strict';
import { TimeSystem } from '../../src/game/TimeSystem.js';

test('weather follows deterministic sunny-cloudy-rainy cycle', () => {
  const time = new TimeSystem();

  time.setDayNumber(1);
  assert.deepEqual(time.getWeatherState(), { code: 'sunny', icon: '☀️' });

  time.setDayNumber(2);
  assert.deepEqual(time.getWeatherState(), { code: 'cloudy', icon: '☁️' });

  time.setDayNumber(3);
  assert.deepEqual(time.getWeatherState(), { code: 'rainy', icon: '🌧️' });

  time.setDayNumber(4);
  assert.deepEqual(time.getWeatherState(), { code: 'sunny', icon: '☀️' });
});

test('clock label is derived from time ratio', () => {
  const time = new TimeSystem({ dayDurationSeconds: 100 });

  time.setTimeRatio(0);
  assert.equal(time.getClockLabel(), '06:00 am');

  time.setTimeRatio(0.5);
  assert.equal(time.getClockLabel(), '06:00 pm');

  time.setTimeRatio(0.75);
  assert.equal(time.getClockLabel(), '12:00 am');
});
