import { test } from 'node:test';
import assert from 'node:assert/strict';
import { getScrollPlan } from '../src/lib/navigation.js';

test('new path navigation resets to the top while same-path state changes preserve scroll', () => {
  assert.deepEqual(
    getScrollPlan({
      previousPath: '/dashboard',
      nextPath: '/requests',
      navigationType: 'PUSH',
      savedPosition: { top: 420, left: 0 },
      currentPosition: 420,
    }),
    { type: 'position', top: 0, left: 0 },
  );
  assert.deepEqual(
    getScrollPlan({
      previousPath: '/requests',
      nextPath: '/requests',
      navigationType: 'PUSH',
      currentPosition: 310,
    }),
    { type: 'position', top: 310, left: 0 },
  );
});

test('browser back and forward restore both saved scroll coordinates', () => {
  assert.deepEqual(
    getScrollPlan({
      previousPath: '/admin/requests',
      nextPath: '/admin/students',
      navigationType: 'POP',
      savedPosition: { top: 640, left: 18 },
    }),
    { type: 'position', top: 640, left: 18 },
  );
  assert.deepEqual(
    getScrollPlan({
      previousPath: '/admin/requests',
      nextPath: '/admin/students',
      navigationType: 'POP',
      savedPosition: 125,
    }),
    { type: 'position', top: 125, left: 0 },
  );
});

test('hash links take precedence and route redirects still reset scroll', () => {
  assert.deepEqual(
    getScrollPlan({
      previousPath: '/privacy-policy',
      nextPath: '/',
      navigationType: 'PUSH',
      currentPosition: 500,
      hash: '#services',
    }),
    { type: 'hash', hash: '#services' },
  );
  assert.deepEqual(
    getScrollPlan({
      previousPath: '/dashboard',
      nextPath: '/sign-in',
      navigationType: 'REPLACE',
      currentPosition: 800,
    }),
    { type: 'position', top: 0, left: 0 },
  );
});
