// Replaces the stripe SDK in tests (see moduleNameMapper in jest.config.cjs).
// Tests import `stripeMock` to inspect calls or change responses.
export const stripeMock = {
  charges: {
    create: jest.fn().mockResolvedValue({ id: 'ch_test_123', status: 'succeeded' }),
    capture: jest.fn().mockResolvedValue({ id: 'ch_test_123', captured: true }),
  },
};

export default class Stripe {
  charges = stripeMock.charges;
}
