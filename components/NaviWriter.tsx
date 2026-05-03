import React, { useState } from 'react';
import { NaverSeoMethod, SEO_METHOD_LABELS, SEO_METHOD_DESCRIPTIONS, NaviResult as NaviResultType } from '../types';
import { generateNaverPost, generatePersona } from '../services/naverAI';
import { NaviResult } from './NaviResult';

const CATEGORIES = [
    { label: '생활/라이프스타일', subs: ['인테리어', '요리/레시피', '청소/정리', '미니멀라이프', '반려동물'] },
    { label: '건강/웰니스', subs: ['다이어트', '운동/헬스', '영양/식품', '한방/자연치유', '멘탈헬스'] },
    { label: '재테크/금융', subs: ['주식/ETF', '부동산', '절약/저축', '연금/보험', '부업/수익화'] },
    { label: 'IT/디지털', subs: ['스마트폰', 'PC/노트북', '앱 활용법', 'AI 도구', '소프트웨어'] },
    { label: '육아/교육', subs: ['임신/출산', '영유아', '초등교육', '학습법', '장난감/교구'] },
    { label: '여행', subs: ['국내여행', '해외여행', '캠핑', '맛집', '숙소 추천'] },
    { label: '뷰티/패션', subs: ['스킨케어', '메이크업', '헤어', '패션/코디', '향수'] },
    { label: '쇼핑/리뷰', subs: ['가전제품', '생활용품', '식품', '의류', '건강기능식품'] },
];

const METHODS: NaverSeoMethod[] = ['crank', 'alcon', 'aeo', 'homeplate', 'insightedge'];
const METHOD_ICONS: Record<NaverSeoMethod, string> = {
    crank: '📊', alcon: '🚀', aeo: '🤖', homeplate: '💛', insightedge: '🔬',
};

