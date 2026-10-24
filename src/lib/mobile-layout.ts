export function clampComposerHeight(
  availableHeight: number,
  minHeight = 88,
  maxHeight = 320,
): number {
  return Math.min(Math.max(availableHeight, minHeight), maxHeight);
}

export function visualViewportOffset(
  viewportHeight: number,
  layoutHeight: number,
  pageTop: number,
): number {
  return Math.max(0, layoutHeight - viewportHeight - Math.min(0, pageTop));
}

export function visualViewportLayout(
  visualViewportHeight: number | undefined,
  layoutViewportHeight: number,
  pageTop: number,
): { viewportHeight: number; keyboardOffset: number } {
  if (visualViewportHeight === undefined) {
    return { viewportHeight: layoutViewportHeight, keyboardOffset: 0 };
  }
  return {
    viewportHeight: visualViewportHeight,
    keyboardOffset: visualViewportOffset(visualViewportHeight, layoutViewportHeight, pageTop),
  };
}
