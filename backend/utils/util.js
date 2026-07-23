/**
 * Chuyển đổi text markdown (AI output) sang định dạng zcajs MessageContent.
 * AI trả về markdown bình thường, hàm này tự tính toán vị trí ký tự và tạo styles[].
 *
 * Heading hierarchy:
 *  - # Tiêu đề    → Bold + SuperBig ("f_20") – tiêu đề từ vựng chính
 *  - ## Mục       → Bold + Big ("f_18")       – tiêu đề mục
 *  - ### Mục phụ  → Bold                       – nhãn/label
 *
 * Inline:
 *  - **text**          → Bold ("b")
 *  - *text*            → Italic ("i")
 *  - ~~text~~          → StrikeThrough ("s")
 *  - __text__          → Underline ("u")
 *  - ***text***        → Bold + Italic
 *
 * Block:
 *  - 1. item           → OrderedList ("lst_2")
 *  - - item / * item   → UnorderedList ("lst_1")
 *  - --- (dòng ngăn)   → bỏ qua (không hỗ trợ)
 *
 * @param {string} rawText - Text markdown do AI trả về
 * @returns {{ msg: string, styles?: Array }} MessageContent cho zcajs
 */
export function parseMarkdownToZalo(rawText) {
  if (!rawText) return { msg: "" };

  // Loại bỏ markdown code blocks (```) và inline code (`), Zalo không hỗ trợ
  rawText = rawText.replace(/```[a-zA-Z]*\n/g, "");
  rawText = rawText.replace(/```/g, "");
  rawText = rawText.replace(/`/g, "");

  // Inline patterns, theo thứ tự ưu tiên (*** trước ** trước *)
  const INLINE_PATTERNS = [
    { regex: /\*\*\*(.+?)\*\*\*/g, styleTypes: ["b", "i"] }, // ***bold italic***
    { regex: /\*\*(.+?)\*\*/g, styleTypes: ["b"] }, // **bold**
    { regex: /~~(.+?)~~/g, styleTypes: ["s"] }, // ~~strikethrough~~
    { regex: /__(.+?)__/g, styleTypes: ["u"] }, // __underline__
    { regex: /\*(.+?)\*/g, styleTypes: ["i"] }, // *italic* (sau ** để không conflict)
  ];

  const finalStyles = [];
  let finalText = "";
  const lines = rawText.split("\n");

  for (let lineIdx = 0; lineIdx < lines.length; lineIdx++) {
    const rawLine = lines[lineIdx];

    // Bỏ qua dòng kẻ ngang --- (không hỗ trợ trên chatbot)
    if (/^[-*_]{3,}$/.test(rawLine.trim())) continue;

    const lineStartInFinal = finalText.length;

    // --- Phát hiện block-level markers ---
    let lineContent = rawLine;
    let listStyle = null;
    let isHeading1 = false; // #   → SuperBig + Bold
    let isHeading2 = false; // ##  → Big + Bold
    let isHeading3 = false; // ### → Bold

    const headingMatch = rawLine.match(/^(#{1,3}) (.+)$/);

    if (headingMatch) {
      lineContent = headingMatch[2];
      isHeading1 = headingMatch[1] === "#";
      isHeading2 = headingMatch[1] === "##";
      isHeading3 = headingMatch[1] === "###";
    }

    // --- Phát hiện inline markers trong lineContent ---
    const inlineSpans = [];
    for (const { regex, styleTypes } of INLINE_PATTERNS) {
      regex.lastIndex = 0;
      let match;
      while ((match = regex.exec(lineContent)) !== null) {
        inlineSpans.push({
          origStart: match.index,
          origEnd: match.index + match[0].length,
          innerText: match[1],
          styleTypes,
        });
      }
    }

    // Sắp xếp và loại bỏ các span bị overlap (span xuất hiện trước được ưu tiên)
    inlineSpans.sort((a, b) => a.origStart - b.origStart);
    const nonOverlapping = [];
    let lastEnd = 0;
    for (const span of inlineSpans) {
      if (span.origStart >= lastEnd) {
        nonOverlapping.push(span);
        lastEnd = span.origEnd;
      }
    }

    // --- Build clean line và thu thập inline styles ---
    let cleanLine = "";
    let prevIdx = 0;
    for (const span of nonOverlapping) {
      cleanLine += lineContent.slice(prevIdx, span.origStart);
      const spanStartInFinal = lineStartInFinal + cleanLine.length;
      cleanLine += span.innerText;
      for (const st of span.styleTypes) {
        finalStyles.push({ start: spanStartInFinal, len: span.innerText.length, st });
      }
      prevIdx = span.origEnd;
    }
    cleanLine += lineContent.slice(prevIdx);

    // --- Thêm block-level styles cho toàn bộ dòng (sau khi biết cleanLine.length) ---
    if (isHeading1) {
      // # → SuperBig + Bold (tiêu đề từ vựng chính)
      finalStyles.push({ start: lineStartInFinal, len: cleanLine.length, st: "b" });
      finalStyles.push({ start: lineStartInFinal, len: cleanLine.length, st: "f_20" });
    } else if (isHeading2) {
      // ## → Big + Bold (tiêu đề mục)
      finalStyles.push({ start: lineStartInFinal, len: cleanLine.length, st: "b" });
      finalStyles.push({ start: lineStartInFinal, len: cleanLine.length, st: "f_18" });
    } else if (isHeading3) {
      // ### → Bold (nhãn/label)
      finalStyles.push({ start: lineStartInFinal, len: cleanLine.length, st: "b" });
    }

    finalText += cleanLine;
    if (lineIdx < lines.length - 1) finalText += "\n";
  }

  return {
    msg: finalText,
    styles: finalStyles.length > 0 ? finalStyles : undefined,
  };
}

export function parseMessyAIData(rawText) {
  if (!rawText) return [];

  // Bước 1: Sửa lỗi AI tự ý xuống dòng bậy (Nối các dòng mồ côi lại)
  const rawLines = rawText.split(/[\r\n]+/);
  const cleanLines = [];

  for (let line of rawLines) {
    line = line.trim();
    if (!line) continue;

    if (line.startsWith("#TOPIC|") || line.startsWith("#WORD|") || line.includes("#WORD|") || line.includes("#TOPIC|")) {
      // Nếu dòng chứa thẻ mới, đẩy vào mảng
      cleanLines.push(line);
    } else {
      // Nếu dòng mồ côi (bị AI ngắt xuống), nối nó vào đuôi của dòng trước đó
      if (cleanLines.length > 0) {
        cleanLines[cleanLines.length - 1] += " " + line;
      }
    }
  }

  // Bước 2: Tách các thẻ bị AI gộp ngang trên cùng một hàng
  const finalizedText = cleanLines
    .join("\n")
    .replace(/#TOPIC\|/g, "\n#TOPIC|")
    .replace(/#WORD\|/g, "\n#WORD|");

  const lines = finalizedText
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  // Bước 3: Parse dữ liệu chuẩn như logic ban đầu của bạn
  const result = [];
  let currentTopic = null;

  for (const line of lines) {
    if (line.startsWith("#TOPIC|")) {
      const parts = line.substring(7).split("|");
      if (parts.length < 5) continue;
      currentTopic = { id: parts[0].trim(), title: parts[1].trim(), category: parts[2].trim(), description: parts[3].trim(), color: parts[4].trim(), words: [] };
      result.push(currentTopic);
    } else if (line.startsWith("#WORD|") && currentTopic) {
      const parts = line.substring(6).split("|");
      if (parts.length < 6) continue;

      const exampleList = [];
      if (parts[4].trim()) {
        parts[4].split(";").forEach((pair) => {
          if (pair.includes("~")) {
            const [en, vi] = pair.split("~");
            exampleList.push({ en: en.trim(), vi: vi.trim() });
          }
        });
      }
      currentTopic.words.push({ id: parts[0].trim(), term: parts[1].trim(), phonetic: parts[2].trim(), translation: parts[3].trim(), examples: exampleList, notes: parts[5].trim() });
    }
  }
  return result;
}
