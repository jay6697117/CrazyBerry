import test from 'node:test';
import assert from 'node:assert/strict';
import { AudioSystem } from '../../src/audio/AudioSystem.js';

class FakeAudioClip {
  constructor(src) {
    this.src = src;
    this.preload = '';
    this.volume = 0;
  }

  cloneNode() {
    return {
      play: () => Promise.resolve()
    };
  }
}

test('audio system preloads action samples from assets path', async () => {
  const oldAudio = globalThis.Audio;
  globalThis.Audio = FakeAudioClip;

  try {
    const audio = new AudioSystem({ enabled: true, basePath: 'assets/sounds' });
    const ready = await audio.init();
    assert.equal(ready, true);
    assert.equal(audio.samples.size, 4);
    assert.match(audio.samples.get('water').src, /assets\/sounds\/water\.wav$/);
    assert.match(audio.samples.get('harvest').src, /assets\/sounds\/harvest\.wav$/);
  } finally {
    globalThis.Audio = oldAudio;
  }
});

test('audio system falls back to synth when sample is unavailable', () => {
  const audio = new AudioSystem({ enabled: true });
  let fallbackType = null;
  audio.playSynth = (type) => {
    fallbackType = type;
  };

  audio.playAction('water');
  assert.equal(fallbackType, 'water');
});
