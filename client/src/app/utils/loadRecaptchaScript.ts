declare global {
  interface Window {
    ng2recaptchaloaded: () => void;
  }
}

declare const grecaptcha;

function loadRecaptchaScript(
  renderMode: "explicit" | string,
  onLoaded: (grecaptcha) => void,
  urlParams: string,
  url?: string,
  nonce?: string,
): void {
  window.ng2recaptchaloaded = () => {
    onLoaded(grecaptcha);
  };
  const script = document.createElement("script");
  script.innerHTML = "";
  const baseUrl = url || "https://www.google.com/recaptcha/api.js";

  script.src = `${baseUrl}?render=${renderMode}&onload=ng2recaptchaloaded${urlParams}`;
  if (nonce) {
    script.nonce = nonce;
  }
  script.async = true;
  script.defer = true;
  document.head.appendChild(script);
}

export const loader = { loadRecaptchaScript };