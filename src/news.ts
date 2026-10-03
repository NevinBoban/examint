import { useSyncExternalStore } from "react";
import {
  LocalContentRepository,
  validateBank,
  type NewsProvider,
} from "./repositories";
import type { CollectionStatus } from "./types";

interface NewsState {
  collection?: CollectionStatus;
  refreshedAt?: string;
  busy: boolean;
  error?: string;
}
let state: NewsState = { busy: false };
try {
  const stored = JSON.parse(
    localStorage.getItem("examint-news-status") || "null",
  );
  if (stored?.collection?.lastRunAt && Array.isArray(stored.collection.sources))
    state = { ...stored, busy: false };
} catch {
  /* Browser may block storage; IndexedDB learning still has its own error handling. */
}
const listeners = new Set<() => void>();
function publish(next: NewsState) {
  state = next;
  if (!next.busy && !next.error) {
    try {
      localStorage.setItem("examint-news-status", JSON.stringify(next));
    } catch {
      /* Status caching is optional. */
    }
  }
  listeners.forEach((fn) => fn());
}
export function useNewsStatus() {
  return useSyncExternalStore(
    (fn) => {
      listeners.add(fn);
      return () => listeners.delete(fn);
    },
    () => state,
  );
}
export class PublishedNewsProvider implements NewsProvider {
  async fetchContent() {
    const response = await fetch(
      `${import.meta.env.BASE_URL}content/live.json`,
      {
        cache: "no-store",
        signal: AbortSignal.timeout(12000),
      },
    );
    if (!response.ok)
      throw new Error(
        "The latest edition is unavailable. Your saved edition remains available.",
      );
    const bank = validateBank(await response.json());
    if (
      !bank.collection ||
      !Number.isFinite(Date.parse(bank.collection.lastRunAt)) ||
      !Array.isArray(bank.collection.sources)
    )
      throw new Error("The news edition has invalid collection metadata.");
    return bank;
  }
}
let pending: Promise<void> | undefined;
let lastCheck = 0;
export function refreshNews(force = false): Promise<void> {
  if (pending) return pending;
  if (!force && Date.now() - lastCheck < 5 * 60 * 1000)
    return Promise.resolve();
  if (!navigator.onLine) {
    publish({
      ...state,
      busy: false,
      error: "Offline — showing news already saved on this device.",
    });
    return Promise.resolve();
  }
  lastCheck = Date.now();
  publish({ ...state, busy: true, error: undefined });
  pending = (async () => {
    try {
      const bank = await new PublishedNewsProvider().fetchContent();
      await new LocalContentRepository().upsert(bank);
      publish({
        collection: bank.collection,
        refreshedAt: new Date().toISOString(),
        busy: false,
      });
    } catch (error) {
      publish({
        ...state,
        busy: false,
        error: error instanceof Error ? error.message : "News refresh failed.",
      });
    } finally {
      pending = undefined;
    }
  })();
  return pending;
}
