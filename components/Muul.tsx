"use client";

import { useEffect, useRef, useState } from "react";
import {
  MuulState,
  PostType,
  TYPES,
  TYPE_KEYS,
  aiContext,
  computeStreak,
  DAY,
  loadState,
  mixCounts,
  saveState,
  uid,
} from "@/lib/state";
import { prompts } from "@/lib/prompts";

/* ---------- static content ---------- */

const TODAY_STEPS = [
  { k: "warmup", t: "Warm up: comment on 5–10 ICP / peer posts", w: "10–15 min, right before you post. Primes reach + relationships." },
  { k: "publish", t: "Publish today's post", w: "Hook first. Grab it from 03 Batch — or have OLLIN:AI draft it." },
  { k: "replies", t: "Reply to every comment within 2 hours", w: "The algorithm rewards fast dialogue." },
  { k: "dms", t: "DM 1–3 people who engaged — zero pitch, pure curiosity", w: "This is where content becomes pipeline." },
  { k: "log", t: "Log the post in 02 Mix + any DMs in 04 Engage", w: "30 seconds. Keeps the scoreboard honest." },
];

const F_CHECKS = [
  { k: "headline", t: "Headline is a value statement (outcome + who), not a job title" },
  { k: "about", t: "About reads like a landing page: their problem → outcomes → CTA" },
  { k: "cta", t: "CTA exists: book-a-call link or a grabbable resource" },
  { k: "featured", t: "Featured pinned: best posts, lead magnet, case study, booking link" },
  { k: "photo", t: "Photo + banner look like someone a VP would take a call with" },
];

const TYPE_NOTES: Record<PostType, string> = {
  edu: "How-to guides, frameworks, teardowns — solve one micro-problem your ICP has this week.",
  proof: "Anonymized deal stories, transformations, before/after numbers. Real stories only — never invented.",
  contrarian: "Industry observations, mistakes your ICP keeps making, your philosophy. Say what others won't.",
  offer: "Free checklist, template, audit, 'DM me for X'. One in ten posts — keep it rare so it lands.",
};

const DM_TEMPLATES = [
  { name: "Post engager → curiosity", body: "Thanks for checking out the post on [topic], [Name]. Curious — are you running into [problem] at [Company] right now?" },
  { name: "Repeat liker → open door", body: "[Name] — noticed you've engaged with a couple of my posts on [topic]. What's got your attention on it?" },
  { name: "Commenter → deepen", body: "Loved your comment on [point], [Name]. How are you handling that at [Company] today?" },
  { name: "Profile viewer → soft open", body: "[Name], saw you stopped by my profile — happy to connect. What are you focused on at [Company] this quarter?" },
];

const QUICK: Record<string, string> = {
  draft: "Draft today's LinkedIn post for me. Pick the content type my mix needs most, write 2 versions, hook-first, 100-150 words each.",
  hook: "Here's my current draft hook — rewrite the first 2 lines 5 ways: benefit, stat, counter-intuitive, story-opener, blunt truth:\n\n[PASTE OR TYPE YOUR HOOK]",
  news: "What's today's top B2B business news relevant to my ICP? Top 5, one line each + a post angle for each. TLDR first.",
  chicago: "What's happening in Chicago business this week? Top 5 items + a LinkedIn post angle for each that makes me the local SME paying attention. TLDR first.",
  review: "Review my content mix vs the 40/30/20/10 target and my drafts. What should I post next and why? TLDR first, bullets.",
};

/* ---------- component ---------- */

