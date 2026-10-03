import { useEffect, useState } from "react";
import {
  HashRouter,
  NavLink,
  Route,
  Routes,
  Link,
  useNavigate,
} from "react-router-dom";
import {
  LayoutDashboard,
  Newspaper,
  ListChecks,
  RotateCcw,
  Bookmark,
  ChartNoAxesCombined,
  CalendarDays,
  Settings,
  Search,
  PanelLeftClose,
  PanelLeftOpen,
  Sun,
  Moon,
  WifiOff,
  Menu,
  X,
  Command,
  GraduationCap,
} from "lucide-react";
import { exams, type Exam } from "./types";
import { updateSettings } from "./db";
import { useData, ToastProvider, DataGate } from "./store";
import Dashboard from "./pages/Dashboard";
import SettingsPage from "./pages/Settings";
import { PWAProvider } from "./pwa";
import { useStudyTools } from "./webmcp";
import Analytics from "./pages/Analytics";
import Calendar from "./pages/Calendar";
import Revision from "./pages/Revision";
import { QuizSetup, QuizSession } from "./pages/Quiz";
import {
  CurrentAffairs,
  ArticleReader,
  GlobalSearch,
  Bookmarks,
} from "./pages/Content";
import { Button } from "./components/ui/button";
const nav = [
  ["/", "Dashboard", LayoutDashboard],
  ["/current-affairs", "Current Affairs", Newspaper],
  ["/quiz", "Daily Quiz", ListChecks],
  ["/revision", "Revision", RotateCcw],
  ["/bookmarks", "Bookmarks", Bookmark],
  ["/analytics", "Analytics", ChartNoAxesCombined],
  ["/calendar", "Calendar", CalendarDays],
  ["/settings", "Settings", Settings],
] as const;
function Shell() {
  useStudyTools();
  const { settings } = useData(),
    [search, setSearch] = useState(""),
    [menu, setMenu] = useState(false),
    [online, setOnline] = useState(navigator.onLine);
  const navigate = useNavigate();
  useEffect(() => {
    document.documentElement.dataset.theme = settings.theme;
  }, [settings.theme]);
  useEffect(() => {
    const on = () => setOnline(navigator.onLine);
    window.addEventListener("online", on);
    window.addEventListener("offline", on);
    return () => {
      window.removeEventListener("online", on);
      window.removeEventListener("offline", on);
    };
  }, []);
  return (
    <div className={`app-shell ${settings.collapsed ? "collapsed" : ""}`}>
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      <aside className={`sidebar ${menu ? "mobile-open" : ""}`}>
        <Link to="/" className="brand">
          <span className="brand-symbol">E</span>
          <span>
            EXAMINT<small>KNOW MORE. GO FURTHER.</small>
          </span>
        </Link>
        <p className="nav-caption">YOUR WORKSPACE</p>
        <nav>
          {nav.map(([path, label, Icon]) => (
            <NavLink
              key={path}
              to={path}
              end={path === "/"}
              onClick={() => setMenu(false)}
              title={settings.collapsed ? label : undefined}
            >
              <Icon size={19} />
              <span>{label}</span>
              {label === "Daily Quiz" && <i className="nav-spark" />}
            </NavLink>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="local-card">
            <span className="local-dot" />
            <strong>Your personal workspace</strong>
            <p>Progress saved on this device.</p>
          </div>
          <div className="profile">
            <span className="avatar">
              {settings.name.slice(0, 1).toUpperCase()}
            </span>
            <div>
              <strong>{settings.name}</strong>
              <small>One day closer.</small>
            </div>
            <Button
              variant="ghost"
              size="icon"
              aria-label="Collapse sidebar"
              onClick={() => updateSettings({ collapsed: !settings.collapsed })}
            >
              {settings.collapsed ? (
                <PanelLeftOpen size={17} />
              ) : (
                <PanelLeftClose size={17} />
              )}
            </Button>
          </div>
        </div>
      </aside>
      {menu && (
        <button
          className="scrim"
          aria-label="Close menu"
          onClick={() => setMenu(false)}
        />
      )}
      <div className="workspace">
        <header className="topbar">
          <Button
            variant="ghost"
            size="icon"
            className="mobile-menu"
            aria-label="Open navigation"
            onClick={() => setMenu(!menu)}
          >
            {menu ? <X /> : <Menu />}
          </Button>
          <form
            className="global-search"
            onSubmit={(e) => {
              e.preventDefault();
              navigate(`/search?q=${encodeURIComponent(search)}`);
            }}
          >
            <Search size={18} />
            <input
              aria-label="Search articles and questions"
              placeholder="Search your next discovery…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <kbd>
              <Command size={12} /> Enter
            </kbd>
          </form>
          <div className="topbar-right">
            <span className="topbar-date">
              {new Date().toLocaleDateString("en-IN", {
                day: "numeric",
                month: "short",
              })}
            </span>
            <span className="edition-tag">EXAMINT</span>
            <label className="exam-select">
              <GraduationCap size={17} />
              <select
                aria-label="Selected examination"
                value={settings.exam}
                onChange={(e) =>
                  updateSettings({ exam: e.target.value as Exam })
                }
              >
                {exams.map((e) => (
                  <option key={e}>{e}</option>
                ))}
              </select>
            </label>
            <Button
              variant="ghost"
              size="icon"
              aria-label="Toggle light or dark theme"
              onClick={() =>
                updateSettings({
                  theme: settings.theme === "dark" ? "light" : "dark",
                })
              }
            >
              {settings.theme === "dark" ? (
                <Sun size={19} />
              ) : (
                <Moon size={19} />
              )}
            </Button>
          </div>
        </header>
        {!online && (
          <div className="offline-banner">
            <WifiOff size={16} /> You’re offline. Saved questions and progress
            remain available; uncached images may be missing.
          </div>
        )}
        <main id="main">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/current-affairs" element={<CurrentAffairs />} />
            <Route path="/article/:id" element={<ArticleReader />} />
            <Route path="/search" element={<GlobalSearch />} />
            <Route path="/bookmarks" element={<Bookmarks />} />
            <Route path="/quiz" element={<QuizSetup />} />
            <Route path="/quiz/session/:id" element={<QuizSession />} />
            <Route path="/revision" element={<Revision />} />
            <Route path="/analytics" element={<Analytics />} />
            <Route path="/calendar" element={<Calendar />} />
            <Route path="/settings" element={<SettingsPage />} />
            <Route
              path="*"
              element={
                <div className="empty">
                  <h1>Page not found</h1>
                  <Link to="/">Back to dashboard</Link>
                </div>
              }
            />
          </Routes>
          <footer>
            EXAMINT <span>Know the News. Crack the Exam.</span>
            <span>Local-first learning · No automatic device sync</span>
          </footer>
        </main>
      </div>
      <nav className="bottom-nav">
        {nav.slice(0, 4).map(([path, label, Icon]) => (
          <NavLink to={path} key={path} end={path === "/"}>
            <Icon size={21} />
            <span>
              {label === "Current Affairs"
                ? "Read"
                : label === "Daily Quiz"
                  ? "Quiz"
                  : label}
            </span>
          </NavLink>
        ))}
        <button onClick={() => setMenu(!menu)}>
          <Menu size={21} />
          <span>More</span>
        </button>
      </nav>
    </div>
  );
}
export default function App() {
  return (
    <ToastProvider>
      <PWAProvider>
        <DataGate>
          <HashRouter>
            <Shell />
          </HashRouter>
        </DataGate>
      </PWAProvider>
    </ToastProvider>
  );
}
