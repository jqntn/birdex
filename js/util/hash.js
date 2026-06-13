// 32-bit FNV-1a hash — tiny, dependency-free, good diffusion so adjacent
// scientific names land in unrelated buckets (no shiny clustering by genus).

export function fnv1a(str) {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}
