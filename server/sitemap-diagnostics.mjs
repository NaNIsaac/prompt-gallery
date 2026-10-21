import ipaddr from 'ipaddr.js';
import networks from './google-crawler-networks.json' with { type: 'json' };

const publishedRanges = Object.entries(networks.sources).map(([category, source]) => ({
  category, ranges: source.prefixes.map(prefix => ipaddr.parseCIDR(prefix))
}));

// This is network attribution, not authentication or proof of a particular Google subsystem.
export function classifyGoogleSource(address) {
  if (!ipaddr.isValid(address)) return 'unverified';
  const ip = ipaddr.process(address);
  return publishedRanges.find(({ ranges }) => ranges.some(([network, bits]) =>
    ip.kind() === network.kind() && ip.match(network, bits)))?.category ?? 'unverified';
}

export function diagnosticReceipt(request, id, startedAt) {
  const ua = request.headers.get('user-agent') ?? '';
  return {
    id, timestamp: new Date(startedAt).toISOString(), method: request.method,
    claimedAgent: /Google-InspectionTool/i.test(ua) ? 'inspection' : /Googlebot/i.test(ua) ? 'googlebot' : 'other',
    sourceNetwork: classifyGoogleSource(request.headers.get('cf-connecting-ip') ?? ''),
    networkListDate: networks.retrievedAt,
    colo: request.cf?.colo ?? null
  };
}

export async function persistReceipt(store, receipt, response, startedAt) {
  try {
    const bytes = response ? new Uint8Array(await response.arrayBuffer()) : null;
    const hash = bytes ? await crypto.subtle.digest('SHA-256', bytes) : null;
    const record = {
      ...receipt,
      responseStatus: response?.status ?? 0,
      contentType: response?.headers.get('content-type') ?? null,
      noindex: /noindex/i.test(response?.headers.get('x-robots-tag') ?? ''),
      bodyBytes: bytes?.byteLength ?? null,
      bodySha256: hash ? Array.from(new Uint8Array(hash), byte => byte.toString(16).padStart(2, '0')).join('') : null,
      elapsedMs: Date.now() - startedAt,
      ...(response ? {} : { failure: 'asset_fetch_failed' })
    };
    await store.put(`request:${receipt.timestamp}:${receipt.id}`, JSON.stringify(record), { expirationTtl: 604800 });
  } catch {
    // Capture/quota failures must not turn a working sitemap into a server error.
    console.warn('sitemap_diagnostic_capture_failed');
  }
}
