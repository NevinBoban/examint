import { useEffect } from "react";
import { db } from "./db";
import { accuracy, streak } from "./logic";
interface ModelContext {
  registerTool(
    tool: {
      name: string;
      title: string;
      description: string;
      inputSchema: object;
      annotations: { readOnlyHint: boolean; untrustedContentHint: boolean };
      execute(input: unknown): Promise<unknown>;
    },
    options: { signal: AbortSignal },
  ): void | Promise<void>;
}
// Optional browser capability. It never sends data to an external server.
export function useStudyTools() {
  useEffect(() => {
    const context = (document as Document & { modelContext?: ModelContext })
      .modelContext;
    if (!context?.registerTool) return;
    const lifecycle = new AbortController();
    try {
      void Promise.resolve(
        context.registerTool(
          {
            name: "read_examint_study_summary",
            title: "Read EXAMINT study summary",
            description:
              "Read locally stored answer counts, accuracy, streak and due revision count. Does not modify progress.",
            inputSchema: {
              type: "object",
              properties: {},
              additionalProperties: false,
            },
            annotations: { readOnlyHint: true, untrustedContentHint: false },
            async execute(input) {
              if (
                !input ||
                typeof input !== "object" ||
                Array.isArray(input) ||
                Object.keys(input).length
              )
                throw new Error("Expected an empty object.");
              const attempts = await db.attempts.toArray();
              return {
                answered: attempts.filter((a) => a.outcome !== "revealed")
                  .length,
                revealed: attempts.filter((a) => a.outcome === "revealed")
                  .length,
                accuracy: accuracy(attempts),
                streak: streak(attempts),
                due: await db.revisions
                  .where("dueAt")
                  .belowOrEqual(new Date().toISOString())
                  .count(),
              };
            },
          },
          { signal: lifecycle.signal },
        ),
      ).catch(() => {});
    } catch {
      /* Optional API registration must not block the application. */
    }
    return () => lifecycle.abort();
  }, []);
}
