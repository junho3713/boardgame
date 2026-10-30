export type SpriteCell = {
  x: number;
  y: number;
  width: number;
  height: number;
  aspect: number;
  viewBox: string;
};

/**
 * Split an atlas into integer pixel cells. Rounding each shared edge once
 * distributes remainder pixels without gaps, overlap, or fractional sampling.
 */
export function spriteCell(
  sheetWidth: number,
  sheetHeight: number,
  cols: number,
  rows: number,
  col: number,
  row: number
): SpriteCell {
  if (![sheetWidth, sheetHeight, cols, rows].every((value) => Number.isInteger(value) && value > 0)) {
    throw new Error('Sprite sheet dimensions and grid size must be positive integers');
  }
  if (!Number.isInteger(col) || !Number.isInteger(row) || col < 0 || col >= cols || row < 0 || row >= rows) {
    throw new Error(`Sprite cell ${col},${row} is outside the ${cols}×${rows} atlas`);
  }

  const x = Math.round(col * sheetWidth / cols);
  const y = Math.round(row * sheetHeight / rows);
  const right = Math.round((col + 1) * sheetWidth / cols);
  const bottom = Math.round((row + 1) * sheetHeight / rows);
  const width = right - x;
  const height = bottom - y;
  return { x, y, width, height, aspect: width / height, viewBox: `${x} ${y} ${width} ${height}` };
}
