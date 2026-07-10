const BAD_WORDS = [
  "địt", "dit", "djt", "đjt", "dm", "dmm", "đm", "đmm", "đụ", "du", "đéo", "deo", "cặc", "cac", "cak",
  "lồn", "lon", "loz", "lìn", "lin", "buồi", "buoi", "đĩ", "di", "điếm", "diem", "óc chó", "oc cho",
  "súc vật", "suc vat", "vãi", "vai", "vl", "vcl", "vc", "con mẹ", "con me", "mẹ mày", "me may",
  "dit me", "địt mẹ", "du ma", "đụ má", "đuma", "cmm", "cmn", "ditmemay", "l0n", "l0z", "c4c", "d1t"
];
const LEET_MAP: Record<string, string> = { "0": "o", "1": "i", "2": "z", "3": "e", "4": "a", "5": "s", "6": "g", "7": "t", "8": "b", "9": "g", "@": "a", "$": "s", "!": "i", "|": "i" };
export function stripHtmlForModeration(input = "") {
  return String(input || "").replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, " ").replace(/<style[\s\S]*?>[\s\S]*?<\/style>/gi, " ").replace(/<[^>]+>/g, " ").replace(/&nbsp;/gi, " ").replace(/&amp;/gi, "&").replace(/&lt;/gi, "<").replace(/&gt;/gi, ">");
}
export function normalizePublicText(input = "") {
  return stripHtmlForModeration(input).toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/đ/g, "d").replace(/[0123456789@$!|]/g, (m) => LEET_MAP[m] || m).replace(/(.)\1{2,}/g, "$1").replace(/[^a-zA-ZÀ-ỹ\s]/g, " ").replace(/\s+/g, " ").trim();
}
function normalizeWord(input = "") { return normalizePublicText(input).replace(/\s+/g, "").trim(); }
export function findPublicContentViolations(input = "") {
  const compact = normalizePublicText(input).replace(/\s+/g, "");
  const spaced = normalizePublicText(input);
  const matches = BAD_WORDS.filter((word) => {
    const normalized = normalizeWord(word);
    if (!normalized || normalized.length < 2) return false;
    return compact.includes(normalized) || spaced.includes(normalizePublicText(word));
  });
  return Array.from(new Set(matches));
}
export function containsForbiddenPublicContent(input = "") { return findPublicContentViolations(input).length > 0; }
export function assertPublicContentSafe(input = "", label = "Nội dung") {
  const matches = findPublicContentViolations(input);
  if (matches.length) throw new Error(`${label} có từ ngữ không phù hợp. Vui lòng chỉnh sửa trước khi đăng công khai.`);
}
