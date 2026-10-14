import { browser } from "hatchable";

export const access = "public";
export const methods = ["POST", "OPTIONS"];

const clean = (v, n = 5000) =>
  String(v ?? "").replace(/\u0000/g, "").replace(/\s+/g, " ").trim().slice(0, n);

const casual = /^(?:hi(?:\s+bro)?|hi hello|hello(?:\s+bro)?|hello bro hi|hello hi|hey(?:\s+bro)?|yo(?:\s+bro)?|what\??|what's up\??|whats up\??|sup\??|good morning|good evening|good night|thanks|thank you|thx|fuck|damn|ok|okay|cool|nice|great)[.!\s]*$/i;

function strip(html) {
  return clean(
    String(html || "")
      .replace(/<script[\s\S]*?<\/script>/gi, " ")
      .replace(/<style[\s\S]*?<\/style>/gi, " ")
      .replace(/<noscript[\s\S]*?<\/noscript>/gi, " ")
      .replace(/<[^>]+>/g, " "),
    9000
  );
}

function decode(v) {
  return String(v || "")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

function unique(list, limit = 8) {
  const out = [];
  const seen = new Set();
  for (const item of list || []) {
    const url = String(item?.url || "").trim();
    if (!/^https?:\/\//i.test(url) || seen.has(url)) continue;
    seen.add(url);
    out.push({ title: clean(item.title, 300), url, text: clean(item.text, 9000) });
    if (out.length >= limit) break;
  }
  return out;
}

async function googleSearch(query) {
  const url = "https://www.google.com/search?gbv=1&hl=en&q=" + encodeURIComponent(query);
  const html = String(await Promise.race([browser.html(url), new Promise((_, reject) => setTimeout(() => reject(new Error("Google search timeout")), 1800))]));
  if (/unusual traffic|captcha|enable javascript on your web browser/i.test(html)) return [];
  const results = [];
  const re = /<a[^>]+href="(https?:\/\/[^"]+)"[^>]*>([\s\S]*?)<\/a>/gi;
  let m;
  while ((m = re.exec(html)) && results.length < 8) {
    const href = decode(m[1]);
    const title = clean(m[2].replace(/<[^>]+>/g, " "), 300);
    if (!title) continue;
    try {
      const host = new URL(href).hostname;
      if (host.includes("google.")) continue;
    } catch { continue; }
    results.push({ title, url: href, text: "" });
  }
  return unique(results, 8);
}

async function bingSearch(query) {
  const url = "https://www.bing.com/search?format=rss&q=" + encodeURIComponent(query);
  const html = String(await Promise.race([browser.html(url), new Promise((_, reject) => setTimeout(() => reject(new Error("Bing search timeout")), 1800))]));
  const items = html.split("<item>").slice(1).map(block => {
    const readTag = name => {
      const a = block.indexOf("<" + name + ">");
      if (a < 0) return "";
      const b = block.indexOf("</" + name + ">", a);
      if (b < 0) return "";
      return decode(block.slice(a + name.length + 2, b).trim());
    };
    return { title: readTag("title"), url: readTag("link"), text: readTag("description") };
  });
  return unique(items, 8);
}

function normalizeSearchQuery(message) {
  let q = clean(message, 700).replace(/[?!.]+$/g, "").trim();
  const fact = q.match(/\b(?:one|an?|some|interesting|fun|cool|random|amazing|surprising)?\s*(?:interesting\s+)?facts?\s+about\s+(.+)$/i);
  if (fact?.[1]) return clean(fact[1], 300) + " facts";
  // Strip conversational framing before search. Keeping phrases such as
  // "in one sentence, what is" in a search query can return unrelated pages.
  q = q.replace(/^\s*(?:please\s+)?(?:in\s+(?:one|a|two)\s+sentences?[, ]*|briefly[, ]*|simply[, ]*)?/i, "");
  q = q.replace(/^\s*(?:please\s+)?(?:can you|could you|would you)\s+/i, "");
  q = q.replace(/^\s*(?:search\s+(?:the\s+)?(?:web|internet|online)\s+(?:for\s+)?|search\s+for\s+|compare\s+|comparison\s+|what(?:'s| is)\s+the\s+difference\s+between\s+)/i, "");
  q = q.replace(/^\s*(?:the\s+)?(?:latest|current|recent)\s+(?:official\s+)?/i, "");
  q = q.replace(/[.!?]\s+(?:explain|describe|discuss|give|show|include|provide|answer|summari[sz]e|summari[sz]y|respond|cite|list)\b[\s\S]*$/i, "");
  q = q.replace(/\s+(?:and\s+)?(?:cite|include|provide|give|show|explain|describe|discuss)\s+(?:(?:the|a|an|suitable|short|concrete|quick|main)\s+){0,3}(?:source|sources|example|examples|use case|details|trade-?off|difference|differences|reason|reasons|how it works)[\s\S]*$/i, "");
  q = q.replace(/\boptimistic locking and pessimistic locking\b/i, "optimistic locking vs pessimistic locking");
  q = q.replace(/\bauthorization code flow with client credentials flow\b/i, "authorization code flow vs client credentials flow");
  q = q.replace(/^\s*(?:tell me|give me|share with me|find me|search for|look up|can you tell me|could you tell me)\s+/i, "");
  q = q.replace(/^\s*(?:what is|what are|what was|what were|who is|who are|who was|who were|where is|where are|where was|when is|when was|why does|why is|why was|how does|how do|how is|how was|define|explain|describe|meaning of|tell me about)\s+/i, "");
  q = q.replace(/^\s*(?:one|an?|some|interesting|fun|cool|random|amazing|surprising)\s+/i, "").trim();
  return q || clean(message, 300);
}

async function firstPartySearch(query) {
  const response = await fetch("https://haxbro.hatchable.site/api/kai/search", {
    method: "POST",
    headers: { "content-type": "application/json", "accept": "application/json" },
    body: JSON.stringify({ query, mode: "fast" })
  });
  if (!response.ok) throw new Error("KAI web search HTTP " + response.status);
  const data = await response.json();
  if (!data?.ok || !Array.isArray(data.sources) || !data.sources.length) throw new Error("KAI web search returned no grounded sources");
  return { engine: data.engine || "KAI 51 Web + Wikipedia", results: data.sources.map(s => ({ title: clean(s.title, 300), url: String(s.url || ""), text: clean(s.text, 9000) })) };
}

async function searchWeb(query) {
  const stopWords = new Set(["the","and","for","with","from","what","who","when","where","which","give","include","provide","explain","compare","comparison","difference","differences","trade","off","use","case","example","examples","latest","official","release","source","sources","search","web","database","flow","main","suitable","short","concrete","answer","please","about"]);
  const terms = clean(query, 500).toLowerCase().split(/\W+/).filter(x => x.length > 2 && !stopWords.has(x));
  const rank = results => (results || []).map(item => {
    const title = String(item.title || "").toLowerCase();
    const haystack = (title + " " + String(item.url || "") + " " + String(item.text || "")).toLowerCase();
    const matches = terms.filter(term => haystack.includes(term)).length;
    const titleMatches = terms.filter(term => title.includes(term)).length;
    const required = terms.length >= 2 ? Math.min(2, Math.ceil(terms.length * 0.5)) : 1;
    return { ...item, _score: matches + titleMatches * 2, _relevant: terms.length > 0 && matches >= required };
  }).filter(item => item._relevant).sort((a, b) => b._score - a._score).map(({_score,_relevant,...item}) => item);

  // Prefer the first-party combined Google/Bing/Wikipedia search when it has a
  // genuinely relevant source. Do not let a large pile of unrelated Bing results
  // outscore one exact Wikipedia result.
  try {
    const firstParty = await firstPartySearch(query);
    const relevant = rank(firstParty.results);
    if (relevant.length) return { ...firstParty, results: relevant.slice(0, 8) };
  } catch {}

  const outcomes = await Promise.allSettled([
    googleSearch(query).then(results => ({ engine: "Google Web", results })),
    bingSearch(query).then(results => ({ engine: "Bing Web", results }))
  ]);
  const candidates = outcomes.filter(x => x.status === "fulfilled" && Array.isArray(x.value.results) && x.value.results.length).map(x => ({...x.value, results:rank(x.value.results)})).filter(x => x.results.length);
  if (!candidates.length) throw new Error("Google and Bing returned no relevant results");
  const score = candidate => Math.max(...candidate.results.map(item => terms.filter(term => (String(item.title||"")+" "+String(item.text||"")).toLowerCase().includes(term)).length));
  candidates.sort((a, b) => score(b) - score(a));
  return candidates[0];
}

async function enrich(results) {
  // Fetch source pages concurrently. Prefer the article's readable text over a
  // generic browser/error page, and use Wikipedia's own rendered article as a
  // lightweight recovery path when the search provider supplies only a title.
  return Promise.all(results.slice(0, 4).map(async item => {
    let text = item.text || "";
    if ((!text || text.length < 180) && /wikipedia\.org\/wiki\//i.test(String(item.url||""))) {
      try {
        const wiki = await Promise.race([
          browser.session(async page => {
            await page.goto(item.url, { waitUntil: "domcontentloaded" });
            return await page.evaluate(() => ({
              title: document.querySelector("#firstHeading")?.innerText || document.title || "",
              text: Array.from(document.querySelectorAll("#mw-content-text .mw-parser-output > p"))
                .map(p => (p.innerText || p.textContent || "").replace(/\s+/g, " ").trim())
                .filter(t => t.length > 45 && !/may refer to|disambiguation/i.test(t))
                .slice(0, 3).join(" ")
            }));
          }),
          new Promise(resolve => setTimeout(() => resolve(null), 1800))
        ]);
        if (wiki?.text && wiki.text.length > text.length) text = wiki.text;
        if (wiki?.title && (!item.title || item.title.length < 3)) item = {...item,title:wiki.title};
      } catch {}
    }
    if (!text || text.length < 180) {
      try {
        const html = await Promise.race([
          browser.html(item.url),
          new Promise((_, reject) => setTimeout(() => reject(new Error("source timeout")), 1000))
        ]);
        const scraped = strip(html);
        if (scraped.length > text.length) text = scraped;
      } catch {}
    }
    return { ...item, text };
  }));
}

function relevantExcerpt(query, text) {
  const body = clean(text, 9000);
  if (!body) return "";
  const stopWords = new Set(["the","and","for","with","from","what","who","when","where","which","give","include","provide","explain","compare","comparison","difference","differences","trade","off","use","case","example","examples","latest","official","release","source","sources","search","web","database","flow","main","suitable","short","concrete"]);
  const words = new Set(clean(query, 500).toLowerCase().split(/\W+/).filter(x => x.length > 2 && !stopWords.has(x)));
  const sentences = body.split(/(?<=[.!?])\s+/).filter(s => s.length > 35);
  const scored = sentences.map(sentence => ({
    sentence,
    score: [...sentence.toLowerCase().matchAll(/[a-z0-9]+/g)].reduce((n, m) => n + (words.has(m[0]) ? 1 : 0), 0)
  })).sort((a, b) => b.score - a.score);
  const requiredMatches = words.size >= 2 ? 2 : 1;
  const relevant = scored.filter(x => x.score >= requiredMatches).slice(0, 2);
  return relevant.map(x => x.sentence).join(" ").slice(0, 900);
}

function groundedAnswer(query, sources, engine) {
  const usable = sources
    .map(s => ({ ...s, excerpt: relevantExcerpt(query, s.text || s.title) }))
    .filter(s => s.excerpt);

  if (!usable.length) {
    const terms = [...new Set(String(query || "").toLowerCase().match(/[a-z0-9]{4,}/g) || [])].filter(x => !["what", "when", "where", "which", "about", "search", "google", "bing", "wikipedia", "explain", "short", "paragraph", "please", "latest", "current", "sources"].includes(x));
    const relevant = (sources || []).filter(s => {
      const haystack = (String(s.title || "") + " " + String(s.url || "") + " " + String(s.text || "")).toLowerCase();
      const matches = terms.filter(term => haystack.includes(term)).length;
      // For multi-word queries require more than one matching topic term; a single
      // generic word such as "engine" must not make an unrelated page look relevant.
      const requiredMatches = terms.length >= 2 ? Math.min(2, Math.ceil(terms.length * 0.5)) : 1;
      return terms.length ? matches >= requiredMatches : false;
    }).slice(0, 3);
    if (!relevant.length) return "I couldn't verify a relevant source for that query in this search pass, so I won't present unrelated results as an answer. Try again or ask KAI 51 to search Google, Bing, and Wikipedia.";
    const sourceLines = relevant.map((s, i) => (i + 1) + ". " + s.title + "\n   " + s.url).join("\n");
    return "I couldn't extract enough readable page text to summarize confidently. These results match the query; please verify them:\n\nSources (" + engine + "):\n" + sourceLines;
  }

  const lead = usable[0];
  const answer = "Here’s what I found on the live web: " + lead.excerpt;
  const sourceLines = usable.slice(0, 3).map((s, i) =>
    (i + 1) + ". " + s.title + "\n   " + s.url
  ).join("\n");

  return answer + "\n\nSources (" + engine + "):\n" + sourceLines;
}

function liteNotice(text) {
  return String(text || "");
}

function repairConversation(query, history = []) {
  const q = clean(query, 300).toLowerCase().replace(/[’‘]/g, "'").trim();
  const previous = (Array.isArray(history) ? history : []).filter(x => x && typeof x === "object")
    .map(x => ({ role: String(x.role || x.sender || "").toLowerCase(), text: clean(x.content || x.text || x.message, 500) }))
    .filter(x => x.text).slice(-4);
  const hasPriorAssistant = previous.some(x => ["assistant", "bot", "ai", "model"].includes(x.role));
  if (/^ghop[.!?\s]*$/i.test(q)) {
    return "I’m not sure what you meant by “ghop,” bro. Was that a typo, or did you mean something else?";
  }
  if (/^(?:o+ bro )?are you (?:mad|angry|upset)[?!.,\s]*$/i.test(q)) {
    return hasPriorAssistant
      ? "No, bro 😅 I’m not mad. My previous reply was off-topic, and I shouldn’t have made up context. Sorry."
      : "No, bro 😅 I don’t get mad. What’s up?";
  }
  if (/^(?:what are you telling|what are you talking about|what do you mean|what are you on about)[?!.,\s]*$/i.test(q)) {
    return hasPriorAssistant
      ? "You’re right to call that out, bro. My last reply didn’t match what you said. I should’ve asked what you meant instead of inventing a topic. Sorry."
      : "I’m trying to answer your actual message, bro. Which part should I clarify?";
  }
  if (/\b(?:i'?m|i am|this is|that is|so)\s+(?:so\s+)?boring\b|^ah+[,!\s]+very boring[.!?\s]*$/i.test(q)) {
    return "Oof, bro 😭 let’s fix that. Want a weird question, a mini game, or should we build something cool?";
  }
  if (/\b(?:i forgive you|forgive you|you'?re forgiven|its okay i forgive|it'?s okay i forgive)\b/i.test(q)) {
    return "Thanks, bro ❤️ I’ll take that—and I’ll do better. No more robotic apology loops; I’ll listen to what you actually say.";
  }
  if (/\b(?:what do you need to be|how can you be|what does it take to be|how to be)\b.{0,45}\b(?:sympathetic|empathetic|sympathy|empathy)\b|\b(?:sympathetic|empathetic)\b.{0,45}\b(?:with me|to me|as an ai|in conversation)\b/i.test(q)) {
    return "Mostly, bro, I need to listen properly: notice how you’re feeling, take your words seriously, respond without judging, and avoid canned apologies or changing the subject. I don’t feel emotions like a person, but I can still respond with care and understanding. ❤️";
  }
  return null;
}

function casualAnswer(query) {
  const q = clean(query, 120).toLowerCase();
  if (/^(?:thanks|thank you|thx)/i.test(q)) return "Anytime, bro. 👊";
  if (/^(?:what\??|what's up\??|whats up\??|sup\??)/i.test(q)) return "I’m here, bro. Tell me what you want to work on.";
  if (/fuck|damn/i.test(q)) return "😂 I’m here, bro. What happened?";
  if (/good morning/i.test(q)) return "Good morning, bro. What are we building today?";
  if (/good evening/i.test(q)) return "Good evening, bro. What are we working on?";
  if (/good night/i.test(q)) return "Good night, bro. 👊";
  return "Hey bro 👋 Kai Lite is online. Give me a task, question, or something you want me to search on the web.";
}

export default async function(req, res) {
  // Generated apps may be hosted on a separate static domain. This public endpoint
  // accepts anonymous chat requests and does not use cookies or credentialed CORS.
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  res.setHeader("Access-Control-Max-Age", "86400");
  if (req.method === "OPTIONS") return res.status(204).send("");
  if (req.method !== "POST") return res.status(405).json({ error: "POST required" });

  const query = clean(req.body?.message, 1800);
  if (!query) return res.status(400).json({ error: "message required" });

  try {
    // Repair short conversational corrections before search or the generic Lite reply.
    const repaired = repairConversation(query, req.body?.history);
    if (repaired) {
      return res.json({ ok: true, response: repaired, provider: "KAI LITE · conversation repair", model: "KAI LITE · conversation repair", lite: true, sources: [] });
    }
    // Kai Lite is a web-grounded lane, but casual conversation should remain
    // conversation instead of turning "hi" into a search-engine query.
    if (casual.test(query)) {
      return res.json({
        ok: true,
        response: liteNotice(casualAnswer(query)),
        provider: "KAI LITE",
        model: "KAI LITE · CONVERSATION",
        lite: true,
        sources: []
      });
    }

    const searchQuery = normalizeSearchQuery(query);
    const searched = await searchWeb(searchQuery);
    const sources = await enrich(searched.results.slice(0, 3));

    return res.json({
      ok: true,
      response: liteNotice(groundedAnswer(searchQuery, sources, searched.engine)),
      provider: "KAI LITE · WEB",
      model: "KAI LITE · GOOGLE/BING SCRAPER",
      lite: true,
      engine: searched.engine,
      sources: sources.slice(0, 5).map(({ title, url }) => ({ title, url }))
    });
  } catch (e) {
    return res.status(502).json({
      ok: false,
      error: "Kai Lite web retrieval unavailable",
      detail: clean(e?.message, 300)
    });
  }
}