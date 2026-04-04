import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

interface Section {
  heading: string;
  content: string;
}

let sections: Section[] | null = null;

function load(): Section[] {
  if (sections) return sections;

  const dir = dirname(fileURLToPath(import.meta.url));
  const root = resolve(dir, "..", "..");
  const path = resolve(root, "references", "ground-truth.md");

  const raw = readFileSync(path, "utf-8");
  const parts = raw.split(/^## /m).slice(1);

  sections = parts.map((part) => {
    const newline = part.indexOf("\n");
    return {
      heading: part.slice(0, newline).trim(),
      content: part.slice(newline + 1).trim(),
    };
  });

  return sections;
}

export function findGroundTruth(topic: string): string {
  const all = load();
  const lower = topic.toLowerCase();

  const match = all.find((s) => s.heading.toLowerCase().includes(lower));
  if (match) return `## ${match.heading}\n\n${match.content}`;

  const bodyMatch = all.find((s) => s.content.toLowerCase().includes(lower));
  if (bodyMatch)
    return `## ${bodyMatch.heading}\n\n${bodyMatch.content}`;

  return all.map((s) => `## ${s.heading}\n\n${s.content}`).join("\n\n");
}

export function getAllGroundTruth(): string {
  const all = load();
  return all.map((s) => `## ${s.heading}\n\n${s.content}`).join("\n\n");
}
