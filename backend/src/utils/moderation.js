const EXTRA_PUBLIC_BLACKLIST = (process.env.PUBLIC_CONTENT_BLACKLIST || "")
  .split(/[\n,;]/)
  .map((w) => w.trim())
  .filter(Boolean);

// -----------------------------------------------------------------------------
// Moderation policy
// -----------------------------------------------------------------------------
// Important: Community content uses a VERY LOW false-positive policy.
// We do not remove Vietnamese accents, do not normalize "các" -> "cac", and do
// not match substrings. Only explicit raw words/phrases are blocked.
// More aggressive moderation is still available for other public surfaces if you
// enable STRICT_PROFANITY_LIBS=true, but community posts/comments should stay
// friendly and not annoy normal users.

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

// English profanity for public/community surfaces. Keep this list conservative:
// no short ambiguous words such as "ass", "hell", or "sex" to avoid false positives
// in normal English learning content. Matching is still boundary-based only.
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

const RAW_ENGLISH_VARIANT_PATTERNS = [
  { label: "fuck", regex: /(^|[^\p{L}\p{N}_])f[\W_]*[u*][\W_]*c[\W_]*k([^\p{L}\p{N}_]|$)/iu },
  { label: "shit", regex: /(^|[^\p{L}\p{N}_])s[\W_]*h[\W_]*i[\W_]*t([^\p{L}\p{N}_]|$)/iu },
];

// Only user-supplied extra blacklist remains raw. Do not normalize it either.
const RAW_EXTRA_BLOCKLIST = EXTRA_PUBLIC_BLACKLIST.map((w) => String(w || "").trim()).filter(Boolean);

let optionalLibrariesReady = false;
let optionalLibraries = [];

