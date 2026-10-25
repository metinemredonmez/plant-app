const formatter = new Intl.DateTimeFormat('tr-TR', {
  timeZone: 'Europe/Istanbul',
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
});

/** "GG.AA.YYYY" in Istanbul time: the app prints dates verbatim. */
export const displayDate = (date: Date) => formatter.format(date);
