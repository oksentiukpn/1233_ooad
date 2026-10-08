import { useState, useEffect } from "react";
import { useAuth } from "react-oidc-context";
import { MeetingsPage } from "@/features/meetings/MeetingsPage";
import { AuthButton } from "@/features/auth/AuthButton";
import {
  Search,
  Info,
  Download,
  Printer,
  Sun,
  Moon,
  Loader2,
  AlertCircle,
} from "lucide-react";

export function App() {
  const auth = useAuth();
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState<"registry" | "create" | "card" | "history">(
    "registry"
  );
  const [currentLang, setCurrentLang] = useState<"uk" | "en">("uk");

  const pathname = typeof window !== "undefined" ? window.location.pathname : "";
  const isLoginPage =
    pathname === "/login" || pathname === "/login/" || pathname.startsWith("/login/");
  const isCallbackPage =
    pathname.includes("/auth/callback") ||
    (typeof window !== "undefined" &&
      new URLSearchParams(window.location.search).has("code"));

  // Step 3: /login/ page calls signinRedirect() as soon as it loads.
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
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center text-white gap-4 p-6 text-center">
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
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center text-white gap-4 p-6 text-center">
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
        <div className="bg-red-600 text-white px-4 py-2 text-center text-xs font-semibold flex items-center justify-center gap-2 shadow">
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

      {/* 1. TOP HEADER (RADA STATE BRANDING) */}
      <header id="header" className="rada-header">
        <div className="px-6 py-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
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
                className="h-14 w-auto object-contain shrink-0"
              />

              {/* Ukrainian Flag Stripe */}
              <div className="rada-flag-stripe shrink-0" />

              <div className="leading-tight">
                <div className="flex items-baseline gap-2">
                  <span className="font-serif font-bold text-3xl md:text-4xl tracking-wider text-white">
                    РАДА
                  </span>
                  <span className="font-sans font-semibold text-lg md:text-xl uppercase tracking-wider text-slate-100">
                    Верховна Рада України
                  </span>
                </div>
                <div className="text-xs md:text-sm font-medium text-[#ffe358] tracking-wide mt-0.5">
                  Законодавство України &bull; Єдина інформаційна система реєстрації
                  засідань «Spry»
                </div>
              </div>
            </a>
          </div>

          {/* Right Services block: OIDC Cognito Authentication and Language switch */}
          <div className="flex items-center gap-3 shrink-0 self-end md:self-auto">
            {/* OIDC Authentication Widget (Sign in / Sign out / Email) */}
            <AuthButton />

            {/* Language switcher */}
            <div className="inline-flex rounded border border-white/30 text-xs overflow-hidden">
              <button
                type="button"
                onClick={() => setCurrentLang("uk")}
                className={`px-2.5 py-1 font-semibold transition-colors ${
                  currentLang === "uk"
                    ? "bg-[#ffe358] text-slate-900"
                    : "bg-transparent text-white hover:bg-white/10"
                }`}
              >
                Укр
              </button>
              <button
                type="button"
                onClick={() => setCurrentLang("en")}
                className={`px-2.5 py-1 font-semibold transition-colors ${
                  currentLang === "en"
                    ? "bg-[#ffe358] text-slate-900"
                    : "bg-transparent text-white hover:bg-white/10"
                }`}
              >
                Eng
              </button>
            </div>
          </div>
        </div>

        {/* 2. SUB-NAV / MAIN SEARCH TOOLBAR */}
        <nav className="rada-nav px-6 flex flex-wrap items-center justify-between border-t border-blue-900/60 text-xs">
          <div className="flex flex-wrap items-center gap-1 py-2">
            <button
              type="button"
              onClick={() => setActiveTab("registry")}
              className={`px-3 py-1 rounded font-medium transition-colors ${
                activeTab === "registry"
                  ? "bg-[#ffe358] text-slate-900 shadow-sm"
                  : "text-white hover:bg-blue-800/60"
              }`}
            >
              Реєстр засідань
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("create")}
              className={`px-3 py-1 rounded font-medium transition-colors ${
                activeTab === "create"
                  ? "bg-[#ffe358] text-slate-900 shadow-sm"
                  : "text-white hover:bg-blue-800/60"
              }`}
            >
              + Зареєструвати засідання
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("card")}
              className={`px-3 py-1 rounded font-medium transition-colors ${
                activeTab === "card"
                  ? "bg-[#ffe358] text-slate-900 shadow-sm"
                  : "text-white hover:bg-blue-800/60"
              }`}
            >
              Картка закону
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("history")}
              className={`px-3 py-1 rounded font-medium transition-colors ${
                activeTab === "history"
                  ? "bg-[#ffe358] text-slate-900 shadow-sm"
                  : "text-white hover:bg-blue-800/60"
              }`}
            >
              Історія скликань
            </button>
          </div>

          <div className="flex items-center gap-2 py-2">
            <div className="relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Пошук у базі засідань..."
                className="text-xs bg-slate-900/60 border border-slate-600 focus:border-[#ffe358] text-white placeholder-slate-400 rounded px-2.5 py-1.5 w-44 sm:w-60 focus:outline-none"
              />
              <Search className="h-3.5 w-3.5 text-slate-400 absolute right-2.5 top-2.5 pointer-events-none" />
            </div>
          </div>
        </nav>
      </header>

      {/* 3. BREADCRUMBS & METADATA NOTICE (AUTHENTIC RADA CARD) */}
      <div className="px-6 pt-4 pb-2">
        <div className="bg-[#f8f9fa] dark:bg-slate-800/80 border border-[#ced4da] dark:border-slate-700 rounded p-3 text-center text-xs md:text-sm text-slate-700 dark:text-slate-200">
          <div>
            Документ{" "}
            <abbr className="font-bold underline cursor-help" title="Ідентифікатор акта">
              SPRY-2026/01
            </abbr>
            ,{" "}
            <span className="inline-block px-1.5 py-0.5 rounded text-xs font-bold text-[#009d3f] border border-[#009d3f] bg-[#e8f5e9] dark:bg-emerald-950 dark:text-emerald-300 mx-1">
              чинний
            </span>
            , поточна редакція — <b>Редакція</b> від{" "}
            <span className="font-semibold">01.10.2026</span>, підстава —{" "}
            <a
              href="https://zakon.rada.gov.ua/laws/show/254%D0%BA/96-%D0%B2%D1%80"
              target="_blank"
              rel="noreferrer"
              className="rada-link font-semibold"
            >
              Конституція України № 254к/96-ВР
            </a>
          </div>
        </div>

        {/* 4. ACTION TOOLBAR */}
        <div className="flex flex-wrap items-center justify-between gap-2 mt-3 pb-2 border-b border-[#ced4da] dark:border-slate-700">
          <div className="flex flex-wrap items-center gap-1.5 text-xs">
            <button
              type="button"
              onClick={() =>
                alert(
                  "Інформація: Єдина система обліку пленарних засідань та нарад Spry Monorepo (FastAPI + React + PostgreSQL)."
                )
              }
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded border border-[#17a2b8] text-[#17a2b8] hover:bg-[#17a2b8]/10 font-medium transition-colors"
            >
              <Info className="h-3.5 w-3.5" />
              <span>Інформація</span>
            </button>
            <div className="inline-flex items-center rounded border border-[#28a745] text-[#28a745] overflow-hidden">
              <span className="px-2 py-1 font-medium bg-[#28a745]/10 flex items-center gap-1">
                <Download className="h-3.5 w-3.5" />
                <span>Зберегти:</span>
              </span>
              <button
                type="button"
                onClick={() => alert("Експорт у форматі HTML згенеровано.")}
                className="px-1.5 py-1 hover:bg-[#28a745]/20 font-mono text-[11px]"
              >
                htm
              </button>
              <button
                type="button"
                onClick={() => alert("Експорт у форматі PDF згенеровано.")}
                className="px-1.5 py-1 hover:bg-[#28a745]/20 font-mono text-[11px] border-l border-[#28a745]/30"
              >
                pdf
              </button>
              <button
                type="button"
                onClick={() => alert("Експорт у форматі DOCX згенеровано.")}
                className="px-1.5 py-1 hover:bg-[#28a745]/20 font-mono text-[11px] border-l border-[#28a745]/30"
              >
                doc
              </button>
            </div>
            <button
              type="button"
              onClick={() => setActiveTab("card")}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded border border-[#007bff] text-[#007bff] hover:bg-[#007bff]/10 font-medium transition-colors"
            >
              <span className="h-3.5 w-3.5 flex items-center justify-center font-bold">
                🗎
              </span>
              <span>Картка документа</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("registry")}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded border border-[#007bff] text-[#007bff] hover:bg-[#007bff]/10 font-medium transition-colors"
            >
              <span className="h-3.5 w-3.5 flex items-center justify-center font-bold">
                📋
              </span>
              <span>Зміст засідань</span>
            </button>
            <button
              type="button"
              onClick={handlePrint}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded border border-[#007bff] text-[#007bff] hover:bg-[#007bff]/10 font-medium transition-colors"
            >
              <Printer className="h-3.5 w-3.5" />
              <span>Друк</span>
            </button>
          </div>

          <div className="flex items-center gap-2 text-xs">
            <button
              type="button"
              onClick={toggleDarkMode}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded border border-slate-400 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 font-medium transition-colors"
            >
              {isDarkMode ? (
                <Sun className="h-3.5 w-3.5 text-yellow-400" />
              ) : (
                <Moon className="h-3.5 w-3.5" />
              )}
              <span>{isDarkMode ? "Світлий режим" : "Темний режим"}</span>
            </button>
          </div>
        </div>

        {/* 5. METADATA RIBBON */}
        <div className="rada-ribbon-panel rounded px-3 py-1.5 mt-2 flex flex-wrap items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1">
              <img src="/rada_assets/card_kQCl.svg" alt="" className="h-4 w-4" />
              Редакція:
            </span>
            <select
              className="bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded px-2 py-0.5 text-xs text-slate-800 dark:text-slate-200"
              defaultValue="current"
            >
              <option value="current">01.10.2026 • Поточна (Spry)</option>
              <option value="2020">01.01.2020</option>
              <option value="1996">28.06.1996</option>
            </select>
          </div>
          <div className="flex items-center gap-2">
            <img
              src="/rada_assets/t_kQCl.svg"
              alt=""
              className="h-4 w-4 opacity-75"
              title="Терміни"
            />
            <img
              src="/rada_assets/ann_kQCl.svg"
              alt=""
              className="h-4 w-4 opacity-75"
              title="Анотація"
            />
            <img
              src="/rada_assets/link_kQCl.svg"
              alt=""
              className="h-4 w-4 opacity-75"
              title="Пов'язані документи"
            />
            <span className="text-[11px] text-slate-600 dark:text-slate-400 font-mono">
              ВРУ / Секретаріат
            </span>
          </div>
        </div>
      </div>

      {/* 6. MAIN CONTENT AREA */}
      <main className="flex-1 px-4 sm:px-8 py-6">
        <MeetingsPage
          searchQuery={searchQuery}
          activeTab={activeTab}
          setActiveTab={setActiveTab}
        />
      </main>

      {/* 7. FOOTER */}
      <footer className="mt-auto border-t border-[#ced4da] dark:border-slate-700 bg-[#f7f7f7] dark:bg-slate-900 text-slate-700 dark:text-slate-300 text-xs px-6 py-8">
        <div className="border-t border-[#ced4da] dark:border-slate-700 mt-6 pt-4 text-center font-medium text-slate-600 dark:text-slate-400">
          ©{" "}
          <a
            href="https://www.rada.gov.ua/"
            target="_blank"
            rel="noreferrer"
            className="rada-link font-semibold"
          >
            Верховна Рада України
          </a>{" "}
          1994-2026. Єдина система обліку засідань Spry.
        </div>
      </footer>
    </div>
  );
}

export default App;
