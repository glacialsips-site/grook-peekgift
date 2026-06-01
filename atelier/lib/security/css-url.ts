export function cssUrl(rawUrl: string | null | undefined): string {
  if (!rawUrl) return 'none';
  const safe = String(rawUrl)
    .replace(/[\r\n]/g, '')
    .replace(/'/g, '%27')
    .replace(/"/g, '%22')
    .replace(/\\/g, '%5C')
    .replace(/\)/g, '%29')
    .replace(/\(/g, '%28');
  return `url('${safe}')`;
}
