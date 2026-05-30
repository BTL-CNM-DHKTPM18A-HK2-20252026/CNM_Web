import { generateHTML } from '@tiptap/html';
import { StarterKit } from '@tiptap/starter-kit';
import { Underline } from '@tiptap/extension-underline';
import { TextStyle } from '@tiptap/extension-text-style';
import { Color } from '@tiptap/extension-color';
import { Strike } from '@tiptap/extension-strike';
import { Highlight } from '@tiptap/extension-highlight';
import { Image as TiptapImage } from '@tiptap/extension-image';

let cachedExtensions: any[] | null = null;

function getExtensions() {
  if (!cachedExtensions) {
    cachedExtensions = [
      StarterKit,
      Underline,
      TextStyle,
      Color,
      Strike,
      Highlight,
      TiptapImage,
    ];
  }
  return cachedExtensions;
}

/**
 * Converts a Tiptap JSON string to HTML.
 * If the input is not valid Tiptap JSON, returns the original string (backward compatible).
 */
export function getMessageHtml(text: string): string {
  if (!text) return '';
  try {
    const json = JSON.parse(text);
    if (json && typeof json === 'object' && json.type === 'doc') {
      return generateHTML(json, getExtensions());
    }
    // It's JSON but not a Tiptap doc — return raw string
    return text;
  } catch {
    // Not JSON at all — return as-is (legacy HTML or plain text)
    return text;
  }
}

/**
 * Extracts plain text from a Tiptap JSON string or HTML string.
 * Used for conversation list previews and notification text.
 */
export function getPlainTextFromMessage(text: string): string {
  if (!text) return '';
  try {
    const json = JSON.parse(text);
    if (json && typeof json === 'object') {
      return extractPlainText(json).trim();
    }
  } catch {
    // Not JSON: strip HTML tags if any, then return
  }
  return text.replace(/<[^>]*>/g, '').trim();
}

function extractPlainText(node: any): string {
  if (!node) return '';
  if (node.type === 'text') return node.text ?? '';
  if (Array.isArray(node.content)) {
    const childText = node.content.map(extractPlainText).join('');
    const blockTypes = ['paragraph', 'heading', 'blockquote', 'listItem'];
    if (blockTypes.includes(node.type)) return childText + ' ';
    return childText;
  }
  return '';
}
