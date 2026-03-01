
import React, { useState, useMemo } from 'react';
interface NaverDisplayProps {
  htmlContent: string;
  isLoading: boolean;
  imageUrl?: string | null;
  subImages?: unknown;
  keywords?: string[];
  seoTitles?: string[];
}

// 세그먼트 타입: 텍스트 or 이미지 슬롯
type Segment =
  | { type: 'text'; content: string }
  | { type: 'main-image' }
  | { type: 'sub-image'; index: number };

// HTML을 네이버 블로그용 세그먼트 배열로 변환
const htmlToNaverSegments = (html: string): { title: string; segments: Segment[] } => {
  if (!html) return { title: '', segments: [] };

  const tempDiv = document.createElement('div');
  tempDiv.innerHTML = html;
  tempDiv.querySelectorAll('script, style').forEach(el => el.remove());

  let extractedTitle = '';
  const parts: (string | Segment)[] = [];

  const flushText = (text: string) => {
    if (text) parts.push(text);
  };

  const walkNode = (node: Node) => {
    if (node.nodeType === Node.COMMENT_NODE) {
      const data = (node as Comment).data.trim();
      if (/대표\s*이미지/i.test(data)) {
        flushText('\n');
        parts.push({ type: 'main-image' } as Segment);
        flushText('\n');
      } else if (/서브\s*이미지\s*(\d+)/i.test(data)) {
        const m = data.match(/서브\s*이미지\s*(\d+)/i);
        flushText('\n');
        parts.push({ type: 'sub-image', index: parseInt(m?.[1] ?? '1', 10) - 1 } as Segment);
        flushText('\n');
      }
      return;
    }

    if (node.nodeType === Node.TEXT_NODE) {
      const text = node.textContent || '';
      if (text.trim()) flushText(text);
      return;
    }

    if (node.nodeType !== Node.ELEMENT_NODE) return;

    const el = node as HTMLElement;
    const tag = el.tagName.toLowerCase();

    switch (tag) {
      case 'h1': {
        const text = el.textContent?.trim() ?? '';
        if (!extractedTitle) extractedTitle = text;
        flushText(`\n\n${text}\n\n`);
        return;
      }
      case 'h2':
        flushText(`\n\n■ ${el.textContent?.trim()}\n\n`);
        return;
      case 'h3':
        flushText(`\n▶ ${el.textContent?.trim()}\n`);
        return;
      case 'h4':
      case 'h5':
      case 'h6':
        flushText(`\n◆ ${el.textContent?.trim()}\n`);
        return;
      case 'p':
        flushText(`\n${el.textContent?.trim()}\n`);
        return;
      case 'br':
        flushText('\n');
        return;
      case 'hr':
        flushText('\n──────────────────────────────\n');
        return;
      case 'ul': {
        flushText('\n');
        Array.from(el.querySelectorAll(':scope > li')).forEach(li => {
          flushText(`• ${li.textContent?.trim()}\n`);
        });
        flushText('\n');
        return;
      }
      case 'ol': {
        flushText('\n');
        Array.from(el.querySelectorAll(':scope > li')).forEach((li, i) => {
          flushText(`${i + 1}. ${li.textContent?.trim()}\n`);
        });
        flushText('\n');
        return;
      }
      case 'blockquote':
        flushText(`\n💬 "${el.textContent?.trim()}"\n`);
        return;
      case 'img':
      case 'figure':
      case 'figcaption':
        return; // 이미지는 주석 플레이스홀더로 처리됨
      case 'table': {
        flushText('\n');
        Array.from(el.querySelectorAll('tr')).forEach(row => {
          const cells = Array.from(row.querySelectorAll('th, td'))
            .map(c => c.textContent?.trim() || '')
            .join(' | ');
          if (cells.trim()) flushText(`${cells}\n`);
        });
        flushText('\n');
        return;
      }
      case 'pre':
      case 'code':
        flushText(`\n${el.textContent?.trim()}\n`);
        return;
      case 'script':
      case 'style':
        return;
      default:
        Array.from(el.childNodes).forEach(walkNode);
    }
  };

  Array.from(tempDiv.childNodes).forEach(walkNode);

  // 연속된 문자열 파트 병합 & 정리
  const segments: Segment[] = [];
  let textAccum = '';

  for (const part of parts) {
    if (typeof part === 'string') {
      textAccum += part;
    } else {
      if (textAccum) {
        const cleaned = textAccum.replace(/\n{3,}/g, '\n\n').replace(/^\n+/, '').replace(/\n+$/, '');
        if (cleaned) segments.push({ type: 'text', content: cleaned });
        textAccum = '';
      }
      segments.push(part);
    }
  }
  if (textAccum) {
    const cleaned = textAccum.replace(/\n{3,}/g, '\n\n').replace(/^\n+/, '').replace(/\n+$/, '');
    if (cleaned) segments.push({ type: 'text', content: cleaned });
  }

  return { title: extractedTitle, segments };
};