export default function Muul() {
  const [s, setS] = useState<MuulState | null>(null);
  const [toastMsg, setToastMsg] = useState("");
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setS(loadState());
  }, []);

  useEffect(() => {
    if (s) saveState(s);
  }, [s]);

  const toast = (m: string) => {
    setToastMsg(m);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToastMsg(""), 1500);
  };

  const copy = (t: string, m: string) => {
    navigator.clipboard.writeText(t).then(() => toast(m)).catch(() => toast("Copy failed"));
  };

  const up = (fn: (d: MuulState) => void) =>
    setS((prev) => {
      if (!prev) return prev;
      const d: MuulState = JSON.parse(JSON.stringify(prev));
      fn(d);
      return d;
    });

  /* drafts / hook composer local state */
  const [hook, setHook] = useState("");
  const [body, setBody] = useState("");
  const [pType, setPType] = useState<PostType>("edu");
  const [pFormat, setPFormat] = useState("Short-form (100–150 words)");
  const [showPreview, setShowPreview] = useState(false);

  /* DM + metric forms */
  const [dmName, setDmName] = useState("");
  const [dmCtx, setDmCtx] = useState("");
  const [mWeek, setMWeek] = useState("");
  const [mDms, setMDms] = useState(0);
  const [mViews, setMViews] = useState(0);
  const [mMeet, setMMeet] = useState(0);

  /* timer */
  const [timerLeft, setTimerLeft] = useState(0);
  const timerInt = useRef<ReturnType<typeof setInterval> | null>(null);
  const startTimer = (min: number) => {
    stopTimer();
    setTimerLeft(min * 60);
    timerInt.current = setInterval(() => {
      setTimerLeft((t) => {
        if (t <= 1) {
          stopTimer();
          toast("Block done — how many drafts?");
          return 0;
        }
        return t - 1;
      });
    }, 1000);
  };
  const stopTimer = () => {
    if (timerInt.current) clearInterval(timerInt.current);
    timerInt.current = null;
  };
  const fmtTime = (x: number) =>
    String(Math.floor(x / 60)).padStart(2, "0") + ":" + String(x % 60).padStart(2, "0");

  /* companion */
  const [aiOpen, setAiOpen] = useState(false);
  const [aiInput, setAiInput] = useState("");
  const [thinking, setThinking] = useState(false);
  const chatBox = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    if (chatBox.current) chatBox.current.scrollTop = chatBox.current.scrollHeight;
  }, [s?.chat, thinking, aiOpen]);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setAiOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  if (!s) return null;

  /* ---------- actions ---------- */

  const markToday = (d: MuulState) => {
    const day = DAY();
    if (!d.postedDays.includes(day)) d.postedDays.push(day);
    d.streak = computeStreak(d.postedDays);
  };

  const finishDay = () =>
    up((d) => {
      markToday(d);
      toast("Streak " + computeStreak(d.postedDays) + "d — still posting");
    });

  const addPost = () => {
    if (!hook.trim()) {
      toast("Write the hook first");
      return;
    }
    up((d) => {
      d.posts.push({
        id: uid(),
        hook: hook.trim(),
        body: body.trim(),
        type: pType,
        format: pFormat,
        status: "Draft",
        date: new Date().toLocaleDateString(),
      });
    });
    setHook("");
    setBody("");
    setShowPreview(false);
    toast("Draft added");
  };

  const sendAI = async (text?: string) => {
    const q = (text ?? aiInput).trim();
    if (!q || thinking) return;
    setAiInput("");
    const nextChat = [...s.chat, { role: "user" as const, content: q }];
    up((d) => {
      d.chat = nextChat;
    });
    setThinking(true);
    try {
      const r = await fetch("/api/ollin", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ system: aiContext(s), messages: nextChat.slice(-12) }),
      });
      const data = await r.json();
      if (!r.ok) {
        if (data.error === "no_key") {
          const full = aiContext(s) + "\n\n---\nMARCOS ASKS:\n" + q;
          copy(full, "Prompt + context copied — paste to Claude");
          up((d) => {
            d.chat.push({
              role: "assistant",
              content:
                "No server API key set, so I packed your full context + question and copied it to your clipboard. Paste it to Claude, then bring the answer back. To answer inline, set ANTHROPIC_API_KEY in .env.local.",
            });
          });
        } else {
          up((d) => {
            d.chat.push({ role: "assistant", content: "Call failed: " + (data.message || r.status) });
          });
        }
      } else {
        up((d) => {
          d.chat.push({ role: "assistant", content: data.text || "(empty reply)" });
        });
      }
    } catch (e) {
      up((d) => {
        d.chat.push({
          role: "assistant",
          content: "Call failed: " + (e instanceof Error ? e.message : "network error"),
        });
      });
    } finally {
      setThinking(false);
    }
  };

  const aiToDraft = (raw: string) => {
    const lines = raw.split("\n").filter((l) => l.trim());
    up((d) => {
      d.posts.push({
        id: uid(),
        hook: lines.slice(0, 2).join("\n") || "OLLIN:AI draft",
        body: raw,
        type: "edu",
        format: "Short-form (100–150 words)",
        status: "Draft",
        date: new Date().toLocaleDateString(),
      });
    });
    toast("Saved to 03 Batch");
  };

  const exportData = () => {
    const blob = new Blob([JSON.stringify(s, null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "muul-data.json";
    a.click();
    toast("Exported");
  };

  const importData = (ev: React.ChangeEvent<HTMLInputElement>) => {
    const f = ev.target.files?.[0];
    if (!f) return;
    const r = new FileReader();
    r.onload = (e) => {
      try {
        const d = JSON.parse(String(e.target?.result));
        setS((prev) => ({ ...(prev as MuulState), ...d }));
        toast("Imported");
      } catch {
        toast("Couldn't read that file");
      }
    };
    r.readAsText(f);
  };

  /* ---------- derived ---------- */
  const doneToday = TODAY_STEPS.filter((x) => s.today.checks[x.k]).length;
  const todayPct = Math.round((doneToday / TODAY_STEPS.length) * 100);
  const counts = mixCounts(s.posts);
  const mixTotal = Object.values(counts).reduce((a, b) => a + b, 0);
  const pct = (k: PostType) => (mixTotal ? Math.round((counts[k] / mixTotal) * 100) : 0);
  const drafts = s.posts.filter((p) => p.status !== "Posted");
  const posted = s.posts.filter((p) => p.status === "Posted");
  const tot = s.metrics.reduce(
    (a, m) => ({ dms: a.dms + +m.dms, views: a.views + +m.views, meetings: a.meetings + +m.meetings }),
    { dms: 0, views: 0, meetings: 0 }
  );

  /* ---------- small renderers ---------- */

  const Rail = ({ no, title, note }: { no: string; title: string; note?: string }) => (
    <div className="rail">
      <div className="inner">
        <div className="no">{no}</div>
        <div className="rt">
          {title}
          {note ? (
            <>
              <br />
              <span style={{ color: "var(--dim)" }}>{note}</span>
            </>
          ) : null}
        </div>
      </div>
    </div>
  );

  const PostItem = ({ p }: { p: (typeof s.posts)[number] }) => {
    const t = TYPES[p.type] || TYPES.edu;
    return (
      <div className="post-item">
        <div className="hook">{p.hook}</div>
        <div className="meta">
          <span className="pill volt">{t.name}</span>
          <span>{p.format}</span>
          <span>{p.date}</span>
          {p.status !== "Posted" ? (
            <>
              <button
                className="btn"
                style={{ padding: "8px 13px" }}
                onClick={() =>
                  up((d) => {
                    const x = d.posts.find((q) => q.id === p.id);
                    if (x) {
                      x.status = "Posted";
                      x.date = new Date().toLocaleDateString();
                    }
                    markToday(d);
                    toast("Posted — mix updated");
                  })
                }
              >
                Mark posted
              </button>
              <button
                className="btn ghost"
                style={{ padding: "8px 13px" }}
                onClick={() => copy(p.hook + "\n\n" + (p.body || ""), "Post copied")}
              >
                Copy
              </button>
              <button
                className="btn x"
                onClick={() => up((d) => void (d.posts = d.posts.filter((q) => q.id !== p.id)))}
              >
                ✕
              </button>
            </>
          ) : (
            <button
              className="btn ghost"
              style={{ padding: "8px 13px" }}
              onClick={() => copy(p.hook + "\n\n" + (p.body || ""), "Post copied")}
            >
              Copy
            </button>
          )}
        </div>
      </div>
    );
  };

  /* ---------- render ---------- */

  return (
    <>
      <div className="masthead">
        <div className="mrow">
          <div className="mword">
            MUUL<i>.</i>
          </div>
          <div className="mnav">
            <a href="#today">Today</a>
            <a href="#foundation">01</a>
            <a href="#mix">02</a>
            <a href="#batch">03</a>
            <a href="#engage">04</a>
            <a href="#score">05</a>
          </div>
          <button className="streak" onClick={finishDay}>
            Streak {s.streak}d
          </button>
        </div>
      </div>

      <div className="page">
        <div className="hero">
          <div className="kicker">
            <span className="mono">Ollin : Systems</span>
            <span className="rule"></span>
            <span className="mono">Vol. 01 · The Gatherer</span>
            <span className="rule"></span>
            <span className="mono">Content = Pipeline</span>
          </div>
          <h1>
            Post <span className="top">like</span>
            <br />
            you <span className="hl">mean</span> it<span className="v">.</span>
          </h1>
          <div className="deck">
            <div className="standfirst">
              Show up on the feed — consistently, without the dread. One post. One routine. Every
              day. <em>MUUL keeps the streak honest.</em>
            </div>
            <p>
              <b>The logic:</b> content is an organic extension of your sales pipeline — never a
              vanity exercise. Five numbered moves, top to bottom on this page. <b>OLLIN:AI</b>{" "}
              rides in the corner the whole way — drafting, fixing hooks, answering questions.
            </p>
          </div>
        </div>
      </div>

      {/* 00 TODAY */}
      <section id="today">
        <div className="page">
          <div className="sec">
            <Rail no="00" title="Today's run" note="daily ritual" />
            <div className="content">
              <h2>
                The daily run<span className="v">.</span>
              </h2>
              <p className="lede">
                The whole system in five moves. Do them in order.{" "}
                <strong>
                  {doneToday} of {TODAY_STEPS.length} done today.
                </strong>
              </p>
              <div className="progress-outer">
                <div className="progress-inner" style={{ width: `${todayPct}%` }} />
              </div>
              <div>
                {TODAY_STEPS.map((step) => (
                  <div
                    key={step.k}
                    className={"check" + (s.today.checks[step.k] ? " done" : "")}
                    onClick={() =>
                      up((d) => void (d.today.checks[step.k] = !d.today.checks[step.k]))
                    }
                  >
                    <input type="checkbox" readOnly checked={!!s.today.checks[step.k]} />
                    <div>
                      <div className="txt">{step.t}</div>
                      <div className="why">{step.w}</div>
                    </div>
                  </div>
                ))}
              </div>
              <div className="row" style={{ marginTop: 22 }}>
                <button className="btn" onClick={finishDay}>
                  Posted → count it
                </button>
                <button className="btn ghost" onClick={() => up((d) => void (d.today.checks = {}))}>
                  Reset for tomorrow
                </button>
              </div>
              <div className="blk" style={{ marginTop: 44, borderBottom: "1px solid var(--border)" }}>
                <div className="bh">
                  <h3>Gather an idea</h3>
                  <span className="mono">quick capture</span>
                </div>
                <textarea
                  value={s.today.idea}
                  onChange={(e) => up((d) => void (d.today.idea = e.target.value))}
                  placeholder="Saw something? Heard something on a call? Dump it before it evaporates…"
                />
                <div className="row" style={{ marginTop: 12 }}>
                  <button
                    className="btn ghost"
                    onClick={() => {
                      const v = s.today.idea.trim();
                      if (!v) {
                        toast("Nothing to send");
                        return;
                      }
                      up((d) => {
                        d.posts.push({
                          id: uid(),
                          hook: v.split("\n")[0],
                          body: v,
                          type: "edu",
                          format: "Short-form (100–150 words)",
                          status: "Draft",
                          date: new Date().toLocaleDateString(),
                        });
                        d.today.idea = "";
                      });
                      toast("Draft created in 03 Batch");
                    }}
                  >
                    → Draft in 03
                  </button>
                  <button
                    className="btn ai"
                    onClick={() => {
                      const v = s.today.idea.trim();
                      if (!v) {
                        toast("Write the idea first");
                        return;
                      }
                      setAiOpen(true);
                      setAiInput("Turn this idea into a LinkedIn post (2 versions, hook-first): " + v);
                    }}
                  >
                    Ask OLLIN:AI to write it
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 01 FOUNDATION */}
      <section id="foundation">
        <div className="page">
          <div className="sec">
            <Rail no="01" title="Foundation" note="positioning & profile" />
            <div className="content">
              <h2>
                Your profile is the
                <br />
                landing page<span className="v">.</span>
              </h2>
              <p className="lede">
                Before posting: a profile built for your exact ICP. Every post you ever publish
                drives here — <strong>make it convert.</strong>
              </p>
              <div className="blk">
                <div className="bh">
                  <h3>Who am I talking to</h3>
                  <span className="pill solid">ICP</span>
                </div>
                <span className="lab">My ICP — titles · industry · company size</span>
                <input
                  type="text"
                  value={s.foundation.icp}
                  onChange={(e) => up((d) => void (d.foundation.icp = e.target.value))}
                  placeholder="e.g., VPs of Sales & IT Directors at mid-market B2B companies in Chicago"
                />
                <span className="lab">The 2–3 core problems I solve for them</span>
                <textarea
                  value={s.foundation.problems}
                  onChange={(e) => up((d) => void (d.foundation.problems = e.target.value))}
                  placeholder={"1. Deal cycles too long\n2. Team can't scale delivery"}
                />
              </div>
              <div className="blk">
                <div className="bh">
                  <h3>Headline builder</h3>
                </div>
                <div className="pull" style={{ marginBottom: 18 }}>
                  Helping <i>[ICP]</i> achieve <i>[outcome]</i> | <i>[Role]</i> @ <i>[Company]</i>
                </div>
                <span className="lab">My headline</span>
                <input
                  type="text"
                  value={s.foundation.headline}
                  onChange={(e) => up((d) => void (d.foundation.headline = e.target.value))}
                  placeholder="Helping ___ achieve ___ | ___ @ ___"
                />
                <span className="lab">About draft — their problems → outcomes delivered → CTA</span>
                <textarea
                  style={{ minHeight: 120 }}
                  value={s.foundation.about}
                  onChange={(e) => up((d) => void (d.foundation.about = e.target.value))}
                  placeholder="You're a VP of Sales and your pipeline is…"
                />
                <div className="row" style={{ marginTop: 14 }}>
                  <button
                    className="btn ghost"
                    onClick={() =>
                      copy(
                        "HEADLINE:\n" + s.foundation.headline + "\n\nABOUT:\n" + s.foundation.about,
                        "Copied — paste into LinkedIn"
                      )
                    }
                  >
                    Copy headline + about
                  </button>
                  <button
                    className="btn ai"
                    onClick={() => {
                      setAiOpen(true);
                      setAiInput(
                        "Help me write my LinkedIn headline and About section. Draft 3 headline options and a full About draft based on my ICP and problems."
                      );
                    }}
                  >
                    Ask OLLIN:AI to write these
                  </button>
                </div>
              </div>
              <div className="blk">
                <div className="bh">
                  <h3>Profile checklist</h3>
                </div>
                {F_CHECKS.map((c) => (
                  <div
                    key={c.k}
                    className={"check" + (s.foundation.checks[c.k] ? " done" : "")}
                    onClick={() =>
                      up((d) => void (d.foundation.checks[c.k] = !d.foundation.checks[c.k]))
                    }
                  >
                    <input type="checkbox" readOnly checked={!!s.foundation.checks[c.k]} />
                    <div className="txt">{c.t}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 02 MIX */}
      <section id="mix">
        <div className="page">
          <div className="sec">
            <Rail no="02" title="The Mix" note="40 / 30 / 20 / 10" />
            <div className="content">
              <h2>
                Four parts,
                <br />
                one voice<span className="v">.</span>
              </h2>
              <p className="lede">
                Authority + pipeline come from balance:{" "}
                <strong>40 educate · 30 prove · 20 provoke · 10 offer.</strong> Your published
                posts, measured against it:
              </p>
              <div className="mixbar">
                {mixTotal
                  ? TYPE_KEYS.map((k) => (
                      <div
                        key={k}
                        style={{ width: `${pct(k)}%`, background: TYPES[k].color }}
                        title={`${TYPES[k].full}: ${pct(k)}%`}
                      />
                    ))
                  : null}
              </div>
              <div className="legend">
                {TYPE_KEYS.map((k) => (
                  <span key={k}>
                    <span className="dot" style={{ background: TYPES[k].color }} />
                    {TYPES[k].name}: <b>{pct(k)}%</b>{" "}
                    <span style={{ color: "var(--dim)" }}>/ {TYPES[k].target}</span>
                  </span>
                ))}
              </div>
              {mixTotal === 0 && (
                <div className="note">Mark posts &quot;Posted&quot; in 03 Batch and the real mix shows here.</div>
              )}
              <div style={{ marginTop: 34 }}>
                {TYPE_KEYS.map((k) => (
                  <div className="blk" key={k}>
                    <div className="bh">
                      <h3>{TYPES[k].full}</h3>
                      <span className="pill volt">{TYPES[k].target}%</span>
                    </div>
                    <div className="note" style={{ margin: "0 0 6px" }}>
                      {TYPE_NOTES[k]}
                    </div>
                    <span className="lab">Idea bank</span>
                    <textarea
                      value={s.ideas[k]}
                      onChange={(e) => up((d) => void (d.ideas[k] = e.target.value))}
                      placeholder="Stack ideas here…"
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 03 BATCH */}
      <section id="batch">
        <div className="page">
          <div className="sec">
            <Rail no="03" title="Batch Studio" note="60–90 min · weekly" />
            <div className="content">
              <h2>
                Draft weekly,
                <br />
                post daily<span className="v">.</span>
              </h2>
              <p className="lede">
                One 60–90 minute block per week → <strong>3–5 posts drafted.</strong> No daily
                brainstorming, ever. That&apos;s how the streak survives.
              </p>
              <div className="row" style={{ marginBottom: 30 }}>
                <div className="timer">{fmtTime(timerLeft)}</div>
                <button className="btn" onClick={() => startTimer(60)}>
                  60 min
                </button>
                <button className="btn" onClick={() => startTimer(90)}>
                  90 min
                </button>
                <button className="btn ghost" onClick={stopTimer}>
                  Stop
                </button>
                <span className="mono">goal: 3–5 drafts · hooks first, polish later</span>
              </div>
              <div className="blk">
                <div className="bh">
                  <h3>New draft</h3>
                </div>
                <span className="lab">
                  Hook — first 2 lines, before &quot;…see more&quot; · benefit, stat, or counter-intuitive
                </span>
                <textarea
                  value={hook}
                  onChange={(e) => setHook(e.target.value)}
                  placeholder={"Most VPs of Sales review pipeline weekly.\nIt's exactly why their forecasts miss."}
                />
                {showPreview && hook.trim() && (
                  <div className="hookpreview">
                    {hook.split("\n").slice(0, 2).map((l, i) => (
                      <span key={i}>
                        {l}
                        <br />
                      </span>
                    ))}
                    <span className="seemore">…see more</span>
                  </div>
                )}
                <div className="row" style={{ marginTop: 8 }}>
                  <button className="btn ghost" onClick={() => setShowPreview((v) => !v)}>
                    {showPreview ? "Hide preview" : "Preview the cut-off"}
                  </button>
                </div>
                <span className="lab">Body</span>
                <textarea
                  style={{ minHeight: 110 }}
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  placeholder="Rest of the post…"
                />
                <div className="grid2">
                  <div>
                    <span className="lab">Content type</span>
                    <select value={pType} onChange={(e) => setPType(e.target.value as PostType)}>
                      {TYPE_KEYS.map((k) => (
                        <option key={k} value={k}>
                          {TYPES[k].full} ({TYPES[k].target}%)
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <span className="lab">Format</span>
                    <select value={pFormat} onChange={(e) => setPFormat(e.target.value)}>
                      <option>Short-form (100–150 words)</option>
                      <option>Long-form (250–400 words)</option>
                      <option>PDF carousel / document</option>
                      <option>Image + text</option>
                    </select>
                  </div>
                </div>
                <div className="row" style={{ marginTop: 16 }}>
                  <button className="btn" onClick={addPost}>
                    + Add draft
                  </button>
                </div>
              </div>
              <div className="blk">
                <div className="bh">
                  <h3>Drafts</h3>
                  <span className="pill dim">{drafts.length}</span>
                </div>
                {drafts.length ? (
                  drafts.map((p) => <PostItem key={p.id} p={p} />)
                ) : (
                  <div className="note">No drafts yet. That focus block is calling.</div>
                )}
              </div>
              <div className="blk">
                <div className="bh">
                  <h3>Published</h3>
                  <span className="pill solid">{posted.length}</span>
                </div>
                {posted.length ? (
                  posted.map((p) => <PostItem key={p.id} p={p} />)
                ) : (
                  <div className="note">
                    Mark a draft Posted when it goes live — it feeds your Mix + streak.
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 04 ENGAGE */}
      <section id="engage">
        <div className="page">
          <div className="sec">
            <Rail no="04" title="Engage" note="zero pitch · pure curiosity" />
            <div className="content">
              <h2>
                Comments are
                <br />
                currency<span className="v">.</span>
              </h2>
              <p className="lede">
                Publishing is half the job. <strong>Conversations are the other half.</strong> The
                first DM never pitches — it opens a door. The pipeline walks through later.
              </p>
              <div className="blk">
                <div className="bh">
                  <h3>DM transition scripts</h3>
                </div>
                {DM_TEMPLATES.map((t, i) => (
                  <div className="post-item" key={i}>
                    <div className="mono" style={{ marginBottom: 6 }}>
                      {t.name}
                    </div>
                    <div style={{ fontSize: 14, color: "var(--body)" }}>{t.body}</div>
                    <div className="meta">
                      <button
                        className="btn ghost"
                        style={{ padding: "8px 13px" }}
                        onClick={() => copy(t.body, "Script copied — personalize it")}
                      >
                        Copy
                      </button>
                    </div>
                  </div>
                ))}
              </div>
              <div className="blk">
                <div className="bh">
                  <h3>Conversation log</h3>
                  <span className="mono">this is the number that matters</span>
                </div>
                <div className="grid2">
                  <div>
                    <span className="lab">Name / company</span>
                    <input
                      type="text"
                      value={dmName}
                      onChange={(e) => setDmName(e.target.value)}
                      placeholder="Sarah K — Acme Corp"
                    />
                  </div>
                  <div>
                    <span className="lab">Context / next step</span>
                    <input
                      type="text"
                      value={dmCtx}
                      onChange={(e) => setDmCtx(e.target.value)}
                      placeholder="Engaged on pipeline post → asked about Q4 process"
                    />
                  </div>
                </div>
                <div className="row" style={{ marginTop: 14 }}>
                  <button
                    className="btn"
                    onClick={() => {
                      if (!dmName.trim()) {
                        toast("Add a name");
                        return;
                      }
                      up((d) =>
                        void d.dms.unshift({
                          id: uid(),
                          name: dmName.trim(),
                          context: dmCtx.trim(),
                          date: new Date().toLocaleDateString(),
                        })
                      );
                      setDmName("");
                      setDmCtx("");
                      toast("Logged");
                    }}
                  >
                    + Log conversation
                  </button>
                </div>
                {s.dms.length > 0 && (
                  <table>
                    <thead>
                      <tr>
                        <th>Who</th>
                        <th>Context / next step</th>
                        <th>Date</th>
                        <th></th>
                      </tr>
                    </thead>
                    <tbody>
                      {s.dms.map((dm) => (
                        <tr key={dm.id}>
                          <td style={{ color: "var(--white)", fontWeight: 700 }}>{dm.name}</td>
                          <td>{dm.context}</td>
                          <td style={{ color: "var(--dim)" }}>{dm.date}</td>
                          <td>
                            <button
                              className="btn x"
                              onClick={() =>
                                up((d) => void (d.dms = d.dms.filter((x) => x.id !== dm.id)))
                              }
                            >
                              ✕
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 05 SCORE */}
      <section id="score">
        <div className="page">
          <div className="sec">
            <Rail no="05" title="Scoreboard" note="conversion > vanity" />
            <div className="content">
              <h2>
                Impressions
                <br />
                don&apos;t pay<span className="v">.</span>
              </h2>
              <p className="lede">
                These three numbers do. <strong>We cheer the reps, not the likes.</strong>
              </p>
              <div className="statgrid">
                <div className="stat">
                  <div className="big">{tot.dms}</div>
                  <div className="mono" style={{ marginTop: 10 }}>
                    Inbound ICP DMs
                  </div>
                </div>
                <div className="stat">
                  <div className="big">{tot.views}</div>
                  <div className="mono" style={{ marginTop: 10 }}>
                    ICP profile views
                  </div>
                </div>
                <div className="stat">
                  <div className="big" style={{ color: "var(--volt)" }}>
                    {tot.meetings}
                  </div>
                  <div className="mono" style={{ marginTop: 10 }}>
                    Meetings booked
                  </div>
                </div>
              </div>
              <div className="blk" style={{ marginTop: 34 }}>
                <div className="bh">
                  <h3>Log this week</h3>
                </div>
                <div className="row">
                  <div style={{ flex: 1, minWidth: 110 }}>
                    <span className="lab">Week of</span>
                    <input type="text" value={mWeek} onChange={(e) => setMWeek(e.target.value)} placeholder="Aug 11" />
                  </div>
                  <div style={{ flex: 1, minWidth: 100 }}>
                    <span className="lab">Inbound DMs</span>
                    <input type="number" min={0} value={mDms} onChange={(e) => setMDms(+e.target.value || 0)} />
                  </div>
                  <div style={{ flex: 1, minWidth: 100 }}>
                    <span className="lab">ICP views</span>
                    <input type="number" min={0} value={mViews} onChange={(e) => setMViews(+e.target.value || 0)} />
                  </div>
                  <div style={{ flex: 1, minWidth: 100 }}>
                    <span className="lab">Meetings</span>
                    <input type="number" min={0} value={mMeet} onChange={(e) => setMMeet(+e.target.value || 0)} />
                  </div>
                </div>
                <div className="row" style={{ marginTop: 14 }}>
                  <button
                    className="btn"
                    onClick={() => {
                      up((d) =>
                        void d.metrics.unshift({
                          id: uid(),
                          week: mWeek.trim() || "Week",
                          dms: mDms,
                          views: mViews,
                          meetings: mMeet,
                        })
                      );
                      setMWeek("");
                      setMDms(0);
                      setMViews(0);
                      setMMeet(0);
                      toast("Logged");
                    }}
                  >
                    + Add week
                  </button>
                </div>
                {s.metrics.length > 0 && (
                  <table>
                    <thead>
                      <tr>
                        <th>Week</th>
                        <th>DMs</th>
                        <th>Views</th>
                        <th>Meetings</th>
                        <th></th>
                      </tr>
                    </thead>
                    <tbody>
                      {s.metrics.map((m) => (
                        <tr key={m.id}>
                          <td style={{ color: "var(--white)", fontWeight: 700 }}>{m.week}</td>
                          <td>{m.dms}</td>
                          <td>{m.views}</td>
                          <td>{m.meetings}</td>
                          <td>
                            <button
                              className="btn x"
                              onClick={() =>
                                up((d) => void (d.metrics = d.metrics.filter((x) => x.id !== m.id)))
                              }
                            >
                              ✕
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
              <div className="blk">
                <div className="bh">
                  <h3>Monthly review ritual</h3>
                </div>
                <div className="pull" style={{ marginBottom: 14 }}>
                  Find the top 20%. Do more of that.{" "}
                  <i>Kill what didn&apos;t convert — even if it got likes.</i>
                </div>
                <div className="note" style={{ fontSize: 13.5, color: "var(--body)" }}>
                  1 · Pull your top 20% posts by DMs + ICP comments.&nbsp;&nbsp; 2 · Note shared
                  topics + formats.&nbsp;&nbsp; 3 · Rebuild next month&apos;s idea banks (02) around
                  those patterns.
                  <br />
                  <br />
                  <span className="mono" style={{ color: "var(--volt)" }}>
                    ◆ Or hit &quot;Review my mix&quot; in OLLIN:AI and do it together.
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <footer>
        <div className="frow">
          <button className="btn ghost" onClick={exportData}>
            Export data
          </button>
          <label className="btn ghost" style={{ cursor: "pointer" }}>
            Import data
            <input type="file" accept=".json" style={{ display: "none" }} onChange={importData} />
          </label>
        </div>
        <div className="mono" style={{ marginTop: 22 }}>
          Ollin : MUUL · Vol. 01
          <br />
          Data saved in this browser. Export for backup.
          <br />
          Life in black &amp; white. AI in color.
        </div>
      </footer>

      {/* OLLIN:AI companion */}
      <div className={"scrim" + (aiOpen ? " on" : "")} onClick={() => setAiOpen(false)} />
      <button className="ailaunch" onClick={() => setAiOpen(true)}>
        <span className="ph">Ask OLLIN:AI</span>
        <span className="go">→</span>
      </button>
      <div className={"drawer" + (aiOpen ? " open" : "")} role="dialog" aria-label="OLLIN:AI">
        <div className="dhead">
          <span className="guide">Your guide</span>
          <span className="t">OLLIN:AI</span>
          <button className="close" onClick={() => setAiOpen(false)}>
            Esc
          </button>
        </div>
        <div className="dchat" ref={chatBox}>
          <div className="msg ai">
            <div className="tagai">Ollin</div>
            I&apos;m here. I know your ICP, your drafts, and your mix. Ask in plain language, or hit
            a quick action — I&apos;ll draft posts, fix hooks, and answer questions.
          </div>
          {s.chat.map((m, i) => (
            <div key={i} className={"msg " + (m.role === "user" ? "user" : "ai")}>
              {m.role === "assistant" && <div className="tagai">Ollin</div>}
              {m.content}
              {m.role === "assistant" && (
                <div className="useit">
                  <button
                    className="btn ghost"
                    style={{ padding: "8px 13px" }}
                    onClick={() => aiToDraft(m.content)}
                  >
                    → Save as draft
                  </button>
                  <button
                    className="btn ghost"
                    style={{ padding: "8px 13px" }}
                    onClick={() => copy(m.content, "Copied")}
                  >
                    Copy
                  </button>
                </div>
              )}
            </div>
          ))}
          {thinking && (
            <div className="msg ai">
              <div className="thinking">OLLIN:AI is thinking…</div>
            </div>
          )}
        </div>
        <div className="quick">
          {Object.entries({
            draft: "Draft today's post",
            hook: "Fix my hook",
            news: "News fuel",
            chicago: "Chicago angle",
            review: "Review my mix",
          }).map(([k, label]) => (
            <button key={k} onClick={() => sendAI(QUICK[k])}>
              {label}
            </button>
          ))}
          <button
            onClick={() => {
              const latest = [...s.posts].reverse().find((p) => p.status !== "Posted");
              if (!latest) {
                toast("No draft to grade — write one in 03 Batch");
                return;
              }
              sendAI(prompts.grade(latest.hook + "\n\n" + (latest.body || "")));
            }}
          >
            Grade my draft
          </button>
          <button onClick={() => sendAI(prompts.recap(s.today.idea))}>Friday recap</button>
        </div>
        <div className="dinput">
          <div className="pillbar">
            <input
              type="text"
              value={aiInput}
              onChange={(e) => setAiInput(e.target.value)}
              placeholder="Ask OLLIN:AI"
              aria-label="Ask OLLIN:AI"
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  sendAI();
                }
              }}
            />
            <button className="micbtn" aria-label="Voice input" onClick={() => toast("Voice coming soon")}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <rect x="9" y="2" width="6" height="12" rx="3" />
                <path d="M5 10a7 7 0 0 0 14 0" />
                <line x1="12" y1="19" x2="12" y2="22" />
              </svg>
            </button>
            <button className="sendbtn" aria-label="Send" onClick={() => sendAI()}>
              →
            </button>
          </div>
        </div>
      </div>

      <div className={"toast" + (toastMsg ? " show" : "")}>{toastMsg}</div>
    </>
  );
}
