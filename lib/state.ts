export type PostType = "edu" | "proof" | "contrarian" | "offer";

export interface Post {
  id: string;
  hook: string;
  body: string;
  type: PostType;
  format: string;
  status: "Draft" | "Posted";
  date: string;
}

export interface MuulState {
  streak: number;
  postedDays: string[];
  lastDay: string;
  foundation: {
    icp: string;
    problems: string;
    headline: string;
    about: string;
    checks: Record<string, boolean>;
  };
  today: { checks: Record<string, boolean>; idea: string };
  posts: Post[];
  ideas: Record<PostType, string>;
  dms: Array<{ id: string; name: string; context: string; date: string }>;
  metrics: Array<{ id: string; week: string; dms: number; views: number; meetings: number }>;
  chat: Array<{ role: "user" | "assistant"; content: string }>;
}

export const TYPES: Record<
  PostType,
  { name: string; full: string; target: number; color: string }
> = {
  edu: { name: "Educate", full: "Educational & Tactical", target: 40, color: "#D4FF00" },
  proof: { name: "Prove", full: "Social Proof & Cases", target: 30, color: "rgba(212,255,0,.6)" },
  contrarian: {
    name: "Provoke",
    full: "Perspective & Contrarian",
    target: 20,
    color: "rgba(212,255,0,.34)",
  },
  offer: { name: "Offer", full: "Direct-Response", target: 10, color: "rgba(212,255,0,.16)" },
};

export const TYPE_KEYS = Object.keys(TYPES) as PostType[];

export const defaultState = (): MuulState => ({
  streak: 0,
  postedDays: [],
  lastDay: "",
  foundation: { icp: "", problems: "", headline: "", about: "", checks: {} },
  today: { checks: {}, idea: "" },
  posts: [],
  ideas: { edu: "", proof: "", contrarian: "", offer: "" },
  dms: [],
  metrics: [],
  chat: [],
});

export const uid = () => Math.random().toString(36).slice(2, 9);

export const DAY = () =>
  new Date().toLocaleDateString("en-CA", { timeZone: "America/Chicago" });

export function computeStreak(postedDays: string[]): number {
  const days = Array.from(new Set(postedDays)).sort().reverse();
  if (!days.length) return 0;
  const today = DAY();
  const yest = new Date(Date.now() - 864e5).toLocaleDateString("en-CA", {
    timeZone: "America/Chicago",
  });
  if (days[0] !== today && days[0] !== yest) return 0;
  let n = 1;
  for (let i = 1; i < days.length; i++) {
    if ((new Date(days[i - 1]).getTime() - new Date(days[i]).getTime()) / 864e5 === 1) n++;
    else break;
  }
  return n;
}

export function mixCounts(posts: Post[]): Record<PostType, number> {
  const c: Record<PostType, number> = { edu: 0, proof: 0, contrarian: 0, offer: 0 };
  posts.filter((p) => p.status === "Posted").forEach((p) => {
    if (c[p.type] !== undefined) c[p.type]++;
  });
  return c;
}

const KEY = "muul-state";

export function loadState(): MuulState {
  const s = defaultState();
  if (typeof window === "undefined") return s;
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) Object.assign(s, JSON.parse(raw));
  } catch {}
  if (!s.postedDays) s.postedDays = [];
  if (s.lastDay !== DAY()) {
    s.today.checks = {};
    s.lastDay = DAY();
  }
  s.streak = computeStreak(s.postedDays);
  return s;
}

export function saveState(s: MuulState) {
  try {
    localStorage.setItem(KEY, JSON.stringify(s));
  } catch {}
}

import { PERSONA } from "./prompts";

export function aiContext(s: MuulState): string {
  const c = mixCounts(s.posts);
  const total = Object.values(c).reduce((a, b) => a + b, 0);
  const drafts =
    s.posts.filter((p) => p.status !== "Posted").map((p) => "- " + p.hook).join("\n") || "(none)";
  return `${PERSONA}

CONTEXT — Marcos's MUUL workspace (LinkedIn B2B content engine):
ICP: ${s.foundation.icp || "(not set)"}
Problems solved: ${s.foundation.problems || "(not set)"}
Headline: ${s.foundation.headline || "(not set)"}
Published mix: ${total} posts (Educate ${c.edu}, Prove ${c.proof}, Provoke ${c.contrarian}, Offer ${c.offer}; targets 40/30/20/10)
Current drafts:
${drafts}
Streak: ${s.streak} days.

MUUL RULES: hook must survive the "...see more" cut (first 2 lines). Human voice, short lines, no corporate polish. Social proof = real stories only, never invented. Marcos has ADHD: TLDR first, keep it punchy. Goal: become the go-to SME for his ICP (Chicago-focused where relevant); content = pipeline, DMs/meetings over likes. Never use emojis.`;
}
