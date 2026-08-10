export function htmlToText(html: string): string {
  const doc = new DOMParser().parseFromString(html, 'text/html');
  const text = doc.body.textContent || '';
  return text
    .replace(/\u00a0/g, ' ')
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

export function normalizeEmailBody(content: string, contentType: 'text' | 'html'): string {
  if (contentType === 'html') {
    return htmlToText(content);
  }
  return content
    .replace(/\u00a0/g, ' ')
    .replace(/\r\n/g, '\n')
    .trim();
}
