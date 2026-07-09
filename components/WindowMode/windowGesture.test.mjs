import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  displayRectToVideoSourceRect,
  handGestureInputFromLandmarks,
  initialWindowGestureState,
  updateWindowGestureFromHands,
  updateWindowGesture,
} from './windowGesture.mjs';

function updateSequence(inputs) {
  return inputs.reduce(
    (state, input) => updateWindowGesture(state, input),
    initialWindowGestureState(),
  );
}

describe('updateWindowGesture', () => {
  it('starts a window from a tight pinch and sizes width from horizontal drag', () => {
    const state = updateSequence([
      { center: { x: 0.24, y: 0.44 }, pinchRatio: 0.18, openPalm: false },
      { center: { x: 0.72, y: 0.46 }, pinchRatio: 0.2, openPalm: false },
    ]);

    assert.equal(state.phase, 'sizingWidth');
    assert.equal(Number(state.rect.x.toFixed(2)), 0.24);
    assert.equal(Number(state.rect.w.toFixed(2)), 0.48);
    assert.ok(state.rect.h >= 0.08 && state.rect.h < 0.11);
  });

  it('keeps the dragged width and grows height as the pinch opens', () => {
    const state = updateSequence([
      { center: { x: 0.25, y: 0.5 }, pinchRatio: 0.18, openPalm: false },
      { center: { x: 0.65, y: 0.5 }, pinchRatio: 0.2, openPalm: false },
      { center: { x: 0.65, y: 0.5 }, pinchRatio: 0.52, openPalm: false },
      { center: { x: 0.65, y: 0.5 }, pinchRatio: 0.72, openPalm: false },
    ]);

    assert.equal(state.phase, 'sizingHeight');
    assert.equal(Number(state.rect.x.toFixed(2)), 0.25);
    assert.equal(Number(state.rect.w.toFixed(2)), 0.4);
    assert.ok(state.rect.h > 0.25);
    assert.equal(
      Number((state.rect.y + state.rect.h / 2).toFixed(2)),
      0.5,
    );
  });

  it('locks the last dimensions when the palm opens', () => {
    const state = updateSequence([
      { center: { x: 0.3, y: 0.48 }, pinchRatio: 0.18, openPalm: false },
      { center: { x: 0.62, y: 0.48 }, pinchRatio: 0.2, openPalm: false },
      { center: { x: 0.62, y: 0.48 }, pinchRatio: 0.7, openPalm: false },
      { center: { x: 0.62, y: 0.48 }, pinchRatio: 1.05, openPalm: true },
    ]);

    assert.equal(state.phase, 'locked');
    assert.equal(Number(state.rect.w.toFixed(2)), 0.32);
    assert.ok(state.rect.h > 0.3);
  });

  it('allows a new pinch to replace a locked window', () => {
    const locked = updateSequence([
      { center: { x: 0.3, y: 0.5 }, pinchRatio: 0.18, openPalm: false },
      { center: { x: 0.68, y: 0.5 }, pinchRatio: 0.2, openPalm: false },
      { center: { x: 0.68, y: 0.5 }, pinchRatio: 0.68, openPalm: false },
      { center: { x: 0.68, y: 0.5 }, pinchRatio: 1.0, openPalm: true },
    ]);

    const restarted = updateWindowGesture(locked, {
      center: { x: 0.12, y: 0.22 },
      pinchRatio: 0.18,
      openPalm: false,
    });

    assert.equal(restarted.phase, 'sizingWidth');
    assert.equal(Number(restarted.anchor.x.toFixed(2)), 0.12);
  });
});

