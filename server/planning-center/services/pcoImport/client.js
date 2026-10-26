/**
 * Client API PCO Services v2 (JSON:API). Basic auth cu Personal Access Token (appId:secret).
 * Migrare one-time: paginare automată (links.next), back-off la 429, parse data/included.
 * Reutilizabil pt. ORICE cont PCO (zero hardcodări) → input = doar credențialele.
 */
const BASE = "https://api.planningcenteronline.com/services/v2";

class PcoClient {
  constructor({ appId, secret, baseUrl = BASE } = {}) {
    if (!appId || !secret) throw new Error("PCO: appId + secret necesare (Personal Access Token).");
    this.auth = "Basic " + Buffer.from(`${appId}:${secret}`).toString("base64");
    this.baseUrl = baseUrl;
  }

  /** Un singur GET (JSON:API). `path` poate fi relativ („/people") sau URL absolut (links.next). */
  async get(path, params = {}) {
    const url = new URL(path.startsWith("http") ? path : this.baseUrl + path);
    for (const [k, v] of Object.entries(params)) if (v != null) url.searchParams.set(k, String(v));
    for (let attempt = 0; attempt < 6; attempt++) {
      const res = await fetch(url, { headers: { Authorization: this.auth, Accept: "application/json" } });
      if (res.status === 429) { // rate-limit → respectă Retry-After
        const wait = (parseInt(res.headers.get("Retry-After"), 10) || 2) * 1000;
        await new Promise((r) => setTimeout(r, wait));
        continue;
      }
      if (!res.ok) throw new Error(`PCO ${res.status} ${url.pathname}: ${(await res.text()).slice(0, 300)}`);
      return res.json();
    }
    throw new Error("PCO: prea multe rate-limit-uri (429).");
  }

  /** GET paginat: întoarce TOATE resursele (data) + un map al tuturor `included` pe (type,id). */
  async getAll(path, params = {}) {
    const data = [];
    const included = new Map(); // `${type}:${id}` → resource
    let next = null, first = true;
    while (first || next) {
      const page = await this.get(next || path, first ? { per_page: 100, ...params } : {});
      (page.data || []).forEach((r) => data.push(r));
      (page.included || []).forEach((r) => included.set(`${r.type}:${r.id}`, r));
      next = page.links && page.links.next ? page.links.next : null;
      first = false;
    }
    return { data, included };
  }
}

/** Helper: id-ul primei relații (ex. rel(res,"service_type")). */
const relId = (res, name) => res?.relationships?.[name]?.data?.id || null;
/** Helper: lista de id-uri a unei relații to-many. */
const relIds = (res, name) => (res?.relationships?.[name]?.data || []).map((d) => d.id);

module.exports = { PcoClient, relId, relIds };
