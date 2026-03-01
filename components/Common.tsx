
import React, { useState } from 'react';

export const ErrorMessage: React.FC<{ message: string | null }> = ({ message }) => (
    <div className="bg-red-900/50 border border-red-700 text-red-300 px-4 py-3 rounded-lg my-4 text-left" role="alert">
        <strong className="font-bold">오류: </strong>
        <span className="block sm:inline">{message}</span>
    </div>
);

/**
 * Robustly copy text to clipboard with a fallback for focus or security issues.
 */
export const copyToClipboard = async (text: string): Promise<boolean> => {
  if (!text) return false;
  
  try {
    // Try modern API first
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch (err) {
    console.warn('Modern clipboard API failed, attempting fallback...', err);
  }

  // Fallback for non-secure contexts or focus issues
  try {
    const textArea = document.createElement("textarea");
    textArea.value = text;
    textArea.style.position = "fixed";
    textArea.style.left = "-9999px";
    textArea.style.top = "0";
    textArea.style.opacity = "0";
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    const successful = document.execCommand('copy');
    document.body.removeChild(textArea);
    return successful;
  } catch (err) {
    console.error('Fallback copy failed', err);
    return false;
  }
};

export const CopyToClipboardButton: React.FC<{ textToCopy: string }> = ({ textToCopy }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    if (!textToCopy) return;
    const success = await copyToClipboard(textToCopy);
    if (success) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <button onClick={handleCopy} className="flex items-center space-x-1 text-xs bg-gray-700 text-gray-300 px-2 py-1 rounded-md hover:bg-gray-600 transition-colors disabled:opacity-50" disabled={copied}>
      {copied ? <span className="text-green-400">✅</span> : <span>📋</span>}
      <span>{copied ? '복사됨!' : '복사'}</span>
    </button>
  );
};

export const SocialMediaPostCard: React.FC<{ platform: string; content: string; icon: string }> = ({ platform, content, icon }) => {
  return (
    <div>
      <div className="flex justify-between items-center mb-2">
        <h3 className="font-semibold text-lg text-white flex items-center">
          <span className="mr-2 text-xl">{icon}</span>
          {platform} 포스트
        </h3>
        <CopyToClipboardButton textToCopy={content} />
      </div>
      <p className="text-gray-300 text-sm bg-gray-900 p-3 rounded-md whitespace-pre-wrap font-korean">{content}</p>
    </div>
  );
};

export const base64ToBlob = (base64: string, mimeType: string): Blob => {
  const byteCharacters = atob(base64);
  const byteNumbers = new Array(byteCharacters.length);
  for (let i = 0; i < byteCharacters.length; i++) {
    byteNumbers[i] = byteCharacters.charCodeAt(i);
  }
  const byteArray = new Uint8Array(byteNumbers);
  return new Blob([byteArray], { type: mimeType });
};

export const base64ToBlobUrl = (base64: string, mimeType: string = 'image/jpeg'): string => {
    if (!base64) return '';
    try {
        const blob = base64ToBlob(base64, mimeType);
        return URL.createObjectURL(blob);
    } catch (e) {
        console.error("Failed to create blob URL from base64 string", e);
        return '';
    }
}

export const workerCode = `
const formatHtmlForDisplay = (html) => {
  if (!html) return '';
  const tab = '  ';
  let indentLevel = 0;
  let result = '';
  
  // Robust Regex for tokenizing HTML
  // 1. Script tags: <script...>...</script>
  // 2. Style tags: <style...>...</style>
  // 3. Comments: <!-- ... -->
  // 4. Tags: <...>
  // 5. Text content: anything else
  const tokens = html.match(/<script[\\s\\S]*?<\\/script>|<style[\\s\\S]*?<\\/style>|<!--[\\s\\S]*?-->|<[^>]+>|[^<]+/g) || [];

  // Complete list of HTML5 void elements (self-closing)
  const voidTags = ['area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link', 'meta', 'param', 'source', 'track', 'wbr'];

  for (const token of tokens) {
    const trimmed = token.trim();
    if (!trimmed) continue;

    const isScriptOrStyle = trimmed.startsWith('<script') || trimmed.startsWith('<style');
    const isComment = trimmed.startsWith('<!--');
    const isDoctype = trimmed.toLowerCase().startsWith('<!doctype');
    const isTag = trimmed.startsWith('<') && trimmed.endsWith('>');
    
    // Determine if tag is closing or self-closing
    let isClosingTag = false;
    let isSelfClosing = false;
    let tagName = '';

    if (isTag) {
        isClosingTag = trimmed.startsWith('</');
        const tagNameMatch = trimmed.match(/^<\\/?([a-zA-Z0-9-]+)/);
        tagName = tagNameMatch ? tagNameMatch[1].toLowerCase() : '';
        isSelfClosing = trimmed.endsWith('/>') || voidTags.includes(tagName);
    }

    if (isScriptOrStyle || isComment || isDoctype) {
      // Don't change indentation for raw blocks, comments, or doctype
      result += '\\n' + tab.repeat(indentLevel) + token; 
      continue;
    }

    if (isTag) {
        if (isClosingTag) {
            indentLevel = Math.max(0, indentLevel - 1);
        }
        
        result += '\\n' + tab.repeat(indentLevel) + trimmed;
        
        if (!isClosingTag && !isSelfClosing) {
            indentLevel++;
        }
    } else {
        // Text content
        result += '\\n' + tab.repeat(indentLevel) + trimmed;
    }
  }

  return result.trim();
};

self.onmessage = (event) => {
  const html = event.data;
  const formattedHtml = formatHtmlForDisplay(html);
  self.postMessage(formattedHtml);
};
`;
export const workerBlob = new Blob([workerCode], { type: 'application/javascript' });
