import React, { useState, useCallback } from 'react';
import { NaviResult as NaviResultType } from '../types';
import { generateImage } from '../services/naverAI';
import { SeoReport } from './SeoReport';

interface Props {
    result: NaviResultType;
    topic: string;
}

export const NaviResult: React.FC<Props> = ({ result, topic }) => {
    const [copied, setCopied] = useState(false);
    const [mainImg, setMainImg] = useState<string | null>(null);
    const [subImgs, setSubImgs] = useState<Record<number, string>>({});
    const [loadingMain, setLoadingMain] = useState(false);
    const [loadingSub, setLoadingSub] = useState<Record<number, boolean>>({});
    const [imgError, setImgError] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState<'preview' | 'html'>('preview');

    const handleCopy = useCallback(async () => {
        try {
            await navigator.clipboard.writeText(result.html);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch {}
    }, [result.html]);

    const handleMainImg = useCallback(async () => {
        if (!result.imagePrompt) return;
        setLoadingMain(true);
        setImgError(null);
        try {
            const img = await generateImage(result.imagePrompt, '1:1');
            setMainImg(img);
        } catch (e) {
            setImgError(e instanceof Error ? e.message : '이미지 생성 실패');
        } finally {
            setLoadingMain(false);
        }
    }, [result.imagePrompt]);

    const handleSubImg = useCallback(async (idx: number) => {
        const p = result.subImagePrompts?.[idx];
        if (!p) return;
        setLoadingSub(prev => ({ ...prev, [idx]: true }));
        try {
            const img = await generateImage(p.prompt, '16:9');
            setSubImgs(prev => ({ ...prev, [idx]: img }));
        } catch {}
        finally { setLoadingSub(prev => ({ ...prev, [idx]: false })); }
    }, [result.subImagePrompts]);

    // Inject images into HTML preview
    const getRenderedHtml = () => {
        let html = result.html;
        if (mainImg) {
            html = html.replace(
                '<!-- 이미지1 -->',
                `<img src='${mainImg}' alt='${result.altText}' style='width:100%; border-radius:8px; margin:16px 0;' />`
            );
        }
        result.subImagePrompts?.forEach((p, i) => {
            const key = i + 2;
            if (subImgs[i]) {
                html = html.replace(
                    `<!-- 이미지${key} -->`,
                    `<img src='${subImgs[i]}' alt='${p.altText}' style='width:100%; border-radius:8px; margin:16px 0;' />`
                );
            }
        });
        return html;
    };

    return (
        <div className="space-y-5">
            {/* SEO Report */}
            <SeoReport report={result.seoReport} />

            {/* Keywords & Titles */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="bg-gray-800 rounded-xl p-4">
                    <p className="text-xs font-bold text-gray-400 mb-2 uppercase tracking-wide">핵심 키워드</p>
                    <div className="flex flex-wrap gap-2">
                        {result.keywords.map((k, i) => (
                            <span key={i} className={`text-xs px-3 py-1 rounded-full font-semibold ${i === 0 ? 'bg-sky-600 text-white' : 'bg-gray-700 text-gray-300'}`}>
                                {k}
                            </span>
                        ))}
                    </div>
                </div>
                <div className="bg-gray-800 rounded-xl p-4">
                    <p className="text-xs font-bold text-gray-400 mb-2 uppercase tracking-wide">썸네일 제목</p>
                    <div className="space-y-1">
                        {result.thumbnailTitles.map((t, i) => (
                            <p key={i} className="text-sm text-white font-semibold">{t}</p>
                        ))}
                    </div>
                </div>
            </div>

            {/* Image Generation */}
            <div className="bg-gray-800 rounded-xl p-4 space-y-3">
                <p className="text-sm font-bold text-white">🎨 이미지 생성</p>
                {imgError && <p className="text-red-400 text-xs">{imgError}</p>}

                {/* Main image */}
                <div className="flex items-center gap-3">
                    <button
                        onClick={handleMainImg}
                        disabled={loadingMain}
                        className="flex-shrink-0 bg-sky-600 hover:bg-sky-500 disabled:bg-gray-600 text-white text-sm font-bold px-4 py-2 rounded-lg transition-colors"
                    >
                        {loadingMain ? (
                            <span className="flex items-center gap-2">
                                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>
                                생성 중
                            </span>
                        ) : '대표 이미지'}
                    </button>
                    <p className="text-xs text-gray-500 truncate">{result.imagePrompt?.slice(0, 60)}...</p>
                </div>
                {mainImg && <img src={mainImg} alt={result.altText} className="w-full max-w-sm rounded-lg" />}

                {/* Sub images */}
                {result.subImagePrompts?.map((p, i) => (
                    <div key={i} className="space-y-2">
                        <div className="flex items-center gap-3">
                            <button
                                onClick={() => handleSubImg(i)}
                                disabled={loadingSub[i]}
                                className="flex-shrink-0 bg-purple-700 hover:bg-purple-600 disabled:bg-gray-600 text-white text-sm font-bold px-4 py-2 rounded-lg transition-colors"
                            >
                                {loadingSub[i] ? (
                                    <span className="flex items-center gap-2">
                                        <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>
                                        생성 중
                                    </span>
                                ) : `서브 ${i + 1}`}
                            </button>
                            <p className="text-xs text-gray-500 truncate">{p.altText}</p>
                        </div>
                        {subImgs[i] && <img src={subImgs[i]} alt={p.altText} className="w-full rounded-lg" />}
                    </div>
                ))}
            </div>

            {/* HTML Tabs */}
            <div className="bg-gray-800 rounded-xl overflow-hidden">
                <div className="flex border-b border-gray-700">
                    <button
                        onClick={() => setActiveTab('preview')}
                        className={`flex-1 py-3 text-sm font-bold transition-colors ${activeTab === 'preview' ? 'text-sky-400 bg-gray-900/50' : 'text-gray-400 hover:text-white'}`}
                    >
                        미리보기
                    </button>
                    <button
                        onClick={() => setActiveTab('html')}
                        className={`flex-1 py-3 text-sm font-bold transition-colors ${activeTab === 'html' ? 'text-sky-400 bg-gray-900/50' : 'text-gray-400 hover:text-white'}`}
                    >
                        HTML 코드
                    </button>
                </div>

                {activeTab === 'preview' && (
                    <div
                        className="p-5 prose prose-invert max-w-none overflow-auto max-h-[600px]"
                        dangerouslySetInnerHTML={{ __html: getRenderedHtml() }}
                    />
                )}

                {activeTab === 'html' && (
                    <div className="relative">
                        <button
                            onClick={handleCopy}
                            className="absolute top-3 right-3 bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold px-3 py-1.5 rounded-lg z-10"
                        >
                            {copied ? '✅ 복사됨!' : '📋 복사'}
                        </button>
                        <pre className="p-5 text-xs text-gray-300 overflow-auto max-h-[500px] whitespace-pre-wrap break-all">
                            {result.html}
                        </pre>
                    </div>
                )}
            </div>
        </div>
    );
};
