import { Sound } from '../../types';

// Singleton audio instances keyed by sound, created lazily on first play
const instances = new Map<Sound, HTMLAudioElement>();

function getOrCreate(sound: Sound): HTMLAudioElement {
  let audio = instances.get(sound);
  if (!audio) {
    audio = new Audio(sound);
    instances.set(sound, audio);
  }
  return audio;
}

export const AudioService = {
  play(sound: Sound) {
    const audio = getOrCreate(sound);
    audio.currentTime = 0;
    audio.play();
  },
};