// 텍스트에서 공백 제외 글자수 계산
const countChars = (segments: Segment[]) => {
  let count = 0;
  for (const seg of segments) {
    if (seg.type === 'text') count += seg.content.replace(/\s/g, '').length;
  }
  return count;
};

// ── 툴바 버튼 ──
const ToolbarBtn: React.FC<{ label: string; bold?: boolean }> = ({ label, bold }) => (
  <button
    className="px-2 py-1 text-xs text-gray-600 bg-white border border-gray-300 rounded hover:bg-gray-100 transition-colors select-none"
    style={{ fontWeight: bold ? 'bold' : 'normal' }}
    onClick={e => e.preventDefault()}
    tabIndex={-1}
  >
    {label}
  </button>
);
const ToolbarSep: React.FC = () => <div className="h-5 w-px bg-gray-300 mx-1" />;


export const NaverDisplay: React.FC<NaverDisplayProps> = ({
  htmlContent,
  isLoading,
  keywords = [],
  seoTitles = [],
}) => {
  const [copied, setCopied] = useState(false);
  const [copiedTitle, setCopiedTitle] = useState(false);

  const { title, segments } = useMemo(() => htmlToNaverSegments(htmlContent), [htmlContent]);

  const charCount = useMemo(() => countChars(segments), [segments]);

  const plainBody = useMemo(
    () => segments.filter(s => s.type === 'text').map(s => (s as { type: 'text'; content: string }).content).join('\n\n'),
    [segments]
  );

  const handleCopyBody = async () => {
    try {
      await navigator.clipboard.writeText(plainBody);
    } catch {
      const ta = document.createElement('textarea');
      ta.value = plainBody;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleCopyTitle = async () => {
    if (!title) return;
    try {
      await navigator.clipboard.writeText(title);
    } catch {
      const ta = document.createElement('textarea');
      ta.value = title;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
    }
    setCopiedTitle(true);
    setTimeout(() => setCopiedTitle(false), 2000);
  };

  // ── 로딩 상태 ──
  if (isLoading) {
    return (
      <div className="flex flex-col rounded-xl overflow-hidden border border-gray-200 shadow-lg" style={{ background: '#f9f9f9', minHeight: '400px' }}>
        <div style={{ background: '#03C75A' }} className="px-4 py-2.5 flex items-center gap-2">
          <div className="bg-white rounded font-black text-lg px-2 py-0.5 leading-none" style={{ color: '#03C75A' }}>N</div>
          <span className="text-white font-semibold text-sm">네이버 블로그</span>
        </div>
        <div className="flex-1 flex flex-col items-center justify-center gap-3 p-10">
          <div className="w-8 h-8 border-4 rounded-full animate-spin" style={{ borderColor: '#03C75A', borderTopColor: 'transparent' }} />
          <p className="text-gray-500 text-sm">네이버 전용 변환 중...</p>
        </div>
      </div>
    );
  }

  if (!htmlContent) return null;

  return (
    <div className="flex flex-col rounded-xl overflow-hidden border border-gray-200 shadow-lg" style={{ background: '#f9f9f9' }}>

      {/* ── 네이버 상단 초록 바 ── */}
      <div style={{ background: '#03C75A' }} className="px-4 py-2 flex items-center justify-between gap-2 shrink-0">
        <div className="flex items-center gap-2">
          <div className="bg-white rounded font-black text-lg px-2 py-0.5 leading-none select-none" style={{ color: '#03C75A' }}>N</div>
          <div className="flex flex-col leading-tight">
            <span className="text-white font-bold text-sm leading-tight">블로그 글쓰기</span>
            <span className="text-white/70 text-xs leading-tight">스마트에디터 (텍스트 전용)</span>
          </div>
          <span className="bg-white/25 text-white text-xs px-2 py-0.5 rounded-full font-medium">네이버 전용</span>
        </div>
        <span className="text-white/80 text-xs">{charCount.toLocaleString()}자 (공백제외)</span>
      </div>

      {/* ── 서브 헤더 ── */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-gray-200 bg-white shrink-0">
        <div className="flex items-center gap-1.5">
          <span className="text-xs text-gray-400 border border-gray-300 rounded px-2 py-0.5">전체공개</span>
          <span className="text-xs text-gray-400 border border-gray-300 rounded px-2 py-0.5">카테고리 선택</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleCopyBody}
            className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-md transition-colors border"
            style={{
              background: copied ? '#e8f5e9' : '#03C75A',
              borderColor: copied ? '#a5d6a7' : '#03C75A',
              color: copied ? '#2e7d32' : '#fff',
            }}
          >
            {copied ? '✅ 복사 완료!' : '📋 본문 텍스트 복사'}
          </button>
          <button className="text-xs font-semibold text-white px-3 py-1.5 rounded-md" style={{ background: '#999', cursor: 'default' }} tabIndex={-1}>
            발행
          </button>
        </div>
      </div>

      {/* ── 툴바 ── */}
      <div className="px-3 py-2 bg-white border-b border-gray-200 flex items-center gap-0.5 flex-wrap shrink-0">
        <ToolbarBtn label="B" bold /><ToolbarBtn label="I" /><ToolbarBtn label="U" />
        <ToolbarSep />
        <ToolbarBtn label="크기▼" /><ToolbarBtn label="색상▼" />
        <ToolbarSep />
        <ToolbarBtn label="≡ 왼쪽" /><ToolbarBtn label="≡ 가운데" /><ToolbarBtn label="≡ 오른쪽" />
        <ToolbarSep />
        <ToolbarBtn label="목록" /><ToolbarBtn label="번호" />
        <ToolbarSep />
        <ToolbarBtn label="사진" /><ToolbarBtn label="동영상" /><ToolbarBtn label="링크" />
        <div className="ml-auto">
          <span className="text-xs text-amber-600 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">
            ⚠ HTML 미지원
          </span>
        </div>
      </div>

      {/* ── 제목 영역 ── */}
      {title && (
        <div className="px-5 py-3 bg-white border-b border-dashed border-gray-200 shrink-0">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1">
              <div className="text-xs text-gray-400 mb-1 font-medium">제목</div>
              <div className="text-xl font-bold leading-snug" style={{ color: '#191919', fontFamily: '나눔고딕, NanumGothic, sans-serif' }}>
                {title}
              </div>
            </div>
            <button
              onClick={handleCopyTitle}
              className="shrink-0 text-xs px-2.5 py-1 rounded border transition-colors mt-5"
              style={{
                background: copiedTitle ? '#e8f5e9' : '#fff',
                borderColor: copiedTitle ? '#a5d6a7' : '#ddd',
                color: copiedTitle ? '#2e7d32' : '#666',
              }}
            >
              {copiedTitle ? '✅' : '복사'}
            </button>
          </div>
        </div>
      )}

      {/* ── 본문 영역: 텍스트 + 이미지 인라인 ── */}
      <div className="flex-1 overflow-y-auto px-5 py-5 bg-white" style={{ minHeight: '400px', maxHeight: '70vh' }}>
        <div className="text-xs text-gray-400 mb-3 font-medium">본문</div>
        {segments.map((seg, i) => {
          if (seg.type === 'text') {
            return (
              <pre
                key={i}
                className="whitespace-pre-wrap leading-relaxed text-sm"
                style={{ color: '#333', fontFamily: '나눔고딕, NanumGothic, "맑은 고딕", "Malgun Gothic", sans-serif', wordBreak: 'keep-all' }}
              >
                {seg.content}
              </pre>
            );
          }
          if (seg.type === 'main-image') {
            return (
              <div key={i} className="my-4 py-1 text-center text-sm italic" style={{ color: '#9ca3af' }}>
                [대표 이미지를 여기에 삽입하세요]
              </div>
            );
          }
          if (seg.type === 'sub-image') {
            return (
              <div key={i} className="my-4 py-1 text-center text-sm italic" style={{ color: '#9ca3af' }}>
                {`[서브 이미지 ${seg.index + 1}을(를) 여기에 삽입하세요]`}
              </div>
            );
          }
          return null;
        })}
      </div>

      {/* ── 태그 영역 ── */}
      {keywords.length > 0 && (
        <div className="px-5 py-3 bg-white border-t border-gray-200 shrink-0">
          <div className="flex items-start gap-2 flex-wrap">
            <span className="text-xs font-semibold text-gray-500 mt-0.5 shrink-0">태그</span>
            {keywords.slice(0, 30).map((kw, i) => (
              <span key={i} className="text-xs px-2.5 py-0.5 rounded-full border cursor-default" style={{ background: '#f5f5f5', borderColor: '#ddd', color: '#555' }}>
                #{kw}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* ── SEO 제목 제안 ── */}
      {seoTitles.length > 0 && (
        <div className="px-5 py-3 border-t border-gray-200 shrink-0" style={{ background: '#f9f9f9' }}>
          <div className="text-xs font-semibold text-gray-500 mb-2">SEO 제목 제안</div>
          <div className="space-y-1">
            {seoTitles.slice(0, 3).map((t, i) => (
              <div key={i} className="flex items-center gap-2 bg-white border border-gray-200 rounded px-3 py-1.5">
                <span className="text-xs text-gray-700 flex-1">{t}</span>
                <button
                  onClick={() => navigator.clipboard.writeText(t).catch(() => {})}
                  className="text-xs shrink-0 px-2 py-0.5 rounded border border-gray-300 text-gray-500 hover:bg-gray-100 transition-colors"
                >
                  복사
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── 하단 안내 ── */}
      <div className="px-4 py-2.5 border-t shrink-0" style={{ background: '#f0fdf4', borderColor: '#bbf7d0' }}>
        <p className="text-xs" style={{ color: '#166534' }}>
          💡 <strong>사용법:</strong> "본문 텍스트 복사" → 네이버 스마트에디터에 붙여넣기.
          이미지는 <strong>[대표이미지]</strong>, <strong>[서브N 이미지]</strong> 위치에 직접 업로드하세요.
        </p>
      </div>
    </div>
  );
};
