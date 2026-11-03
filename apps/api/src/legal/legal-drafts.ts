export interface LegalSection {
  heading: string;
  body: string;
}

export interface LegalDraft {
  slug: string;
  version: string;
  title: string;
  summary?: string;
  sections: LegalSection[];
}

/**
 * DRAFTS, inserted once when a text has no version yet. The lawyer's texts
 * are published from the admin panel as new versions (ADR 0016); they replace
 * these without a deploy. The retention periods here are RETENTION_* defaults.
 */
export const LEGAL_DRAFTS: LegalDraft[] = [
  {
    slug: 'kvkk',
    version: '2026-11-03',
    title: 'KVKK Aydınlatma Metni',
    sections: [
      {
        heading: 'Veri sorumlusu',
        body: 'EverBloom (şirket bilgileri kuruluşla birlikte eklenecek).',
      },
      {
        heading: 'İşlenen veriler',
        body: 'Hesap bilgileri (ad; e-posta ya da telefon numarasının özeti ve son iki hanesi; giriş yolu), bitkilerin ve bakım kayıtların, tarama fotoğrafların (konum bilgisi silinmiş hâliyle), asistan mesajların, seçersen şehrin ve ilk sorulara verdiğin cevaplar, abonelik durumun.',
      },
      {
        heading: 'Amaç ve hukuki sebep',
        body: 'Uygulamayı sunmak ve hesabını yönetmek: sözleşmenin kurulması ve ifası (KVKK m.5/2-c). Fotoğraf ve soruların yurt dışındaki yapay zekâ sağlayıcılarına aktarılması: açık rızan (KVKK m.9); rızan olmadan bu aktarım yapılmaz.',
      },
      {
        heading: 'Aktarım',
        body: 'Bitki tanıma ve sağlık değerlendirmesi sağlayıcısı (Avrupa Birliği), yapay zekâ asistanı sağlayıcısı (ABD), barındırma ve SMS hizmeti sağlayıcıları. Reklam ya da satış için kimseyle paylaşılmaz. Tanıma sağlayıcısındaki kayıt, sonuç alındıktan hemen sonra silinir.',
      },
      {
        heading: 'Saklama',
        body: 'Tarama fotoğrafları 180 gün, asistan sohbetleri 1 yıl saklanır; süresi dolanlar her gün otomatik silinir. Bitkilerin ve bakım kayıtların hesabın açık olduğu sürece durur. Hesabını sildiğinde bitkilerin, fotoğrafların ve sohbetlerin silinir; Apple ile giriş erişimi de kaldırılır. Başvuru kayıtları kapandıktan sonra 3 yıl saklanır.',
      },
      {
        heading: 'Hakların',
        body: 'KVKK m.11 uyarınca verilerine erişme, düzeltilmesini ya da silinmesini isteme ve itiraz etme hakların var. Başvurunu web sitemizdeki KVKK başvuru formundan yapabilirsin; en geç 30 gün içinde yanıtlanır. Hesabını uygulamadan ya da web sitemizdeki hesap silme sayfasından silebilirsin.',
      },
    ],
  },
  {
    slug: 'kosullar',
    version: '2026-11-03',
    title: 'Kullanım Koşulları',
    sections: [
      {
        heading: 'Hizmet',
        body: 'EverBloom bitki tanıma, bakım bilgisi, hatırlatma ve bakım asistanı sunar. Teşhisler ön değerlendirmedir; ilaç önerisi yapılmaz.',
      },
      {
        heading: 'Üyelik',
        body: 'Premium, uygulama mağazası üzerinden aylık ya da yıllık abonelikle sunulur. Abonelik mağaza ayarlarından iptal edilmedikçe yenilenir.',
      },
      {
        heading: 'Hesap',
        body: 'Hesabını istediğin zaman Profil ekranından ya da web sitemizdeki hesap silme sayfasından silebilirsin.',
      },
    ],
  },
  {
    slug: 'gizlilik',
    version: '2026-11-03',
    title: 'Gizlilik',
    sections: [
      {
        heading: 'Kısaca',
        body: 'Verilerin yalnız uygulamayı çalıştırmak için işlenir. Satmayız, reklam için kullanmayız. Telefon numaran saklanmaz; yalnızca özeti ve son iki hanesi tutulur.',
      },
      {
        heading: 'Ayrıntı',
        body: "İşlenen veriler, amaçlar ve hakların KVKK Aydınlatma Metni'nde.",
      },
    ],
  },
  {
    // The version the app has shown since October: consents given stay valid.
    slug: 'yapay-zeka',
    version: '2026-10-25',
    title: 'Yapay zekâ ile inceleme',
    summary:
      "Tanıma, teşhis ve asistan için fotoğrafların ve soruların yurt dışındaki sağlayıcılara iletilir: fotoğraflar Avrupa Birliği'ndeki bitki tanıma sağlayıcısına, sorular ABD'deki yapay zekâ asistanı sağlayıcısına. Fotoğrafın konum bilgisi telefonda silinir.",
    sections: [
      {
        heading: 'Neler iletilir',
        body: 'Bitkini tanımak, sorunlarını teşhis etmek ve sorularını yanıtlamak için gönderdiğin fotoğraflar ve mesajlar yurt dışındaki yapay zekâ hizmet sağlayıcılarına iletilir.',
      },
      {
        heading: 'Kime',
        body: 'Fotoğraflar: bitki tanıma ve sağlık değerlendirmesi sağlayıcısı (Avrupa Birliği). Sorular ve bitki bilgilerin: yapay zekâ asistanı sağlayıcısı (ABD).',
      },
      {
        heading: 'Korunma',
        body: 'Fotoğrafının konum bilgisi telefonda silinir, gönderilmez. Fotoğraflar ve sohbetler hesabını sildiğinde silinir.',
      },
      {
        heading: 'Seçimin',
        body: 'Onayını istediğin zaman Profil ekranından geri alabilirsin. Onay vermezsen bakım kartları, Bitkilerim ve hatırlatıcılar çalışmaya devam eder; yalnızca tarama ve asistan kapanır.',
      },
    ],
  },
  {
    slug: 'model-gelistirme',
    version: '2026-11-03',
    title: 'Fotoğrafların model geliştirmede kullanılması',
    summary:
      'İstersen tarama fotoğrafların bitki tanıma ve teşhis doğruluğunu ölçmek ve iyileştirmek için kullanılabilir. Varsayılan olarak kapalıdır ve uygulamayı kullanmak için gerekmez.',
    sections: [
      {
        heading: 'Amaç',
        body: 'Yalnızca bitki tanıma ve teşhis doğruluğunu ölçmek ve iyileştirmek. Reklam için kullanılmaz, satılmaz.',
      },
      {
        heading: 'Neler kullanılır',
        body: 'Konum bilgisi silinmiş tarama fotoğrafların ve sonuçları. Adın, e-postan ya da telefonun bu işe katılmaz.',
      },
      {
        heading: 'Seçimin',
        body: 'İzin vermesen de uygulamanın bütün özellikleri çalışır. İzni istediğin zaman Profil ekranından geri alabilirsin; geri alınca fotoğrafların bu amaçla kullanılmaz.',
      },
    ],
  },
];
