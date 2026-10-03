import { useEffect, useState } from "react";
import {
  Download,
  Upload,
  MonitorSmartphone,
  ShieldCheck,
  Check,
  Trash2,
} from "lucide-react";
import { useLiveQuery } from "dexie-react-hooks";
import { useData, useToast } from "../store";
import { db, updateSettings } from "../db";
import { exams, type Exam } from "../types";
import {
  exportBackup,
  validateBackup,
  restoreBackup,
  downloadJSON,
  type Backup,
} from "../backup";
import { usePWA } from "../pwa";
import { prettyDate } from "../logic";
import { PageHeader } from "../components/common";
import { Button } from "../components/ui/button";
export default function Settings() {
  const { settings, articles, questions } = useData(),
    toast = useToast(),
    pwa = usePWA();
  const [name, setName] = useState(settings.name),
    [goal, setGoal] = useState(String(settings.goal)),
    [exam, setExam] = useState(settings.exam),
    [file, setFile] = useState<Backup | null>(null),
    [fileName, setFileName] = useState(""),
    [mode, setMode] = useState<"merge" | "replace">("merge"),
    [confirmed, setConfirmed] = useState(false),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  useEffect(() => {
    setName(settings.name);
    setGoal(String(settings.goal));
    setExam(settings.exam);
  }, [settings.updatedAt]);
  const reports = useLiveQuery(() => db.reports.toArray(), []) || [];
  async function importFile() {
    if (!file || (mode === "replace" && !confirmed)) return;
    setBusy(true);
    setError("");
    try {
      await restoreBackup(file, mode);
      setFile(null);
      setConfirmed(false);
      const s = await db.settings.get("user");
      if (s) {
        setName(s.name);
        setGoal(String(s.goal));
        setExam(s.exam);
      }
      toast("Backup restored successfully. Your workspace has been updated.");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <PageHeader
        title="Make this space yours"
        description="Your preferences, your progress, your control."
      />
      <div className="settings-grid">
        <section className="panel settings-section">
          <h2>Study preferences</h2>
          <p>Build a routine you can come back to.</p>
          <form
            className="stack"
            onSubmit={async (e) => {
              e.preventDefault();
              const n = Number(goal);
              if (!name.trim() || !Number.isInteger(n) || n < 1 || n > 500) {
                toast("Enter your name and a goal from 1 to 500.");
                return;
              }
              try {
                await updateSettings({ name: name.trim(), goal: n, exam });
                toast("Preferences saved.");
              } catch {
                toast("Could not save preferences.");
              }
            }}
          >
            <label className="field">
              Your name
              <input
                required
                maxLength={60}
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </label>
            <label className="field">
              Primary examination
              <select
                value={exam}
                onChange={(e) => setExam(e.target.value as Exam)}
              >
                {exams.map((e) => (
                  <option key={e}>{e}</option>
                ))}
              </select>
            </label>
            <label className="field">
              Daily question goal
              <input
                type="number"
                required
                min={1}
                max={500}
                value={goal}
                onChange={(e) => setGoal(e.target.value)}
              />
            </label>
            <Button>Save preferences</Button>
          </form>
          <div className="appearance-setting">
            <h3>Appearance</h3>
            <div className="theme-options">
              {(["dark", "light"] as const).map((t) => (
                <button
                  key={t}
                  className={settings.theme === t ? "active" : ""}
                  aria-pressed={settings.theme === t}
                  onClick={() => updateSettings({ theme: t })}
                >
                  <span className={`theme-preview ${t}`}>
                    <i />
                    <i />
                    <i />
                  </span>
                  {t === "dark" ? "Midnight" : "Daylight"}
                  {settings.theme === t && <Check size={15} />}
                </button>
              ))}
            </div>
          </div>
        </section>
        <section className="panel settings-section">
          <div className="row">
            <ShieldCheck className="violet" />
            <h2>Your data, safely with you</h2>
          </div>
          <p>
            Progress is stored in this browser on this device. Export regularly;
            clearing browser data can remove it. Laptop and phone do not sync
            automatically.
          </p>
          <div className="backup-block">
            <h3>Export progress</h3>
            <p>
              Includes your attempts, bookmarks, revision schedules, sessions,
              settings, error reports and downloaded content.
            </p>
            <Button
              variant="secondary"
              onClick={async () => {
                try {
                  downloadJSON(await exportBackup());
                  toast("Backup prepared. Check your browser’s downloads.");
                } catch (e) {
                  toast("Could not export: " + (e as Error).message);
                }
              }}
            >
              <Download size={17} />
              Export progress
            </Button>
          </div>
          <div className="backup-block">
            <h3>Import progress</h3>
            <p>
              Restore an EXAMINT JSON backup, or transfer progress from another
              device.
            </p>
            <label className="file-input">
              <Upload size={18} />
              <span>{fileName || "Choose backup file"}</span>
              <input
                aria-label="Choose EXAMINT backup JSON"
                type="file"
                accept=".json,application/json"
                onChange={async (e) => {
                  const f = e.target.files?.[0];
                  setFile(null);
                  setFileName("");
                  setError("");
                  setConfirmed(false);
                  if (!f) return;
                  try {
                    if (f.size > 20 * 1024 * 1024)
                      throw new Error("Backup is larger than the 20 MB limit.");
                    const data = validateBackup(JSON.parse(await f.text()));
                    setFile(data);
                    setFileName(f.name);
                  } catch (err) {
                    setError(
                      err instanceof SyntaxError
                        ? "Invalid JSON. Choose a valid EXAMINT backup."
                        : (err as Error).message,
                    );
                  } finally {
                    e.target.value = "";
                  }
                }}
              />
            </label>
            {file && (
              <div className="import-preview">
                <p>
                  <strong>Validated backup</strong> ·{" "}
                  {prettyDate(file.exportedAt)}
                </p>
                <p>
                  {file.data.attempts.length} attempts ·{" "}
                  {file.data.bookmarks.length} bookmarks ·{" "}
                  {file.data.questions.length} questions
                </p>
                <label className="field">
                  Restore method
                  <select
                    value={mode}
                    onChange={(e) => {
                      setMode(e.target.value as "merge" | "replace");
                      setConfirmed(false);
                    }}
                  >
                    <option value="merge">Merge with current data</option>
                    <option value="replace">Replace current data</option>
                  </select>
                </label>
                <p>
                  {mode === "merge"
                    ? "Adds missing records, preserves duplicate attempts and uses newer compatible settings and revision records."
                    : "This will replace all data in this browser. Export your current progress first."}
                </p>
                {mode === "replace" && (
                  <label className="check-label">
                    <input
                      type="checkbox"
                      checked={confirmed}
                      onChange={(e) => setConfirmed(e.target.checked)}
                    />{" "}
                    I confirm replacing my current local data.
                  </label>
                )}
                <Button
                  disabled={busy || (mode === "replace" && !confirmed)}
                  onClick={importFile}
                >
                  {busy
                    ? "Restoring…"
                    : mode === "merge"
                      ? "Merge backup"
                      : "Replace and restore"}
                </Button>
              </div>
            )}
            {error && (
              <p className="form-error" role="alert">
                {error}
              </p>
            )}
          </div>
        </section>
        <section className="panel settings-section">
          <div className="row">
            <MonitorSmartphone className="violet" />
            <h2>EXAMINT, on your home screen</h2>
          </div>
          <p>
            Install from a compatible browser on Windows or Android after
            opening the HTTPS website.
          </p>
          {pwa.installed ? (
            <p className="green">Running as an installed app.</p>
          ) : pwa.installAvailable ? (
            <Button onClick={pwa.install}>
              <Download size={17} />
              Install EXAMINT
            </Button>
          ) : (
            <p className="small-note">
              If your browser offers installation, use its menu → Install app or
              Add to Home screen. Installation becomes available after
              deployment; support varies by browser.
            </p>
          )}
          <div className="offline-status">
            <strong>
              {pwa.offlineReady
                ? "App shell cached for offline use"
                : "Offline cache not yet confirmed"}
            </strong>
            <p>
              {articles.length} articles and {questions.length} questions saved
              in IndexedDB. Images are available offline only if their fetches
              have been cached successfully.
            </p>
          </div>
          {pwa.needRefresh && (
            <Button variant="secondary" onClick={pwa.update}>
              Update app now
            </Button>
          )}
          <Button
            variant="ghost"
            onClick={async () => {
              try {
                if (!navigator.storage?.persist) {
                  toast(
                    "This browser does not support persistent storage requests. Keep regular backups.",
                  );
                  return;
                }
                toast(
                  (await navigator.storage.persist())
                    ? "Persistent storage granted. Keep regular backups as well."
                    : "Persistent storage was not granted. Export regularly.",
                );
              } catch {
                toast(
                  "Could not request persistent storage. Keep regular backups.",
                );
              }
            }}
          >
            Request persistent browser storage
          </Button>
        </section>
        <section className="panel settings-section">
          <h2>News collection and local progress</h2>
          <p>
            Official news is collected on GitHub. Progress stays on this device.
            Demonstration content is labelled separately. No AI API is
            connected.
          </p>
          <dl className="integration-list">
            <div>
              <dt>News source</dt>
              <dd>PIB English releases + demonstration edition</dd>
            </div>
            <div>
              <dt>AI summaries</dt>
              <dd>Not connected</dd>
            </div>
            <div>
              <dt>Automatic news collection</dt>
              <dd>GitHub Actions · scheduled every four hours</dd>
            </div>
            <div>
              <dt>Cloud synchronization</dt>
              <dd>Not connected</dd>
            </div>
          </dl>
          <p className="small-note">
            Future integrations use provider interfaces. API credentials belong
            on a secure backend or a scheduled server-side job, never inside
            this app.
          </p>
        </section>
      </div>
      <section className="panel settings-section reports-section">
        <h2>Saved error reports</h2>
        <p>
          These notes stay on this device and are included in your backups. No
          reports are transmitted.
        </p>
        {reports.length ? (
          reports.map((r) => (
            <div key={r.id} className="report-row">
              <div>
                <h3>
                  {questions.find((q) => q.id === r.questionId)?.prompt ||
                    r.questionId}
                </h3>
                <p>{r.message}</p>
                <small>{prettyDate(r.createdAt)}</small>
              </div>
              <Button
                variant="ghost"
                size="icon"
                aria-label="Delete saved report"
                onClick={() => {
                  if (window.confirm("Delete this locally saved error report?"))
                    void db.reports.delete(r.id);
                }}
              >
                <Trash2 size={17} />
              </Button>
            </div>
          ))
        ) : (
          <p className="small-note">No reports saved.</p>
        )}
      </section>
    </>
  );
}
