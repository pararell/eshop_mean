import type { Profile } from 'passport-google-oauth20';
export class GoogleUserDto {
  profile!: Profile;
  email!: string;
}
