import { remark } from "remark";

import { generateUUID } from "@/app/lib/utils";

const MARKDOWN_FRONTMATTER_RE = /^\uFEFF?---\s*\n[\s\S]*?\n---\s*(?:\n|$)/;
const CJK_CHAR_RE = /[\u3040-\u30ff\u3400-\u4dbf\u4e00-\u9fff\uf900-\ufaff]/;
const TRAILING_NO_SPACE_RE = /[(\[{'"\u201c\u2018/\\-]$/;
const LEADING_NO_SPACE_RE = /^[,.;:!?%)}\]'"\u201d\u2019\u3001\uFF0C\u3002\uFF01\uFF1F\uFF1B\uFF1A]/;

type MarkdownNode = {
  alt?: string;
  children?: MarkdownNode[];
  ordered?: boolean;
  start?: number;
  type?: string;
  value?: string;
};

function normalizeNewlines(value: string) {
  return value.replace(/\r\n?/g, "\n");
}

function shouldJoinWithoutSpace(left: string, right: string) {
  const leftLastCharacter = left.slice(-1);
  const rightFirstCharacter = right.charAt(0);

  return TRAILING_NO_SPACE_RE.test(left)
    || LEADING_NO_SPACE_RE.test(right)
    || (CJK_CHAR_RE.test(leftLastCharacter) && CJK_CHAR_RE.test(rightFirstCharacter));
}

function joinParagraphLines(lines: string[]) {
  let result = "";

  lines.forEach((line) => {
    const trimmedLine = line.replace(/\u00a0/g, " ").trim();
    if (!trimmedLine) {
      return;
    }

    if (!result) {
      result = trimmedLine;
      return;
    }

    result += shouldJoinWithoutSpace(result, trimmedLine)
      ? trimmedLine
      : ` ${trimmedLine}`;
  });

  return result.trim();
}

function normalizeImportedParagraph(paragraph: string) {
  return joinParagraphLines(normalizeNewlines(paragraph).split("\n"));
}

function pushParagraph(paragraphs: string[], value: string, prefix = "") {
  splitTextIntoParagraphs(value).forEach((paragraph, index) => {
    paragraphs.push(index === 0 ? `${prefix}${paragraph}` : paragraph);
  });
}

function extractMarkdownNodeText(node: MarkdownNode | undefined): string {
  if (!node) {
    return "";
  }

  switch (node.type) {
    case "text":
    case "inlineCode":
    case "code":
      return typeof node.value === "string" ? node.value : "";
    case "break":
      return "\n";
    case "image":
    case "imageReference":
      return node.alt || "";
    default:
      if (Array.isArray(node.children)) {
        return node.children.map((child) => extractMarkdownNodeText(child)).join("");
      }

      return typeof node.value === "string" ? node.value : "";
  }
}

function collectMarkdownListItem(node: MarkdownNode, paragraphs: string[], prefix: string) {
  let hasPrefixedParagraph = false;

  (node.children || []).forEach((child) => {
    if (child.type === "paragraph" || child.type === "heading") {
      const text = extractMarkdownNodeText(child);
      if (!text.trim()) {
        return;
      }

      pushParagraph(paragraphs, text, hasPrefixedParagraph ? "" : prefix);
      hasPrefixedParagraph = true;
      return;
    }

    if (child.type === "code") {
      pushParagraph(paragraphs, child.value || "", hasPrefixedParagraph ? "" : prefix);
      hasPrefixedParagraph = true;
      return;
    }

    collectMarkdownBlock(child, paragraphs);
  });
}

function collectMarkdownBlock(node: MarkdownNode, paragraphs: string[]) {
  switch (node.type) {
    case "root":
    case "blockquote":
      (node.children || []).forEach((child) => {
        collectMarkdownBlock(child, paragraphs);
      });
      return;
    case "paragraph":
    case "heading":
      pushParagraph(paragraphs, extractMarkdownNodeText(node));
      return;
    case "list": {
      const start = typeof node.start === "number" ? node.start : 1;

      (node.children || []).forEach((child, index) => {
        const prefix = node.ordered ? `${start + index}. ` : "- ";
        collectMarkdownListItem(child, paragraphs, prefix);
      });
      return;
    }
    case "listItem":
      collectMarkdownListItem(node, paragraphs, "- ");
      return;
    case "code":
      pushParagraph(paragraphs, node.value || "");
      return;
    case "table":
      (node.children || []).forEach((row) => {
        const rowText = (row.children || [])
          .map((cell) => normalizeImportedParagraph(extractMarkdownNodeText(cell)))
          .filter(Boolean)
          .join(" | ");

        if (rowText) {
          paragraphs.push(rowText);
        }
      });
      return;
    case "thematicBreak":
    case "definition":
    case "footnoteDefinition":
    case "html":
      return;
    default:
      if (Array.isArray(node.children)) {
        const text = extractMarkdownNodeText(node);
        if (text.trim()) {
          pushParagraph(paragraphs, text);
        }
      }
  }
}

function stripMarkdownFrontmatter(markdown: string) {
  return normalizeNewlines(markdown)
    .replace(MARKDOWN_FRONTMATTER_RE, "")
    .trim();
}

export function splitTextIntoParagraphs(text: string) {
  const normalizedText = normalizeNewlines(text)
    .replace(/\uFEFF/g, "")
    .trim();

  if (!normalizedText) {
    return [];
  }

  return normalizedText
    .split(/\n\s*\n+/)
    .map((paragraph) => normalizeImportedParagraph(paragraph))
    .filter(Boolean);
}

export function extractMarkdownParagraphs(markdown: string) {
  const source = stripMarkdownFrontmatter(markdown);
  if (!source) {
    return [];
  }

  const syntaxTree = remark().parse(source) as MarkdownNode;
  const paragraphs: string[] = [];

  collectMarkdownBlock(syntaxTree, paragraphs);

  return paragraphs.filter(Boolean);
}

export function createEditorDocumentFromParagraphs(paragraphs: string[]) {
  const content = paragraphs.length
    ? paragraphs.map((paragraph) => ({
      type: "editorCard",
      attrs: { id: generateUUID() },
      content: [{ type: "text", text: paragraph }],
    }))
    : [{ type: "editorCard", attrs: { id: generateUUID() } }];

  return {
    type: "doc",
    content,
  };
}

export function createEditorDocumentFromText(text: string) {
  return createEditorDocumentFromParagraphs(splitTextIntoParagraphs(text));
}

export function createEditorDocumentFromMarkdown(markdown: string) {
  return createEditorDocumentFromParagraphs(extractMarkdownParagraphs(markdown));
}
