export const exams = ["RRB JE", "SSC CGL", "SSC CHSL"] as const;
export type Exam = (typeof exams)[number];
export const categories = [
  "National Affairs",
  "International Affairs",
  "Government Schemes",
  "Economy and Banking",
  "Science and Technology",
  "Space and Defence",
  "Railways and Infrastructure",
  "Environment",
  "Geography",
  "Sports",
  "Awards and Honours",
  "Appointments",
  "Reports and Indices",
  "Important Days",
  "Electronics and Technology",
] as const;
export type Category = (typeof categories)[number];
export type Priority = "High" | "Medium" | "Low";
export interface LicensedImage {
  url: string;
  alt: string;
  author: string;
  license: string;
  sourceUrl: string;
  licenseUrl: string;
}
export interface ContentMeta {
  id: string;
  category: Category;
  exams: Exam[];
  priority: Priority;
  publishedAt: string;
  eventAt?: string;
  collectedAt: string;
  updatedAt: string;
  source: string;
  sourceUrl: string;
  verification: "demo" | "verified" | "unverified" | "source-checked";
  evidence?: {
    method: string;
    rule: string;
    quote: string;
    sourceUrl: string;
    checkedAt: string;
    sourceHash: string;
  };
  image?: LicensedImage;
  organizations: string[];
  locations: string[];
}
export interface Article extends ContentMeta {
  headline: string;
  summary: string;
  body: string[];
  facts: string[];
  staticGK: string[];
  remember: string;
  relevance: Record<Exam, string>;
  aiGenerated: boolean;
}
export interface Question extends ContentMeta {
  articleId: string;
  prompt: string;
  options: [string, string, string, string];
  answer: number;
  explanation: string;
  validation: "demo-reviewed" | "pending" | "verified" | "rule-checked";
}
export type Outcome = "correct" | "incorrect" | "revealed";
export interface Attempt {
  id: string;
  questionId: string;
  sessionId: string;
  selected: number | null;
  outcome: Outcome;
  attemptedAt: string;
  revision: boolean;
}
export interface Bookmark {
  id: string;
  type: "article" | "question";
  targetId: string;
  updatedAt: string;
}
export interface Revision {
  questionId: string;
  dueAt: string;
  interval: number;
  consecutive: number;
  lastOutcome: Outcome;
  updatedAt: string;
}
export interface Settings {
  id: "user";
  name: string;
  exam: Exam;
  goal: number;
  theme: "dark" | "light";
  collapsed: boolean;
  updatedAt: string;
}
export interface Session {
  id: string;
  mode: string;
  questionIds: string[];
  index: number;
  results: Record<string, string>;
  startedAt: string;
  updatedAt: string;
  finishedAt?: string;
  revision: boolean;
}
export interface Reading {
  articleId: string;
  readAt: string;
}
export interface Report {
  id: string;
  questionId: string;
  message: string;
  createdAt: string;
}
export interface Bank {
  version: number;
  articles: Article[];
  questions: Question[];
  collection?: CollectionStatus;
}
export interface CollectionStatus {
  lastRunAt: string;
  lastSuccessAt: string | null;
  schedule: string;
  sources: {
    name: string;
    url: string;
    ok: boolean;
    errors: string[];
    discovered: number;
    checked: number;
  }[];
  addedArticles: number;
  addedQuestions: number;
  held: number;
  articleCount: number;
  questionCount: number;
  policy: string;
}
