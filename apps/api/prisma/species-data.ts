// Turkish care cards for common house, balcony and garden plants.
// DRAFT: written from general horticultural references; every card ships
// with `reviewed: false` until a horticulturist (ziraat mühendisi) checks
// it. Pet toxicity follows the ASPCA toxic/non-toxic plant lists and must be
// re-checked against them; null means not confirmed.
import type {
  Difficulty,
  LightLevel,
  PlantSpot,
} from '../src/generated/prisma/client.js';

export interface SeedSpecies {
  scientificName: string;
  turkishName: string;
  otherNames: string[];
  synonyms?: string[];
  family: string;
  light: LightLevel;
  difficulty: Difficulty;
  waterSummerDays: number;
  waterWinterDays: number;
  humidity: 'düşük' | 'orta' | 'yüksek';
  tempMinC: number;
  tempMaxC: number;
  toxicToPets: boolean | null;
  toxicityNote?: string;
  summary: string;
  wateringTip: string;
  lightTip: string;
  fertilizingTip: string;
  commonProblems: string[];
  spots: PlantSpot[];
}

const SOURCE =
  'Genel bahçecilik kaynakları; evcil hayvan toksisitesi ASPCA listeleri. Uzman kontrolü bekliyor.';
export const SPECIES_SOURCE = SOURCE;

