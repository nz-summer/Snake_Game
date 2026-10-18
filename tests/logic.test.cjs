// Run: node --test tests/logic.test.cjs   (Node 18+, no dependencies)
const test = require('node:test');
const assert = require('node:assert/strict');
const S = require('../logic.js');

const inside = (s, p) => p.x >= 0 && p.y >= 0 && p.x < s.cols && p.y < s.rows;
const onBody = (s, p) => s.body.some(b => b.x === p.x && b.y === p.y);

test('a new game has a 3-segment snake in the middle and food on a free cell', () => {
  const s = S.create(24, 15);
  assert.equal(s.body.length, 3);
  assert.deepEqual([s.cols, s.rows], [24, 15]);
  assert.ok(inside(s, s.food) && !onBody(s, s.food));
});

test('one number makes a square grid', () => {
  const s = S.create(12);
  assert.deepEqual([s.cols, s.rows], [12, 12]);
});

test('reversals are ignored and at most two turns are queued', () => {
  const s = S.create(10);
  assert.equal(S.turn(s, 'left'), false);
  assert.equal(S.turn(s, 'up'), true);
  assert.equal(S.turn(s, 'left'), true);
  assert.equal(S.turn(s, 'down'), false);
});

test('hitting the right and bottom walls of a non-square grid ends the game', () => {
  const right = S.create(10, 5);
  let result;
  for (let i = 0; i < 20 && !right.over; i++) result = S.step(right);
  assert.equal(result, 'collision');
  const down = S.create(10, 5);
  S.turn(down, 'down');
  for (let i = 0; i < 20 && !down.over; i++) result = S.step(down);
  assert.equal(result, 'collision');
});

test('eating grows the snake, scores, and respawns food on a free cell', () => {
  const s = S.create(10, 6);
  const head = s.body[0];
  s.food = { x: head.x + 1, y: head.y };
  assert.equal(S.step(s), 'eat');
  assert.equal(s.score, 1);
  assert.equal(s.body.length, 4);
  assert.ok(inside(s, s.food) && !onBody(s, s.food));
});

test('moving into the cell the tail just left is allowed', () => {
  const s = S.create(10, 10);
  s.body = [{ x: 2, y: 1 }, { x: 2, y: 2 }, { x: 1, y: 2 }, { x: 1, y: 1 }];
  s.direction = 'up'; S.turn(s, 'left');
  assert.equal(S.step(s), 'move');
});

test('food never lands outside the grid or on the snake', () => {
  for (let n = 0; n < 500; n++) {
    const s = S.create(9, 7);
    for (let k = 0; k < 30 && !s.over; k++) { if (k % 4 === 0) S.turn(s, ['up', 'left', 'down', 'right'][(k / 4) % 4]); S.step(s); }
    if (s.food) assert.ok(inside(s, s.food) && !onBody(s, s.food));
  }
});

test('filling the whole board wins', () => {
  const s = S.create(3, 1);
  s.body = [{ x: 1, y: 0 }, { x: 0, y: 0 }];
  s.food = { x: 2, y: 0 };
  assert.equal(S.step(s), 'won');
  assert.ok(s.won && s.over && s.food === null);
});

test('resize keeps the snake whole, inside the new grid, with valid food', () => {
  const grids = [[47, 24], [17, 29], [8, 8], [30, 12], [9, 40], [20, 20]];
  for (const [cols, rows] of grids) {
    const s = S.create(20);
    S.step(s); S.step(s);
    const before = s.body.map((p, i) => i ? { dx: p.x - s.body[i - 1].x, dy: p.y - s.body[i - 1].y } : null);
    const result = S.resize(s, cols, rows);
    if (result === 'reset') continue;
    assert.deepEqual([s.cols, s.rows], [cols, rows]);
    assert.ok(s.body.every(p => inside(s, p)));
    assert.deepEqual(s.body.map((p, i) => i ? { dx: p.x - s.body[i - 1].x, dy: p.y - s.body[i - 1].y } : null), before);
    assert.ok(inside(s, s.food) && !onBody(s, s.food));
  }
});

test('resize asks for a reset when the snake cannot fit', () => {
  const s = S.create(30, 30);
  s.body = Array.from({ length: 12 }, (_, i) => ({ x: 5 + i, y: 5 }));
  assert.equal(S.resize(s, 8, 8), 'reset');
  assert.equal(s.cols, 30);
});

test('resize never spawns food after a win', () => {
  const s = S.create(3, 1);
  s.body = [{ x: 1, y: 0 }, { x: 0, y: 0 }];
  s.food = { x: 2, y: 0 };
  S.step(s);
  S.resize(s, 10, 4);
  assert.equal(s.food, null);
});
