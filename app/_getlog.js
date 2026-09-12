const https = require("https");
const z = require("zlib");
const fs = require("fs");
const session = '{"id":"bb33c362-7f37-47e2-bb5f-8bf4cfb177e2","version":2}';
const buildId = process.argv[2];
const q = JSON.stringify({
  query: "query($id: ID!){ builds{ byId(buildId:$id){ logFiles } } }",
  variables: { id: buildId },
});
function post() {
  return new Promise((res, rej) => {
    const r = https.request("https://api.expo.dev/graphql", { method: "POST", headers: { "content-type": "application/json", "expo-session": session } }, (resp) => {
      let d = ""; resp.on("data", (c) => (d += c)); resp.on("end", () => res(JSON.parse(d)));
    });
    r.on("error", rej); r.write(q); r.end();
  });
}
function get(u) {
  return new Promise((res, rej) => {
    https.get(u, (resp) => { const chunks = []; resp.on("data", (c) => chunks.push(c)); resp.on("end", () => res(Buffer.concat(chunks))); }).on("error", rej);
  });
}
(async () => {
  const j = await post();
  const files = j.data.builds.byId.logFiles;
  let all = "";
  for (const url of files) {
    const buf = await get(url);
    let out = null;
    for (const f of [z.gunzipSync, z.brotliDecompressSync, z.inflateSync, z.inflateRawSync]) { try { out = f(buf); break; } catch (e) {} }
    if (!out) out = buf;
    all += out.toString("utf8") + "\n";
  }
  const lines = all.split("\n").filter(Boolean);
  for (const ln of lines) {
    try { const o = JSON.parse(ln); console.log("[" + (o.phase||"") + "] " + (o.msg || (o.err && o.err.message) || "")); } catch (e) { console.log(ln); }
  }
})();
