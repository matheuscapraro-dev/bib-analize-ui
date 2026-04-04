export const FIELD_MAP: Record<string, string> = {
  PT: "Tipo de Publicação", AU: "Autores", AF: "Autores (Nome Completo)",
  TI: "Título", SO: "Periódico", LA: "Idioma", DT: "Tipo de Documento",
  DE: "Palavras-chave do Autor", ID: "Keywords Plus", AB: "Resumo",
  C1: "Endereços", C3: "Afiliações", FU: "Agência Financiadora",
  CR: "Referências Citadas", NR: "Nº de Referências Citadas",
  TC: "Citações WoS Core", Z9: "Citações Total", PY: "Ano de Publicação",
  DI: "DOI", SN: "ISSN", EI: "eISSN", VL: "Volume", IS: "Fascículo",
  BP: "Página Inicial", EP: "Página Final", PG: "Contagem de Páginas",
  WC: "Categorias WoS", SC: "Áreas de Pesquisa", OA: "Acesso Aberto",
  UT: "ID Único WoS", OI: "ORCID", EM: "Email", RP: "Endereço de Reimpressão",
  _FWCI: "FWCI", _CITE_PERCENTILE: "Percentil de Citação",
  _TOP_1PCT: "Top 1% Citados", _TOP_10PCT: "Top 10% Citados",
  _GLOBAL_SOUTH: "Sul Global", _CONTINENTS: "Continentes",
  _N_COUNTRIES: "Nº Países Distintos", _N_INSTITUTIONS: "Nº Instituições Distintas",
  _INST_TYPES: "Tipos de Instituição", _CITE_TRAJECTORY: "Trajetória de Citações",
  _RETRACTED: "Retratado", _SDG: "ODS", _INDEXED: "Indexado Em",
  _OA_URL: "URL Acesso Aberto",
};

export const NUMERIC_FIELDS = [
  "NR", "TC", "Z9", "PY", "PG",
  "_FWCI", "_CITE_PERCENTILE", "_N_COUNTRIES", "_N_INSTITUTIONS",
];

export const COUNTRY_NORMALIZE: Record<string, string> = {
  "PEOPLES R CHINA": "China", "P.R. CHINA": "China", "PR CHINA": "China",
  USA: "Estados Unidos", "UNITED STATES": "Estados Unidos",
  ENGLAND: "Reino Unido", SCOTLAND: "Reino Unido", WALES: "Reino Unido",
  "SOUTH KOREA": "Coreia do Sul", TAIWAN: "Taiwan", RUSSIA: "Rússia",
  GERMANY: "Alemanha", FRANCE: "França", SPAIN: "Espanha", ITALY: "Itália",
  JAPAN: "Japão", BRAZIL: "Brasil", CANADA: "Canadá", INDIA: "Índia",
  AUSTRALIA: "Austrália", NETHERLANDS: "Países Baixos", SWEDEN: "Suécia",
  SWITZERLAND: "Suíça", BELGIUM: "Bélgica", NORWAY: "Noruega",
  DENMARK: "Dinamarca", FINLAND: "Finlândia", PORTUGAL: "Portugal",
  AUSTRIA: "Áustria", POLAND: "Polônia", TURKEY: "Turquia", IRAN: "Irã",
  ISRAEL: "Israel", MEXICO: "México", SINGAPORE: "Singapura",
  MALAYSIA: "Malásia", THAILAND: "Tailândia", PAKISTAN: "Paquistão",
  "SAUDI ARABIA": "Arábia Saudita", EGYPT: "Egito",
  "SOUTH AFRICA": "África do Sul", CHILE: "Chile", COLOMBIA: "Colômbia",
  ARGENTINA: "Argentina", GREECE: "Grécia",
  "CZECH REPUBLIC": "República Tcheca", ROMANIA: "Romênia",
  HUNGARY: "Hungria", IRELAND: "Irlanda", "NEW ZEALAND": "Nova Zelândia",
  "UNITED ARAB EMIRATES": "Emirados Árabes", NIGERIA: "Nigéria",
  VIETNAM: "Vietnã", INDONESIA: "Indonésia", PHILIPPINES: "Filipinas",
  BANGLADESH: "Bangladesh", MOROCCO: "Marrocos", TUNISIA: "Tunísia",
  CROATIA: "Croácia", SERBIA: "Sérvia", UKRAINE: "Ucrânia",
  BULGARIA: "Bulgária", ICELAND: "Islândia", LUXEMBOURG: "Luxemburgo",
};

