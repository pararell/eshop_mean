import type { UserDoc } from '../../db/mappers';

/** Authenticated user (`req.user`); never send `passwordHash` to clients */
export type User = UserDoc;
