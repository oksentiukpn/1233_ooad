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
  Cloud,
} from "lucide-react";

export function App() {
  const auth = useAuth();
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState<"registry" | "create">("registry");

  const pathname = typeof window !== "undefined" ? window.location.pathname : "";
  const hostname = typeof window !== "undefined" ? window.location.hostname : "";
  const isAzure = hostname.startsWith("azure");

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

  // 2. /auth/callback Dedicated Page: processing tokens
  if (isCallbackPage && auth.isLoading) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center text-white gap-4 p-6 text-center font-sans">
        <Loader2 className="h-10 w-10 animate-spin text-[#ffe358]" />
        <h2 className="text-xl font-bold">Завершення входу в систему...</h2>
        <p className="text-sm text-slate-300 max-w-md leading-relaxed">
          Обробка криптографічних OIDC токенів та створення сесії користувача.
        </p>
      </div>
    );
  }

  // 3. Callback Error Page
  if (auth.error) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center text-white gap-4 p-6 text-center font-sans">
        <AlertCircle className="h-10 w-10 text-red-400" />
        <h2 className="text-xl font-bold">Помилка авторизації</h2>
        <p className="text-sm text-slate-300 max-w-md leading-relaxed">
          {auth.error.message}
        </p>
        <button
          type="button"
          onClick={() => {
            window.location.href = "/";
          }}
          className="mt-2 inline-flex items-center gap-1.5 px-4 py-2 rounded bg-slate-700 text-white text-xs font-semibold hover:bg-slate-600 transition-colors shadow"
        >
          Повернутися на головну
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f4f6f9] dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col transition-colors duration-200">
      {/* 1. TOP HEADER (GOVERNMENTAL PARLIAMENTARY STYLE) */}
      <header className="rada-header text-white shadow-md print:hidden">
        <div className="px-5 sm:px-8 py-3.5 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          {/* Official Rada Brand & Portal Title */}
          <div className="flex items-center gap-3.5">
            <a
              href="https://www.rada.gov.ua"
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
                <div className="flex flex-wrap items-center gap-2 text-xs font-medium text-[#ffe358] tracking-wide mt-0.5 font-sans">
                  <span>
                    Законодавство України &bull; Єдина інформаційна система реєстрації
                    засідань «Spry»
                  </span>
                  {isAzure ? (
                    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-semibold bg-sky-500/25 text-sky-200 border border-sky-400/40">
                      <span className="h-1.5 w-1.5 rounded-full bg-sky-400 animate-pulse" />
                      Хмара: Microsoft Azure (norwayeast)
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-semibold bg-amber-500/25 text-amber-200 border border-amber-400/40">
                      <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
                      Хмара: AWS (us-east-1)
                    </span>
                  )}
                </div>
              </div>
            </a>
          </div>

          {/* Right Header: Cloud Switcher, Auth & Theme Switch */}
          <div className="flex items-center gap-2.5 shrink-0 self-end md:self-auto font-sans">
            {isAzure ? (
              <a
                href="https://1233.pp.ua"
                className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-200 hover:text-white px-2.5 py-1 rounded bg-white/10 hover:bg-white/20 transition-colors border border-white/20"
                title="Перейти на основну версію сайту, розгорнуту на Amazon Web Services"
              >
                <Cloud className="h-3 w-3 text-amber-300" />
                <span>AWS версія ↗</span>
              </a>
            ) : (
              <a
                href="https://azure.1233.pp.ua"
                className="inline-flex items-center gap-1 text-[11px] font-medium text-yellow-300 hover:text-yellow-100 px-2.5 py-1 rounded bg-[#ffe358]/15 hover:bg-[#ffe358]/25 transition-colors border border-[#ffe358]/35"
                title="Перейти на мультихмарну версію сайту, розгорнуту на Microsoft Azure"
              >
                <Cloud className="h-3 w-3 text-sky-300" />
                <span>Azure версія ↗</span>
              </a>
            )}

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
        <div className="flex flex-wrap items-center justify-between text-xs text-slate-600 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800 pb-2">
          <div className="flex items-center gap-2">
            <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="font-semibold text-slate-800 dark:text-slate-200">
              {isAzure
                ? "База даних підключена (Azure PostgreSQL Flexible Server)"
                : "База даних підключена (AWS Aurora Serverless v2)"}
            </span>
            <span>&bull;</span>
            <span>Режим: Законотворча сесія 2026</span>
          </div>
          <div className="text-[11px] text-slate-500">
            Оновлено: {new Date().toLocaleDateString("uk-UA")}
          </div>
        </div>
      </div>

      {/* 4. MAIN WORKSPACE / CONTENT */}
      <main className="flex-1 px-5 sm:px-8 py-4">
        <MeetingsPage
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          searchQuery={searchQuery}
        />
      </main>

      {/* 5. PARLIAMENTARY FOOTER */}
      <footer className="rada-footer text-slate-300 py-6 px-5 sm:px-8 mt-auto border-t border-blue-900/40 text-xs font-sans print:hidden">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <img
              src="/rada_assets/gerb_kQCl.gif"
              alt="Герб"
              className="h-6 w-auto opacity-80"
            />
            <span className="font-medium text-slate-200">
              © {new Date().getFullYear()} Верховна Рада України. Інформаційна система
              «Spry».
            </span>
          </div>
          <div className="text-slate-400 flex flex-wrap gap-4">
            <a
              href="https://zakon.rada.gov.ua"
              target="_blank"
              rel="noreferrer"
              className="hover:text-[#ffe358] transition-colors"
            >
              База «Законодавство»
            </a>
            <span>&bull;</span>
            <a
              href="https://it.rada.gov.ua"
              target="_blank"
              rel="noreferrer"
              className="hover:text-[#ffe358] transition-colors"
            >
              Управління комп’ютеризованих систем
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default App;
