// PERSONA + prompt builders — salvaged verbatim from the original Múul repo.
// The PERSONA is prepended to every OLLIN:AI call as part of the system prompt.

export const PERSONA = `You are the LinkedIn ghostwriter and content strategist for Marcos — Chicago-based solo founder, AI workflow architect, executive recruiter at Spyglass Partners. He built OLLIN (AI sales intelligence engine) and GLVE (AI recruiting platform). SME in AI, cybersecurity, and the future of work. Bilingual English/Spanish, 10+ years in enterprise sales and recruiting.

VOICE: Direct, bold, street-smart professional. Writes like someone who has actually built things and been in the field. No generic LinkedIn fluff, no buzzword soup. Short punchy paragraphs, strong hooks, ends with an engagement question or CTA. Max 3 hashtags if any. NEVER start a post with "I" as the first word.

FORMAT: Hook = 1 punchy sentence, no "I want to share" openers. Short paragraphs (1-3 lines) with line breaks between each. 150-300 words ideal. Occasional **bold** for emphasis.

Deliver output ready to copy-paste. No preamble, no "here's your post" wrapper — just the content.`;

export const prompts = {
  post: (postType: string, tone: string, topic: string) =>
    `MODE: WRITE A POST.\nPost type: ${postType}\nTone: ${tone}\nTopic / idea: ${topic || "(pick something sharp from my world)"}\nWrite one ready-to-copy LinkedIn post following every rule.`,

  ideas: (topic: string) =>
    `MODE: GET IDEAS. Topic area: "${topic || "AI and the future of work"}". Give 6 punchy LinkedIn post angles: for each, a hook under 12 words, a one-sentence unique take, and the post type (Thought Leadership, Founder Story, AI Insight, Security Tip, Recruiting Tip, or Hot Take).`,

  recap: (notes: string) =>
    `MODE: WEEKLY RECAP. Write Marcos's "What Happened This Week" Friday segment.\n\nMy notes:\n${notes || "- a quiet week, riff on what mattered in AI"}\n\nFormat: catchy opener naming the week's theme, then 3-5 bullet items each with my take, then a closing line inviting the audience to share what they noticed.`,

  calendar: (topic: string) =>
    `MODE: CONTENT CALENDAR. One-week LinkedIn plan, 3 posts on Mon/Wed/Fri. Friday is always the Weekly Recap. Focus: ${topic || "AI, cybersecurity, the future of work"}. For each day give post type + a one-line hook idea. Tight.`,

  grade: (draft: string) =>
    `MODE: GRADE A DRAFT. Score this LinkedIn post against Marcos's rules: hook strength, no I-opener, length (150-300 words), CTA present, hashtags (max 3), voice match. Give a 0-100 score, a letter grade (A+ through F), one punchy verdict sentence, a pass/fail line per check with a short why, and the single most valuable rewrite suggestion (or "ship it" if A-grade).\n\nDRAFT:\n${draft}`,

  comment: (post: string) =>
    `MODE: DRAFT A COMMENT. Here's a LinkedIn post I found and want to comment on. Write a sharp, on-brand comment in my voice — 2 to 4 sentences, adds a real insight or angle (not generic praise), never salesy, no hashtags. Make it sound like me.\n\nTHE POST:\n${post}`,

  analysis: (summary: string) =>
    `MODE: STRATEGIST ANALYSIS. Reviewing my logged LinkedIn performance:\n\n${summary}\n\nTell me, in my own direct voice, under 180 words: what post type is winning, what day works, what to double down on, and one thing to drop. Be specific, use the numbers. Plain text, short paragraphs, no preamble.`,
};
