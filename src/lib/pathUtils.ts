export const normalizePath = (path: string): string => {
  return path.replace(/\\/g, '/').replace(/\/+/g, '/').replace(/^\/+/, '').replace(/\/+$/, '');
};

export const joinPaths = (...paths: string[]): string => {
  return normalizePath(paths.join('/'));
};
