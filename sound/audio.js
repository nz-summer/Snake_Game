/* Tiny original effects. Audio is created only after a player gesture. */
window.OGAudio = (() => {
  // Sound preference is stored per game so games on one origin never share it.
  const soundKey = (document.body.dataset.game || 'snake') + ':sound';
  let context;
  let enabled = true; // On by default; the player's saved choice wins.
  try { enabled = localStorage.getItem(soundKey) !== 'off'; } catch { /* Storage is optional. */ }
  function unlock() {
    if (!enabled) return;
    const Audio = window.AudioContext || window.webkitAudioContext;
    if (!Audio) return;
    try {
      context ||= new Audio();
      if (context.state === 'suspended') context.resume().catch(() => {});
    } catch { /* Play remains available without audio. */ }
  }
  document.addEventListener('pointerdown', unlock);
  document.addEventListener('keydown', unlock);
  const effects = {
    move: [260], flip: [420, 520], hit: [360, 640], eat: [480, 720],
    success: [440, 554, 659, 880], failure: [220, 165, 110]
  };
  // Longer "bonk" for hitting a wall: a falling tone over a low thud.
  function crash() {
    const t = context.currentTime;
    [['sawtooth', 260, 50, .7, .11], ['sine', 120, 40, .5, .2]].forEach(([type, from, to, length, volume]) => {
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      oscillator.type = type;
      oscillator.frequency.setValueAtTime(from, t);
      oscillator.frequency.exponentialRampToValueAtTime(to, t + length);
      gain.gain.setValueAtTime(volume, t);
      gain.gain.exponentialRampToValueAtTime(.001, t + length);
      oscillator.connect(gain).connect(context.destination);
      oscillator.start(t);
      oscillator.stop(t + length + .02);
      oscillator.onended = () => { oscillator.disconnect(); gain.disconnect(); };
    });
  }
  function play(name) {
    if (!enabled || !context || context.state !== 'running') return;
    if (name === 'crash') return crash();
    (effects[name] || effects.flip).forEach((frequency, index) => {
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      const start = context.currentTime + index * .075;
      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(frequency, start);
      gain.gain.setValueAtTime(0, start);
      gain.gain.linearRampToValueAtTime(.065, start + .008);
      gain.gain.exponentialRampToValueAtTime(.001, start + .12);
      oscillator.connect(gain).connect(context.destination);
      oscillator.start(start);
      oscillator.stop(start + .13);
      oscillator.onended = () => { oscillator.disconnect(); gain.disconnect(); };
    });
  }
  return {
    play,
    get enabled() { return enabled; },
    toggle() {
      enabled = !enabled;
      try { localStorage.setItem(soundKey, enabled ? 'on' : 'off'); } catch { /* Optional. */ }
      unlock();
      if (enabled) play('flip');
      return enabled;
    }
  };
})();
