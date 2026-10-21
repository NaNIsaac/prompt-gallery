import { diagnosticReceipt, persistReceipt } from '../server/sitemap-diagnostics.mjs';

const productionHost = 'q07k-prompt-gallery.pages.dev';

export async function onRequest(context) {
  const { request, env } = context;
  const isProduction = new URL(request.url).hostname === productionHost;
  const until = Date.parse(env.SITEMAP_DIAGNOSTICS_UNTIL ?? '');
  const active = isProduction && env.SEO_DIAGNOSTICS && Number.isFinite(until) && Date.now() < until;
  const startedAt = Date.now();
  const receipt = active ? diagnosticReceipt(request, crypto.randomUUID(), startedAt) : null;
  let asset;
  try {
    asset = await context.next();
  } catch (error) {
    if (active) context.waitUntil(persistReceipt(env.SEO_DIAGNOSTICS, receipt, null, startedAt));
    throw error;
  }
  const response = new Response(asset.body, asset);
  // _headers rules do not apply to Functions responses; retain these policies explicitly.
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  if (!isProduction) response.headers.set('X-Robots-Tag', 'noindex, nofollow');
  if (active) {
    response.headers.set('X-Sitemap-Diagnostic-Id', receipt.id);
    context.waitUntil(persistReceipt(env.SEO_DIAGNOSTICS, receipt, response.clone(), startedAt));
  }
  return response;
}
