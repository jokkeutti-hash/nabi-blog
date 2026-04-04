
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { ProcessedContent } from '../types';
import { CopyToClipboardButton, SocialMediaPostCard, workerBlob, copyToClipboard } from './Common';
import { InteractiveCodeModal } from './InteractiveCodeModal';
import { NaverDisplay } from './NaverDisplay';

interface ResultDisplayProps {
  htmlContent: string;
  isLoading: boolean;
  supplementaryInfo: ProcessedContent['supplementaryInfo'] | null;
  socialMediaPosts: ProcessedContent['socialMediaPosts'] | null;
  imageUrl: string | null;
  subImages: ProcessedContent['subImages'] | null;
  onGenerateImage: () => Promise<void>;
  isGeneratingImage: boolean;
  imageError?: string | null;
  onDeleteImage?: () => void;
  onGenerateSubImage: (index: number) => Promise<void>;
  isGeneratingSubImages: Record<number, boolean>;
  onDeleteSubImage?: (index: number) => void;
  shouldAddThumbnailText: boolean;
  onGenerateThumbnail: () => Promise<void>;
  isGeneratingThumbnail: boolean;
  thumbnailDataUrl: string | null;
  thumbnailAspectRatio: '16:9' | '1:1';
  blogPlatform?: string;
}

