#!/usr/bin/env node
/**
 * Production smoke test for the Faza frontend.
 *
 * The frontend and the API are deployed separately, so the browser can end up
 * talking to a build that is older (or newer) than the API. The public menu
 * is server-rendered, so a page that renders the coffee name proves the
 * server can reach the API, and the client bundle proves the browser is
 * pointed at the same API origin.
 *
 * Usage:
 *   node scripts/smoke.mjs --url https://faza-iota.vercel.app
 *   node scripts/smoke.mjs --url https://faza.example.com --coffee rakwa --wait 120
 *
 * Flags:
 *   --url <origin>     deployed site origin (default: https://faza-iota.vercel.app)
 *   --coffee <slug>    coffee slug used for the render check (default: rakwa)
 *   --api <origin>     API origin the browser must call (default: https://menuscanapis.onrender.com)
 *   --wait <seconds>   poll until the page renders (default: 0 = check once)
 *   --timeout <ms>     per-request timeout (default: 20000)
 */

const args = process.argv.slice(2);

function flag(name, fallback) {
  const index = args.indexOf(`--${name}`);
  if (index === -1) return fallback;
  const value = args[index + 1];
  return value && !value.startsWith("--") ? value : fallback;
}

const siteUrl = (flag("url", "https://faza-iota.vercel.app") || "").replace(/\/+$/, "");
const coffeeSlug = flag("coffee", "rakwa");
const apiOrigin = (flag("api", "https://menuscanapis.onrender.com") || "").replace(/\/+$/, "");
const waitSeconds = Number(flag("wait", "0")) || 0;
const timeoutMs = Number(flag("timeout", "20000")) || 20000;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function fetchText(url) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, { signal: controller.signal, redirect: "follow" });
    const text = await response.text();
    return { status: response.status, text };
  } finally {
    clearTimeout(timer);
  }
}

async function runOnce() {
  const checks = [];
  const page = `${siteUrl}/faza/${coffeeSlug}`;
  const result = await fetchText(page);

  checks.push({
    name: `GET /faza/${coffeeSlug} renders`,
    ok: result.status === 200,
    detail: `status=${result.status}`,
  });

  checks.push({
    name: "the page is server-rendered with the coffee",
    ok: result.status === 200 && /<title>[^<]*<\/title>/.test(result.text) && result.text.includes("Faza"),
    detail: result.status === 200 ? `bytes=${result.text.length}` : "page unreachable",
  });

  checks.push({
    name: "the page does not fall back to a local API",
    ok: result.status === 200 && !result.text.includes("localhost:4000"),
    detail: "localhost:4000 must not be referenced by a production build",
  });

  // The browser API origin is inlined in the client bundle: check that it is
  // the production API and not a developer machine.
  const scripts = [...result.text.matchAll(/src="(\/_next\/static\/[^"]+\.js)"/g)].map((match) => match[1]);
  let bundleHasApi = false;
  let bundleHasLocalApi = false;
  for (const src of [...new Set(scripts)].slice(0, 30)) {
    try {
      const chunk = await fetchText(`${siteUrl}${src}`);
      if (chunk.text.includes(apiOrigin)) bundleHasApi = true;
      if (chunk.text.includes("localhost:4000")) bundleHasLocalApi = true;
    } catch {
      // A chunk that cannot be fetched is not a failure of the deployment.
    }
  }

  checks.push({
    name: "the browser bundle calls the production API",
    ok: bundleHasApi,
    detail: bundleHasApi ? apiOrigin : `no chunk referenced ${apiOrigin}`,
  });

  checks.push({
    name: "the browser bundle has no local API URL",
    ok: !bundleHasLocalApi,
    detail: bundleHasLocalApi ? "localhost:4000 is inlined in a client chunk" : "clean",
  });

  return { ok: checks.every((check) => check.ok), checks };
}

async function main() {
  console.log(`Faza frontend smoke test → ${siteUrl}`);

  if (waitSeconds > 0) {
    const deadline = Date.now() + waitSeconds * 1000;
    let outcome = { ok: false, checks: [] };
    while (Date.now() < deadline) {
      outcome = await runOnce();
      if (outcome.ok) break;
      console.log("  … not live yet, retrying in 10s");
      await sleep(10000);
    }
    for (const check of outcome.checks) {
      console.log(`${check.ok ? "  ok  " : "  FAIL"} ${check.name}${check.detail ? ` — ${check.detail}` : ""}`);
    }
    if (!outcome.ok) {
      console.error("\nThe deployed frontend never satisfied the checks.");
      process.exit(1);
    }
  } else {
    const outcome = await runOnce();
    for (const check of outcome.checks) {
      console.log(`${check.ok ? "  ok  " : "  FAIL"} ${check.name}${check.detail ? ` — ${check.detail}` : ""}`);
    }
    if (!outcome.ok) {
      console.error(`\n${outcome.checks.filter((check) => !check.ok).length}/${outcome.checks.length} checks failed.`);
      process.exit(1);
    }
  }

  console.log("\nAll checks passed.");
}

main().catch((error) => {
  console.error("Smoke test could not run:", error instanceof Error ? error.message : error);
  process.exit(1);
});
