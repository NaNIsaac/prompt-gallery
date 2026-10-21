import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { onRequest } from '../functions/sitemap.xml.js';
import { classifyGoogleSource } from '../server/sitemap-diagnostics.mjs';

const xml = '<?xml version="1.0"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"><url><loc>https://q07k-prompt-gallery.pages.dev/</loc></url></urlset>';
function fixture({ host = 'q07k-prompt-gallery.pages.dev', ua = 'Googlebot', ip = '66.249.66.1', status = 200, expires = Date.now() + 3_600_000, putError = false, assetError, method = 'GET' } = {}) {
  const writes = [], pending = [];
  const request = new Request(`https://${host}/sitemap.xml?private=must-not-be-stored`, { method, headers: { 'User-Agent': ua, 'CF-Connecting-IP': ip, Cookie: 'private=secret', 'CF-Ray': 'diagnostic-test-ICN' } });
  Object.defineProperty(request, 'cf', { value: { colo: 'ICN' } });
  const context = { request, env: { SITEMAP_DIAGNOSTICS_UNTIL: new Date(expires).toISOString(), SEO_DIAGNOSTICS: { put: async (...args) => { if (putError) throw new Error('quota exceeded'); writes.push(args); } } }, next: async () => { if (assetError) throw assetError; return new Response(method === 'HEAD' ? null : xml, { status, headers: { 'Content-Type': 'application/xml', ETag: 'original-etag', 'Cache-Control': 'public, max-age=0, must-revalidate' } }); }, waitUntil: promise => pending.push(promise) };
  return { context, writes, flush: () => Promise.all(pending) };
}

test('diagnostics preserves sitemap bytes/status/cache headers and persists a private response receipt', async () => {
  const f = fixture();
  const response = await onRequest(f.context);
  assert.equal(await response.text(), xml);
  assert.equal(response.status, 200);
  assert.equal(response.headers.get('etag'), 'original-etag');
  assert.equal(response.headers.get('cache-control'), 'public, max-age=0, must-revalidate');
  assert.ok(response.headers.get('x-sitemap-diagnostic-id'));
  await f.flush();
  assert.equal(f.writes.length, 1);
  const [key, json, options] = f.writes[0], record = JSON.parse(json);
  assert.equal(record.id, response.headers.get('x-sitemap-diagnostic-id'));
  assert.match(key, /^request:/);
  assert.equal(record.responseStatus, 200);
  assert.equal(record.bodySha256, createHash('sha256').update(xml).digest('hex'));
  assert.equal(record.bodyBytes, Buffer.byteLength(xml));
  assert.equal(record.claimedAgent, 'googlebot');
  assert.equal(record.sourceNetwork, 'common');
  assert.equal(record.colo, 'ICN');
  assert.equal(options.expirationTtl, 604800);
  for (const secret of ['66.249.66.1', 'private=', 'secret', 'Googlebot']) assert.ok(!json.includes(secret));
});

test('published Google IPv4 and IPv6 networks are verified; user-agent claims alone are not', () => {
  assert.equal(classifyGoogleSource('66.249.66.1'), 'common');
  assert.equal(classifyGoogleSource('2001:4860:4801:10::1'), 'common');
  assert.equal(classifyGoogleSource('127.0.0.1'), 'unverified');
  assert.equal(classifyGoogleSource('not-an-ip'), 'unverified');
  assert.equal(classifyGoogleSource(''), 'unverified');
});

test('inspection requests and spoofed Googlebot user agents remain distinct', async () => {
  for (const [ua, ip, expectedAgent, expectedNetwork] of [['Google-InspectionTool/1.0', '66.249.66.1', 'inspection', 'common'], ['Googlebot', '127.0.0.1', 'googlebot', 'unverified'], ['Mozilla/5.0', '127.0.0.1', 'other', 'unverified']]) {
    const f = fixture({ ua, ip }); await onRequest(f.context); await f.flush();
    const record = JSON.parse(f.writes[0][1]);
    assert.equal(record.claimedAgent, expectedAgent);
    assert.equal(record.sourceNetwork, expectedNetwork);
  }
});

test('asset failure status and fetch exception are recorded without hiding the failure', async () => {
  const f = fixture({ status: 503 }); const response = await onRequest(f.context); await f.flush();
  assert.equal(response.status, 503); assert.equal(JSON.parse(f.writes[0][1]).responseStatus, 503);
  const assetError = new Error('asset unavailable'), failed = fixture({ assetError });
  await assert.rejects(onRequest(failed.context), error => error === assetError); await failed.flush();
  const record = JSON.parse(failed.writes[0][1]);
  assert.equal(record.responseStatus, 0); assert.equal(record.failure, 'asset_fetch_failed');
});

test('preview traffic is excluded from production diagnostics and remains noindex', async () => {
  const f = fixture({ host: 'preview.q07k-prompt-gallery.pages.dev' });
  const response = await onRequest(f.context); await f.flush();
  assert.equal(f.writes.length, 0); assert.equal(response.headers.get('x-robots-tag'), 'noindex, nofollow');
});

test('expired/missing activation or missing binding serves the XML without recording', async () => {
  for (const kind of ['expired', 'missing-binding', 'missing-deadline']) {
    const f = fixture({ expires: Date.now() - 60_000 });
    if (kind === 'missing-binding') { f.context.env.SITEMAP_DIAGNOSTICS_UNTIL = new Date(Date.now() + 60_000).toISOString(); delete f.context.env.SEO_DIAGNOSTICS; }
    if (kind === 'missing-deadline') delete f.context.env.SITEMAP_DIAGNOSTICS_UNTIL;
    const response = await onRequest(f.context); await f.flush();
    assert.equal(await response.text(), xml); assert.equal(f.writes.length, 0); assert.equal(response.headers.get('x-sitemap-diagnostic-id'), null);
  }
});

test('a rejected KV write never breaks sitemap availability', async t => {
  t.mock.method(console, 'warn', () => {});
  const f = fixture({ putError: true }); const response = await onRequest(f.context); await f.flush();
  assert.equal(response.status, 200); assert.equal(await response.text(), xml);
  assert.ok(console.warn.mock.callCount() > 0);
});

test('HEAD requests retain an empty body and are labelled as HEAD', async () => {
  const f = fixture({ method: 'HEAD' }); const response = await onRequest(f.context); await f.flush();
  assert.equal(await response.text(), ''); assert.equal(JSON.parse(f.writes[0][1]).method, 'HEAD');
});
