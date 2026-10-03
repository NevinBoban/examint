import { it, expect } from "vitest";
import { readFileSync, existsSync } from "node:fs";
it("ships a scoped manifest, install icons and offline content with relative asset paths", () => {
  const manifest = JSON.parse(
    readFileSync("dist/manifest.webmanifest", "utf8"),
  );
  expect(manifest.scope).toBe("./");
  expect(manifest.start_url).toBe("./");
  for (const icon of manifest.icons)
    expect(existsSync("dist/" + icon.src)).toBe(true);
  const html = readFileSync("dist/index.html", "utf8");
  expect(html).not.toMatch(/(?:src|href)="\/assets\//);
  expect(html).toContain("./assets/");
  const sw = readFileSync("dist/sw.js", "utf8");
  expect(sw).toContain("content/demo.json");
  expect(sw).not.toMatch(/url:\s*["']content\/live\.json["']/);
  expect(sw).toContain("index.html");
  expect(existsSync("dist/content/demo.json")).toBe(true);
});