describe('updateWindowGestureFromHands', () => {
  it('sizes width from both pinched hands without switching owners', () => {
    let state = initialWindowGestureState();
    state = updateWindowGestureFromHands(state, [
      { center: { x: 0.28, y: 0.48 }, pinchRatio: 0.18, openPalm: false },
      { center: { x: 0.62, y: 0.5 }, pinchRatio: 0.2, openPalm: false },
    ]);
    state = updateWindowGestureFromHands(state, [
      { center: { x: 0.18, y: 0.48 }, pinchRatio: 0.18, openPalm: false },
      { center: { x: 0.82, y: 0.5 }, pinchRatio: 0.2, openPalm: false },
    ]);

    assert.equal(state.phase, 'sizingWidth');
    assert.equal(Number(state.rect.x.toFixed(2)), 0.18);
    assert.equal(Number(state.rect.w.toFixed(2)), 0.64);
    assert.ok(state.rect.h >= 0.08 && state.rect.h < 0.11);
  });

  it('does not grow height until the paired pinch opens', () => {
    let state = initialWindowGestureState();
    state = updateWindowGestureFromHands(state, [
      { center: { x: 0.35, y: 0.5 }, pinchRatio: 0.18, openPalm: false },
      { center: { x: 0.65, y: 0.5 }, pinchRatio: 0.18, openPalm: false },
    ]);
    state = updateWindowGestureFromHands(state, [
      { center: { x: 0.24, y: 0.5 }, pinchRatio: 0.19, openPalm: false },
      { center: { x: 0.76, y: 0.5 }, pinchRatio: 0.2, openPalm: false },
    ]);

    assert.equal(state.phase, 'sizingWidth');
    assert.equal(Number(state.rect.h.toFixed(2)), 0.08);

    state = updateWindowGestureFromHands(state, [
      { center: { x: 0.24, y: 0.5 }, pinchRatio: 0.62, openPalm: false },
      { center: { x: 0.76, y: 0.5 }, pinchRatio: 0.66, openPalm: false },
    ]);

    assert.equal(state.phase, 'sizingHeight');
    assert.equal(Number(state.rect.x.toFixed(2)), 0.24);
    assert.equal(Number(state.rect.w.toFixed(2)), 0.52);
    assert.ok(state.rect.h > 0.25);
  });

  it('starts growing height when either hand opens its pinch', () => {
    let state = initialWindowGestureState();
    state = updateWindowGestureFromHands(state, [
      { center: { x: 0.3, y: 0.5 }, pinchRatio: 0.18, openPalm: false },
      { center: { x: 0.7, y: 0.5 }, pinchRatio: 0.18, openPalm: false },
    ]);

    state = updateWindowGestureFromHands(state, [
      { center: { x: 0.25, y: 0.5 }, pinchRatio: 0.62, openPalm: false },
      { center: { x: 0.75, y: 0.5 }, pinchRatio: 0.18, openPalm: false },
    ]);

    assert.equal(state.phase, 'sizingHeight');
    assert.ok(state.rect.h > 0.2);
  });

  it('grows vertical bounds at a moderated rate', () => {
    let state = initialWindowGestureState();
    state = updateWindowGestureFromHands(state, [
      { center: { x: 0.24, y: 0.5 }, pinchRatio: 0.18, openPalm: false },
      { center: { x: 0.76, y: 0.5 }, pinchRatio: 0.18, openPalm: false },
    ]);
    state = updateWindowGestureFromHands(state, [
      { center: { x: 0.24, y: 0.5 }, pinchRatio: 0.62, openPalm: false },
      { center: { x: 0.76, y: 0.5 }, pinchRatio: 0.66, openPalm: false },
    ]);

    assert.equal(state.phase, 'sizingHeight');
    assert.ok(state.rect.h >= 0.28);
    assert.ok(state.rect.h <= 0.31);
  });

  it('locks a paired window when either hand opens into a palm', () => {
    let state = initialWindowGestureState();
    state = updateWindowGestureFromHands(state, [
      { center: { x: 0.24, y: 0.5 }, pinchRatio: 0.18, openPalm: false },
      { center: { x: 0.76, y: 0.5 }, pinchRatio: 0.18, openPalm: false },
    ]);
    state = updateWindowGestureFromHands(state, [
      { center: { x: 0.24, y: 0.5 }, pinchRatio: 0.62, openPalm: false },
      { center: { x: 0.76, y: 0.5 }, pinchRatio: 0.66, openPalm: false },
    ]);
    const grown = state.rect;

    state = updateWindowGestureFromHands(state, [
      { center: { x: 0.24, y: 0.5 }, pinchRatio: 0.92, openPalm: true },
      { center: { x: 0.76, y: 0.5 }, pinchRatio: 0.66, openPalm: false },
    ]);

    assert.equal(state.phase, 'locked');
    assert.deepEqual(state.rect, grown);
  });
});

describe('displayRectToVideoSourceRect', () => {
  it('maps display-space x to a mirrored source crop and marks it for mirrored drawing', () => {
    const source = displayRectToVideoSourceRect(
      { x: 0.2, y: 0.25, w: 0.4, h: 0.3 },
      { videoWidth: 1000, videoHeight: 800 },
    );

    assert.deepEqual(source, {
      sx: 400,
      sy: 200,
      sw: 400,
      sh: 240,
      flipX: true,
    });
  });
});

describe('handGestureInputFromLandmarks', () => {
  it('mirrors the thumb/index pinch center and normalizes pinch by hand size', () => {
    const landmarks = Array.from({ length: 21 }, () => ({ x: 0.5, y: 0.5, z: 0 }));
    landmarks[0] = { x: 0.5, y: 0.8, z: 0 };
    landmarks[4] = { x: 0.2, y: 0.4, z: 0 };
    landmarks[8] = { x: 0.24, y: 0.4, z: 0 };
    landmarks[9] = { x: 0.5, y: 0.4, z: 0 };

    const input = handGestureInputFromLandmarks(landmarks, { mirrored: true });

    assert.ok(input);
    assert.equal(Number(input.center.x.toFixed(2)), 0.78);
    assert.equal(Number(input.center.y.toFixed(2)), 0.4);
    assert.ok(input.pinchRatio > 0.09 && input.pinchRatio < 0.11);
    assert.equal(input.openPalm, false);
  });
});
