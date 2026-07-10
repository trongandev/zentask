// Frontend guard for community/public text.
// Low false-positive policy: do NOT remove accents, do NOT normalize Vietnamese,
// do NOT match substrings. Backend will check again before saving.

const RAW_EXPLICIT_WORDS = [
  "địt",
  "đụ",
  "đéo",
  "cặc",
  "lồn",
  "buồi",
];

const RAW_EXPLICIT_PHRASES = [
  "địt mẹ",
  "địt con mẹ",
  "địt mẹ mày",
  "đụ má",
  "đụ mẹ",
  "đéo mẹ",
  "đm mày",
  "địt mày",
  "mẹ mày",
  "con mẹ mày",
];

const RAW_EXPLICIT_ACRONYMS = [
  "đm",
  "đmm",
  "dm",
  "dmm",
  "dcm",
  "dkm",
  "vcl",
  "ditmemay",
  "ditme",
  "dume",
  "duma",
];

// English profanity for public/community surfaces. Keep it conservative to avoid
// blocking normal English-learning words; do not include ambiguous terms like
// "ass", "hell", or "sex". Matching is boundary-based only.
const RAW_ENGLISH_EXPLICIT_WORDS = [
  "fuck",
  "fucking",
  "fucker",
  "motherfucker",
  "shit",
  "bullshit",
  "bitch",
  "asshole",
  "cunt",
  "dickhead",
  "pussy",
  "bastard",
  "slut",
  "whore",
];

const RAW_ENGLISH_EXPLICIT_PHRASES = [
  "fuck you",
  "fuck off",
  "shut the fuck up",
  "son of a bitch",
  "piece of shit",
];

const RAW_ENGLISH_EXPLICIT_ACRONYMS = [
  "wtf",
  "stfu",
  "fck",
];

const RAW_ENGLISH_VARIANT_PATTERNS: Array<{ label: string; regex: RegExp }> = [
  { label: "fuck", regex: /(^|[^\p{L}\p{N}_])f[\W_]*[u*][\W_]*c[\W_]*k([^\p{L}\p{N}_]|$)/iu },
  { label: "shit", regex: /(^|[^\p{L}\p{N}_])s[\W_]*h[\W_]*i[\W_]*t([^\p{L}\p{N}_]|$)/iu },
];

export function stripHtmlForModeration(input = "") {
  return String(input || "")
    .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?>[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'");
}

// Kept for compatibility with older imports, but intentionally no longer removes
// accents or converts "các" -> "cac".
export function normalizePublicText(input = "") {
  return stripHtmlForModeration(input).toLocaleLowerCase("vi-VN").replace(/\s+/g, " ").trim();
}

function escapeRegExp(value = "") {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function rawWordPattern(word: string) {
  return new RegExp(`(^|[^\\p{L}\\p{N}_])${escapeRegExp(word)}([^\\p{L}\\p{N}_]|$)`, "iu");
}

function rawPhrasePattern(phrase: string) {
  const parts = String(phrase || "")
    .trim()
    .split(/\s+/)
    .map(escapeRegExp)
    .join("[\\s\\p{P}]+?");
  return new RegExp(`(^|[^\\p{L}\\p{N}_])${parts}([^\\p{L}\\p{N}_]|$)`, "iu");
}

export function findPublicContentViolations(input = "") {
  const text = normalizePublicText(input);
  if (!text) return [];

  const matches: string[] = [];

  const phrases = [...RAW_EXPLICIT_PHRASES, ...RAW_ENGLISH_EXPLICIT_PHRASES];
  const words = [
    ...RAW_EXPLICIT_WORDS,
    ...RAW_EXPLICIT_ACRONYMS,
    ...RAW_ENGLISH_EXPLICIT_WORDS,
    ...RAW_ENGLISH_EXPLICIT_ACRONYMS,
  ];

  for (const phrase of phrases) {
    if (rawPhrasePattern(phrase).test(text)) matches.push(phrase);
  }
  for (const word of words) {
    if (rawWordPattern(word).test(text)) matches.push(word);
  }
  for (const item of RAW_ENGLISH_VARIANT_PATTERNS) {
    if (item.regex.test(text)) matches.push(item.label);
  }

  return Array.from(new Set(matches));
}

export function containsForbiddenPublicContent(input = "") {
  return findPublicContentViolations(input).length > 0;
}

export function assertPublicContentSafe(input = "", label = "Nội dung") {
  const matches = findPublicContentViolations(input);
  if (matches.length) {
    throw new Error(`${label} có từ ngữ không phù hợp. Vui lòng chỉnh sửa trước khi đăng công khai.`);
  }
}
