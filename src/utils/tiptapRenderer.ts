/**
 * Converts a Tiptap JSON string to HTML.
 * If the input is not valid Tiptap JSON, returns the original string (backward compatible).
 */
export function getMessageHtml(text: string): string {
  if (!text) return '';
  try {
    const json = JSON.parse(text);
    if (json && typeof json === 'object' && json.type === 'doc') {
      return renderTiptapNode(json);
    }
    return text;
  } catch {
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
    // Fallback: strip HTML tags if any, then return
  }
  return text.replace(/<[^>]*>/g, '').trim();
}

export function isTiptapEmpty(text: string): boolean {
  if (!text) return true;
  try {
    const json = JSON.parse(text);
    if (json && typeof json === 'object' && json.type === 'doc') {
      const hasContent = (node: any): boolean => {
        if (!node) return false;
        if (node.type === 'text' && node.text?.trim()) return true;
        if (node.type === 'image') return true;
        if (Array.isArray(node.content)) {
          return node.content.some(hasContent);
        }
        return false;
      };
      return !hasContent(json);
    }
  } catch {
    return !text.trim();
  }
  return false;
}

function escapeHtml(unsafe: string): string {
  return unsafe
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function renderTiptapNode(node: any): string {
  if (!node) return '';

  if (node.type === 'text') {
    let html = escapeHtml(node.text || '');
    if (Array.isArray(node.marks)) {
      for (const mark of node.marks) {
        if (mark.type === 'bold') {
          html = `<strong>${html}</strong>`;
        } else if (mark.type === 'italic') {
          html = `<em>${html}</em>`;
        } else if (mark.type === 'underline') {
          html = `<u>${html}</u>`;
        } else if (mark.type === 'strike') {
          html = `<s>${html}</s>`;
        } else if (mark.type === 'textStyle') {
          const color = mark.attrs?.color;
          if (color) {
            html = `<span style="color: ${color}">${html}</span>`;
          }
        } else if (mark.type === 'highlight') {
          const color = mark.attrs?.color;
          if (color) {
            html = `<span style="background-color: ${color}">${html}</span>`;
          } else {
            html = `<mark>${html}</mark>`;
          }
        }
      }
    }
    return html;
  }

  if (node.type === 'image') {
    const src = node.attrs?.src || '';
    const alt = node.attrs?.alt || '';
    const title = node.attrs?.title || '';
    return `<img src="${src}" alt="${alt}" title="${title}" class="inline-block w-6 h-6 mx-0.5 align-text-bottom" />`;
  }

  // Process children recursively
  let childrenHtml = '';
  if (Array.isArray(node.content)) {
    childrenHtml = node.content.map(renderTiptapNode).join('');
  }

  // Wrap in block tag
  if (node.type === 'paragraph') {
    return `<p>${childrenHtml}</p>`;
  } else if (node.type === 'heading') {
    const level = node.attrs?.level || 1;
    return `<h${level}>${childrenHtml}</h${level}>`;
  } else if (node.type === 'bulletList') {
    return `<ul>${childrenHtml}</ul>`;
  } else if (node.type === 'orderedList') {
    return `<ol>${childrenHtml}</ol>`;
  } else if (node.type === 'listItem') {
    return `<li>${childrenHtml}</li>`;
  } else if (node.type === 'blockquote') {
    return `<blockquote>${childrenHtml}</blockquote>`;
  } else if (node.type === 'hardBreak') {
    return `<br />`;
  } else if (node.type === 'doc') {
    return childrenHtml;
  }

  return childrenHtml;
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
