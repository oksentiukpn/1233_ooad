import { User } from "@/types/auth";

// Amazon Cognito Configuration
const COGNITO_DOMAIN = "https://spry-1233.auth.us-east-1.amazoncognito.com";
const CLIENT_ID = "3f1rgrm4hrmsuhhbmfjjle9t28";

export function getCallbackUrl(): string {
  if (typeof window !== "undefined") {
    const origin = window.location.origin;
    return `${origin}/auth/callback/`;
  }
  return "https://1233.pp.ua/auth/callback/";
}

export function getCognitoLoginUrl(): string {
  const redirectUri = encodeURIComponent(getCallbackUrl());
  return `${COGNITO_DOMAIN}/login?client_id=${CLIENT_ID}&response_type=code&scope=email+openid+profile&redirect_uri=${redirectUri}`;
}

export function getCognitoLogoutUrl(): string {
  const logoutUri = encodeURIComponent(
    typeof window !== "undefined" ? `${window.location.origin}/` : "https://1233.pp.ua/"
  );
  return `${COGNITO_DOMAIN}/logout?client_id=${CLIENT_ID}&logout_uri=${logoutUri}`;
}

// Exchange Cognito code for tokens
export async function handleCognitoCallback(code: string): Promise<User> {
  const redirectUri = getCallbackUrl();
  const tokenUrl = `${COGNITO_DOMAIN}/oauth2/token`;

  const body = new URLSearchParams({
    grant_type: "authorization_code",
    client_id: CLIENT_ID,
    code: code,
    redirect_uri: redirectUri,
  });

  const response = await fetch(tokenUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: body.toString(),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Token exchange failed: ${errText}`);
  }

  const tokens = await response.json();
  // Decode id_token JWT (payload is 2nd segment)
  const idToken = tokens.id_token;
  const payloadBase64 = idToken.split(".")[1];
  const payloadJson = JSON.parse(
    atob(payloadBase64.replace(/-/g, "+").replace(/_/g, "/"))
  );

  const user: User = {
    id: 1,
    email: payloadJson.email || payloadJson["cognito:username"] || "user@spry",
    name: payloadJson.name || payloadJson.email?.split("@")[0] || null,
    avatar_url: payloadJson.picture || null,
    created_at: new Date().toISOString(),
  };

  localStorage.setItem("spry_user", JSON.stringify(user));
  localStorage.setItem("spry_id_token", idToken);
  return user;
}

export async function fetchCurrentUser(): Promise<User | null> {
  try {
    const cached = localStorage.getItem("spry_user");
    if (cached) {
      return JSON.parse(cached);
    }
    return null;
  } catch (err) {
    console.error("Failed to check auth state:", err);
    return null;
  }
}

export async function logoutUser(): Promise<void> {
  localStorage.removeItem("spry_user");
  localStorage.removeItem("spry_id_token");
}
