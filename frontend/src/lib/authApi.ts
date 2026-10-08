import { AuthProviderProps } from "react-oidc-context";
import { WebStorageStateStore } from "oidc-client-ts";

export const COGNITO_AUTHORITY =
  import.meta.env.VITE_COGNITO_AUTHORITY ||
  "https://cognito-idp.us-east-1.amazonaws.com/us-east-1_7FvYNO3Qp";

export const COGNITO_CLIENT_ID =
  import.meta.env.VITE_COGNITO_CLIENT_ID || "3f1rgrm4hrmsuhhbmfjjle9t28";

export const COGNITO_DOMAIN =
  import.meta.env.VITE_COGNITO_DOMAIN ||
  "https://spry-1233.auth.us-east-1.amazoncognito.com";

export function getRedirectUri(): string {
  if (typeof window !== "undefined") {
    if (
      window.location.hostname === "localhost" ||
      window.location.hostname === "127.0.0.1"
    ) {
      return `${window.location.origin}/auth/callback/`;
    }
  }
  return import.meta.env.VITE_COGNITO_REDIRECT_URI || "https://1233.pp.ua/auth/callback/";
}

export function getLogoutUri(): string {
  if (typeof window !== "undefined") {
    if (
      window.location.hostname === "localhost" ||
      window.location.hostname === "127.0.0.1"
    ) {
      return `${window.location.origin}/`;
    }
  }
  return import.meta.env.VITE_COGNITO_LOGOUT_URI || "https://1233.pp.ua/";
}

export const oidcConfig: AuthProviderProps = {
  authority: COGNITO_AUTHORITY,
  client_id: COGNITO_CLIENT_ID,
  redirect_uri: getRedirectUri(),
  response_type: "code",
  scope: "openid email profile",
  userStore:
    typeof window !== "undefined"
      ? new WebStorageStateStore({ store: window.localStorage })
      : undefined,
  onSigninCallback: () => {
    // When returning from Cognito callback, clean up query params and route to /
    window.history.replaceState(
      {},
      document.title,
      window.location.pathname.replace(/\/auth\/callback\/?$/, "/") || "/"
    );
    if (window.location.pathname.includes("/auth/callback")) {
      window.location.href = "/";
    }
  },
};

export async function signOutRedirect(auth: {
  removeUser: () => Promise<void>;
}): Promise<void> {
  await auth.removeUser();
  const logoutUrl = `${COGNITO_DOMAIN}/logout?client_id=${COGNITO_CLIENT_ID}&logout_uri=${encodeURIComponent(
    getLogoutUri()
  )}`;
  window.location.href = logoutUrl;
}
