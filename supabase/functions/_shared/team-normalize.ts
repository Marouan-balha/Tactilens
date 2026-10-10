// Shared team name normalizer used by RAG ingestion + analyst RPC filtering.
// Canonical keys are lowercase, ASCII, no club prefixes/suffixes.

const ALIASES: Record<string, string[]> = {
  'bayern munich': ['bayern', 'bayern munich', 'bayern münchen', 'fc bayern', 'fc bayern münchen', 'fcb münchen', 'munchen'],
  'real madrid': ['real madrid', 'real madrid cf', 'madrid cf', 'rma'],
  'atletico madrid': ['atletico', 'atletico madrid', 'atlético', 'atlético madrid', 'club atlético de madrid', 'atleti', 'atl'],
  'barcelona': ['barcelona', 'fc barcelona', 'barça', 'barca', 'barça fc'],
  'psg': ['psg', 'paris saint-germain', 'paris saint germain', 'paris saint-germain fc', 'paris sg'],
  'manchester united': ['manchester united', 'man utd', 'man united', 'mufc'],
  'manchester city': ['manchester city', 'man city', 'mcfc', 'mci'],
  'liverpool': ['liverpool', 'liverpool fc', 'lfc'],
  'arsenal': ['arsenal', 'arsenal fc', 'gunners', 'ars'],
  'chelsea': ['chelsea', 'chelsea fc', 'che'],
  'tottenham': ['tottenham', 'tottenham hotspur', 'spurs', 'tot'],
  'newcastle': ['newcastle', 'newcastle united', 'nufc', 'new'],
  'aston villa': ['aston villa', 'villa'],
  'brighton': ['brighton', 'brighton & hove albion'],
  'west ham': ['west ham', 'west ham united'],
  'juventus': ['juventus', 'juve', 'juventus fc'],
  'inter milan': ['inter milan', 'inter', 'internazionale', 'fc internazionale', 'int'],
  'ac milan': ['ac milan', 'milan', 'a.c. milan'],
  'napoli': ['napoli', 'ssc napoli', 'nap'],
  'atalanta': ['atalanta', 'atalanta bc', 'ata'],
  'roma': ['roma', 'as roma'],
  'lazio': ['lazio', 'ss lazio'],
  'dortmund': ['dortmund', 'borussia dortmund', 'bvb'],
  'leverkusen': ['leverkusen', 'bayer leverkusen', 'bayer 04', 'b04'],
  'frankfurt': ['frankfurt', 'eintracht frankfurt', 'sge'],
  'rb leipzig': ['rb leipzig', 'leipzig'],
  'monaco': ['monaco', 'as monaco', 'asm'],
  'marseille': ['marseille', 'olympique de marseille', 'om', 'mar'],
  'lyon': ['lyon', 'olympique lyonnais', 'ol'],
  'lille': ['lille', 'losc lille'],
  'sporting cp': ['sporting', 'sporting cp', 'sporting clube de portugal', 'spo'],
  'benfica': ['benfica', 'sl benfica', 'ben'],
  'porto': ['porto', 'fc porto'],
  'ajax': ['ajax', 'afc ajax', 'aja'],
  'psv': ['psv', 'psv eindhoven'],
  'feyenoord': ['feyenoord'],
  'club brugge': ['club brugge', 'brugge', 'clu'],
  'galatasaray': ['galatasaray', 'gal'],
  'fenerbahce': ['fenerbahce', 'fenerbahçe'],
  'celtic': ['celtic', 'celtic fc'],
  'rangers': ['rangers', 'rangers fc'],
  'bodo glimt': ['bodo glimt', 'bodø/glimt', 'bodo/glimt', 'fk bodø'],
  'olympiakos': ['olympiakos', 'oly'],
  'qarabag': ['qarabağ', 'qarabag', 'qarabağ ağdam', 'qar'],
  'paphos': ['paphos', 'paphos fc', 'aep'],
  'union sg': ['union sg', 'union saint-gilloise', 'usg'],
  'kobenhavn': ['københavn', 'kobenhavn', 'fc københavn', 'kob'],
  'slavia praha': ['slavia praha', 'slavia prague', 'slp'],
  'villarreal': ['villarreal', 'villarreal cf', 'vil'],
  'kairat': ['kairat', 'fk kairat', 'kai'],
  'athletic bilbao': ['athletic', 'athletic bilbao', 'athletic club', 'ath'],
  // National teams / FIFA World Cup 2026 teams. These tags let the RAG
  // pipeline retrieve international-team documents without matching club data.
  'algeria': ['algeria', 'algérie'],
  'argentina': ['argentina', 'arg'],
  'australia': ['australia', 'australia socceroos'],
  'austria': ['austria', 'österreich'],
  'belgium': ['belgium', 'belgië', 'belgique'],
  'bosnia and herzegovina': ['bosnia and herzegovina', 'bosnia-herzegovina', 'bosnia', 'bih'],
  'brazil': ['brazil', 'brasil'],
  'canada': ['canada'],
  'cape verde': ['cape verde', 'cabo verde', 'cpv'],
  'colombia': ['colombia'],
  'costa rica': ['costa rica'],
  'croatia': ['croatia', 'hrvatska'],
  'curacao': ['curacao', 'curaçao', 'cuw'],
  'czechia': ['czechia', 'czech republic'],
  'denmark': ['denmark', 'danmark'],
  'dr congo': ['dr congo', 'congo dr', 'democratic republic of the congo', 'congo', 'cod'],
  'ecuador': ['ecuador'],
  'egypt': ['egypt', 'misr'],
  'england': ['england', 'three lions'],
  'france': ['france', 'les bleus'],
  'germany': ['germany', 'deutschland'],
  'ghana': ['ghana'],
  'haiti': ['haiti', 'haïti'],
  'iran': ['iran', 'ir iran'],
  'iraq': ['iraq'],
  'ivory coast': ['ivory coast', 'cote d ivoire', "côte d'ivoire", 'côte divoire'],
  'japan': ['japan', 'nippon'],
  'jordan': ['jordan'],
  'korea republic': ['korea republic', 'south korea', 'korea'],
  'mexico': ['mexico', 'méxico'],
  'morocco': ['morocco', 'maroc'],
  'netherlands': ['netherlands', 'holland', 'oranje'],
  'new zealand': ['new zealand', 'all whites'],
  'norway': ['norway', 'norge'],
  'panama': ['panama', 'panamá'],
  'paraguay': ['paraguay'],
  'portugal': ['portugal'],
  'qatar': ['qatar'],
  'saudi arabia': ['saudi arabia', 'ksa'],
  'scotland': ['scotland'],
  'senegal': ['senegal', 'sénégal'],
  'south africa': ['south africa', 'rsa', 'bafana'],
  'spain': ['spain', 'españa', 'la roja'],
  'sweden': ['sweden', 'sverige'],
  'switzerland': ['switzerland', 'swiss', 'suisse', 'schweiz', 'switzlerland'],
  'tunisia': ['tunisia', 'tunisie'],
  'turkey': ['turkey', 'türkiye', 'turkiye'],
  'united states': ['united states', 'usa', 'usmnt', 'u s a'],
  'uruguay': ['uruguay'],
  'uzbekistan': ['uzbekistan'],
};

