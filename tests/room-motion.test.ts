import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createContext, runInContext} from 'node:vm';
import {positionOnRoute} from '#feiyu-home';

// Exercise the shipped scene's actual snapshot and frame prediction functions.
// No WebGL, personal state, renderer hooks or second movement implementation.
function scene() {
  const source = readFileSync('vendor/feiyu-room-template/public/room/app.js', 'utf8');
  function section(start: string, end: string) {
    const from = source.indexOf(start), to = source.indexOf(end, from);
    assert.ok(from >= 0 && to > from, 'Scene fixture boundary changed');
    return source.slice(from, to);
  }
  let clock = 0;
  const context = createContext({performance: {now: () => clock}, Date: {now: () => 1_000_000 + clock}});
  runInContext(`
    const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
    let state = null, roomView = null, walkPredict = null, lastDisplayPos = null;
    let placeHold = null, charDrag = null;
    const SHOT = true;
    const world = {updateEnvironment() {}, setClock() {}};
    const presentationLoop = {invalidate() {}};
    function renderHUD() {} function syncCharacter() {} function presentAnimationFeedback() {}
    ${section('function advanceRoute(', '\nconst canvas =')}
    ${section('function applyState(next)', '\nfunction renderHUD()')}
    function position() {
      const her = state.her;
      ${section('    let displayPos = her.pos;', '    const dragging =')}
      lastDisplayPos = displayPos;
      return displayPos;
    }
    globalThis.apply = applyState;
    globalThis.position = position;
  `, context);
  return {
    at(value: number) { clock = value; },
    apply(value: unknown) { (context.apply as (value: unknown) => void)(value); },
    position() { return Array.from((context.position as () => number[])()); },
  };
}

function route(points: number[][], departAt = 1_000_000) {
  const speed = 1.05;
  const length = points.slice(1).reduce((sum, point, i) => sum + Math.hypot(point[0] - points[i][0], point[1] - points[i][1]), 0);
  return {points, departAt, speed, arriveAt: departAt + length / speed * 1000};
}
function snapshot(plan: ReturnType<typeof route>, now: number) {
  return {now, her: {pos: positionOnRoute(plan, now), walking: true,
    route: plan.points, speed: plan.speed, etaMs: Math.max(0, plan.arriveAt - now)}};
}
function near(actual: number[], expected: number[]) {
  assert.ok(Math.hypot(actual[0] - expected[0], actual[1] - expected[1]) < 0.001,
    JSON.stringify({actual, expected}));
}

test('late and repeated snapshots do not pull an autonomous walk backwards', () => {
  const view = scene(), plan = route([[0, 0], [4, 0], [4, 4]]);
  view.apply(snapshot(plan, plan.departAt));
  view.at(2000);
  near(view.position(), [2.1, 0]);
  view.apply(snapshot(plan, plan.departAt + 1000)); // One second late.
  near(view.position(), [2.1, 0]);
  view.at(2600);
  view.apply(snapshot(plan, plan.departAt + 1200)); // Delay changes again.
  near(view.position(), [2.73, 0]);
  view.apply(snapshot(plan, plan.departAt + 1200)); // Duplicate response.
  near(view.position(), [2.73, 0]);
  view.at(5000);
  near(view.position(), [4, 1.25]); // The existing doorway/corner is retained.
});

test('ETA keeps a returning actor on the correct overlapping route leg', () => {
  const view = scene(), plan = route([[11.5, 7.1], [11.8, 6.55], [11.5, 7.1]]);
  const sampledAt = plan.departAt + (plan.arriveAt - plan.departAt) * 0.7;
  view.apply(snapshot(plan, sampledAt));
  view.at(200);
  near(view.position(), positionOnRoute(plan, sampledAt + 200)!);
});

test('delivery delay in the first snapshot does not leave a jump at arrival', () => {
  const view = scene(), plan = route([[0, 0], [4, 0]]);
  view.at(1000);
  view.apply(snapshot(plan, plan.departAt)); // The first packet took a second.
  near(view.position(), [1.05, 0]);
  view.at(4000);
  const before = view.position();
  near(before, [4, 0]);
  view.apply({now: plan.departAt + 4000, her: {pos: [4, 0], walking: false, route: [], speed: 0, etaMs: 0}});
  near(view.position(), before);
});

test('a different trip with the same geometry starts a new prediction and arrival stops it', () => {
  const view = scene(), first = route([[0, 0], [4, 0]]);
  view.apply(snapshot(first, first.departAt));
  view.at(2000);
  near(view.position(), [2.1, 0]);
  const second = route(first.points, first.arriveAt + 5000);
  view.apply(snapshot(second, second.departAt));
  near(view.position(), [0, 0]);
  view.at(2200);
  near(view.position(), [0.21, 0]);
  view.apply({now: second.arriveAt, her: {pos: [4, 0], walking: false, route: [], speed: 0, etaMs: 0}});
  near(view.position(), [4, 0]);
});
