// The client has no unit-test runner; pure client functions are tested here with the server's Jest
import { pageItems } from '../../../client/src/app/shared/components/pagination/page-items';

describe('pageItems', () => {
  it('lists every page when there are few', () => {
    expect(pageItems(1, 3)).toEqual([1, 2, 3]);
    expect(pageItems(2, 2)).toEqual([1, 2]);
  });

  it('keeps first, last and the neighbours of the current page, with gaps', () => {
    expect(pageItems(1, 10)).toEqual([1, 2, null, 10]);
    expect(pageItems(5, 10)).toEqual([1, null, 4, 5, 6, null, 10]);
    expect(pageItems(10, 10)).toEqual([1, null, 9, 10]);
    expect(pageItems(3, 10)).toEqual([1, 2, 3, 4, null, 10]);
  });
});
