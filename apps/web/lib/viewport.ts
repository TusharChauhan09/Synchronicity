export const VIEWPORT_WIDTH = 1024;
export const VIEWPORT_HEIGHT = 768;

export function mapClickToViewport(
  clientX: number,
  clientY: number,
  rect: DOMRect,
): { x: number; y: number } | null {
  const scale = Math.min(rect.width / VIEWPORT_WIDTH, rect.height / VIEWPORT_HEIGHT);
  const displayWidth = VIEWPORT_WIDTH * scale;
  const displayHeight = VIEWPORT_HEIGHT * scale;
  const offsetX = (rect.width - displayWidth) / 2;
  const offsetY = (rect.height - displayHeight) / 2;

  const x = (clientX - rect.left - offsetX) / scale;
  const y = (clientY - rect.top - offsetY) / scale;

  if (x < 0 || y < 0 || x > VIEWPORT_WIDTH || y > VIEWPORT_HEIGHT) {
    return null;
  }

  return { x: Math.round(x), y: Math.round(y) };
}
