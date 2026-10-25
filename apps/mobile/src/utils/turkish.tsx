// Turkish formatting helpers. They avoid Intl and toLocaleUpperCase so the
// result does not depend on the JS engine's locale data.

/** "749" → "₺749", "1590" → "₺1.590", "749.5" → "₺749,50" */
export const formatPrice = (value: number | string | undefined) => {
  const amount = Number(value) || 0;
  const [whole, fraction] = amount.toFixed(2).split('.');
  const grouped = whole.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return fraction === '00' ? `₺${grouped}` : `₺${grouped},${fraction}`;
};

/**
 * Upper case with the Turkish dotted/dotless i (i → İ, ı → I). The style
 * `textTransform: 'uppercase'` turns "Seramik" into "SERAMIK".
 */
export const trUpper = (text: string) =>
  text.replace(/i/g, 'İ').replace(/ı/g, 'I').toUpperCase();

/** Letters the template's validators accepted, plus Turkish ones. */
export const LETTERS = 'a-zA-ZçğıöşüÇĞİÖŞÜâîûÂÎÛа-яА-Я';
