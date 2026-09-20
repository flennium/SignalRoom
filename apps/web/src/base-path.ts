export const basePath = import.meta.env.BASE_URL;

export function appPath(path = '') {
  return `${basePath}${path.replace(/^\//, '')}`;
}
