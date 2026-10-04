import { useState, useEffect } from "react";
import { User } from "@/types/auth";
import { fetchCurrentUser, logoutUser, getGoogleLoginUrl } from "@/lib/authApi";
import { LogOut, UserCircle2, Loader2 } from "lucide-react";

export function AuthButton() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    // Check if returning from Google Auth
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.has("auth") || urlParams.has("auth_error")) {
      const cleanUrl = window.location.pathname;
      window.history.replaceState({}, document.title, cleanUrl);
    }

    fetchCurrentUser()
      .then((currUser) => setUser(currUser))
      .finally(() => setLoading(false));
  }, []);

  const handleLogout = async () => {
    try {
      await logoutUser();
      setUser(null);
      setMenuOpen(false);
      window.location.reload();
    } catch (e) {
      console.error("Logout failed:", e);
    }
  };

  if (loading) {
    return (
      <div className="inline-flex items-center gap-2 bg-[#0e317e]/80 text-white text-xs font-semibold px-3 py-1.5 rounded border border-blue-400/30">
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
        <span>Завантаження...</span>
      </div>
    );
  }

  if (!user) {
    return (
      <a
        href={getGoogleLoginUrl()}
        className="inline-flex items-center gap-2 bg-white hover:bg-slate-100 text-slate-800 text-xs font-semibold px-3 py-1.5 rounded border border-slate-300 shadow-sm transition-all hover:shadow hover:scale-[1.02]"
        title="Авторизуватися за допомогою Google акаунту"
      >
        {/* Google Official G Logo */}
        <svg className="h-4 w-4 shrink-0" viewBox="0 0 24 24">
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
        <span>Увійти через Google</span>
      </a>
    );
  }

  return (
    <div className="relative inline-block text-left">
      <button
        type="button"
        onClick={() => setMenuOpen(!menuOpen)}
        className="inline-flex items-center gap-2 bg-[#0e317e] hover:bg-[#184dbd] text-white text-xs font-semibold px-2.5 py-1.5 rounded border border-blue-400/40 shadow-sm transition-colors"
      >
        {user.avatar_url ? (
          <img
            src={user.avatar_url}
            alt={user.name || user.email}
            className="h-5 w-5 rounded-full object-cover border border-white/40"
          />
        ) : (
          <UserCircle2 className="h-5 w-5 text-yellow-300" />
        )}
        <span className="max-w-[130px] truncate">
          {user.name || user.email.split("@")[0]}
        </span>
      </button>

      {menuOpen && (
        <div className="absolute right-0 mt-1.5 w-60 rounded-md shadow-lg bg-white dark:bg-slate-800 ring-1 ring-black ring-opacity-5 z-50 p-2 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700">
          <div className="px-2 py-1.5 border-b border-slate-100 dark:border-slate-700 text-xs">
            <p className="font-semibold text-slate-900 dark:text-white truncate">
              {user.name || "Користувач"}
            </p>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
              {user.email}
            </p>
          </div>
          <button
            type="button"
            onClick={handleLogout}
            className="w-full mt-1.5 flex items-center gap-2 px-2 py-1.5 text-xs text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 rounded transition-colors"
          >
            <LogOut className="h-3.5 w-3.5" />
            <span>Вийти з акаунту</span>
          </button>
        </div>
      )}
    </div>
  );
}
