// The client has no unit-test runner; pure client functions are tested here with the server's Jest

import { shopImageLoader } from '../../../client/src/app/services/image-loader';

describe('shopImageLoader', () => {
  const cloudinary = 'https://res.cloudinary.com/demo/image/upload/v1615624628/shop/boots.jpg';

  it('asks Cloudinary for a resized, auto-format image', () => {
    expect(shopImageLoader({ src: cloudinary, width: 640 })).toBe(
      'https://res.cloudinary.com/demo/image/upload/f_auto,q_auto,w_640,c_limit/v1615624628/shop/boots.jpg',
    );
  });

  it('keeps the original size when no width is requested', () => {
    expect(shopImageLoader({ src: cloudinary })).toBe('https://res.cloudinary.com/demo/image/upload/f_auto,q_auto/v1615624628/shop/boots.jpg');
  });

  it('leaves other URLs alone', () => {
    const other = 'https://upload.wikimedia.org/x/800px-boots.jpg';
    expect(shopImageLoader({ src: other, width: 640 })).toBe(other);
    expect(shopImageLoader({ src: '/assets/default.svg', width: 640 })).toBe('/assets/default.svg');
  });
});
