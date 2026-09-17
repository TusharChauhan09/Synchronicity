const BROWSER_VIEWPORT = { width: 1280, height: 800 };

export function mapClickToViewport(
  clientX: number,
  clientY: number,
  rect: DOMRect,
  viewport = BROWSER_VIEWPORT,
): { x: number; y: number } | null {
  const scale = Math.min(rect.width / viewport.width, rect.height / viewport.height);
  const renderedWidth = viewport.width * scale;
  const renderedHeight = viewport.height * scale;
  const offsetX = (rect.width - renderedWidth) / 2;
  const offsetY = (rect.height - renderedHeight) / 2;

  const x = clientX - rect.left - offsetX;
  const y = clientY - rect.top - offsetY;

  if (x < 0 || y < 0 || x > renderedWidth || y > renderedHeight) return null;

  return {
    x: Math.round(x / scale),
    y: Math.round(y / scale),
  };
}
