(() => {
  const canvas = document.getElementById('board');
  const scoreLabel = document.getElementById('score');
  const bestLabel = document.getElementById('best');
  const CRASH_MS = 1100;
  let state, running = false, paused = false, accumulator = 0, lastFrame = 0, frame = 0, best = 0, now = 0;
  let crashing = false, crashStart = 0, crashFrame = 0;
  const ui = OG.createUI({ restart, togglePause });
  const view = OG.canvasView(canvas, draw);
  function bestKey() { return 'snake:best:' + ui.difficulty; }
  function restart(playImmediately = false) {
    cancelAnimationFrame(frame); frame = 0;
    cancelAnimationFrame(crashFrame); crashFrame = 0; crashing = false;
    state = SnakeLogic.create(20);
    running = paused = false;
    accumulator = 0;
    best = Number(OG.storage.get(bestKey(), 0)) || 0;
    bestLabel.textContent = String(best);
    scoreLabel.textContent = '0';
    ui.setPaused(false);
    ui.showOverlay('Ready', '', 'Play', start, false);
    view.draw();
    if (playImmediately) start();
  }
  function start() {
    running = true; paused = false;
    ui.hideOverlay(); ui.setPaused(false);
    canvas.focus({ preventScroll: true });
    wake();
  }
  function move(direction) {
    if (state.over || paused) return;
    SnakeLogic.turn(state, direction);
    if (!running) start();
  }
  function togglePause() {
    if (!running || state.over) return;
    paused = !paused;
    if (paused) { cancelAnimationFrame(frame); frame = 0; } ui.setPaused(paused);
    if (paused) ui.showOverlay('Paused', '', 'Resume', togglePause);
    else { ui.hideOverlay(); wake(); }
  }
  function showEnd() {
    ui.showOverlay(state.won ? 'Board complete' : 'Game over', `${state.score} ${state.score === 1 ? 'fruit' : 'fruits'} collected · Best ${best}`, 'Play again', () => { restart(); start(); });
    view.draw();
  }
  // On a crash the snake's face stays against the wall for a moment (dizzy eyes, tongue out,
  // a little shake and a long "bonk") before the Game over screen appears.
  function crashLoop(timestamp) {
    now = timestamp;
    view.draw();
    if (timestamp - crashStart < CRASH_MS) crashFrame = requestAnimationFrame(crashLoop);
    else { crashFrame = 0; crashing = false; showEnd(); }
  }
  function end() {
    running = false;
    if (state.won) { OGAudio.play('success'); showEnd(); return; }
    OGAudio.play('crash');
    crashing = true; crashStart = performance.now();
    crashFrame = requestAnimationFrame(crashLoop);
  }
  function draw(ctx, size) {
    if (!state) return;
    const cell = size / state.size;
    ctx.clearRect(0, 0, size, size);
    ctx.save();
    const age = crashing ? now - crashStart : 0;
    if (crashing && !OG.reducedMotion.matches && age < 450) {
      const fade = 1 - age / 450;
      ctx.translate(Math.sin(age / 22) * cell * .18 * fade, Math.cos(age / 17) * cell * .1 * fade);
    }
    ctx.fillStyle = '#f8faef'; ctx.fillRect(0, 0, size, size);
    ctx.strokeStyle = '#e1e9d6'; ctx.lineWidth = 1;
    ctx.beginPath();
    for (let i = 1; i < state.size; i++) { ctx.moveTo(i * cell, 0); ctx.lineTo(i * cell, size); ctx.moveTo(0, i * cell); ctx.lineTo(size, i * cell); } ctx.stroke();
    if (state.food) {
      const x = (state.food.x + .5) * cell, y = (state.food.y + .5) * cell;
      const pulse = OG.reducedMotion.matches ? 1 : 1 + Math.sin(now / 240) * .05;
      const r = cell * .36 * pulse;
      ctx.fillStyle = '#d93a1f'; ctx.beginPath(); ctx.arc(x, y + r * .08, r, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#ffffff55'; ctx.beginPath(); ctx.ellipse(x - r * .4, y - r * .1, r * .2, r * .38, .4, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = '#6b4a2b'; ctx.lineWidth = Math.max(1.5, cell * .06); ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(x, y - r * .8); ctx.lineTo(x + r * .15, y - r * 1.25); ctx.stroke();
      ctx.fillStyle = '#58a64a'; ctx.beginPath(); ctx.ellipse(x + r * .55, y - r * 1.05, r * .42, r * .2, -.5, 0, Math.PI * 2); ctx.fill();
    }
    const last = state.body.length - 1;
    for (let i = last; i >= 0; i--) {
      const p = state.body[i];
      ctx.fillStyle = i === 0 ? '#2f6538' : i === last ? '#3f7a45' : '#6aa95a';
      ctx.beginPath(); ctx.roundRect(p.x * cell + 1, p.y * cell + 1, cell - 2, cell - 2, cell * .24); ctx.fill();
    }
    const head = state.body[0], d = SnakeLogic.vectors[state.direction];
    const hx = (head.x + .5) * cell, hy = (head.y + .5) * cell;
    // Forked tongue just in front of the head.
    ctx.strokeStyle = '#e2452b'; ctx.lineWidth = Math.max(1.5, cell * .07); ctx.lineCap = 'round';
    const reach = crashing ? .55 : .3; // the tongue flops out further after a crash
    const tx = hx + d.x * cell * .5, ty = hy + d.y * cell * .5, ex = tx + d.x * cell * reach, ey = ty + d.y * cell * reach;
    ctx.beginPath(); ctx.moveTo(tx, ty); ctx.lineTo(ex, ey);
    ctx.moveTo(ex, ey); ctx.lineTo(ex + (d.x + d.y) * cell * .1, ey + (d.y - d.x) * cell * .1);
    ctx.moveTo(ex, ey); ctx.lineTo(ex + (d.x - d.y) * cell * .1, ey + (d.y + d.x) * cell * .1);
    ctx.stroke();
    for (const side of [-1, 1]) {
      const x = hx + d.x * cell * .12 + d.y * side * cell * .2;
      const y = hy + d.y * cell * .12 + d.x * side * cell * .2;
      if (crashing) {
        // Dizzy "X" eyes.
        const s = cell * .1;
        ctx.strokeStyle = '#ffffff'; ctx.lineWidth = Math.max(1.5, cell * .06); ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(x - s, y - s); ctx.lineTo(x + s, y + s); ctx.moveTo(x + s, y - s); ctx.lineTo(x - s, y + s); ctx.stroke();
        continue;
      }
      ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.arc(x, y, cell * .13, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#1f3324'; ctx.beginPath(); ctx.arc(x + d.x * cell * .04, y + d.y * cell * .04, cell * .065, 0, Math.PI * 2); ctx.fill();
    }
    if (crashing) {
      // Impact burst where the face met the wall or body, pulsing out and fading.
      const t = Math.min(1, age / 500), bx = hx + d.x * cell * .62, by = hy + d.y * cell * .62;
      ctx.strokeStyle = '#f6b21c'; ctx.lineWidth = Math.max(2, cell * .08); ctx.lineCap = 'round'; ctx.globalAlpha = 1 - t * .8;
      ctx.beginPath();
      for (let i = 0; i < 8; i++) {
        const a = i * Math.PI / 4, r1 = cell * (.22 + t * .25), r2 = cell * (.4 + t * .4);
        ctx.moveTo(bx + Math.cos(a) * r1, by + Math.sin(a) * r1); ctx.lineTo(bx + Math.cos(a) * r2, by + Math.sin(a) * r2);
      }
      ctx.stroke(); ctx.globalAlpha = 1;
    }
    ctx.restore();
  }  function tick(timestamp) {
    frame = 0;
    if (!running || paused || document.hidden) return;
    now = timestamp;
    accumulator += Math.min(timestamp - lastFrame, 250); lastFrame = timestamp;
    const interval = Math.max(65, { easy: 185, normal: 140, hard: 105 }[ui.difficulty] - state.score * 2);
    while (accumulator >= interval && !state.over) {
      accumulator -= interval;
      const result = SnakeLogic.step(state);
      if (result === 'eat' || result === 'won') {
        scoreLabel.textContent = String(state.score);
        if (state.score > best) { best = state.score; OG.storage.set(bestKey(), best); bestLabel.textContent = String(best); }
        OGAudio.play('eat');
      }
      if (state.over) { end(); return; }
    }
    view.draw();
    frame = requestAnimationFrame(tick);
  }
  function wake() { if (!frame) { lastFrame = performance.now(); frame = requestAnimationFrame(tick); } }
  document.addEventListener('visibilitychange', () => { if (document.hidden && running && !paused) togglePause(); });
  window.addEventListener('blur', () => { if (running && !paused) togglePause(); });
  OGInput.bind({ surface: canvas, direction: move, action: () => { if (state.over) { restart(); start(); } else if (paused) togglePause(); else if (!running) start(); }, pause: togglePause, restart: () => { restart(); start(); } });
  restart();
})();
