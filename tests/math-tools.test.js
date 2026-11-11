import test from "node:test";
import assert from "node:assert/strict";
import handler from "../api/tools/math.js";

function response() {
  return {
    code: 200, headers: {}, body: null,
    setHeader(k,v){this.headers[k]=v},
    status(n){this.code=n;return this},
    json(v){this.body=v;return this}
  };
}
async function run(expression,operation="evaluate") {
  const res=response();
  await handler({method:"POST",body:{expression,operation}},res);
  return res;
}

test("calculator preserves very large integer sums exactly",async()=>{
  const res=await run("23556766544444556666555445556677776 + 787898675653564242487");
  assert.equal(res.code,200);
  assert.equal(res.body.result,"23556766544445344565231099120920263");
});

test("algebra solves linear equations",async()=>{
  const res=await run("2*x + 3 = 11","solve");
  assert.equal(res.code,200);
  assert.equal(res.body.result,"x = 4");
});

test("algebra differentiates polynomials",async()=>{
  const res=await run("x^3 + 2*x","derivative");
  assert.equal(res.code,200);
  assert.match(res.body.result,/3\s*\*\s*x\s*\^\s*2/);
});

test("calculator rejects executable or unsupported input",async()=>{
  const res=await run("import('node:fs')");
  assert.equal(res.code,400);
  assert.equal(res.body.ok,false);
});


test("quadratic solver keeps roots in arbitrary precision", async () => {
  const res = await run("x^2 - 2 = 0", "solve");
  assert.equal(res.code, 200);
  assert.match(res.body.result, /x = 1\\.4142135623730950488/);
});
