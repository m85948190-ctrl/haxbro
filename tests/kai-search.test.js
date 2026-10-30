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