const REVERSE = (() => {
  const m = new Map<string, string>();
  for (const [canon, aliases] of Object.entries(ALIASES)) {
    m.set(canon, canon);
    for (const a of aliases) m.set(a, canon);
  }
  return m;
})();

function clean(input: string): string {
  return input
    .toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '') // strip accents
    .replace(/&amp;/g, '&')
    .replace(/\b(fc|cf|sc|ac|as|ss|ssc|sl|afc|cfc|lfc|rfc|club|de|del)\b/g, ' ')
    .replace(/[^a-z0-9 /]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function normalizeTeam(input: string | null | undefined): string {
  if (!input) return '';
  const c = clean(input);
  if (!c) return '';
  // direct hit
  if (REVERSE.has(c)) return REVERSE.get(c)!;
  // try alias contains
  for (const [alias, canon] of REVERSE) {
    if (c === alias) return canon;
  }
  // partial includes (longest alias first)
  const sorted = Array.from(REVERSE.keys()).sort((a, b) => b.length - a.length);
  for (const alias of sorted) {
    if (alias.length >= 4 && c.includes(alias)) return REVERSE.get(alias)!;
  }
  return c;
}

export function extractTeamTags(text: string, max = 8): string[] {
  const c = clean(text);
  const found = new Set<string>();
  for (const [alias, canon] of REVERSE) {
    if (alias.length >= 4 && c.includes(alias)) found.add(canon);
    if (found.size >= max) break;
  }
  return Array.from(found);
}
