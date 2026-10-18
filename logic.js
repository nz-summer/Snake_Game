const SnakeLogic = (() => {
  const vectors = { up: { x: 0, y: -1 }, down: { x: 0, y: 1 }, left: { x: -1, y: 0 }, right: { x: 1, y: 0 } };
  const same = (a, b) => a.x === b.x && a.y === b.y;
  // The grid is cols x rows of square cells. Pass one number for a square grid.
  function foodFor(body, cols, rows, random = Math.random) {
    const occupied = new Set(body.map(p => p.y * cols + p.x));
    const free = [];
    for (let i = 0; i < cols * rows; i++) if (!occupied.has(i)) free.push(i);
    if (!free.length) return null;
    const index = free[Math.floor(random() * free.length)];
    return { x: index % cols, y: Math.floor(index / cols) };
  }
  function create(cols = 20, rows = cols, random = Math.random) {
    const x = Math.floor(cols / 2), y = Math.floor(rows / 2);
    const body = [{ x, y }, { x: x - 1, y }, { x: x - 2, y }];
    return { cols, rows, body, direction: 'right', queue: [], food: foodFor(body, cols, rows, random), score: 0, over: false, won: false };
  }
  function turn(state, name) {
    if (!vectors[name] || state.over || state.queue.length >= 2) return false;
    const previous = state.queue[state.queue.length - 1] || state.direction;
    const a = vectors[previous], b = vectors[name];
    if (previous === name || (a.x + b.x === 0 && a.y + b.y === 0)) return false;
    state.queue.push(name);
    return true;
  }
  function step(state, random = Math.random) {
    if (state.over) return 'over';
    state.direction = state.queue.shift() || state.direction;
    const d = vectors[state.direction];
    const head = { x: state.body[0].x + d.x, y: state.body[0].y + d.y };
    const eating = state.food && same(head, state.food);
    // The tail moves away on a normal step, so its current cell is safe to enter.
    const occupied = eating ? state.body : state.body.slice(0, -1);
    if (head.x < 0 || head.y < 0 || head.x >= state.cols || head.y >= state.rows || occupied.some(p => same(p, head))) {
      state.over = true; return 'collision';
    }
    state.body.unshift(head);
    if (!eating) state.body.pop();
    else {
      state.score++;
      state.food = foodFor(state.body, state.cols, state.rows, random);
      if (!state.food) { state.over = state.won = true; return 'won'; }
      return 'eat';
    }
    return 'move';
  }
  // Move a game onto a grid of a different size (the screen or iframe was resized).
  // The whole snake and the apple shift together, keeping roughly the same place on
  // screen, so the snake's shape is untouched and no new collision can appear.
  // Returns 'same', 'shifted' or 'reset'. 'reset' means the snake cannot fit and the
  // state is left unchanged; the caller should start a new game.
  function resize(state, cols, rows, random = Math.random) {
    if (cols === state.cols && rows === state.rows) return 'same';
    const xs = state.body.map(p => p.x), ys = state.body.map(p => p.y);
    const minX = Math.min(...xs), maxX = Math.max(...xs), minY = Math.min(...ys), maxY = Math.max(...ys);
    if (maxX - minX + 1 > cols || maxY - minY + 1 > rows) return 'reset';
    const fit = (shift, min, max, size) => Math.min(size - 1 - max, Math.max(-min, shift));
    const dx = fit(Math.floor((cols - state.cols) / 2), minX, maxX, cols);
    const dy = fit(Math.floor((rows - state.rows) / 2), minY, maxY, rows);
    state.body = state.body.map(p => ({ x: p.x + dx, y: p.y + dy }));
    state.cols = cols; state.rows = rows;
    const food = state.food && { x: state.food.x + dx, y: state.food.y + dy };
    const valid = food && food.x >= 0 && food.y >= 0 && food.x < cols && food.y < rows && !state.body.some(p => same(p, food));
    state.food = valid ? food : (state.won ? null : foodFor(state.body, cols, rows, random));
    return 'shifted';
  }
  return { create, turn, step, resize, foodFor, vectors };
})();
if (typeof module !== 'undefined') module.exports = SnakeLogic;