export const species: SeedSpecies[] = [
  {
    scientificName: 'Monstera deliciosa',
    turkishName: 'Deve tabanı',
    otherNames: ['Monstera'],
    family: 'Araceae',
    light: 'BRIGHT_INDIRECT',
    difficulty: 'EASY',
    waterSummerDays: 7,
    waterWinterDays: 14,
    humidity: 'orta',
    tempMinC: 15,
    tempMaxC: 30,
    toxicToPets: true,
    toxicityNote:
      'Kalsiyum oksalat kristalleri içerir; kedi ve köpeklerde ağızda tahriş, salya ve kusmaya yol açabilir.',
    summary:
      'Delikli büyük yapraklarıyla bilinen, hızlı büyüyen bir salon bitkisi. Destek çubuğuyla dik büyür.',
    wateringTip:
      'Toprağın üst 3-5 cm’i kuruyunca bol sulayın, saksı altında su bırakmayın.',
    lightTip:
      'Parlak ama dolaylı ışık sever. Doğrudan öğle güneşi yapraklarını yakar; az ışıkta yeni yapraklar deliksiz çıkar.',
    fertilizingTip:
      'İlkbahar ve yaz aylarında ayda bir sıvı yeşil bitki gübresi; kışın gübre vermeyin.',
    commonProblems: [
      'Sararan alt yapraklar: çoğunlukla fazla su',
      'Kahverengi kuru kenarlar: düşük nem veya düzensiz sulama',
      'Deliksiz yeni yapraklar: yetersiz ışık',
    ],
    spots: ['INDOOR'],
  },
  {
    scientificName: 'Epipremnum aureum',
    turkishName: 'Pothos',
    otherNames: ['Altın sarmaşık', 'Şeytan sarmaşığı'],
    family: 'Araceae',
    light: 'PARTIAL',
    difficulty: 'NO_FUSS',
    waterSummerDays: 7,
    waterWinterDays: 12,
    humidity: 'orta',
    tempMinC: 15,
    tempMaxC: 30,
    toxicToPets: true,
    toxicityNote:
      'Kalsiyum oksalat içerir; evcil hayvanlarda ağız tahrişi ve kusma yapabilir.',
    summary:
      'Sarkan ya da tırmanan, bakımı çok kolay bir sarmaşık. Az ışığa dayanıklıdır, çelikle kolay çoğalır.',
    wateringTip:
      'Toprağın yarısı kuruyunca sulayın; yapraklar hafif sarkınca su zamanı gelmiştir.',
    lightTip:
      'Orta ve az ışıkta yaşar; alacalı yapraklar için parlak dolaylı ışık daha iyidir.',
    fertilizingTip: 'Büyüme döneminde ayda bir, yarı dozda sıvı gübre.',
    commonProblems: [
      'Sararan yapraklar: fazla su',
      'Alacanın kaybolması: az ışık',
      'Uzun çıplak gövdeler: budama ve ışık eksikliği',
    ],
    spots: ['INDOOR'],
  },
  {
    scientificName: 'Dracaena trifasciata',
    turkishName: 'Paşa kılıcı',
    otherNames: ['Sansevieria', 'Kaynana dili'],
    synonyms: ['Sansevieria trifasciata', 'Sansevieria'],
    family: 'Asparagaceae',
    light: 'PARTIAL',
    difficulty: 'NO_FUSS',
    waterSummerDays: 14,
    waterWinterDays: 30,
    humidity: 'düşük',
    tempMinC: 12,
    tempMaxC: 32,
    toxicToPets: true,
    toxicityNote:
      'Saponin içerir; evcil hayvanlarda bulantı ve kusma yapabilir, genellikle hafiftir.',
    summary:
      'Dik, kılıç biçimli yapraklı, kuraklığa çok dayanıklı bir bitki. Unutulmaya en dayanıklı salon bitkilerinden.',
    wateringTip:
      'Toprak tamamen kuruyunca sulayın. Kışın ayda bir yeterli; en büyük tehlike fazla sudur.',
    lightTip: 'Az ışıktan parlak ışığa kadar her yerde yaşar.',
    fertilizingTip: 'Yazın 1-2 ayda bir yarı dozda gübre yeter.',
    commonProblems: [
      'Yumuşayan, kokan dip: kök çürümesi, fazla su',
      'Kırışan yapraklar: uzun süre susuz kalma',
    ],
    spots: ['INDOOR'],
  },
  {
    scientificName: 'Zamioculcas zamiifolia',
    turkishName: 'ZZ bitkisi',
    otherNames: ['Zamioculcas', 'Zenginlik çiçeği'],
    family: 'Araceae',
    light: 'PARTIAL',
    difficulty: 'NO_FUSS',
    waterSummerDays: 14,
    waterWinterDays: 28,
    humidity: 'düşük',
    tempMinC: 15,
    tempMaxC: 30,
    toxicToPets: true,
    toxicityNote:
      'Kalsiyum oksalat içerir; evcil hayvanlar ve çocuklar yememeli.',
    summary:
      'Parlak koyu yeşil yapraklı, toprak altındaki yumrularında su depolayan dayanıklı bir bitki.',
    wateringTip:
      'Toprak tamamen kuruyunca sulayın; yumruları su tuttuğu için seyrek sulama yeterli.',
    lightTip: 'Az ışığa dayanır, parlak dolaylı ışıkta daha hızlı büyür.',
    fertilizingTip: 'İlkbahar ve yaz 1-2 ayda bir yarı dozda gübre.',
    commonProblems: [
      'Sararan yapraklar ve yumuşak gövde: fazla su',
      'Yavaş büyüme: normaldir, az ışıkta daha da yavaşlar',
    ],
    spots: ['INDOOR'],
  },
  {
    scientificName: 'Ficus elastica',
    turkishName: 'Kauçuk ağacı',
    otherNames: ['Kauçuk', 'Lastik ağacı'],
    family: 'Moraceae',
    light: 'BRIGHT_INDIRECT',
    difficulty: 'EASY',
    waterSummerDays: 7,
    waterWinterDays: 14,
    humidity: 'orta',
    tempMinC: 15,
    tempMaxC: 29,
    toxicToPets: true,
    toxicityNote:
      'Süt özsuyu evcil hayvanlarda ağız ve mide tahrişi yapabilir; ciltte de tahriş edebilir.',
    summary:
      'Kalın, parlak yapraklı, ağaç gibi büyüyen bir ficus. Yer değiştirmeyi sevmez.',
    wateringTip: 'Üst 3-4 cm kuruyunca sulayın; kışın aralığı açın.',
    lightTip:
      'Parlak dolaylı ışık; sabah güneşine dayanır. Karanlıkta alt yapraklarını döker.',
    fertilizingTip: 'Büyüme döneminde ayda bir sıvı gübre.',
    commonProblems: [
      'Yaprak dökme: ani yer veya sıcaklık değişimi, cereyan',
      'Tozlanan yapraklar: nemli bezle silin',
    ],
    spots: ['INDOOR'],
  },
  {
    scientificName: 'Ficus lyrata',
    turkishName: 'Keman yapraklı incir',
    otherNames: ['Ficus lyrata', 'Keman ficus'],
    family: 'Moraceae',
    light: 'BRIGHT_INDIRECT',
    difficulty: 'MODERATE',
    waterSummerDays: 7,
    waterWinterDays: 12,
    humidity: 'orta',
    tempMinC: 16,
    tempMaxC: 29,
    toxicToPets: true,
    toxicityNote: 'Süt özsuyu evcil hayvanlarda tahriş yapabilir.',
    summary:
      'İri, keman biçimli yapraklarıyla dekoratif ama hassas bir ficus. Düzenli bakım ve sabit bir yer ister.',
    wateringTip:
      'Üst 5 cm kuruyunca sulayın; hem fazla hem az suya kahverengi lekelerle tepki verir.',
    lightTip: 'Pencereye yakın, bol dolaylı ışık; saksıyı ara sıra çevirin.',
    fertilizingTip: 'İlkbahar-yaz ayda bir gübre.',
    commonProblems: [
      'Kahverengi lekeler: düzensiz sulama veya kök çürümesi',
      'Yaprak dökme: yer değişikliği, soğuk cereyan',
    ],
    spots: ['INDOOR'],
  },
  {
    scientificName: 'Spathiphyllum wallisii',
    turkishName: 'Barış çiçeği',
    otherNames: ['Spatifilyum', 'Yelken çiçeği'],
    synonyms: ['Spathiphyllum'],
    family: 'Araceae',
    light: 'PARTIAL',
    difficulty: 'EASY',
    waterSummerDays: 5,
    waterWinterDays: 10,
    humidity: 'yüksek',
    tempMinC: 16,
    tempMaxC: 30,
    toxicToPets: true,
    toxicityNote:
      'Kalsiyum oksalat içerir; evcil hayvanlarda ağız tahrişi ve salya yapabilir.',
    summary:
      'Beyaz yelken biçimli çiçekleri olan, susadığında yapraklarını belirgin biçimde sarkıtan bir salon bitkisi.',
    wateringTip:
      'Toprağı hafif nemli tutun; yapraklar sarkınca hemen sulayın, birkaç saatte toparlanır.',
    lightTip: 'Orta ve az ışık; doğrudan güneş yapraklarını yakar.',
    fertilizingTip:
      'Çiçeklenme döneminde ayda bir çiçekli bitki gübresi, yarı dozda.',
    commonProblems: [
      'Kahverengi yaprak uçları: kuru hava veya klorlu su',
      'Çiçek açmama: az ışık',
    ],
    spots: ['INDOOR'],
  },
  {
    scientificName: 'Chlorophytum comosum',
    turkishName: 'Kurdele çiçeği',
    otherNames: ['Örümcek bitkisi'],
    family: 'Asparagaceae',
    light: 'PARTIAL',
    difficulty: 'NO_FUSS',
    waterSummerDays: 6,
    waterWinterDays: 12,
    humidity: 'orta',
    tempMinC: 10,
    tempMaxC: 30,
    toxicToPets: false,
    summary:
      'Uzun şeritli yapraklı, yavrularıyla kolay çoğalan, evcil hayvan dostu bir bitki.',
    wateringTip: 'Üst toprak kuruyunca sulayın; kalın kökleri suyu depolar.',
    lightTip: 'Parlak dolaylı ışık en iyisi; az ışıkta alacası solar.',
    fertilizingTip: 'Büyüme döneminde ayda bir yarı dozda gübre.',
    commonProblems: [
      'Kahverengi uçlar: florürlü/klorlu su veya kuru hava',
      'Yavru vermeme: saksı büyük gelmiştir veya ışık azdır',
    ],
    spots: ['INDOOR', 'BALCONY'],
  },
  {
    scientificName: 'Aloe vera',
    turkishName: 'Aloe vera',
    otherNames: ['Sarısabır'],
    synonyms: ['Aloe barbadensis'],
    family: 'Asphodelaceae',
    light: 'DIRECT',
    difficulty: 'NO_FUSS',
    waterSummerDays: 14,
    waterWinterDays: 30,
    humidity: 'düşük',
    tempMinC: 10,
    tempMaxC: 35,
    toxicToPets: true,
    toxicityNote:
      'Yaprak kabuğundaki maddeler kedi ve köpeklerde kusma ve ishal yapabilir.',
    summary: 'Etli yapraklarında su depolayan, bol güneş seven bir sukulent.',
    wateringTip:
      'Toprak tamamen kuruyunca sulayın; kışın çok seyrek. Kaktüs toprağı kullanın.',
    lightTip:
      'Güneşli pencere veya balkon; birden güneşe çıkarırsanız yapraklar kızarabilir, alıştırın.',
    fertilizingTip: 'Yazın 1-2 kez kaktüs gübresi yeter.',
    commonProblems: [
      'Yumuşak, şeffaf yapraklar: fazla su',
      'İnce, yayılan yapraklar: az ışık',
    ],
    spots: ['INDOOR', 'BALCONY'],
  },
  {
    scientificName: 'Phalaenopsis',
    turkishName: 'Kelebek orkide',
    otherNames: ['Orkide', 'Falenopsis'],
    synonyms: ['Phalaenopsis amabilis', 'Phalaenopsis aphrodite'],
    family: 'Orchidaceae',
    light: 'BRIGHT_INDIRECT',
    difficulty: 'MODERATE',
    waterSummerDays: 7,
    waterWinterDays: 12,
    humidity: 'orta',
    tempMinC: 18,
    tempMaxC: 30,
    toxicToPets: false,
    summary:
      'Uzun süre açan çiçekleriyle en yaygın orkide. Toprakta değil kabuk karışımında yetişir.',
    wateringTip:
      'Kökler gümüşi griye dönünce saksıyı 10-15 dakika suda bekletin, suyunu tamamen süzün. Yaprak arasında su bırakmayın.',
    lightTip:
      'Doğu veya kuzey penceresi gibi parlak dolaylı ışık; doğrudan güneş yaprakları yakar.',
    fertilizingTip:
      'Büyüme döneminde iki-üç sulamada bir, orkide gübresiyle çok seyreltik.',
    commonProblems: [
      'Kararan, yumuşak kökler: fazla su',
      'Yeniden çiçek açmama: gece sıcaklığının biraz düşmesi (yaklaşık 5 °C fark) tetikler',
    ],
    spots: ['INDOOR'],
  },
  {
    scientificName: 'Pelargonium',
    turkishName: 'Sardunya',
    otherNames: ['Itır', 'Pelargonyum'],
    synonyms: [
      'Pelargonium × hortorum',
      'Pelargonium hortorum',
      'Pelargonium zonale',
      'Pelargonium peltatum',
    ],
    family: 'Geraniaceae',
    light: 'DIRECT',
    difficulty: 'EASY',
    waterSummerDays: 3,
    waterWinterDays: 10,
    humidity: 'düşük',
    tempMinC: 5,
    tempMaxC: 32,
    toxicToPets: true,
    toxicityNote:
      'Kedi ve köpeklerde kusma, iştahsızlık ve ciltte tahriş yapabilir.',
    summary:
      'Balkonların vazgeçilmez çiçeği; güneşte bol çiçek açar, kuraklığa dayanıklıdır.',
    wateringTip:
      'Üst toprak kuruyunca sulayın; yaz sıcağında balkonda her 2-3 günde bir. Yapraklarını ıslatmayın.',
    lightTip: 'Günde en az 6 saat güneş; gölgede çiçek azalır.',
    fertilizingTip:
      'Çiçeklenme boyunca iki haftada bir çiçekli bitki gübresi. Solan çiçekleri koparın.',
    commonProblems: [
      'Sararan alt yapraklar: fazla su',
      'Uzayan, seyrek dallar: az ışık; uç alma ile sıklaştırın',
      'Dondan zarar görme: kışın 5 °C altına düşmeyen bir yere alın',
    ],
    spots: ['BALCONY', 'GARDEN', 'INDOOR'],
  },
  {
    scientificName: 'Ocimum basilicum',
    turkishName: 'Fesleğen',
    otherNames: ['Reyhan'],
    family: 'Lamiaceae',
    light: 'DIRECT',
    difficulty: 'EASY',
    waterSummerDays: 2,
    waterWinterDays: 5,
    humidity: 'orta',
    tempMinC: 12,
    tempMaxC: 35,
    toxicToPets: false,
    summary:
      'Mutfakta kullanılan, sıcak ve güneş seven tek yıllık bir ot. Balkon saksısında kolay yetişir.',
    wateringTip:
      'Toprağı sürekli hafif nemli tutun; yaz sıcağında her gün kontrol edin.',
    lightTip: 'Günde 6-8 saat güneş; soğuğa ve rüzgâra hassastır.',
    fertilizingTip: 'Ayda bir organik sıvı gübre yeterli.',
    commonProblems: [
      'Çiçeklenme: tepe tomurcuklarını koparın, yapraklar acılaşmasın',
      'Siyahlaşan yapraklar: soğuk gece veya fazla su',
    ],
    spots: ['BALCONY', 'GARDEN', 'INDOOR'],
  },
  {
    scientificName: 'Solanum lycopersicum',
    turkishName: 'Domates',
    otherNames: ['Balkon domatesi', 'Cherry domates'],
    family: 'Solanaceae',
    light: 'DIRECT',
    difficulty: 'MODERATE',
    waterSummerDays: 2,
    waterWinterDays: 7,
    humidity: 'orta',
    tempMinC: 12,
    tempMaxC: 32,
    toxicToPets: true,
    toxicityNote:
      'Yaprak ve yeşil gövdeleri evcil hayvanlarda mide rahatsızlığı yapabilir; olgun meyve sorun değildir.',
    summary:
      'Balkon ve bahçede yetiştirilen sebze. Saksıda cherry çeşitleri daha kolaydır; destek ister.',
    wateringTip:
      'Düzenli ve derin sulayın; sıcakta saksılar her gün su isteyebilir. Düzensiz sulama meyvede çatlama ve dip çürüklüğü yapar.',
    lightTip: 'Günde en az 6-8 saat doğrudan güneş.',
    fertilizingTip:
      'Çiçeklenmeden sonra iki haftada bir domates/sebze gübresi; aşırı azot yaprak yapar, meyve azalır.',
    commonProblems: [
      'Meyve dibinde siyah çökük leke: düzensiz sulama (çiçek burnu çürüklüğü)',
      'Alt yapraklarda kahverengi halkalı lekeler: mantar hastalığı olabilir, fotoğrafla kontrol edin',
      'Çiçek dökme: aşırı sıcak (35 °C üstü) veya soğuk geceler',
    ],
    spots: ['BALCONY', 'GARDEN'],
  },
  {
    scientificName: 'Capsicum annuum',
    turkishName: 'Biber',
    otherNames: ['Sivri biber', 'Dolma biber', 'Süs biberi'],
    family: 'Solanaceae',
    light: 'DIRECT',
    difficulty: 'EASY',
    waterSummerDays: 2,
    waterWinterDays: 7,
    humidity: 'orta',
    tempMinC: 15,
    tempMaxC: 32,
    toxicToPets: null,
    summary:
      'Sıcak seven bir sebze; saksıda da verimlidir. Süs biberleri iç mekânda da yetişir.',
    wateringTip:
      'Toprağı eşit nemli tutun, üst yüzey kuruyunca sulayın; su birikmesinden kaçının.',
    lightTip: 'Günde 6-8 saat güneş; 15 °C altındaki gecelerde büyüme durur.',
    fertilizingTip:
      'Çiçeklenme ve meyve döneminde iki haftada bir sebze gübresi.',
    commonProblems: [
      'Çiçek dökme: sıcaklık stresi veya düzensiz sulama',
      'Yaprak altında küçük böcekler: yaprak biti olabilir, fotoğrafla kontrol edin',
    ],
    spots: ['BALCONY', 'GARDEN'],
  },
  {
    scientificName: 'Citrus limon',
    turkishName: 'Limon',
    otherNames: ['Saksı limonu', 'Mayer limonu'],
    synonyms: ['Citrus × limon', 'Citrus × meyeri', 'Citrus meyeri'],
    family: 'Rutaceae',
    light: 'DIRECT',
    difficulty: 'MODERATE',
    waterSummerDays: 4,
    waterWinterDays: 10,
    humidity: 'orta',
    tempMinC: 5,
    tempMaxC: 35,
    toxicToPets: true,
    toxicityNote:
      'Yaprak ve kabuktaki uçucu yağlar kedi ve köpeklerde kusma, ishal ve ışığa duyarlılık yapabilir.',
    summary:
      'Saksıda da meyve veren narenciye. Güneşi ve düzenli sulamayı sever, dona hassastır.',
    wateringTip:
      'Üst 3-5 cm kuruyunca derin sulayın; saksı tabanında su kalmasın.',
    lightTip:
      'Günde en az 6 saat güneş; kışın içeri alırsanız en aydınlık pencereye koyun.',
    fertilizingTip:
      'Mart-ekim arası ayda bir narenciye gübresi; sararan yapraklar demir eksikliği olabilir.',
    commonProblems: [
      'Damarları yeşil kalıp sararan yapraklar: demir veya magnezyum eksikliği',
      'Yaprak dökme: ani sıcaklık değişimi veya kuru kalma',
      'Yapışkan yapraklar: koşnil veya yaprak biti olabilir, fotoğrafla kontrol edin',
    ],
    spots: ['BALCONY', 'GARDEN', 'INDOOR'],
  },
  {
    scientificName: 'Olea europaea',
    turkishName: 'Zeytin',
    otherNames: ['Saksı zeytini', 'Bonsai zeytin'],
    family: 'Oleaceae',
    light: 'DIRECT',
    difficulty: 'EASY',
    waterSummerDays: 7,
    waterWinterDays: 21,
    humidity: 'düşük',
    tempMinC: 0,
    tempMaxC: 40,
    toxicToPets: false,
    summary:
      'Akdeniz’in kuraklığa dayanıklı ağacı; saksıda balkon ve terasta yıllarca yaşar.',
    wateringTip:
      'Toprak iyice kuruyunca derin sulayın; saksıdakiler bahçedekilerden sık su ister. Fazla su köklere zarar verir.',
    lightTip: 'Tam güneş; iç mekânda uzun süre kalırsa zayıflar.',
    fertilizingTip:
      'İlkbaharda ve yaz başında birer kez yavaş salınımlı gübre.',
    commonProblems: [
      'Yaprak dökme: kışın içeride az ışık',
      'Saksıda dondan zarar: sert ayazlarda kökleri korumak için saksıyı sarın',
    ],
    spots: ['BALCONY', 'GARDEN'],
  },
  {
    scientificName: 'Salvia rosmarinus',
    turkishName: 'Biberiye',
    otherNames: ['Kuşdili'],
    synonyms: ['Rosmarinus officinalis'],
    family: 'Lamiaceae',
    light: 'DIRECT',
    difficulty: 'NO_FUSS',
    waterSummerDays: 7,
    waterWinterDays: 14,
    humidity: 'düşük',
    tempMinC: -5,
    tempMaxC: 35,
    toxicToPets: false,
    summary:
      'Kokulu, her dem yeşil bir aromatik çalı. Güneşli balkonda az bakımla yaşar.',
    wateringTip:
      'Toprak kuruyunca sulayın; ıslak toprağı sevmez, saksının drenajı iyi olmalı.',
    lightTip: 'Tam güneş.',
    fertilizingTip: 'Çok az gübre ister; ilkbaharda bir kez yeterli.',
    commonProblems: [
      'Kuruyan dal uçları: kök çürümesi (fazla su) veya tam kuruma',
      'Beyaz pudramsı kaplama: külleme olabilir, havalandırmayı artırın',
    ],
    spots: ['BALCONY', 'GARDEN'],
  },
  {
    scientificName: 'Crassula ovata',
    turkishName: 'Para ağacı',
    otherNames: ['Yeşim bitkisi', 'Krassula'],
    family: 'Crassulaceae',
    light: 'DIRECT',
    difficulty: 'NO_FUSS',
    waterSummerDays: 14,
    waterWinterDays: 28,
    humidity: 'düşük',
    tempMinC: 10,
    tempMaxC: 30,
    toxicToPets: true,
    toxicityNote: 'Kedi ve köpeklerde kusma ve halsizlik yapabilir.',
    summary: 'Etli yapraklı, ağaçsı büyüyen, uzun ömürlü bir sukulent.',
    wateringTip: 'Toprak tamamen kuruyunca sulayın; kışın çok seyrek.',
    lightTip:
      'Güneşli pencere; birkaç saat doğrudan güneş yaprak kenarlarını kızartır, bu normaldir.',
    fertilizingTip: 'Yazın 1-2 kez kaktüs gübresi.',
    commonProblems: [
      'Buruşan yapraklar: susuzluk',
      'Dökülen, yumuşak yapraklar: fazla su',
    ],
    spots: ['INDOOR', 'BALCONY'],
  },
  {
    scientificName: 'Begonia',
    turkishName: 'Begonya',
    otherNames: ['Begonya'],
    synonyms: [
      'Begonia × semperflorens-cultorum',
      'Begonia maculata',
      'Begonia rex',
    ],
    family: 'Begoniaceae',
    light: 'BRIGHT_INDIRECT',
    difficulty: 'MODERATE',
    waterSummerDays: 5,
    waterWinterDays: 10,
    humidity: 'yüksek',
    tempMinC: 15,
    tempMaxC: 28,
    toxicToPets: true,
    toxicityNote:
      'Özellikle yumruları evcil hayvanlarda ağız tahrişi ve kusma yapabilir.',
    summary:
      'Renkli yaprakları veya bol çiçekleriyle sevilen, nemli ortamı seven bir bitki ailesi.',
    wateringTip:
      'Üst toprak kuruyunca dipten sulayın; yapraklarını ıslatmayın, çürüme yapar.',
    lightTip: 'Parlak dolaylı ışık; öğle güneşi yaprakları yakar.',
    fertilizingTip: 'Büyüme döneminde iki haftada bir yarı dozda gübre.',
    commonProblems: [
      'Yapraklarda beyaz pudramsı kaplama: külleme',
      'Çürüyen gövde dibi: fazla su',
    ],
    spots: ['INDOOR', 'BALCONY'],
  },
  {
    scientificName: 'Goeppertia',
    turkishName: 'Kalatya',
    otherNames: ['Calathea', 'Tavus kuşu bitkisi'],
    synonyms: [
      'Calathea',
      'Goeppertia makoyana',
      'Goeppertia orbifolia',
      'Calathea orbifolia',
      'Goeppertia insignis',
    ],
    family: 'Marantaceae',
    light: 'PARTIAL',
    difficulty: 'MODERATE',
    waterSummerDays: 5,
    waterWinterDays: 9,
    humidity: 'yüksek',
    tempMinC: 18,
    tempMaxC: 29,
    toxicToPets: false,
    summary:
      'Desenli yaprakları gece kapanan, nem ve düzen isteyen bir salon bitkisi.',
    wateringTip:
      'Toprağı hafif nemli tutun, tamamen kurutmayın; mümkünse dinlendirilmiş veya filtreli su kullanın.',
    lightTip: 'Orta, dolaylı ışık; güneş desenleri soldurur.',
    fertilizingTip: 'Büyüme döneminde ayda bir yarı dozda gübre.',
    commonProblems: [
      'Kıvrılan yapraklar: susuzluk veya kuru hava',
      'Kahverengi kenarlar: düşük nem, klorlu su',
    ],
    spots: ['INDOOR'],
  },
  {
    scientificName: 'Schlumbergera truncata',
    turkishName: 'Yılbaşı çiçeği',
    otherNames: ['Noel kaktüsü', 'Kırmızı kaktüs'],
    synonyms: ['Schlumbergera', 'Schlumbergera × buckleyi'],
    family: 'Cactaceae',
    light: 'BRIGHT_INDIRECT',
    difficulty: 'EASY',
    waterSummerDays: 7,
    waterWinterDays: 14,
    humidity: 'orta',
    tempMinC: 10,
    tempMaxC: 27,
    toxicToPets: false,
    summary:
      'Kışın açan, yassı segmentli bir orman kaktüsü. Çöl kaktüslerinden daha çok su ister.',
    wateringTip:
      'Üst toprak kuruyunca sulayın; tomurcuk döneminde düzenli sulayın.',
    lightTip:
      'Parlak dolaylı ışık. Tomurcuklanması için sonbaharda uzun ve serin geceler gerekir.',
    fertilizingTip: 'İlkbahar-yaz ayda bir yarı dozda gübre.',
    commonProblems: [
      'Tomurcuk dökme: yer değiştirme veya sıcaklık değişimi',
      'Kızaran segmentler: fazla güneş',
    ],
    spots: ['INDOOR'],
  },
  {
    scientificName: 'Kalanchoe blossfeldiana',
    turkishName: 'Kalanşo',
    otherNames: ['Kalanchoe'],
    synonyms: ['Kalanchoe'],
    family: 'Crassulaceae',
    light: 'DIRECT',
    difficulty: 'NO_FUSS',
    waterSummerDays: 10,
    waterWinterDays: 20,
    humidity: 'düşük',
    tempMinC: 10,
    tempMaxC: 30,
    toxicToPets: true,
    toxicityNote:
      'Kalp glikozitleri içerir; evcil hayvanlarda kusma, ishal ve nadiren kalp ritmi bozukluğu yapabilir.',
    summary: 'Uzun süre çiçekli kalan, etli yapraklı bir sukulent.',
    wateringTip: 'Toprak kuruyunca sulayın; fazla su gövdeyi çürütür.',
    lightTip: 'Parlak ışık ve birkaç saat güneş.',
    fertilizingTip: 'Çiçeklenmede ayda bir yarı dozda gübre.',
    commonProblems: [
      'Uzayan gövdeler: az ışık',
      'Yeniden açmama: sonbaharda kısa gün (günde 12-14 saat karanlık) gerekir',
    ],
    spots: ['INDOOR', 'BALCONY'],
  },
  {
    scientificName: 'Dieffenbachia seguine',
    turkishName: 'Difenbahya',
    otherNames: ['Dieffenbachia', 'Dilsiz kamış'],
    synonyms: ['Dieffenbachia'],
    family: 'Araceae',
    light: 'PARTIAL',
    difficulty: 'EASY',
    waterSummerDays: 6,
    waterWinterDays: 12,
    humidity: 'orta',
    tempMinC: 16,
    tempMaxC: 29,
    toxicToPets: true,
    toxicityNote:
      'Kalsiyum oksalat içerir; çiğnenirse ağız ve boğazda şişme yapar. Çocuklardan ve evcil hayvanlardan uzak tutun.',
    summary: 'Geniş, alacalı yapraklı, hızlı büyüyen bir salon bitkisi.',
    wateringTip: 'Üst toprak kuruyunca sulayın; kışın aralığı açın.',
    lightTip: 'Orta, dolaylı ışık.',
    fertilizingTip: 'Büyüme döneminde ayda bir sıvı gübre.',
    commonProblems: [
      'Sararan alt yapraklar: yaşlanma veya fazla su',
      'Kahverengi kenarlar: soğuk cereyan veya kuru hava',
    ],
    spots: ['INDOOR'],
  },
  {
    scientificName: 'Nephrolepis exaltata',
    turkishName: 'Boston eğreltisi',
    otherNames: ['Eğrelti otu', 'Pamukçuk'],
    synonyms: ['Nephrolepis'],
    family: 'Nephrolepidaceae',
    light: 'PARTIAL',
    difficulty: 'MODERATE',
    waterSummerDays: 3,
    waterWinterDays: 6,
    humidity: 'yüksek',
    tempMinC: 15,
    tempMaxC: 27,
    toxicToPets: false,
    summary:
      'Gür, sarkan yapraklı bir eğrelti. Nemli banyolar ve gölgeli balkonlar için uygundur.',
    wateringTip:
      'Toprağı sürekli nemli tutun ama çamur yapmayın; kurursa yaprakları hızla dökülür.',
    lightTip: 'Gölge ve yarı gölge; doğrudan güneşten koruyun.',
    fertilizingTip: 'Büyüme döneminde ayda bir yarı dozda gübre.',
    commonProblems: [
      'Kuruyan, dökülen yapraklar: kuru hava veya susuzluk',
      'Sararma: fazla güneş',
    ],
    spots: ['INDOOR', 'BALCONY'],
  },
];
