import { useState, useEffect } from "react";
import { useAuth } from "react-oidc-context";
import { MeetingsPage } from "@/features/meetings/MeetingsPage";
import { AuthButton } from "@/features/auth/AuthButton";
import {
  Search,
  Printer,
  Sun,
  Moon,
  Loader2,
  AlertCircle,
  Sparkles,
  ListFilter,
  X,
} from "lucide-react";

export function App() {
  const auth = useAuth();
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState<"registry" | "create">("registry");

  const pathname = typeof window !== "undefined" ? window.location.pathname : "";
  const isLoginPage =
    pathname === "/login" || pathname === "/login/" || pathname.startsWith("/login/");
  const isCallbackPage =
    pathname.includes("/auth/callback") ||
    (typeof window !== "undefined" &&
      new URLSearchParams(window.location.search).has("code"));

  // Cognito /login/ page automatic redirect
  useEffect(() => {
    if (
      isLoginPage &&
      !auth.isAuthenticated &&
      !auth.isLoading &&
      !auth.activeNavigator
    ) {
      auth.signinRedirect().catch((err) => {
        console.error("signinRedirect error on /login/ page:", err);
      });
    }
  }, [isLoginPage, auth.isAuthenticated, auth.isLoading, auth.activeNavigator, auth]);

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, [isDarkMode]);

  const toggleDarkMode = () => {
    setIsDarkMode((prev) => !prev);
  };

  const handlePrint = () => {
    window.print();
  };

  // 1. /login/ Dedicated Page: immediately redirecting to Cognito Managed Login
  if (isLoginPage) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center text-white gap-4 p-6 text-center font-sans">
        <Loader2 className="h-10 w-10 animate-spin text-[#ffe358]" />
        <h2 className="text-xl font-bold">Перенаправлення на сторінку входу...</h2>
        <p className="text-sm text-slate-300 max-w-md leading-relaxed">
          Відкривається офіційна форма авторизації Amazon Cognito Managed Login (Email та
          Google).
        </p>
        <button
          type="button"
          onClick={() => auth.signinRedirect()}
          className="mt-2 inline-flex items-center gap-1.5 px-4 py-2 rounded bg-[#ffe358] text-slate-900 text-xs font-semibold hover:bg-[#ebd046] transition-colors shadow"
        >
          Натисніть тут, якщо перенаправлення не відбулося автоматично
        </button>
      </div>
    );
  }

  // 2. /auth/callback/ Dedicated Processing State
  if (auth.isLoading && isCallbackPage) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center text-white gap-4 p-6 text-center font-sans">
        <Loader2 className="h-10 w-10 animate-spin text-[#ffe358]" />
        <h2 className="text-xl font-bold">Обробка авторизації...</h2>
        <p className="text-sm text-slate-300 max-w-md leading-relaxed">
          Виконується безпечний OIDC PKCE обмін коду на токени Amazon Cognito.
          Зачекайте...
        </p>
      </div>
    );
  }

  return (
    <div className="rada-page-container">
      {/* Auth error notification banner */}
      {auth.error && (
        <div className="bg-red-600 text-white px-4 py-2 text-center text-xs font-semibold flex items-center justify-center gap-2 shadow font-sans">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>Помилка OIDC авторизації: {auth.error.message}</span>
          <button
            type="button"
            onClick={() => (window.location.href = "/")}
            className="underline ml-2 hover:text-red-100"
          >
            На головну
          </button>
        </div>
      )}

      {/* 1. TOP HEADER (AUTHENTIC RADA STATE BRANDING) */}
      <header id="header" className="rada-header">
        <div className="px-5 sm:px-8 py-3.5 flex flex-col md:flex-row md:items-center justify-between gap-4">
          {/* Logo brand */}
          <div className="flex items-center gap-3">
            <a
              href="https://zakon.rada.gov.ua/laws/main/index"
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-3 text-white no-underline hover:opacity-95"
            >
              {/* Official Ukrainian Coat of Arms (Trident / Герб) */}
              <img
                src="/rada_assets/gerb_kQCl.gif"
                alt="Герб України"
                className="h-12 sm:h-14 w-auto object-contain shrink-0"
              />

              {/* Ukrainian Flag Stripe */}
              <div className="rada-flag-stripe shrink-0" />

              <div className="leading-tight">
                <div className="flex items-baseline gap-2">
                  <span className="font-serif font-bold text-2xl sm:text-3xl tracking-wider text-white">
                    РАДА
                  </span>
                  <span className="font-sans font-semibold text-base sm:text-lg uppercase tracking-wider text-slate-100">
                    Верховна Рада України
                  </span>
                </div>
                <div className="text-xs font-medium text-[#ffe358] tracking-wide mt-0.5 font-sans">
                  Законодавство України &bull; Єдина інформаційна система реєстрації
                  засідань «Spry»
                </div>
              </div>
            </a>
          </div>

          {/* Right Header: Auth & Theme Switch */}
          <div className="flex items-center gap-3 shrink-0 self-end md:self-auto font-sans">
            <AuthButton />

            <button
              type="button"
              onClick={toggleDarkMode}
              className="p-1.5 rounded-full border border-white/30 text-white hover:bg-white/10 transition-colors"
              title={
                isDarkMode ? "Перемкнути на світлий режим" : "Перемкнути на темний режим"
              }
            >
              {isDarkMode ? (
                <Sun className="h-4 w-4 text-yellow-300" />
              ) : (
                <Moon className="h-4 w-4 text-slate-100" />
              )}
            </button>
          </div>
        </div>

        {/* 2. SUB-NAV / TOOLBAR */}
        <nav className="rada-navbar px-5 sm:px-8 flex flex-wrap items-center justify-between border-t border-blue-900/60 text-xs font-sans">
          <div className="flex flex-wrap items-center gap-1.5 py-2">
            <button
              type="button"
              onClick={() => setActiveTab("registry")}
              className={`px-3 py-1.5 rounded font-semibold transition-all flex items-center gap-1.5 ${
                activeTab === "registry"
                  ? "bg-[#ffe358] text-slate-900 shadow-sm"
                  : "text-white hover:bg-white/10"
              }`}
            >
              <ListFilter className="h-3.5 w-3.5" />
              <span>Реєстр засідань</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("create")}
              className={`px-3 py-1.5 rounded font-semibold transition-all flex items-center gap-1.5 ${
                activeTab === "create"
                  ? "bg-[#ffe358] text-slate-900 shadow-sm"
                  : "text-white hover:bg-white/10"
              }`}
            >
              <Sparkles className="h-3.5 w-3.5 text-[#ffe358] group-hover:text-white" />
              <span>+ Нове засідання (з ШІ)</span>
            </button>
          </div>

          <div className="flex items-center gap-2 py-2">
            {/* Live Search */}
            <div className="relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Пошук у базі засідань..."
                className="text-xs bg-slate-900/60 border border-slate-600 focus:border-[#ffe358] text-white placeholder-slate-400 rounded-md px-2.5 py-1.5 pr-8 w-44 sm:w-64 focus:outline-none transition-all"
              />
              {searchQuery ? (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="absolute right-2 top-2 text-slate-400 hover:text-white"
                  title="Очистити пошук"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              ) : (
                <Search className="h-3.5 w-3.5 text-slate-400 absolute right-2.5 top-2 pointer-events-none" />
              )}
            </div>

            <button
              type="button"
              onClick={handlePrint}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded border border-white/30 text-white hover:bg-white/10 font-medium transition-colors"
              title="Роздрукувати сторінку"
            >
              <Printer className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Друк</span>
            </button>
          </div>
        </nav>
      </header>

      {/* 3. PARLIAMENTARY STATUS RIBBON */}
      <div className="px-5 sm:px-8 pt-3 pb-1">
        <div className="rada-ribbon-panel rounded-md px-3.5 py-2 flex flex-wrap items-center justify-between gap-2 text-xs font-sans text-slate-700 dark:text-slate-300">
          <div className="flex items-center gap-2">
            <span className="inline-block h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="font-semibold text-slate-900 dark:text-white">
              Єдина державна інформаційна система засідань
            </span>
            <span className="text-slate-500 dark:text-slate-400 hidden sm:inline">
              &bull;
            </span>
            <span className="text-slate-600 dark:text-slate-400 hidden sm:inline">
              База даних: Aurora PostgreSQL
            </span>
          </div>

          <div className="flex items-center gap-2 text-[11px] font-mono text-slate-600 dark:text-slate-400">
            <span className="px-1.5 py-0.5 rounded bg-blue-100 text-blue-900 dark:bg-blue-950 dark:text-blue-300 font-sans font-bold text-[10px] uppercase">
              ШІ-Сервіс: Bedrock Ministral 3
            </span>
            <span className="hidden md:inline">ВРУ / Секретаріат</span>
          </div>
        </div>
      </div>

      {/* 4. MAIN CONTENT AREA */}
      <main className="flex-1 px-3 sm:px-8 py-4">
        <MeetingsPage
          searchQuery={searchQuery}
          activeTab={activeTab}
          setActiveTab={setActiveTab}
        />
      </main>

      {/* 5. FOOTER */}
      <footer className="mt-auto border-t border-[#ced4da] dark:border-slate-800 bg-[#f7f7f7] dark:bg-slate-900 text-slate-700 dark:text-slate-300 text-xs px-6 py-6 font-sans">
        <div className="max-w-[960px] mx-auto text-center font-medium text-slate-600 dark:text-slate-400">
          &copy;{" "}
          <a
            href="https://www.rada.gov.ua/"
            target="_blank"
            rel="noreferrer"
            className="rada-link font-semibold"
          >
            Верховна Рада України
          </a>{" "}
          1994–2026. Єдина система обліку пленарних засідань та нарад Spry.
        </div>
      </footer>
    </div>
  );
}

export default App;
