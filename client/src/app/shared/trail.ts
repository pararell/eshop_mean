// The marked-trail colors of categories: the same color on the tile and in the menu.
import type { TrailColor } from '@eshop/shared';

export const TRAIL_COLORS = ['red', 'blue', 'green', 'yellow'] as const satisfies readonly TrailColor[];

/**
 * The CSS class of a category's trail color: the one chosen in the admin, otherwise by its position
 * among the menu categories (red, blue, green, yellow, red, …).
 */
export function trailClass(color: TrailColor | null | undefined, index: number): string {
  return `trail-${color || TRAIL_COLORS[index % TRAIL_COLORS.length]}`;
}
