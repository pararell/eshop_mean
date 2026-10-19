import { IsString, MaxLength, MinLength, Matches } from 'class-validator';

/** Password rule for new accounts: 5–20 characters with at least one digit */
export const PASSWORD_RULE = /^(?=.*\d).{5,20}$/;

/** Body of `POST /api/auth/signup`: new passwords must follow PASSWORD_RULE */
export class AuthCredentialDto {
  name?: string;

  googleId?: string;

  @IsString()
  @MinLength(4)
  @MaxLength(50)
  email!: string;

  @IsString()
  @MinLength(5)
  @MaxLength(50)
  @Matches(PASSWORD_RULE, {
    message: 'password too weak',
  })
  password!: string;
}

/**
 * Body of `POST /api/auth/signin`. No strength rule here: the stored hash decides, so accounts
 * created outside sign-up (e.g. the seeded admin) can log in. 72 bytes is the bcrypt input limit.
 */
export class SignInDto {
  @IsString()
  @MinLength(4)
  @MaxLength(50)
  email!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(72)
  password!: string;
}
