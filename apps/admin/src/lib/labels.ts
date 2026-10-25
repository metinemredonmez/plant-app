export const LIGHT: Record<string, string> = {
  LOW: 'Az ışık',
  PARTIAL: 'Orta ışık',
  BRIGHT_INDIRECT: 'Parlak, dolaylı ışık',
  DIRECT: 'Doğrudan güneş',
};

export const DIFFICULTY: Record<string, string> = {
  NO_FUSS: 'Hiç zahmetsiz',
  EASY: 'Kolay',
  MODERATE: 'Orta',
};

export const SPOTS: Record<string, string> = {
  INDOOR: 'İç mekân',
  BALCONY: 'Balkon',
  GARDEN: 'Bahçe',
};

export const REPORT_REASON: Record<string, string> = {
  WRONG: 'Yanlış bilgi',
  UNSAFE: 'Güvensiz öneri',
  OFF_TOPIC: 'Konu dışı',
  OTHER: 'Başka',
};

export const TASK: Record<string, string> = {
  IDENTIFY: 'Tanıma',
  DIAGNOSE: 'Teşhis',
  ASSISTANT: 'Asistan',
  CARD_DRAFT: 'Kart taslağı',
};

export const ACTION: Record<string, string> = {
  'species.create': 'Tür eklendi',
  'species.update': 'Tür düzenlendi',
  'species.draft': 'Yapay zekâ taslağı yazıldı',
  'species.approve': 'Tür onaylandı',
  'report.resolve': 'Bildirim kapatıldı',
  'user.anonymize': 'Kullanıcı anonimleştirildi',
};

export const ROLE: Record<string, string> = {
  ADMIN: 'Yönetici',
  STAFF: 'Uzman',
  CUSTOMER: 'Kullanıcı',
};

const dateFormat = new Intl.DateTimeFormat('tr-TR', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  timeZone: 'Europe/Istanbul',
});

export const when = (iso: string | null | undefined) => (iso ? dateFormat.format(new Date(iso)) : '—');

// Small amounts keep a third decimal: a Kindwise call is 0,055 dollars.
export const usd = (value: number) =>
  new Intl.NumberFormat('tr-TR', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: value > 0 && value < 1 ? 3 : 2,
  }).format(value);
