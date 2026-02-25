import test from 'node:test';
import assert from 'node:assert/strict';
import { TimeSystem } from '../../src/game/TimeSystem.js';

test('day advances and emits day-end event', () => {
  const time = new TimeSystem({ dayDurationSeconds: 10 });
  let called = 0;
  time.onDayEnd(() => {
    called += 1;
  });

  time.update(11);
  assert.equal(time.getDayNumber(), 2);
  assert.equal(called, 1);
});

test('phase label transitions', () => {
  const time = new TimeSystem({ dayDurationSeconds: 100 });
  assert.equal(time.getPhase(), 'morning');
  time.update(30);
  assert.equal(time.getPhase(), 'noon');
  time.update(25);
  assert.equal(time.getPhase(), 'dusk');
  time.update(25);
  assert.equal(time.getPhase(), 'night');
});
