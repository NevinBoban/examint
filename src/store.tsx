import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db, defaultSettings } from "./db";
import { initialize } from "./repositories";
const ToastContext = createContext<(message: string) => void>(() => {});
export function ToastProvider({ children }: { children: ReactNode }) {
  const [message, setMessage] = useState("");
  useEffect(() => {
    if (message) {
      const t = setTimeout(() => setMessage(""), 5000);
      return () => clearTimeout(t);
    }
  }, [message]);
  return (
    <ToastContext.Provider value={setMessage}>
      {children}
      {message && (
        <div className="toast" role="status">
          {message}
          <button aria-label="Dismiss message" onClick={() => setMessage("")}>
            ×
          </button>
        </div>
      )}
    </ToastContext.Provider>
  );
}
export const useToast = () => useContext(ToastContext);
export function useData() {
  return (
    useLiveQuery(
      async () => ({
        articles: await db.articles.toArray(),
        questions: await db.questions.toArray(),
        attempts: await db.attempts.toArray(),
        bookmarks: await db.bookmarks.toArray(),
        revisions: await db.revisions.toArray(),
        sessions: await db.sessions.toArray(),
        readings: await db.readings.toArray(),
        settings: (await db.settings.get("user")) || defaultSettings,
      }),
      [],
    ) || {
      articles: [],
      questions: [],
      attempts: [],
      bookmarks: [],
      revisions: [],
      sessions: [],
      readings: [],
      settings: defaultSettings,
    }
  );
}
export function DataGate({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false),
    [error, setError] = useState("");
  async function start() {
    setError("");
    try {
      await initialize();
      setReady(true);
    } catch (e) {
      if (await db.articles.count()) setReady(true);
      else setError((e as Error).message);
    }
  }
  useEffect(() => {
    void start();
  }, []);
  return ready ? (
    children
  ) : (
    <div className="boot">
      <div className="brand-symbol">E</div>
      <h1>EXAMINT</h1>
      <p>{error || "Opening your study workspace…"}</p>
      {error && <button onClick={start}>Try again</button>}
    </div>
  );
}
