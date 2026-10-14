// Replaces @sendgrid/mail in tests (see moduleNameMapper in jest.config.cjs)
const sgMail = {
  setApiKey: jest.fn(),
  send: jest.fn().mockResolvedValue([{ statusCode: 202 }, {}]),
};

export default sgMail;