export const COUNTRY_ISO: Record<string, string> = {
  China: "CHN", "Estados Unidos": "USA", "Reino Unido": "GBR",
  "Coreia do Sul": "KOR", Taiwan: "TWN", Rússia: "RUS",
  Alemanha: "DEU", França: "FRA", Espanha: "ESP", Itália: "ITA",
  Japão: "JPN", Brasil: "BRA", Canadá: "CAN", Índia: "IND",
  Austrália: "AUS", "Países Baixos": "NLD", Suécia: "SWE",
  Suíça: "CHE", Bélgica: "BEL", Noruega: "NOR", Dinamarca: "DNK",
  Finlândia: "FIN", Portugal: "PRT", Áustria: "AUT", Polônia: "POL",
  Turquia: "TUR", Irã: "IRN", Israel: "ISR", México: "MEX",
  Singapura: "SGP", Malásia: "MYS", Tailândia: "THA", Paquistão: "PAK",
  "Arábia Saudita": "SAU", Egito: "EGY", "África do Sul": "ZAF",
  Chile: "CHL", Colômbia: "COL", Argentina: "ARG", Grécia: "GRC",
  "República Tcheca": "CZE", Romênia: "ROU", Hungria: "HUN",
  Irlanda: "IRL", "Nova Zelândia": "NZL", "Emirados Árabes": "ARE",
  Nigéria: "NGA", Vietnã: "VNM", Indonésia: "IDN", Filipinas: "PHL",
  Bangladesh: "BGD", Marrocos: "MAR", Tunísia: "TUN",
  Croácia: "HRV", Sérvia: "SRB", Bulgária: "BGR", Ucrânia: "UKR",
  Islândia: "ISL", Luxemburgo: "LUX",
};

export const COUNTRY_CONTINENT: Record<string, string> = {
  AF: "Ásia", DZ: "África", AO: "África", AR: "América", AU: "Oceania",
  AT: "Europa", BD: "Ásia", BE: "Europa", BR: "América", BG: "Europa",
  CA: "América", CL: "América", CN: "Ásia", CO: "América", HR: "Europa",
  CZ: "Europa", DK: "Europa", EG: "África", EE: "Europa", FI: "Europa",
  FR: "Europa", DE: "Europa", GR: "Europa", HU: "Europa", IS: "Europa",
  IN: "Ásia", ID: "Ásia", IR: "Ásia", IQ: "Ásia", IE: "Europa",
  IL: "Ásia", IT: "Europa", JP: "Ásia", JO: "Ásia", KR: "Ásia",
  KW: "Ásia", LB: "Ásia", LU: "Europa", MY: "Ásia", MX: "América",
  MA: "África", NL: "Europa", NZ: "Oceania", NG: "África", NO: "Europa",
  PK: "Ásia", PH: "Ásia", PL: "Europa", PT: "Europa", QA: "Ásia",
  RO: "Europa", RU: "Europa", SA: "Ásia", RS: "Europa", SG: "Ásia",
  SK: "Europa", SI: "Europa", ZA: "África", ES: "Europa", LK: "Ásia",
  SE: "Europa", CH: "Europa", TW: "Ásia", TH: "Ásia", TN: "África",
  TR: "Ásia", UA: "Europa", AE: "Ásia", GB: "Europa", US: "América",
  UY: "América", VN: "Ásia", VE: "América",
};

export const GLOBAL_SOUTH_CODES = new Set([
  "AF","DZ","AO","AR","BD","BR","CN","CO","EG","ID","IN","IR","IQ","JO",
  "KE","KW","LB","MY","MX","MA","NG","PK","PH","QA","SA","ZA","LK",
  "TH","TN","TR","AE","UY","VN","VE","CL","CU",
]);

export const CHART_COLORS = [
  "var(--chart-1)", "var(--chart-2)", "var(--chart-3)",
  "var(--chart-4)", "var(--chart-5)",
];

export const RECHARTS_COLORS = [
  "var(--chart-1)", "var(--chart-2)", "var(--chart-3)",
  "var(--chart-4)", "var(--chart-5)",
];

export const TAILWIND_CHART_FILLS = [
  "fill-chart-1", "fill-chart-2", "fill-chart-3",
  "fill-chart-4", "fill-chart-5",
];

export const OA_STATUS_MAP: Record<string, string> = {
  gold: "Gold", green: "Green", bronze: "Bronze",
  hybrid: "Hybrid", closed: "Fechado", diamond: "Diamond",
};

export const DOC_TYPES: Record<string, string | null> = {
  Todos: null, Article: "article", Review: "review",
  "Book Chapter": "book-chapter", Book: "book",
  "Conference Paper": "proceedings-article", Dataset: "dataset",
  Preprint: "posted-content", Dissertation: "dissertation",
};

export const SORT_OPTIONS: Record<string, string> = {
  "Relevância ↓": "relevance_score:desc",
  "Citações ↓": "cited_by_count:desc",
  "Data ↓ (recentes)": "publication_date:desc",
  "Data ↑ (antigos)": "publication_date:asc",
};

export const LANG_MAP: Record<string, string> = {
  en: "English", pt: "Portuguese", es: "Spanish", fr: "French",
  de: "German", it: "Italian", zh: "Chinese", ja: "Japanese",
  ko: "Korean", ru: "Russian", ar: "Arabic", tr: "Turkish",
  nl: "Dutch", pl: "Polish", sv: "Swedish", cs: "Czech",
};
