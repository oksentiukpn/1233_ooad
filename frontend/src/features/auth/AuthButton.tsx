import { useState } from "react";
import { useAuth } from "react-oidc-context";
import { signOutRedirect } from "@/lib/authApi";
import { LogOut, UserCircle2, Loader2, LogIn } from "lucide-react";

export function AuthButton() {
  const auth = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);

  if (auth.isLoading) {
    return (
      <div className="inline-flex items-center gap-2 bg-[#0e317e]/80 text-white text-xs font-semibold px-3 py-1.5 rounded border border-blue-400/30">
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
        <span>Завантаження...</span>
      </div>
    );
  }

  if (!auth.isAuthenticated) {
    return (
      <div className="flex items-center gap-2">
        {/* Primary Sign In Button (opens Cognito Managed Login) */}
        <button
          type="button"
          onClick={() => auth.signinRedirect()}
          className="inline-flex items-center gap-1.5 bg-[#ffe358] hover:bg-[#ebd046] text-slate-900 text-xs font-semibold px-3 py-1.5 rounded shadow-sm transition-all hover:scale-[1.02]"
          title="Sign in with Email or Google (Cognito Managed Login)"
        >
          <LogIn className="h-3.5 w-3.5" />
          <span>Sign in</span>
        </button>

        {/* Optional Direct Google Button (skips Cognito page) */}
        <button
          type="button"
          onClick={() =>
            auth.signinRedirect({
              extraQueryParams: { identity_provider: "Google" },
            })
          }
          className="inline-flex items-center gap-1.5 bg-white hover:bg-slate-100 text-slate-800 text-xs font-semibold px-2.5 py-1.5 rounded border border-slate-300 shadow-sm transition-all hover:scale-[1.02]"
          title="Sign in directly with Google"
        >
          <svg className="h-3.5 w-3.5 shrink-0" viewBox="0 0 24 24">
            <path
              fill="#4285F4"
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            />
            <path
              fill="#34A853"
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            />
            <path
              fill="#FBBC05"
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
            />
            <path
              fill="#EA4335"
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
            />
          </svg>
          <span className="hidden sm:inline">Google</span>
        </button>
      </div>
    );
  }

  const email =
    (auth.user?.profile?.email as string) ||
    (auth.user?.profile?.["cognito:username"] as string) ||
    "User";

  return (
    <div className="flex items-center gap-2">
      <div className="relative">
        <button
          type="button"
          onClick={() => setMenuOpen(!menuOpen)}
          className="inline-flex items-center gap-1.5 bg-[#0e317e] hover:bg-[#153f9e] text-white text-xs font-semibold px-3 py-1.5 rounded border border-blue-300/40 shadow-sm transition-all"
        >
          <UserCircle2 className="h-4 w-4 text-blue-200" />
          <span className="max-w-[160px] truncate">{email}</span>
        </button>

        {menuOpen && (
          <div className="absolute right-0 mt-1.5 w-60 rounded-md shadow-lg bg-white dark:bg-slate-800 ring-1 ring-black ring-opacity-5 py-1 z-50 text-slate-800 dark:text-slate-100 divide-y divide-slate-100 dark:divide-slate-700">
            <div className="px-4 py-2">
              <p className="text-xs font-semibold truncate text-slate-900 dark:text-white">
                {(auth.user?.profile?.name as string) || "Користувач"}
              </p>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                {email}
              </p>
            </div>
            <div className="py-1">
              <button
                type="button"
                onClick={() => signOutRedirect(auth)}
                className="w-full text-left px-4 py-1.5 text-xs text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 flex items-center gap-2"
              >
                <LogOut className="h-3.5 w-3.5" />
                <span>Sign out</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Direct Sign out button next to email */}
      <button
        type="button"
        onClick={() => signOutRedirect(auth)}
        className="inline-flex items-center gap-1 bg-red-600/80 hover:bg-red-600 text-white text-xs font-semibold px-2.5 py-1.5 rounded transition-colors"
        title="Sign out"
      >
        <LogOut className="h-3.5 w-3.5" />
        <span className="hidden sm:inline">Sign out</span>
      </button>
    </div>
  );
}