export const ResultDisplay: React.FC<ResultDisplayProps> = ({
  htmlContent,
  isLoading,
  supplementaryInfo,
  socialMediaPosts,
  imageUrl,
  subImages,
  onGenerateImage,
  isGeneratingImage,
  imageError,
  onGenerateSubImage,
  isGeneratingSubImages,
  onDeleteImage,
  onDeleteSubImage,
  shouldAddThumbnailText,
  onGenerateThumbnail,
  isGeneratingThumbnail,
  thumbnailDataUrl,
  thumbnailAspectRatio,
  blogPlatform,
}) => {
  const [copied, setCopied] = useState(false);
  const [viewMode, setViewMode] = useState<'preview' | 'html' | 'naver'>('preview');
  const previewRef = useRef<HTMLDivElement>(null);
  const fullscreenRef = useRef<HTMLDivElement>(null);
  const [isInteractiveCodeModalOpen, setInteractiveCodeModalOpen] = useState(false);
  const [isFullscreenPreview, setIsFullscreenPreview] = useState(false);

  const [formattedHtmlForView, setFormattedHtmlForView] = useState('');
  const workerRef = useRef<Worker | null>(null);

  useEffect(() => {
    const workerUrl = URL.createObjectURL(workerBlob);
    const worker = new Worker(workerUrl);
    workerRef.current = worker;
    
    worker.onmessage = (event: MessageEvent<string>) => {
        setFormattedHtmlForView(event.data);
    };

    return () => {
        worker.terminate();
        URL.revokeObjectURL(workerUrl);
    }
  }, []);

  // Compute HTML with images injected based on placeholders (ONLY for Preview)
  const injectedHtml = useMemo(() => {
    if (!htmlContent) return '';
    let finalHtml = htmlContent;

    const spacer = `<div style='margin: 24px 0;'></div>`;

    // Helper: actual image with spacer before and after
    const makeImageHtml = (url: string, altText: string) =>
        spacer +
        `<figure style='margin: 0; text-align: center;'>` +
        `<img src='${url}' alt='${altText}' style='width: 100%; max-height: 500px; border-radius: 12px; object-fit: contain; display: block; margin: 0 auto; box-shadow: 0 4px 20px rgba(0,0,0,0.2);'>` +
        `<figcaption style='text-align: center; font-size: 13px; color: #9CA3AF; margin-top: 10px;'>${altText}</figcaption>` +
        `</figure>` +
        spacer;

    // Helper: simple text placeholder with spacer before and after
    const makePlaceholderHtml = (label: string) =>
        spacer +
        `<p style='text-align: center; color: #9CA3AF; font-size: 14px; font-style: italic; margin: 0;'>[ ${label} 삽입위치 ]</p>` +
        spacer;

    // 1. Replace <!-- 대표 이미지 --> with image or placeholder label
    const mainSlotHtml = imageUrl
        ? makeImageHtml(imageUrl, supplementaryInfo?.altText || '대표 이미지')
        : makePlaceholderHtml('대표 이미지');
    finalHtml = finalHtml.replace(/<!--\s*대표\s*이미지\s*-->/gi, mainSlotHtml);
    // Fallback: old Korean text patterns
    finalHtml = finalHtml.replace(/<p[^>]*>\s*\[대표 이미지를 여기에 삽입하세요\]\s*<\/p>/gi, mainSlotHtml);
    finalHtml = finalHtml.replace(/\[대표 이미지를 여기에 삽입하세요\]/gi, mainSlotHtml);

    // 2. Replace <!-- 서브 이미지 N --> with image or placeholder label
    finalHtml = finalHtml.replace(/<!--\s*서브\s*이미지\s*(\d+)\s*-->/gi, (_, n) => {
        const index = parseInt(n, 10) - 1;
        const image = subImages?.[index];
        return image?.url
            ? makeImageHtml(image.url, image.altText)
            : makePlaceholderHtml(`서브 ${n} 이미지`);
    });
    // Fallback: old Korean text patterns for sub images
    if (subImages) {
        subImages.forEach((image, index) => {
            const n = index + 1;
            const slotHtml = image.url
                ? makeImageHtml(image.url, image.altText)
                : makePlaceholderHtml(`서브 ${n} 이미지`);
            finalHtml = finalHtml.replace(new RegExp(`<p[^>]*>\\s*\\[본문 이미지 ${n}을\\(를\\) 여기에 삽입하세요\\]\\s*<\\/p>`, 'gi'), slotHtml);
            finalHtml = finalHtml.replace(new RegExp(`\\[본문 이미지 ${n}을\\(를\\) 여기에 삽입하세요\\]`, 'gi'), slotHtml);
        });
    }

    return finalHtml;
  }, [htmlContent, imageUrl, supplementaryInfo, subImages]);

  const interactiveCode = useMemo(() => {
    if (!htmlContent) return null;
    // Use htmlContent instead of injectedHtml to ensure we get the code even if view mode changes
    const startComment = '<!-- Interactive Element Start -->';
    const endComment = '<!-- Interactive Element End -->';
    
    const startIndex = htmlContent.indexOf(startComment);
    const endIndex = htmlContent.indexOf(endComment);
    
    if (startIndex !== -1 && endIndex !== -1 && startIndex < endIndex) {
        const codeStartIndex = startIndex + startComment.length;
        return htmlContent.substring(codeStartIndex, endIndex).trim();
    }
    
    return null;
  }, [htmlContent]);

  const charCountNoSpaces = useMemo(() => {
    if (!htmlContent) {
      return 0;
    }
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = htmlContent;
    tempDiv.querySelectorAll('script, style').forEach(el => el.remove());
    const textOnly = tempDiv.textContent || '';
    return textOnly.replace(/\s/g, '').length;
  }, [htmlContent]);

  // 네이버 플랫폼이 아닌데 naver 탭이 선택돼 있으면 preview로 복귀
  useEffect(() => {
    if (blogPlatform !== 'naver' && viewMode === 'naver') {
      setViewMode('preview');
    }
  }, [blogPlatform, viewMode]);

  // HTML 복사용: 이미지 주석을 쉽게 삭제 가능한 단순 텍스트로 교체
  const htmlForCopy = useMemo(() => {
    if (!htmlContent) return '';
    let html = htmlContent;
    html = html.replace(/<!--\s*대표\s*이미지\s*-->/gi,
      `<p>[대표 이미지 삽입위치]</p>`);
    html = html.replace(/<!--\s*서브\s*이미지\s*(\d+)\s*-->/gi, (_: string, n: string) =>
      `<p>[서브 이미지 ${n} 삽입위치]</p>`);
    return html;
  }, [htmlContent]);

  // Update formatted HTML for view.
  useEffect(() => {
    if (viewMode === 'html' && htmlForCopy) {
        setFormattedHtmlForView('Formatting code...');
        workerRef.current?.postMessage(htmlForCopy);
    }
  }, [viewMode, htmlForCopy]);

  const handleCopy = async () => {
    if (!htmlForCopy) return;
    const success = await copyToClipboard(htmlForCopy);
    if (success) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };
  
  // Render Preview
  useEffect(() => {
    if (viewMode === 'preview' && previewRef.current && injectedHtml) {
        const container = previewRef.current;
        container.innerHTML = ''; 

        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = injectedHtml;
        const scripts = Array.from(tempDiv.getElementsByTagName('script'));
        scripts.forEach(script => script.parentNode?.removeChild(script));

        while (tempDiv.firstChild) {
            container.appendChild(tempDiv.firstChild);
        }

        // Re-execute scripts for interactive elements
        scripts.forEach(oldScript => {
            const newScript = document.createElement('script');
            Array.from(oldScript.attributes).forEach(attr => {
                newScript.setAttribute(attr.name, attr.value);
            });
            newScript.text = `
              (() => {
                try {
                  ${oldScript.text}
                } catch (e) {
                  console.error("Error executing interactive script:", e);
                }
              })();
            `;
            container.appendChild(newScript);
        });
    }
  }, [injectedHtml, viewMode]);

  // 전체화면 미리보기 HTML 주입
  useEffect(() => {
    if (isFullscreenPreview && fullscreenRef.current && injectedHtml) {
        const container = fullscreenRef.current;
        container.innerHTML = '';
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = injectedHtml;
        const scripts = Array.from(tempDiv.getElementsByTagName('script'));
        scripts.forEach(script => script.parentNode?.removeChild(script));
        while (tempDiv.firstChild) {
            container.appendChild(tempDiv.firstChild);
        }
        scripts.forEach(oldScript => {
            const newScript = document.createElement('script');
            Array.from(oldScript.attributes).forEach(attr => newScript.setAttribute(attr.name, attr.value));
            newScript.text = `(() => { try { ${oldScript.text} } catch(e) {} })();`;
            container.appendChild(newScript);
        });
    }
  }, [injectedHtml, isFullscreenPreview]);

  // ESC 키로 전체화면 닫기
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setIsFullscreenPreview(false); };
    if (isFullscreenPreview) window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [isFullscreenPreview]);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center p-10 bg-gray-800 rounded-lg h-96">
        <span className="text-5xl animate-pulse">✨</span>
        <p className="text-white mt-4 text-lg">블로그 포스트를 생성 중입니다...</p>
        <p className="text-gray-400">잠시만 기다려 주세요. 최대 1분 정도 소요될 수 있습니다.</p>
      </div>
    );
  }

  if (!htmlContent) {
    return (
      <div className="flex flex-col items-center justify-center p-10 bg-gray-800 rounded-lg h-96 text-center">
        <span className="text-5xl text-gray-500">✨</span>
        <p className="text-white mt-4 text-lg">생성된 콘텐츠가 여기에 표시됩니다.</p>
        <p className="text-gray-400">위에서 주제를 입력하고 테마를 선택한 후 생성 버튼을 클릭하세요.</p>
      </div>
    );
  }

  return (
    <div className="mt-8">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-2xl font-semibold text-white">생성된 콘텐츠</h2>
        <button
          onClick={() => setIsFullscreenPreview(true)}
          className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-500 transition-colors text-sm font-semibold shadow-lg"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
          </svg>
          전체화면 미리보기
        </button>
      </div>
      <div className="grid md:grid-cols-3 gap-6">
        <div className="md:col-span-2 bg-gray-800 rounded-lg shadow-lg overflow-hidden">
          <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center p-3 bg-gray-800 border-b border-gray-700 text-gray-900">
            <div className="flex space-x-1 items-center flex-wrap gap-y-2 mb-2 sm:mb-0">
              <button onClick={() => setViewMode('preview')} className={`px-3 py-1 text-sm rounded-md ${viewMode === 'preview' ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'}`}>
                <span role="img" aria-label="preview" className="mr-1">👀</span>미리보기
              </button>
              <button onClick={() => setViewMode('html')} className={`px-3 py-1 text-sm rounded-md ${viewMode === 'html' ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'}`}>
                <span role="img" aria-label="code" className="mr-1">💻</span>HTML
              </button>
              <button
                onClick={() => setInteractiveCodeModalOpen(true)}
                className={`px-3 py-1 text-sm rounded-md transition-colors ${!interactiveCode ? 'bg-gray-700 text-gray-500 cursor-not-allowed' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'}`}
                disabled={!interactiveCode}
                title={!interactiveCode ? "인터랙티브 요소가 없습니다." : "인터랙티브 요소 코드 보기"}
              >
                <span role="img" aria-label="interactive" className="mr-1">⚡</span>인터랙티브 코드
              </button>
              {blogPlatform === 'naver' && (
                <button
                  onClick={() => setViewMode('naver')}
                  className={`px-3 py-1 text-sm rounded-md font-semibold transition-colors ${viewMode === 'naver' ? 'text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'}`}
                  style={viewMode === 'naver' ? { background: '#03C75A' } : {}}
                >
                  <span className="mr-1 font-black">N</span>네이버
                </button>
              )}
               <div className="text-xs text-gray-400 ml-4 border-l border-gray-700 pl-4">
                  <span>글자수(공백제외): {charCountNoSpaces.toLocaleString()}자</span>
              </div>
            </div>
            <button onClick={handleCopy} className="flex items-center justify-center space-x-2 bg-green-600 text-white px-3 py-1 rounded-md hover:bg-green-700 transition-colors text-sm disabled:bg-gray-500" disabled={copied}>
              {copied ? <span>✅</span> : <span>📋</span>}
              <span>{copied ? '복사 완료!' : 'HTML 복사'}</span>
            </button>
          </div>

          {viewMode === 'naver' ? (
            <NaverDisplay
              htmlContent={htmlContent}
              isLoading={false}
              imageUrl={imageUrl}
              subImages={subImages}
              keywords={supplementaryInfo?.keywords}
              seoTitles={supplementaryInfo?.seoTitles}
            />
          ) : viewMode === 'preview' ? (
            <div ref={previewRef} id="html-preview" className="p-6 sm:p-10 bg-white font-korean text-gray-900 min-h-[600px] leading-relaxed shadow-inner" />
          ) : (
            <div>
              <div className="p-3 bg-slate-700 text-center text-sm text-gray-300 border-b border-slate-600">
                HTML 소스 코드입니다. (이미지는 포함되지 않습니다. 다운로드 후 별도 첨부해주세요){" "}
                <button
                    onClick={() => setViewMode('preview')}
                    className="font-bold text-cyan-400 hover:underline inline-flex items-center"
                >
                    <span role="img" aria-label="preview" className="mr-1.5">👀</span>
                    미리보기로 전환
                </button>
              </div>
              <pre className="p-4 text-sm bg-gray-900 overflow-y-auto whitespace-pre-wrap break-all font-mono custom-scrollbar text-white max-h-[70vh]">
                <code>{formattedHtmlForView}</code>
              </pre>
            </div>
          )}
        </div>

        {/* Right Column Wrapper */}
        <div className="flex flex-col gap-6">
          {supplementaryInfo && (
            <div className="bg-gray-800 rounded-lg shadow-lg p-4 flex flex-col space-y-6">
              
              {/* Image Section */}
              <div>
                 <h3 className="font-semibold text-lg text-white mb-2 border-b border-gray-700 pb-2">대표 이미지</h3>
                 <div className="mt-4">
                    <div className="w-full bg-gray-900 rounded-lg mb-3 flex items-center justify-center border-2 border-gray-700 border-dashed overflow-hidden relative" style={{ aspectRatio: thumbnailAspectRatio === '16:9' ? '16 / 9' : '1 / 1' }}>
                        {imageUrl ? (
                            <img src={imageUrl} alt={supplementaryInfo.altText} className="w-full h-full object-cover" />
                        ) : (
                            <div className="text-gray-600 flex flex-col items-center">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 mb-2 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                </svg>
                                <span className="text-sm font-medium text-gray-500">이미지가 생성되지 않았습니다</span>
                            </div>
                        )}
                    </div>

                    <div className="flex justify-between items-center mb-2">
                        <h4 className="font-semibold text-md text-gray-300">이미지 생성 프롬프트</h4>
                        <CopyToClipboardButton textToCopy={supplementaryInfo.imagePrompt} />
                    </div>
                    <p className="text-gray-400 bg-gray-900 p-3 rounded-md text-sm mb-3">{supplementaryInfo.imagePrompt}</p>

                    <div className="flex justify-between items-center mb-2">
                        <h4 className="font-semibold text-md text-gray-300">Alt 태그</h4>
                        <CopyToClipboardButton textToCopy={supplementaryInfo.altText} />
                    </div>
                    <p className="text-gray-400 bg-gray-900 p-3 rounded-md text-sm mb-3">{supplementaryInfo.altText}</p>

                    <div className="grid grid-cols-3 gap-2">
                        <a href={imageUrl || '#'} download={imageUrl ? "featured-image.jpeg" : undefined} onClick={e => !imageUrl && e.preventDefault()} className={`text-center bg-green-600 text-white font-bold py-2 px-4 rounded-md transition-colors duration-200 inline-block text-sm ${!imageUrl ? 'opacity-50 cursor-not-allowed hover:bg-green-600' : 'hover:bg-green-700'}`}>
                            다운로드
                        </a>
                        <button
                            onClick={onGenerateImage}
                            disabled={isGeneratingImage}
                            className={`text-center bg-purple-600 text-white font-bold py-2 px-4 rounded-md hover:bg-purple-700 transition-colors duration-200 disabled:bg-gray-500 flex items-center justify-center text-sm`}
                        >
                        {isGeneratingImage ? (
                            <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path></svg>
                        ) : (imageUrl ? '재생성' : '생성')}
                        </button>
                        <button
                            onClick={onDeleteImage}
                            disabled={!imageUrl}
                            className={`text-center bg-red-600 text-white font-bold py-2 px-4 rounded-md transition-colors duration-200 text-sm ${!imageUrl ? 'opacity-50 cursor-not-allowed' : 'hover:bg-red-700'}`}
                        >
                            삭제
                        </button>
                    </div>
                    {imageError && (
                        <p className="text-red-400 text-xs mt-2 text-center">{imageError}</p>
                    )}

                    {shouldAddThumbnailText && (
                      <button
                        onClick={onGenerateThumbnail}
                        disabled={isGeneratingThumbnail || !imageUrl}
                        className={`mt-3 w-full text-center bg-teal-600 text-white font-bold py-2 px-4 rounded-md transition-colors duration-200 flex items-center justify-center ${(!imageUrl || isGeneratingThumbnail) ? 'opacity-50 cursor-not-allowed hover:bg-teal-600' : 'hover:bg-teal-700'}`}
                      >
                        {isGeneratingThumbnail ? (
                           <>
                            <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path></svg>
                            생성 중...
                          </>
                        ) : '🖼️ 썸네일 생성'}
                      </button>
                    )}
                 </div>
                 {thumbnailDataUrl && (
                  <div className="mt-4">
                    <h4 className="text-md font-medium text-gray-400 mb-2">생성된 썸네일</h4>
                    <img src={thumbnailDataUrl} alt="Generated thumbnail" className="rounded-lg mb-3 w-full" />
                    <a href={thumbnailDataUrl} download="thumbnail.jpeg" className="w-full text-center bg-green-600 text-white font-bold py-2 px-4 rounded-md hover:bg-green-700 transition-colors duration-200 inline-block">
                      썸네일 다운로드
                    </a>
                  </div>
                )}
              </div>

              {/* Sub Images Section */}
              {subImages && subImages.length > 0 && (
                <div>
                  <h3 className="font-semibold text-lg text-white mb-3 border-b border-gray-700 pb-2">서브 이미지 (16:9)</h3>
                  <div className="grid grid-cols-1 gap-3 mt-3">
                    {subImages.map((subImage, index) => (
                      <div key={index} className="bg-gray-900 rounded-lg overflow-hidden border border-gray-700 flex flex-col">
                        {/* 이미지 썸네일 */}
                        <div className="relative bg-gray-800 flex items-center justify-center border-b border-gray-700 overflow-hidden" style={{ aspectRatio: '16 / 9' }}>
                          {subImage.url ? (
                            <img src={subImage.url} alt={subImage.altText} className="w-full h-full object-cover" />
                          ) : (
                            <div className="flex flex-col items-center text-gray-600">
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 opacity-40" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                              </svg>
                            </div>
                          )}
                          <span className="absolute top-1 left-1 bg-black/60 text-white text-xs px-1.5 py-0.5 rounded">#{index + 1}</span>
                        </div>

                        {/* 프롬프트 + 복사 */}
                        <div className="p-2 flex-1">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-xs text-gray-500">프롬프트</span>
                            <CopyToClipboardButton textToCopy={subImage.prompt} />
                          </div>
                          <p className="text-gray-400 text-xs leading-relaxed line-clamp-3 mb-2">{subImage.prompt}</p>
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-xs text-gray-500">Alt 태그</span>
                            <CopyToClipboardButton textToCopy={subImage.altText} />
                          </div>
                          <p className="text-gray-500 text-xs line-clamp-2">{subImage.altText}</p>
                        </div>

                        {/* 버튼 */}
                        <div className="grid grid-cols-3 gap-1 p-2 pt-0">
                          <a
                            href={subImage.url || '#'}
                            download={subImage.url ? `sub-image-${index + 1}.jpeg` : undefined}
                            onClick={e => !subImage.url && e.preventDefault()}
                            className={`text-center bg-green-600 text-white font-bold py-1.5 rounded text-xs ${!subImage.url ? 'opacity-50 cursor-not-allowed' : 'hover:bg-green-700'}`}
                          >
                            다운로드
                          </a>
                          <button
                            onClick={() => onGenerateSubImage(index)}
                            disabled={isGeneratingSubImages[index]}
                            className="text-center bg-purple-600 text-white font-bold py-1.5 rounded hover:bg-purple-700 transition-colors disabled:bg-gray-500 flex items-center justify-center text-xs"
                          >
                            {isGeneratingSubImages[index] ? (
                              <svg className="animate-spin h-3.5 w-3.5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path></svg>
                            ) : (subImage.url ? '재생성' : '생성')}
                          </button>
                          <button
                            onClick={() => onDeleteSubImage?.(index)}
                            className="text-center bg-red-600 text-white font-bold py-1.5 rounded hover:bg-red-700 transition-colors text-xs"
                          >
                            삭제
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* SEO and Prompt Section */}
              <div>
                <h3 className="font-semibold text-lg text-white mb-2">SEO 제목 제안</h3>
                <ul className="space-y-2 text-sm">
                  {supplementaryInfo.seoTitles.map((title, i) => (
                    <li key={i} className="flex items-center justify-between bg-gray-900 p-2 rounded">
                        <span className="text-gray-300 truncate mr-2">{title}</span>
                        <CopyToClipboardButton textToCopy={title} />
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <h3 className="font-semibold text-lg text-white mb-3">메타 태그 및 플랫폼별 키워드</h3>
                <div className="space-y-4">
                  {supplementaryInfo.metaDescription && (
                    <div>
                        <div className="flex justify-between items-center mb-2">
                            <h4 className="font-semibold text-md text-gray-300">Meta Description (설명)</h4>
                            <CopyToClipboardButton textToCopy={supplementaryInfo.metaDescription} />
                        </div>
                        <p className="text-gray-400 bg-gray-900 p-3 rounded-md text-sm">{supplementaryInfo.metaDescription}</p>
                    </div>
                  )}

                  <div>
                      <div className="flex justify-between items-center mb-2">
                          <h4 className="font-semibold text-md text-gray-300">티스토리 태그 (쉼표 구분)</h4>
                          <CopyToClipboardButton textToCopy={supplementaryInfo.keywords.join(', ')} />
                      </div>
                      <p className="text-gray-400 bg-gray-900 p-3 rounded-md text-sm">{supplementaryInfo.keywords.join(', ')}</p>
                  </div>

                  <div>
                      <div className="flex justify-between items-center mb-2">
                          <h4 className="font-semibold text-md text-gray-300">블로그스팟 라벨 (쉼표 구분)</h4>
                          <CopyToClipboardButton textToCopy={supplementaryInfo.blogspotLabels.join(', ')} />
                      </div>
                      <p className="text-gray-400 bg-gray-900 p-3 rounded-md text-sm">{supplementaryInfo.blogspotLabels.join(', ')}</p>
                      <p className="text-xs text-gray-500 mt-1.5">💡 블로그스팟 라벨: 사이트 구조를 위한 대분류 키워드 위주입니다.</p>
                  </div>
                  
                  {supplementaryInfo.slug ? (
                    <div>
                        <div className="flex justify-between items-center mb-2">
                            <h4 className="font-semibold text-md text-gray-300">URL 슬러그 (Permalink)</h4>
                            <CopyToClipboardButton textToCopy={supplementaryInfo.slug} />
                        </div>
                        <p className="text-green-300 bg-gray-900 p-3 rounded-md text-sm font-mono mb-2">
                            {supplementaryInfo.slug}
                        </p>
                        <div className="text-xs text-gray-500 bg-gray-900/50 p-2 rounded border border-gray-700">
                            <p className="mb-1">💡 <strong>필수 행동:</strong> 글 발행 전, 오른쪽 메뉴 [퍼머링크] → [맞춤 퍼머링크] 선택 → 영어 키워드(하이픈 연결) 입력.</p>
                            <p>한글 주소 사용 시 URL이 깨져 SEO에 불리할 수 있으므로, 반드시 이 영어 주소를 사용하세요.</p>
                        </div>
                    </div>
                  ) : (
                    <div>
                        <div className="flex justify-between items-center mb-2">
                            <h4 className="font-semibold text-md text-gray-300">해시태그 (# 포함)</h4>
                            <CopyToClipboardButton textToCopy={supplementaryInfo.keywords.map(k => `#${k.replace(/\s+/g, '')}`).join(' ')} />
                        </div>
                        <p className="text-blue-300 bg-gray-900 p-3 rounded-md text-sm">
                            {supplementaryInfo.keywords.map(k => `#${k.replace(/\s+/g, '')}`).join(' ')}
                        </p>
                    </div>
                  )}

                </div>
              </div>

            </div>
          )}
          {socialMediaPosts && (
            <div className="bg-gray-800 rounded-lg shadow-lg p-4 flex flex-col space-y-6">
              <h2 className="text-xl font-semibold text-white mb-2 border-b border-gray-700 pb-2">소셜 미디어 포스트</h2>
              <SocialMediaPostCard platform="Threads" content={socialMediaPosts.threads} icon="🧵" />
              <SocialMediaPostCard platform="Instagram" content={socialMediaPosts.instagram} icon="📸" />
              <SocialMediaPostCard platform="Facebook" content={socialMediaPosts.facebook} icon="👍" />
              <SocialMediaPostCard platform="X" content={socialMediaPosts.x} icon="✖️" />
            </div>
          )}
        </div>
      </div>
      {isInteractiveCodeModalOpen && interactiveCode && (
        <InteractiveCodeModal
            code={interactiveCode}
            onClose={() => setInteractiveCodeModalOpen(false)}
        />
      )}

      {/* 전체화면 미리보기 모달 */}
      {isFullscreenPreview && (
        <div className="fixed inset-0 z-50 flex flex-col bg-gray-100">
          {/* 상단 바 */}
          <div className="flex items-center justify-between px-4 py-2 bg-gray-800 border-b border-gray-700 shrink-0">
            <div className="flex items-center gap-3">
              <span className="text-white font-semibold text-sm">📄 블로그 포스트 미리보기</span>
              <span className="text-gray-400 text-xs">실제 블로그와 동일하게 렌더링됩니다</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleCopy}
                className="flex items-center gap-1 bg-green-600 text-white px-3 py-1.5 rounded-md hover:bg-green-500 transition-colors text-sm"
              >
                {copied ? '✅ 복사 완료!' : '📋 HTML 복사'}
              </button>
              <button
                onClick={() => setIsFullscreenPreview(false)}
                className="flex items-center gap-1 bg-gray-600 text-white px-3 py-1.5 rounded-md hover:bg-gray-500 transition-colors text-sm"
                title="닫기 (ESC)"
              >
                ✕ 닫기
              </button>
            </div>
          </div>
          {/* 본문 스크롤 영역 */}
          <div className="flex-1 overflow-y-auto">
            <div className="max-w-3xl mx-auto bg-white my-6 rounded-xl shadow-xl overflow-hidden">
              <div
                ref={fullscreenRef}
                className="p-8 sm:p-12 font-korean text-gray-900 leading-relaxed"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