export const NaviWriter: React.FC = () => {
    const [topic, setTopic] = useState('');
    const [keywords, setKeywords] = useState('');
    const [method, setMethod] = useState<NaverSeoMethod>('crank');
    const [persona, setPersona] = useState('');
    const [imageCount, setImageCount] = useState(3);
    const [includeFaq, setIncludeFaq] = useState(true);
    const [isProduct, setIsProduct] = useState(false);
    const [productInfo, setProductInfo] = useState('');
    const [additionalRequest, setAdditionalRequest] = useState('');

    const [isLoading, setIsLoading] = useState(false);
    const [isPersonaLoading, setIsPersonaLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [result, setResult] = useState<NaviResultType | null>(null);

    const handleGenerate = async () => {
        if (!topic.trim()) { setError('주제를 입력해주세요.'); return; }
        setIsLoading(true);
        setError(null);
        setResult(null);
        try {
            const res = await generateNaverPost({
                topic: topic.trim(),
                keywords: keywords.trim() || undefined,
                method,
                persona: persona.trim() || undefined,
                imageCount,
                includeFaq,
                isProduct,
                productInfo: isProduct ? productInfo.trim() : undefined,
                additionalRequest: additionalRequest.trim() || undefined,
            });
            setResult(res);
        } catch (e) {
            setError(e instanceof Error ? e.message : '생성 중 오류가 발생했습니다.');
        } finally {
            setIsLoading(false);
        }
    };

    const handlePersonaSuggest = async () => {
        if (!topic.trim()) return;
        setIsPersonaLoading(true);
        try {
            const p = await generatePersona(topic.trim());
            setPersona(p);
        } catch {}
        finally { setIsPersonaLoading(false); }
    };

    return (
        <div className="space-y-5">
            {/* SEO Method */}
            <div>
                <label className="block text-sm font-bold text-gray-300 mb-2">📐 SEO 최적화 방식</label>
                <div className="grid grid-cols-1 sm:grid-cols-5 gap-2">
                    {METHODS.map(m => (
                        <button
                            key={m}
                            onClick={() => setMethod(m)}
                            className={`p-3 rounded-xl border-2 text-left transition-all ${
                                method === m
                                    ? 'border-sky-400 bg-sky-900/30 text-white'
                                    : 'border-gray-700 bg-gray-800/50 text-gray-400 hover:border-gray-500'
                            }`}
                        >
                            <div className="text-lg mb-1">{METHOD_ICONS[m]}</div>
                            <div className="text-xs font-bold leading-tight">{SEO_METHOD_LABELS[m]}</div>
                        </button>
                    ))}
                </div>
                <p className="mt-2 text-xs text-sky-400 bg-sky-900/20 rounded-lg px-3 py-2">
                    {METHOD_ICONS[method]} {SEO_METHOD_DESCRIPTIONS[method]}
                </p>
            </div>

            {/* Topic & Keywords */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                    <label className="block text-sm font-bold text-gray-300 mb-1.5">✏️ 주제 <span className="text-red-400">*</span></label>
                    <input
                        value={topic}
                        onChange={e => setTopic(e.target.value)}
                        placeholder="예: 다이어트에 좋은 아침 식단"
                        className="w-full bg-gray-900 border border-gray-600 rounded-lg px-3 py-2.5 text-white placeholder-gray-500 focus:ring-2 focus:ring-sky-500 text-sm"
                    />
                </div>
                <div>
                    <label className="block text-sm font-bold text-gray-300 mb-1.5">🔑 핵심 키워드</label>
                    <input
                        value={keywords}
                        onChange={e => setKeywords(e.target.value)}
                        placeholder="예: 아침 식단, 다이어트 식단"
                        className="w-full bg-gray-900 border border-gray-600 rounded-lg px-3 py-2.5 text-white placeholder-gray-500 focus:ring-2 focus:ring-sky-500 text-sm"
                    />
                </div>
            </div>

            {/* Persona */}
            <div>
                <label className="block text-sm font-bold text-gray-300 mb-1.5">
                    👤 인간 페르소나
                    <span className="ml-2 text-xs text-gray-500 font-normal">(글쓴이/독자 설정)</span>
                </label>
                <div className="flex gap-2">
                    <input
                        value={persona}
                        onChange={e => setPersona(e.target.value)}
                        placeholder="예: 30대 직장맘, 건강 정보에 관심 많은 독자층 타겟"
                        className="flex-1 bg-gray-900 border border-gray-600 rounded-lg px-3 py-2.5 text-white placeholder-gray-500 focus:ring-2 focus:ring-sky-500 text-sm"
                    />
                    <button
                        onClick={handlePersonaSuggest}
                        disabled={isPersonaLoading || !topic.trim()}
                        className="flex-shrink-0 bg-purple-700 hover:bg-purple-600 disabled:bg-gray-700 text-white text-sm font-bold px-4 py-2.5 rounded-lg transition-colors"
                    >
                        {isPersonaLoading ? '...' : 'AI 제안'}
                    </button>
                </div>
            </div>

            {/* Options Row */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div>
                    <label className="block text-xs font-bold text-gray-400 mb-1.5">🖼️ 이미지 수 ({imageCount}개)</label>
                    <input
                        type="range" min={1} max={8} value={imageCount}
                        onChange={e => setImageCount(+e.target.value)}
                        className="w-full accent-sky-500"
                    />
                    <div className="flex justify-between text-xs text-gray-600 mt-0.5">
                        <span>1</span><span>8</span>
                    </div>
                </div>
                <div className="flex flex-col justify-center">
                    <label className="flex items-center gap-2 cursor-pointer">
                        <input
                            type="checkbox" checked={includeFaq}
                            onChange={e => setIncludeFaq(e.target.checked)}
                            className="w-4 h-4 rounded accent-sky-500"
                        />
                        <span className="text-sm text-gray-300 font-semibold">FAQ 포함</span>
                    </label>
                </div>
                <div className="flex flex-col justify-center col-span-2 sm:col-span-2">
                    <label className="flex items-center gap-2 cursor-pointer">
                        <input
                            type="checkbox" checked={isProduct}
                            onChange={e => setIsProduct(e.target.checked)}
                            className="w-4 h-4 rounded accent-sky-500"
                        />
                        <span className="text-sm text-gray-300 font-semibold">🛍️ 상품 합성 (제품 블로그)</span>
                    </label>
                </div>
            </div>

            {/* Product info */}
            {isProduct && (
                <div>
                    <label className="block text-sm font-bold text-gray-300 mb-1.5">상품 정보</label>
                    <textarea
                        value={productInfo}
                        onChange={e => setProductInfo(e.target.value)}
                        placeholder="상품명, 가격, 특징, 구매 링크 등"
                        rows={3}
                        className="w-full bg-gray-900 border border-gray-600 rounded-lg px-3 py-2.5 text-white placeholder-gray-500 focus:ring-2 focus:ring-sky-500 text-sm resize-none"
                    />
                </div>
            )}

            {/* Additional request */}
            <div>
                <label className="block text-sm font-bold text-gray-300 mb-1.5">📝 추가 요청사항 <span className="text-gray-500 font-normal text-xs">(선택)</span></label>
                <textarea
                    value={additionalRequest}
                    onChange={e => setAdditionalRequest(e.target.value)}
                    placeholder="예: 50대 독자에게 친근하게, 음식 사진 많이, 마지막에 레시피 포함"
                    rows={2}
                    className="w-full bg-gray-900 border border-gray-600 rounded-lg px-3 py-2.5 text-white placeholder-gray-500 focus:ring-2 focus:ring-sky-500 text-sm resize-none"
                />
            </div>

            {/* Generate button */}
            <button
                onClick={handleGenerate}
                disabled={isLoading || !topic.trim()}
                className="w-full flex items-center justify-center gap-2 bg-sky-500 hover:bg-sky-400 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-bold py-3.5 rounded-xl transition-colors text-base"
            >
                {isLoading ? (
                    <>
                        <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24" fill="none">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                        </svg>
                        네이버 SEO 최적화 글 작성 중...
                    </>
                ) : `✨ ${SEO_METHOD_LABELS[method]} 방식으로 글 생성`}
            </button>

            {error && (
                <div className="bg-red-900/30 border border-red-700 rounded-xl px-4 py-3 text-red-300 text-sm">
                    ❌ {error}
                </div>
            )}

            {result && <NaviResult result={result} topic={topic} />}
        </div>
    );
};
