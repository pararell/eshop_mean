// The client has no unit-test runner; pure client functions are tested here with the server's Jest
import { trailClass } from '../../../client/src/app/shared/trail';

describe('trail colors', () => {
  it("uses the category's own color, otherwise the next color by position", () => {
    expect([0, 1, 2, 3, 4].map((i) => trailClass(null, i))).toEqual(['trail-red', 'trail-blue', 'trail-green', 'trail-yellow', 'trail-red']);
    expect(trailClass('yellow', 0)).toBe('trail-yellow');
  });
});
