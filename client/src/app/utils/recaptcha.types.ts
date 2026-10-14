/** The part of the reCAPTCHA v3 browser API this app uses (script loaded from google.com). */
export interface ReCaptchaV3 {
  execute(siteKey: string, options: { action: string }): PromiseLike<string>;
}
