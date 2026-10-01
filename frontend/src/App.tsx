import { useState, useEffect } from "react";
import { MeetingsPage } from "@/features/meetings/MeetingsPage";
import {
  UserCircle2,
  Search,
  Info,
  Download,
  FolderOpen,
  ListTree,
  Printer,
  Sun,
  Moon,
  Scale,
  ExternalLink,
} from "lucide-react";

export function App() {
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState<"registry" | "create" | "card" | "history">("registry");
  const [currentLang, setCurrentLang] = useState<"uk" | "en">("uk");

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

  return (
    <div className="rada-page-container">
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
                  Законодавство України &bull; Єдина інформаційна система реєстрації засідань «Spry»
                </div>
              </div>
            </a>
          </div>

          {/* Right Services block */}
          <div className="flex items-center gap-3 shrink-0 self-end md:self-auto">
            <a
              href="https://itd.rada.gov.ua/idsrv/"
              target="_blank"
              rel="noreferrer"
              className="hidden sm:inline-flex items-center gap-2 bg-[#0e317e] hover:bg-[#184dbd] text-white text-xs font-semibold px-3 py-2 rounded border border-blue-400/40 shadow-sm transition-colors"
            >
              <UserCircle2 className="h-4 w-4" />
              <span>Електронний кабінет</span>
            </a>

            {/* Language switcher */}
            <div className="inline-flex rounded border border-white/30 text-xs overflow-hidden">
              <button
                type="button"
                onClick={() => setCurrentLang("uk")}
                className={`px-2.5 py-1 font-semibold transition-colors ${currentLang === "uk"
                    ? "bg-[#ffe358] text-slate-900"
                    : "bg-transparent text-white hover:bg-white/10"
                  }`}
              >
                Укр
              </button>
              <button
                type="button"
                onClick={() => setCurrentLang("en")}
                className={`px-2.5 py-1 font-semibold transition-colors ${currentLang === "en"
                    ? "bg-[#ffe358] text-slate-900"
                    : "bg-transparent text-white hover:bg-white/10"
                  }`}
              >
                Eng
              </button>
            </div>
          </div>
        </div>

        {/* 2. PRIMARY NAVY NAVBAR */}
        <nav className="rada-navbar px-6 py-0 flex flex-wrap items-center justify-between border-t border-blue-900/50">
          <div className="flex items-center overflow-x-auto space-x-1 sm:space-x-2 py-1 text-sm font-semibold text-white">
            <button
              type="button"
              onClick={() => setActiveTab("registry")}
              className={`px-3 py-2.5 rounded transition-colors whitespace-nowrap ${activeTab === "registry"
                  ? "text-[#ffe358] border-b-2 border-[#ffe358]"
                  : "text-slate-100 hover:text-[#ffe358]"
                }`}
            >
              Реєстр засідань
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("create")}
              className={`px-3 py-2.5 rounded transition-colors whitespace-nowrap ${activeTab === "create"
                  ? "text-[#ffe358] border-b-2 border-[#ffe358]"
                  : "text-slate-100 hover:text-[#ffe358]"
                }`}
            >
              Реєстрація засідання
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("card")}
              className={`px-3 py-2.5 rounded transition-colors whitespace-nowrap ${activeTab === "card"
                  ? "text-[#ffe358] border-b-2 border-[#ffe358]"
                  : "text-slate-100 hover:text-[#ffe358]"
                }`}
            >
              Картка
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("history")}
              className={`px-3 py-2.5 rounded transition-colors whitespace-nowrap ${activeTab === "history"
                  ? "text-[#ffe358] border-b-2 border-[#ffe358]"
                  : "text-slate-100 hover:text-[#ffe358]"
                }`}
            >
              Історія
            </button>
            <a
              href="https://zakon.rada.gov.ua/laws/main/index"
              target="_blank"
              rel="noreferrer"
              className="px-3 py-2.5 text-slate-100 hover:text-[#ffe358] transition-colors whitespace-nowrap flex items-center gap-1"
            >
              <span>Законодавство</span>
              <ExternalLink className="h-3 w-3 opacity-70" />
            </a>
            <button
              type="button"
              onClick={handlePrint}
              className="px-3 py-2.5 text-slate-100 hover:text-[#ffe358] transition-colors whitespace-nowrap"
            >
              Текст для друку
            </button>
          </div>

          {/* Quick Search */}
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
            Документ <abbr className="font-bold underline cursor-help" title="Ідентифікатор акта">SPRY-2026/01</abbr>,{" "}
            <span className="inline-block px-1.5 py-0.5 rounded text-xs font-bold text-[#009d3f] border border-[#009d3f] bg-[#e8f5e9] dark:bg-emerald-950 dark:text-emerald-300 mx-1">
              чинний
            </span>
            , поточна редакція — <b>Редакція</b> від <span className="font-semibold">01.10.2026</span>, підстава —{" "}
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
              onClick={() => alert("Інформація: Єдина система обліку пленарних засідань та нарад Spry Monorepo (FastAPI + React + PostgreSQL).")}
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
              <FolderOpen className="h-3.5 w-3.5" />
              <span>Картка документа</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("registry")}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded border border-[#007bff] text-[#007bff] hover:bg-[#007bff]/10 font-medium transition-colors"
            >
              <ListTree className="h-3.5 w-3.5" />
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

          {/* Dark Mode & Social toggle */}
          <div className="flex items-center gap-2 text-xs">
            <button
              type="button"
              onClick={toggleDarkMode}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded border border-slate-400 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 font-medium transition-colors"
            >
              {isDarkMode ? <Sun className="h-3.5 w-3.5 text-yellow-400" /> : <Moon className="h-3.5 w-3.5" />}
              <span>{isDarkMode ? "Світлий режим" : "Темний режим"}</span>
            </button>
          </div>
        </div>

        {/* 5. SECONDARY RIBBON PANEL (EXACTLY AS IN RADA HTML) */}
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
            <button
              type="button"
              title="Порівняти редакції"
              onClick={() => alert("Порівняння редакцій: розбіжностей не виявлено.")}
              className="p-1 rounded hover:bg-blue-200/50 text-slate-700 dark:text-slate-300"
            >
              <Scale className="h-4 w-4" />
            </button>
          </div>

          <div className="flex items-center gap-2">
            <img src="/rada_assets/t_kQCl.svg" alt="" className="h-4 w-4 opacity-75" title="Терміни" />
            <img src="/rada_assets/ann_kQCl.svg" alt="" className="h-4 w-4 opacity-75" title="Анотація" />
            <img src="/rada_assets/link_kQCl.svg" alt="" className="h-4 w-4 opacity-75" title="Пов'язані документи" />
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

      {/* 7. OFFICIAL RADA FOOTER */}
      <footer className="mt-auto border-t border-[#ced4da] dark:border-slate-700 bg-[#f7f7f7] dark:bg-slate-900 text-slate-700 dark:text-slate-300 text-xs px-6 py-8">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
          {/* Support and notices */}
          <div className="md:col-span-4 space-y-2 order-2 md:order-1">
            <p className="font-semibold text-slate-800 dark:text-slate-100">
              Програмно-технічна підтримка — Управління комп'ютеризованих систем Апарату Верховної Ради України
            </p>
            <p>
              Інформаційне наповнення — Відділ баз даних нормативно-правової інформації та секретаріат «Spry»
            </p>
            <div className="p-2.5 rounded bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 text-[11px] leading-relaxed text-amber-900 dark:text-amber-200 mt-3">
              Деякі функції знаходяться у режимі тестової експлуатації. Якщо Ви побачили помилку в тексті або роботі системи, виділіть її мишкою та натисніть Ctrl+Enter.
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 pt-2">
              Весь контент доступний за ліцензією{" "}
              <a
                href="https://creativecommons.org/licenses/by/4.0/deed.uk"
                target="_blank"
                rel="noreferrer"
                className="rada-link"
              >
                Creative Commons Attribution 4.0 International license
              </a>
              , якщо не зазначено інше.
            </p>
          </div>

          {/* Directory links (3 columns on desktop) */}
          <div className="md:col-span-8 order-1 md:order-2">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <div><a href="https://zakon.rada.gov.ua/laws/main/a" target="_blank" rel="noreferrer" className="rada-link">Всі документи</a></div>
                <div><a href="https://zakon.rada.gov.ua/laws/main/nn" target="_blank" rel="noreferrer" className="rada-link">Нові надходження</a></div>
                <div><a href="https://zakon.rada.gov.ua/laws/main/d" target="_blank" rel="noreferrer" className="rada-link">Популярні документи</a></div>
                <div><a href="https://zakon.rada.gov.ua/laws/main/perv" target="_blank" rel="noreferrer" className="rada-link">Первинні законодавчі акти</a></div>
              </div>
              <div className="space-y-1.5">
                <div><a href="https://zakon.rada.gov.ua/laws/main/groups" target="_blank" rel="noreferrer" className="rada-link">Групи документів</a></div>
                <div><a href="https://zakon.rada.gov.ua/laws/main/koms" target="_blank" rel="noreferrer" className="rada-link">Розподіл за комітетами ВРУ</a></div>
                <div><a href="https://zakon.rada.gov.ua/laws/main/termin" target="_blank" rel="noreferrer" className="rada-link">Термінологія законодавства</a></div>
                <div><a href="https://zakon.rada.gov.ua/laws/main/eurovoc" target="_blank" rel="noreferrer" className="rada-link">Тезаурус "EUROVOC"</a></div>
              </div>
              <div className="space-y-1.5">
                <div><a href="https://zakon.rada.gov.ua/laws/main/klas" target="_blank" rel="noreferrer" className="rada-link">Юридична класифікація</a></div>
                <div><a href="https://zakon.rada.gov.ua/laws/main/days" target="_blank" rel="noreferrer" className="rada-link">Календар офіційних свят</a></div>
                <div><a href="https://zakon.rada.gov.ua/laws/main/rules" target="_blank" rel="noreferrer" className="rada-link">Правила користування</a></div>
                <div><a href="https://zakon.rada.gov.ua/laws/main/contact" target="_blank" rel="noreferrer" className="rada-link">Контактна інформація</a></div>
              </div>
            </div>
          </div>
        </div>

        <div className="border-t border-[#ced4da] dark:border-slate-700 mt-6 pt-4 text-center font-medium text-slate-600 dark:text-slate-400">
          &copy; <a href="https://www.rada.gov.ua/" target="_blank" rel="noreferrer" className="rada-link font-semibold">Верховна Рада України</a> 1994-2026. Єдина система обліку засідань Spry.
        </div>
      </footer>
    </div>
  );
}

export default App;
