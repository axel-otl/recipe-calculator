// Diagnostic: looks for the full Coop and ICA store lists and their in-store
// weekly offers, and prints a short report. Read-only; makes about a dozen
// requests.
//
//   node scripts/probe-stores.mjs "<a word from your store's name>"
//
// e.g. node scripts/probe-stores.mjs "Gränby"

const NEEDLE = (process.argv[2] ?? "").toLowerCase();
const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0 Safari/537.36";

const short = (value, n = 400) => {
  const text = typeof value === "string" ? value : JSON.stringify(value);
  return text.length > n ? `${text.slice(0, n)}…` : text;
};

async function get(url, headers = {}) {
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": UA, "Accept-Language": "sv-SE,sv;q=0.9", ...headers },
      signal: AbortSignal.timeout(20000),
    });
    const text = await res.text();
    return { status: res.status, text };
  } catch (error) {
    return { status: 0, text: String(error) };
  }
}

function tryJson(text) {
  try {
    return JSON.parse(text);
  } catch {
    return undefined;
  }
}

/** Finds arrays of objects anywhere in a value, largest first. */
function findArrays(value, path = "$", out = []) {
  if (Array.isArray(value)) {
    if (value.length && typeof value[0] === "object" && value[0]) out.push({ path, length: value.length, sample: value[0] });
    value.slice(0, 3).forEach((v, i) => findArrays(v, `${path}[${i}]`, out));
  } else if (value && typeof value === "object") {
    for (const [k, v] of Object.entries(value)) findArrays(v, `${path}.${k}`, out);
  }
  return out.sort((a, b) => b.length - a.length);
}

function initialData(html) {
  const marker = "window.__INITIAL_DATA__ =";
  const start = html.indexOf(marker);
  if (start < 0) return undefined;
  const end = html.indexOf("</script>", start);
  let text = html
    .slice(start + marker.length, end)
    .trim()
    .replace(/;\s*$/, "")
    .replace(/([:[,]\s*)undefined\b/g, "$1null")
    .replace(/new Map\(\[\]\)/g, "null");
  text = text.slice(0, text.lastIndexOf("}") + 1);
  return tryJson(text);
}

function apiUrls(html) {
  return [...new Set(html.match(/https:\/\/[a-z0-9.-]*(?:api|proxy)[a-z0-9.-]*\.[a-z]+\/[^"'\s\\<>]{3,120}/gi) ?? [])].slice(0, 25);
}

function matching(list, fields) {
  if (!NEEDLE) return [];
  return list.filter((s) => fields.some((f) => String(s?.[f] ?? "").toLowerCase().includes(NEEDLE))).slice(0, 5);
}

console.log(`Searching for stores matching "${NEEDLE || "(none given)"}"\n`);

// ---------- Coop ----------
console.log("=== COOP ===");
const home = await get("https://www.coop.se/");
const key = (field) => new RegExp(`"${field}"\\s*:\\s*"([0-9a-f]{32})"`).exec(home.text)?.[1];
const storeKey = key("storeApiSubscriptionKey");
console.log(`coop.se ${home.status}; store key ${storeKey ? "found" : "MISSING"}`);

if (storeKey) {
  const reg = await get("https://proxy.api.coop.se/external/store/stores?api-version=v2", {
    "Ocp-Apim-Subscription-Key": storeKey,
    Accept: "application/json",
  });
  const data = tryJson(reg.text);
  const list = Array.isArray(data) ? data : (data?.stores ?? data?.items ?? data?.results ?? []);
  if (!Array.isArray(data)) console.log(`  response keys: ${Object.keys(data ?? {}).join(", ")}`);
  console.log(`store register ${reg.status}: ${list.length} stores`);
  console.log(`  first: ${short(list[0])}`);
  const hits = matching(list, ["name", "storeName", "displayName", "city", "conceptName"]);
  for (const hit of hits) console.log(`  match: ${short(hit, 300)}`);
  const ledger = (hits[0] ?? list[0])?.ledgerAccountNumber;
  if (ledger) {
    const detail = await get(`https://proxy.api.coop.se/external/store/stores/${ledger}?api-version=v2`, {
      "Ocp-Apim-Subscription-Key": storeKey,
      Accept: "application/json",
    });
    const d = tryJson(detail.text) ?? {};
    console.log(`store detail ${ledger} ${detail.status}: keys ${Object.keys(d).join(", ")}`);
    console.log(`  lat/lng ${d.latitude}, ${d.longitude}; weeklyOffersLink ${d.weeklyOffersLink}`);
    if (d.weeklyOffersLink) {
      const link = String(d.weeklyOffersLink).startsWith("http") ? d.weeklyOffersLink : `https://www.coop.se${d.weeklyOffersLink}`;
      const page = await get(link);
      console.log(`offers page ${page.status} (${page.text.length} bytes): ${link}`);
      console.log(`  api urls in page: ${apiUrls(page.text).join("\n    ") || "none"}`);
      const nextData = /<script id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/.exec(page.text)?.[1];
      if (nextData) {
        const arrays = findArrays(tryJson(nextData));
        console.log(`  __NEXT_DATA__ arrays: ${arrays.slice(0, 4).map((a) => `${a.path} (${a.length})`).join(", ")}`);
        if (arrays[0]) console.log(`  sample: ${short(arrays[0].sample)}`);
      }
      const offerWords = page.text.match(/.{0,80}(?:kr\/st|för \d+ kr|jmf).{0,80}/gi)?.slice(0, 3);
      if (offerWords) console.log(`  offer-like text: ${offerWords.map((t) => short(t, 160)).join(" | ")}`);
    }
  }
}

// ---------- ICA ----------
console.log("\n=== ICA ===");
for (const url of ["https://www.ica.se/butiker/", "https://www.ica.se/erbjudanden/"]) {
  const page = await get(url);
  const data = initialData(page.text);
  console.log(`${url} ${page.status} (${page.text.length} bytes); __INITIAL_DATA__ ${data ? "found" : "not found"}`);
  if (data) {
    console.log(`  top-level keys: ${Object.keys(data).join(", ")}`);
    const arrays = findArrays(data).slice(0, 5);
    for (const a of arrays) console.log(`  array ${a.path} (${a.length}): ${short(a.sample, 250)}`);
  }
  console.log(`  api urls in page: ${apiUrls(page.text).join("\n    ") || "none"}`);
}
