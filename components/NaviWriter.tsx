import React, { useState } from 'react';
import { NaverSeoMethod, SEO_METHOD_LABELS, SEO_METHOD_DESCRIPTIONS, NaviResult as NaviResultType } from '../types';
import { generateNaverPost } from '../services/naverAI';

const METHODS: NaverSeoMethod[] = ['crank', 'alcon', 'aeo', 'insightedge', 'homeplate'];

interface Props {
    onResult: (result: NaviResultType, topic: string) => void;
    onSkipImages: (skip: boolean) => void;
}

export const NaviWriter: React.FC<Props> = ({ onResult, onSkipImages }) => {
    const [topic, setTopic] = useState('');
    const [mainKeyword, setMainKeyword] = useState('');
    const [subKeywords, setSubKeywords] = useState('');
    const [method, setMethod] = useState<NaverSeoMethod>('crank');
    const [humanize, setHumanize] = useState(false);
    const [imageCount, setImageCount] = useState(6);
    const [skipImages, setSkipImages] = useState(false);
    const [includeFaq, setIncludeFaq] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleSkipChange = (v: boolean) => {
        setSkipImages(v);
        onSkipImages(v);
    };

    const handleGenerate = async () => {
        if (!mainKeyword.trim()) { setError('메인 키워드를 입력해주세요.'); return; }
        setIsLoading(true);
        setError(null);
        try {
            const res = await generateNaverPost({
                topic: topic.trim() || mainKeyword.trim(),
                mainKeyword: mainKeyword.trim(),
                subKeywords: subKeywords.trim() || undefined,
                method,
                humanize,
                imageCount,
                includeFaq,
            });
            onResult(res, topic.trim() || mainKeyword.trim());
        } catch (e) {
            setError(e instanceof Error ? e.message : '생성 중 오류가 발생했습니다.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
            <div className="p-5 space-y-5">
                {/* SEO Method */}
                <div>
                    <div className="text-xs font-bold text-gray-500 mb-2 uppercase tracking-wide">SEO 최적화 방식 선택</div>
                    <div className="grid grid-cols-3 gap-2 mb-2">
                        {METHODS.slice(0, 3).map(m => (
                            <button key={m} onClick={() => setMethod(m)}
                                className={`p-3 rounded-lg border-2 text-left transition-all text-sm font-semibold ${
                                    method === m ? 'border-green-600 bg-white text-green-700' : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
                                }`}
                            >{SEO_METHOD_LABELS[m]}</button>
                        ))}
                    </div>
                    <div className="grid grid-cols-2 gap-2 mb-2">
                        {METHODS.slice(3).map(m => (
                            <button key={m} onClick={() => setMethod(m)}
                                className={`p-3 rounded-lg border-2 text-left transition-all text-sm font-semibold ${
                                    method === m ? 'border-green-600 bg-white text-green-700' : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
                                }`}
                            >{SEO_METHOD_LABELS[m]}</button>
                        ))}
                    </div>
                    <div className="bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-xs text-gray-600">
                        {SEO_METHOD_DESCRIPTIONS[method]}
                    </div>
                </div>

                {/* Inputs */}
                <div className="space-y-3">
                    <div>
                        <label className="block text-sm text-gray-700 mb-1">주제</label>
                        <input value={topic} onChange={e => setTopic(e.target.value)}
                            placeholder="예: 서울 근교 당일치기 여행 코스 추천"
                            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 placeholder-gray-400"
                        />
                    </div>
                    <div>
                        <label className="block text-sm text-gray-700 mb-1">메인 키워드 <span className="text-red-500">*</span></label>
                        <input value={mainKeyword} onChange={e => setMainKeyword(e.target.value)}
                            placeholder="예: 당일치기 여행"
                            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 placeholder-gray-400"
                        />
                    </div>
                    <div>
                        <label className="block text-sm text-gray-700 mb-1">서브 키워드 <span className="text-gray-400 text-xs">(선택, 쉼표로 구분)</span></label>
                        <input value={subKeywords} onChange={e => setSubKeywords(e.target.value)}
                            placeholder="예: 서울 근교 드라이브, 서울 근교 가볼만한곳"
                            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 placeholder-gray-400"
                        />
                    </div>
                </div>

                {/* Humanize toggle */}
                <div className="border border-gray-200 rounded-lg px-4 py-3 flex items-center justify-between">
                    <div>
                        <span className="text-sm font-semibold text-gray-700">인간화 페르소나 적용</span>
                        <span className="ml-2 text-xs text-gray-400">(AI 탐지 우회)</span>
                    </div>
                    <button
                        onClick={() => setHumanize(v => !v)}
                        className={`relative w-12 h-6 rounded-full transition-colors flex-shrink-0 ${humanize ? 'bg-green-500' : 'bg-gray-300'}`}
                    >
                        <span className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${humanize ? 'translate-x-7' : 'translate-x-1'}`} />
                    </button>
                </div>

                {/* Multimedia */}
                <div className="border border-gray-200 rounded-lg p-4 space-y-3">
                    <div className="text-sm font-semibold text-gray-700">멀티미디어 생성</div>
                    <div className="flex items-center gap-3">
                        <span className="text-xs text-gray-500 w-14 flex-shrink-0">🖼️ 이미지</span>
                        <input type="range" min={1} max={8} value={imageCount}
                            onChange={e => setImageCount(+e.target.value)}
                            disabled={skipImages}
                            className="flex-1 accent-green-600"
                        />
                        <span className="text-xs text-gray-600 w-10 text-right">{imageCount}장</span>
                        <label className="flex items-center gap-1 text-xs text-gray-500 flex-shrink-0">
                            <input type="checkbox" checked={skipImages} onChange={e => handleSkipChange(e.target.checked)} className="accent-green-600" />
                            미생성
                        </label>
                    </div>
                </div>

                {/* FAQ */}
                <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={includeFaq} onChange={e => setIncludeFaq(e.target.checked)} className="w-4 h-4 accent-green-600" />
                    <span className="text-sm text-gray-700">
                        <span className="text-red-500 mr-1">?</span>
                        FAQ 포함 <span className="text-gray-400 text-xs">(자주 묻는 질문 섹션)</span>
                    </span>
                </label>

                {error && (
                    <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-red-600 text-sm">
                        {error}
                    </div>
                )}

                <button
                    onClick={handleGenerate}
                    disabled={isLoading || !mainKeyword.trim()}
                    className="w-full flex items-center justify-center gap-2 bg-green-700 hover:bg-green-600 disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-bold py-3.5 rounded-xl transition-colors"
                >
                    {isLoading ? (
                        <><svg className="animate-spin h-5 w-5" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>최적화 글 생성 중...</>
                    ) : '✦ 최적화 글 생성하기'}
                </button>
            </div>

            {/* Empty state */}
            {<div className="border-t border-gray-100 py-10 text-center text-gray-400">
                <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
                    <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
                    </svg>
                </div>
                <p className="text-sm font-medium text-gray-500">결과가 여기에 표시됩니다.</p>
                <p className="text-xs text-gray-400 mt-1">위 양식을 작성하고 생성 버튼을 눌러주세요.</p>
            </div>}
        </div>
    );
};
