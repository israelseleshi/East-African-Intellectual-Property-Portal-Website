const normalizeRawPath = (rawPath?: string): string => {
  if (!rawPath) return '';
  const trimmed = rawPath.trim();
  if (!trimmed) return '';
  return trimmed.replace(/\\/g, '/');
};

const toCanonicalApiUrl = (normalizedPath: string): string => {
  const origin = window.location.origin;
  const withoutLeadingSlash = normalizedPath.replace(/^\/+/, '');
  const withLeadingSlash = `/${withoutLeadingSlash}`;

  if (withLeadingSlash.startsWith('/api/uploads/')) return `${origin}${withLeadingSlash}`;
  if (withLeadingSlash.startsWith('/uploads/')) return `${origin}/api${withLeadingSlash}`;

  if (withLeadingSlash.startsWith('/api/forms-download/')) return `${origin}${withLeadingSlash}`;
  if (withLeadingSlash.startsWith('/forms-download/')) return `${origin}/api${withLeadingSlash}`;

  if (withoutLeadingSlash.startsWith('uploads/')) return `${origin}/api/${withoutLeadingSlash}`;
  if (withoutLeadingSlash.startsWith('marks/')) return `${origin}/api/uploads/${withoutLeadingSlash}`;

  // Legacy cases may store only file names.
  if (/^mark_/i.test(withoutLeadingSlash)) return `${origin}/api/uploads/marks/${withoutLeadingSlash}`;
  if (/^file-/i.test(withoutLeadingSlash)) return `${origin}/api/uploads/${withoutLeadingSlash}`;

  return `${origin}/api/forms-download/${withoutLeadingSlash}`;
};

const toRemoteProdUrl = (url: string): string => {
  if (typeof window === 'undefined') return url;
  if (!/localhost|127\.0\.0\.1/i.test(window.location.hostname)) return url;
  // Route production API assets through local Vite proxy to keep same-origin fetch
  // support (needed by ExcelJS image export in local development).
  const fromOrigin = window.location.origin;
  if (!url.startsWith(fromOrigin)) return url;
  const path = url.slice(fromOrigin.length);
  if (path.startsWith('/api/')) return `${fromOrigin}/prod-api/${path.replace(/^\/api\//, '')}`;
  return url;
};

export const getMarkImageCandidates = (rawPath?: string): string[] => {
  const normalized = normalizeRawPath(rawPath);
  if (!normalized) return [];

  if (normalized.startsWith('http://') || normalized.startsWith('https://') || normalized.startsWith('data:')) {
    return [normalized];
  }

  const canonical = toCanonicalApiUrl(normalized);
  const remote = toRemoteProdUrl(canonical);

  // In local dev with production-like DB data, remote tends to be valid while local files may be missing.
  if (/localhost|127\.0\.0\.1/i.test(window.location.hostname)) {
    return Array.from(new Set([remote, canonical]));
  }

  return [canonical];
};

export const resolveMarkImageUrl = (rawPath?: string): string => {
  const [first] = getMarkImageCandidates(rawPath);
  return first || '';
};
