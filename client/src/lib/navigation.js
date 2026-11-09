export function getScrollPlan({
  previousPath,
  nextPath,
  navigationType,
  savedPosition,
  currentPosition,
  hash = '',
}) {
  if (hash) return { type: 'hash', hash };
  if (navigationType === 'POP') {
    return {
      type: 'position',
      top: typeof savedPosition === 'number' ? savedPosition : (savedPosition?.top ?? 0),
      left: typeof savedPosition === 'number' ? 0 : (savedPosition?.left ?? 0),
    };
  }
  if (previousPath !== nextPath) return { type: 'position', top: 0, left: 0 };
  return { type: 'position', top: currentPosition ?? 0, left: 0 };
}
