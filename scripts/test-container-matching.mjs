/**
 * Quick sanity check for container matching logic (no Graph API needed).
 * Run: node scripts/test-container-matching.mjs
 */

function normalizeContainerId(value) {
  return value.trim().toUpperCase().replace(/\s+/g, '');
}

function isPrimarkInvoiceEmail(text) {
  const lower = text.toLowerCase();
  return (
    lower.includes('primark') &&
    (lower.includes('commercial invoice') ||
      lower.includes('new invoice from primark') ||
      /\bcontainer\s+number\s+[a-z]{3}\d{8}\b/i.test(text))
  );
}

function extractContainerReferences(text) {
  const found = new Set();
  const patterns = [
    /\bcontainer\s+number\s+([A-Z]{3}\d{8})\b/gi,
    /\bcontainer\s+number\s+([A-Z]{4}\d{7})\b/gi,
  ];
  for (const pattern of patterns) {
    pattern.lastIndex = 0;
    for (const match of text.matchAll(pattern)) {
      if (match[1]) found.add(normalizeContainerId(match[1]));
    }
  }
  return [...found];
}

function containerAppearsInText(containerNo, text) {
  const normalized = normalizeContainerId(containerNo);
  if (!normalized || normalized.length < 4) return false;
  const haystack = normalizeContainerId(text);
  if (haystack.includes(normalized)) return true;
  if (/^[A-Z]{4}\d{7}$/.test(normalized)) {
    const spaced = `${normalized.slice(0, 4)} ${normalized.slice(4)}`;
    if (haystack.includes(normalizeContainerId(spaced))) return true;
  }
  return false;
}

function buildMessageSearchText(subject, body) {
  return [subject?.trim(), body?.trim()].filter(Boolean).join('\n');
}

const primarkBody = `Dear Customer,

Please find attached our Primark commercial invoice for Sales Order No 5697 container number DEL00003301

For any issues or queries relating to this invoice, please contact FranchiseInvoices@primark.com.

Kind Regards,
Primark Franchise Team.`;

const cases = [
  {
    name: 'Primark invoice detects container reference',
    subject: 'New Invoice from Primark',
    body: primarkBody,
    container: 'DEL00003301',
    expectMatch: true,
    expectPrimark: true,
    expectExtracted: ['DEL00003301'],
  },
  {
    name: 'container in body (ISO)',
    subject: 'Shipment update',
    body: 'Container No: MRSU0440557\nCIPL DATE RECEIVED: 2025-01-15',
    container: 'MRSU0440557',
    expectMatch: true,
    expectPrimark: false,
    expectExtracted: [],
  },
  {
    name: 'container only in subject',
    subject: 'Pre-alert MAEU265952242',
    body: 'Please find attached documents.',
    container: 'MAEU265952242',
    expectMatch: true,
    expectPrimark: false,
    expectExtracted: [],
  },
];

let failed = 0;
for (const c of cases) {
  const text = buildMessageSearchText(c.subject, c.body);
  const gotMatch = containerAppearsInText(c.container, text);
  const gotPrimark = isPrimarkInvoiceEmail(text);
  const extracted = extractContainerReferences(text);
  const ok =
    gotMatch === c.expectMatch &&
    gotPrimark === c.expectPrimark &&
    JSON.stringify(extracted) === JSON.stringify(c.expectExtracted);
  if (!ok) failed += 1;
  console.log(
    `${ok ? '✓' : '✗'} ${c.name}: match=${gotMatch}, primark=${gotPrimark}, extracted=${extracted.join(',') || '(none)'}`
  );
}

if (failed > 0) {
  console.error(`\n${failed} test(s) failed`);
  process.exit(1);
}

console.log('\nAll container matching checks passed.');
