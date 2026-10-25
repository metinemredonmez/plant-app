/**
 * Comparable form of a scientific name: lower case, single spaces, without
 * the hybrid sign ("Citrus × limon", "Citrus x limon" and "citrus limon"
 * are the same key).
 */
export const scientificKey = (name: string) =>
  name
    .replace(/(^|\s)[×x](?=\s)/g, ' ')
    .replace(/×/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
