import React, { useState, useCallback } from 'react';
import { NaviResult as NaviResultType } from '../types';
import { generateImage } from '../services/naverAI';

interface Props {
    result: NaviResultType | null;
    skipImages?: boolean;
}

export const MediaPanel: React.FC<Props> = ({ result, skipImages }) => {
    const [mainImg, setMainImg] = useState<string | null>(null);
    const [subImgs, setSubImgs] = useState<Record<number, string>>({});
    const [loadingMain, setLoadingMain] = useState(false);
    const [loadingSub, setLoadingSub] = useState<Record<number, boolean>>({});
    const [imgError, setImgError] = useState<string | null>(null);

    const handleMainImg = useCallback(async () => {
        if (!result?.imagePrompt) return;
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
    }, [result?.imagePrompt]);

    const handleSubImg = useCallback(async (idx: number) => {
        const p = result?.subImagePrompts?.[idx];
        if (!p) return;
        setLoadingSub(prev => ({ ...prev, [idx]: true }));
        try {
            const img = await generateImage(p.prompt, '16:9');
            setSubImgs(prev => ({ ...prev, [idx]: img }));
        } catch {}
        finally { setLoadingSub(prev => ({ ...prev, [idx]: false })); }
    }, [result?.subImagePrompts]);

    return (
        <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden sticky top-[120px]">
            <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-100 bg-gray-50">
                <span className="text-sm">🖼️</span>
                <span className="text-sm font-bold text-gray-700">미디어 생성</span>
            </div>

            {!result ? (
                <div className="p-6 text-center">
                    <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
                        <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <rect x="3" y="3" width="18" height="18" rx="2" strokeWidth="1.5"/>
                            <circle cx="8.5" cy="8.5" r="1.5" strokeWidth="1.5"/>
                            <path d="m21 15-5-5L5 21" strokeWidth="1.5"/>
                        </svg>
                    </div>
                    <p className="text-gray-500 text-xs leading-relaxed">블로그 글을 생성하면 본문에 맞는 이미지 및 동영상 생기가 여기에 나타납니다.</p>
                </div>
            ) : skipImages ? (
                <div className="p-4 text-center text-gray-400 text-xs">미생성 선택됨</div>
            ) : (
                <div className="p-4 space-y-3">
                    {imgError && <p className="text-red-500 text-xs bg-red-50 rounded-lg px-3 py-2">{imgError}</p>}

                    {/* Main image */}
                    <div>
                        <div className="flex items-center gap-2 mb-1.5">
                            <button
                                onClick={handleMainImg}
                                disabled={loadingMain}
                                className="flex-shrink-0 bg-green-600 hover:bg-green-500 disabled:bg-gray-300 text-white text-xs font-bold px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5"
                            >
                                {loadingMain ? (
                                    <><svg className="animate-spin h-3 w-3" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>생성 중</>
                                ) : '대표 이미지'}
                            </button>
                            <span className="text-xs text-gray-400 truncate">{result.imagePrompt?.slice(0, 40)}...</span>
                        </div>
                        {mainImg && <img src={mainImg} alt={result.altText} className="w-full rounded-lg border border-gray-200" />}
                    </div>

                    {/* Sub images */}
                    {result.subImagePrompts?.map((p, i) => (
                        <div key={i}>
                            <div className="flex items-center gap-2 mb-1.5">
                                <button
                                    onClick={() => handleSubImg(i)}
                                    disabled={loadingSub[i]}
                                    className="flex-shrink-0 bg-blue-600 hover:bg-blue-500 disabled:bg-gray-300 text-white text-xs font-bold px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5"
                                >
                                    {loadingSub[i] ? (
                                        <><svg className="animate-spin h-3 w-3" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>생성 중</>
                                    ) : `서브 ${i + 1}`}
                                </button>
                                <span className="text-xs text-gray-400 truncate">{p.altText}</span>
                            </div>
                            {subImgs[i] && <img src={subImgs[i]} alt={p.altText} className="w-full rounded-lg border border-gray-200" />}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};