function escapeRegExp(value = "") {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function stripHtml(input = "") {
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

export function normalizeForModeration(input = "") {
  // Kept only for compatibility with older imports. Do not use this for community.
  return stripHtml(input).toLowerCase().replace(/\s+/g, " ").trim();
}

function compactSpaces(text = "") {
  return String(text || "").replace(/\s+/g, " ").trim();
}

function textForRawModeration(input = "") {
  return compactSpaces(stripHtml(input).toLocaleLowerCase("vi-VN"));
}

function rawWordPattern(word) {
  return new RegExp(`(^|[^\\p{L}\\p{N}_])${escapeRegExp(word)}([^\\p{L}\\p{N}_]|$)`, "iu");
}

function rawPhrasePattern(phrase) {
  const parts = String(phrase || "")
    .trim()
    .split(/\s+/)
    .map(escapeRegExp)
    .join("[\\s\\p{P}]+?");
  return new RegExp(`(^|[^\\p{L}\\p{N}_])${parts}([^\\p{L}\\p{N}_]|$)`, "iu");
}

function localFindRawMatches(input = "", { community = false } = {}) {
  const text = textForRawModeration(input);
  if (!text) return [];

  const matches = [];
  const words = [
    ...RAW_EXPLICIT_WORDS,
    ...RAW_EXPLICIT_ACRONYMS,
    ...RAW_ENGLISH_EXPLICIT_WORDS,
    ...RAW_ENGLISH_EXPLICIT_ACRONYMS,
    ...RAW_EXTRA_BLOCKLIST,
  ];
  const phrases = [...RAW_EXPLICIT_PHRASES, ...RAW_ENGLISH_EXPLICIT_PHRASES];

  for (const phrase of phrases) {
    if (rawPhrasePattern(phrase).test(text)) matches.push(phrase);
  }
  for (const word of words) {
    if (rawWordPattern(word).test(text)) matches.push(word);
  }
  for (const item of RAW_ENGLISH_VARIANT_PATTERNS) {
    if (item.regex.test(text)) matches.push(item.label);
  }

  // Community is intentionally conservative: exact raw words/phrases + a few
  // unambiguous English obfuscations only. No accent stripping and no substring matching.
  if (community) return Array.from(new Set(matches)).slice(0, 10);

  return Array.from(new Set(matches)).slice(0, 10);
}

async function initOptionalLibraries() {
  if (optionalLibrariesReady) return;
  optionalLibrariesReady = true;

  if (String(process.env.STRICT_PROFANITY_LIBS || "false").toLowerCase() !== "true") return;

  const tryUse = async (name, setup) => {
    try {
      const mod = await import(name);
      const checker = setup(mod?.default || mod, mod);
      if (checker) optionalLibraries.push({ name, checker });
    } catch (_) {
      // Optional package is not installed. Raw local guard still protects the app.
    }
  };

  const customWords = [
    ...RAW_EXPLICIT_WORDS,
    ...RAW_EXPLICIT_PHRASES,
    ...RAW_EXPLICIT_ACRONYMS,
    ...RAW_ENGLISH_EXPLICIT_WORDS,
    ...RAW_ENGLISH_EXPLICIT_PHRASES,
    ...RAW_ENGLISH_EXPLICIT_ACRONYMS,
    ...RAW_EXTRA_BLOCKLIST,
  ];

  await tryUse("bad-words", (FilterExport) => {
    const FilterCtor = FilterExport?.Filter || FilterExport;
    if (typeof FilterCtor !== "function") return null;
    const filter = new FilterCtor();
    if (typeof filter.addWords === "function") filter.addWords(...customWords);
    return (text) => Boolean(filter.isProfane?.(text));
  });

  await tryUse("leo-profanity", (leo) => {
    try {
      if (typeof leo.loadDictionary === "function") leo.loadDictionary("en");
      if (typeof leo.add === "function") leo.add(customWords);
      else if (typeof leo.addWords === "function") leo.addWords(customWords);
    } catch (_) {}
    return (text) => Boolean(leo.check?.(text) || leo.isProfane?.(text));
  });

  await tryUse("vietnamese-profanity-filter", (lib) => {
    return (text) => {
      if (typeof lib === "function") return Boolean(lib(text));
      if (typeof lib.check === "function") return Boolean(lib.check(text));
      if (typeof lib.isProfane === "function") return Boolean(lib.isProfane(text));
      if (typeof lib.containsProfanity === "function") return Boolean(lib.containsProfanity(text));
      if (typeof lib.filter === "function") return String(lib.filter(text)) !== String(text);
      return false;
    };
  });
}

export async function inspectPublicContent(input = "", options = {}) {
  const community = Boolean(options.community);
  const rawText = String(input || "");
  const localMatches = localFindRawMatches(rawText, { community });

  // For community, never use external libraries because they are more likely to
  // match harmless Vietnamese text. Backend still blocks exact explicit words.
  if (community) {
    return { blocked: localMatches.length > 0, matches: localMatches, libraryMatches: [] };
  }

  await initOptionalLibraries();
  let libraryHit = false;
  const libraryMatches = [];

  for (const item of optionalLibraries) {
    try {
      if (item.checker(rawText)) {
        libraryHit = true;
        libraryMatches.push(item.name);
      }
    } catch (_) {}
  }

  return {
    blocked: localMatches.length > 0 || libraryHit,
    matches: localMatches,
    libraryMatches,
  };
}

export function sanitizePublicHtml(input = "", { maxLength = 20000 } = {}) {
  let html = String(input || "").slice(0, maxLength);
  html = html
    .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?>[\s\S]*?<\/style>/gi, "")
    .replace(/<iframe[\s\S]*?>[\s\S]*?<\/iframe>/gi, "")
    .replace(/<object[\s\S]*?>[\s\S]*?<\/object>/gi, "")
    .replace(/<embed[\s\S]*?>[\s\S]*?<\/embed>/gi, "")
    .replace(/\son\w+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, "")
    .replace(/javascript\s*:/gi, "")
    .replace(/data\s*:/gi, "");

  html = html.replace(/<(?!\/?(?:p|br|strong|b|em|i|s|strike|ul|ol|li|span)\b)[^>]*>/gi, "");
  html = html.replace(/<span([^>]*)>/gi, (_m, attrs) => {
    const color = attrs.match(/color\s*:\s*(#[0-9a-fA-F]{3,8}|rgb\([^)]{1,60}\))/i)?.[0];
    const fontSize = attrs.match(/font-size\s*:\s*(12px|16px|20px|24px)/i)?.[0];
    const styleParts = [color, fontSize].filter(Boolean).join(";");
    return styleParts ? `<span style="${styleParts}">` : "<span>";
  });
  return html.trim();
}

export async function assertPublicContentClean(value, label = "Nội dung", options = {}) {
  const result = await inspectPublicContent(value, options);
  if (result.blocked) {
    const error = new Error(`${label} chứa từ ngữ không phù hợp. Vui lòng chỉnh sửa lại trước khi đăng công khai.`);
    error.status = 400;
    error.code = "PUBLIC_CONTENT_BLOCKED";
    error.matches = result.matches;
    error.libraryMatches = result.libraryMatches;
    throw error;
  }
  return true;
}

export async function cleanAndValidatePublicText(value, label, options = {}) {
  const maxLength = options.maxLength || 5000;
  const text = String(value || "").trim().slice(0, maxLength);
  await assertPublicContentClean(text, label, options);
  return text;
}

export async function cleanAndValidatePublicHtml(value, label, options = {}) {
  const html = sanitizePublicHtml(value, options);
  await assertPublicContentClean(html, label, options);
  return html;
}

export async function cleanAndValidateCommunityText(value, label, options = {}) {
  return cleanAndValidatePublicText(value, label, { ...options, community: true });
}

export async function cleanAndValidateCommunityHtml(value, label, options = {}) {
  return cleanAndValidatePublicHtml(value, label, { ...options, community: true });
}

export async function validatePublicObject(value, label = "Dữ liệu công khai", path = label) {
  if (value === null || value === undefined) return;
  if (typeof value === "string") {
    await assertPublicContentClean(value, path);
    return;
  }
  if (Array.isArray(value)) {
    for (let i = 0; i < value.length; i++) await validatePublicObject(value[i], label, `${path}[${i}]`);
    return;
  }
  if (typeof value === "object") {
    for (const [key, child] of Object.entries(value)) {
      if (["id", "_id", "createdAt", "updatedAt"].includes(key)) continue;
      await validatePublicObject(child, label, `${path}.${key}`);
    }
  }
}
