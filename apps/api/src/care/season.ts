const ISTANBUL_OFFSET_MS = 3 * 60 * 60 * 1000; // Türkiye has no DST

/** Midnight of the current Istanbul day, as a UTC instant. */
export function istanbulDayStart(now = new Date()) {
  const local = new Date(now.getTime() + ISTANBUL_OFFSET_MS);
  local.setUTCHours(0, 0, 0, 0);
  return new Date(local.getTime() - ISTANBUL_OFFSET_MS);
}

/** First day of the current Istanbul month, as a UTC instant. */
export function istanbulMonthStart(now = new Date()) {
  const local = new Date(now.getTime() + ISTANBUL_OFFSET_MS);
  local.setUTCDate(1);
  local.setUTCHours(0, 0, 0, 0);
  return new Date(local.getTime() - ISTANBUL_OFFSET_MS);
}

/** April–September waters like summer, October–March like winter. */
export function isSummer(now = new Date()) {
  const month = new Date(now.getTime() + ISTANBUL_OFFSET_MS).getUTCMonth();
  return month >= 3 && month <= 8;
}

export const DAY_MS = 24 * 60 * 60 * 1000;
