import test from "node:test";
import assert from "node:assert/strict";
import handler from "../api/kai/search.js";

function response(body, contentType="text/html") {
  return new Response(body, { status: 200, headers: { "content-type": contentType } });
}
function mockResponse() {
  return {
    code: 200,
    headers: {},
    body: null,
    setHeader(name, value) { this.headers[name] = value; },
    status(code) { this.code = code; return this; },
    json(value) { this.body = value; return this; }
  };
}

test("research endpoint opens search results and extracts page text", async () => {
  const originalFetch = globalThis.fetch;
  const article = "<html><head><title>Solar energy storage guide</title></head><body><nav>Navigation</nav><main><h1>Solar energy storage</h1><p>Battery storage allows solar electricity generated during daylight hours to be saved and used later. Grid operators use storage to balance supply and demand, improve reliability, and integrate more renewable generation. Different technologies include lithium-ion batteries, flow batteries, pumped hydro, and thermal storage.</p></main><footer>Footer noise</footer></body></html>";
  globalThis.fetch = async (input) => {
    const url = String(input);
    if (url.includes("google.com/search")) {
      return response('<a href="https://example.org/solar-storage"><h3>Solar energy storage guide</h3></a>');
    }
    if (url.includes("bing.com/search")) return response("<html><body></body></html>");
    if (url.includes("wikipedia.org/w/api.php")) {
      return response(JSON.stringify({ query: { search: [] } }), "application/json");
    }
    if (url === "https://example.org/solar-storage") return response(article);
    throw new Error("Unexpected URL: " + url);
  };

  try {
    const req = { method: "GET", query: { q: "solar energy storage" } };
    const res = mockResponse();
    await handler(req, res);
    assert.equal(res.code, 200);
    assert.equal(res.body.ok, true);
    assert.equal(res.body.research.readCount, 1);
    assert.equal(res.body.sources[0].readStatus, "read");
    assert.match(res.body.sources[0].text, /Battery storage allows solar electricity/);
    assert.doesNotMatch(res.body.sources[0].text, /Navigation|Footer noise/);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("research endpoint rejects an empty query", async () => {
  const res = mockResponse();
  await handler({ method: "GET", query: {} }, res);
  assert.equal(res.code, 400);
  assert.equal(res.body.ok, false);
});


test("DuckDuckGo is a working fallback when the other search engines fail", async () => {
  const originalFetch = globalThis.fetch;
  const article = "<html><body><main><h1>Quantum battery storage</h1><p>Quantum battery research studies how quantum effects may influence energy storage and charging. Researchers investigate collective charging, coherence, and potential limits on charging power.</p></main></body></html>";
  globalThis.fetch = async (input) => {
    const url = String(input);
    if (url.includes("html.duckduckgo.com/html/")) {
      return response('<a rel="nofollow" class="result__a" href="https://example.org/quantum-battery">Quantum battery storage research</a>');
    }
    if (url === "https://example.org/quantum-battery") return response(article);
    throw new Error("Simulated unavailable engine: " + url);
  };
  try {
    const res = mockResponse();
    await handler({ method: "GET", query: { q: "quantum battery storage" } }, res);
    assert.equal(res.code, 200);
    assert.equal(res.body.ok, true);
    assert.ok(res.body.searched.includes("DuckDuckGo"));
    assert.equal(res.body.sources[0].readStatus, "read");
    assert.match(res.body.sources[0].text, /quantum effects may influence energy storage/);
  } finally {
    globalThis.fetch = originalFetch;
  }
});


test("Bing RSS provides real links and two independent readable sources", async () => {
  const originalFetch = globalThis.fetch;
  const pages = {
    "https://example.org/solar-one": "<html><body><main><h1>Solar storage report</h1><p>Solar battery storage allows households and grid operators to save renewable electricity generated during daylight and use it later. Battery systems can improve grid flexibility and reduce reliance on fossil fuel generation during periods of high demand.</p></main></body></html>",
    "https://research.example.net/solar-two": "<html><body><article><h1>Energy storage research</h1><p>Energy storage technologies help balance variable renewable electricity by shifting generation across time. Lithium-ion batteries are widely deployed, while pumped hydro and flow batteries serve other grid-scale applications.</p></article></body></html>"
  };
  globalThis.fetch = async (input) => {
    const url = String(input);
    if (url.includes("bing.com/search?format=rss")) {
      return response(`<?xml version="1.0"?><rss><channel>
        <item><title>Solar battery storage report</title><link>https://example.org/solar-one</link><description>Solar battery storage and renewable electricity report.</description></item>
        <item><title>Energy storage research review</title><link>https://research.example.net/solar-two</link><description>Research on grid energy storage and renewable power.</description></item>
      </channel></rss>`, "application/rss+xml");
    }
    if (pages[url]) return response(pages[url]);
    throw new Error("Simulated unavailable provider: " + url);
  };
  try {
    const res = mockResponse();
    await handler({ method: "GET", query: { q: "solar battery energy storage" } }, res);
    assert.equal(res.code, 200);
    assert.equal(res.body.sources.length, 2);
    assert.equal(res.body.research.readCount, 2);
    assert.equal(res.body.research.independentDomains, 2);
    assert.equal(res.body.answerable, true);
    assert.equal(res.body.sources[0].readStatus, "read");
    assert.match(res.body.sources[0].url, /^https:\/\//);
  } finally {
    globalThis.fetch = originalFetch;
  }
});
