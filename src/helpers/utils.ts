export function buildQueryString(params: object) {
  return Object.entries(params)
    .map(([key, value]) => `${key}=${value}`)
    .join('&');
}
