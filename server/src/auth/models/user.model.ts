import { Document } from 'mongoose';

export interface User extends Document<string> {
  _id: string;
  email: string;
  password?: string;
  name?: string;
  salt?: string;
  /** Unused: the cart lives in the session */
  cart?: unknown;
  /** Unused: the image library lives in the session */
  images?: string[];
  roles?: string[];
  googleId?: string;
}
