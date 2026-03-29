export const normalizePath = (path: string): string => {
  if (!path) return '';
  // Replace backslashes with forward slashes
  let normalized = path.replace(/\\/g, '/');
  // Remove duplicate slashes
  normalized = normalized.replace(/\/+/g, '/');
  // Remove leading and trailing slashes
  normalized = normalized.replace(/^\/+/, '').replace(/\/+$/, '');
  
  // Handle relative path components (simple version)
  const parts = normalized.split('/');
  const result: string[] = [];
  for (const part of parts) {
    if (part === '..') {
      result.pop();
    } else if (part !== '.' && part !== '') {
      result.push(part);
    }
  }
  return result.join('/');
};

export const joinPaths = (...paths: string[]): string => {
  return normalizePath(paths.filter(Boolean).join('/'));
};
