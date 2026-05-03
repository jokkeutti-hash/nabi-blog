import React, { useState } from 'react';
import { NaverSeoMethod, SEO_METHOD_LABELS } from '../types';
import { generateNaverTitles } from '../services/naverAI';

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

export const NaviTitles: React.FC = () => {
    const [category, setCategory] = useState(CATEGORIES[0].label);
    const [subCategory, setSubCategory] = useState(CATEGORIES[0].subs[0]);
    const [method, setMethod] = useState<NaverSeoMethod>('crank');
    const [keyword, setKeyword] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [titles, setTitles] = useState<string[]>([]);
    const [copied, setCopied] = useState<number | null>(null);

    const currentCat = CATEGORIES.find(c => c.label === category)!;

    const handleCategoryChange = (cat: string) => {
        setCategory(cat);
        const found = CATEGORIES.find(c => c.label === cat);
        if (found) setSubCategory(found.subs[0]);
    };

    const handleGenerate = async () => {
        setIsLoading(true);
        setError(null);
        setTitles([]);
        try {
            const result = await generateNaverTitles({
                category,
                subCategory,
                method,
                keyword: keyword.trim() || undefined,
            });
            setTitles(result);
        } catch (e) {
            setError(e instanceof Error ? e.message : '생성 중 오류가 발생했습니다.');
        } finally {
            setIsLoading(false);
        }
    };

    const handleCopy = async (title: string, idx: number) => {
        try {
            await navigator.clipboard.writeText(title);
            setCopied(idx);
            setTimeout(() => setCopied(null), 2000);
        } catch {}
    };

    const handleCopyAll = async () => {
        try {
            await navigator.clipboard.writeText(titles.join('\n'));
            setCopied(-1);
            setTimeout(() => setCopied(null), 2000);
        } catch {}
    };

    return (
        <div className="space-y-5">
            {/* Method */}
            <div>
                <label className="block text-sm font-bold text-gray-300 mb-2">📐 SEO 방식</label>
                <div className="grid grid-cols-5 gap-2">
                    {METHODS.map(m => (
                        <button
                            key={m}
                            onClick={() => setMethod(m)}
                            className={`p-2.5 rounded-xl border-2 text-left transition-all ${
                                method === m
                                    ? 'border-sky-400 bg-sky-900/30 text-white'
                                    : 'border-gray-700 bg-gray-800/50 text-gray-400 hover:border-gray-500'
                            }`}
                        >
                            <div className="text-base mb-0.5">{METHOD_ICONS[m]}</div>
                            <div className="text-xs font-bold leading-tight">{SEO_METHOD_LABELS[m]}</div>
                        </button>
                    ))}
                </div>
            </div>

            {/* Category */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                    <label className="block text-sm font-bold text-gray-300 mb-1.5">📂 카테고리</label>
                    <select
                        value={category}
                        onChange={e => handleCategoryChange(e.target.value)}
                        className="w-full bg-gray-900 border border-gray-600 rounded-lg px-3 py-2.5 text-white focus:ring-2 focus:ring-sky-500 text-sm"
                    >
                        {CATEGORIES.map(c => (
                            <option key={c.label} value={c.label}>{c.label}</option>
                        ))}
                    </select>
                </div>
                <div>
                    <label className="block text-sm font-bold text-gray-300 mb-1.5">📌 세부 카테고리</label>
                    <select
                        value={subCategory}
                        onChange={e => setSubCategory(e.target.value)}
                        className="w-full bg-gray-900 border border-gray-600 rounded-lg px-3 py-2.5 text-white focus:ring-2 focus:ring-sky-500 text-sm"
                    >
                        {currentCat.subs.map(s => (
                            <option key={s} value={s}>{s}</option>
                        ))}
                    </select>
                </div>
            </div>

            {/* Keyword */}
            <div>
                <label className="block text-sm font-bold text-gray-300 mb-1.5">
                    🔑 핵심 키워드
                    <span className="ml-2 text-xs text-gray-500 font-normal">(선택 — 입력하면 더 정확해집니다)</span>
                </label>
                <input
                    value={keyword}
                    onChange={e => setKeyword(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && !isLoading && handleGenerate()}
                    placeholder="예: 신혼부부 인테리어, 반려견 산책 용품"
                    className="w-full bg-gray-900 border border-gray-600 rounded-lg px-3 py-2.5 text-white placeholder-gray-500 focus:ring-2 focus:ring-sky-500 text-sm"
                />
            </div>

            {/* Button */}
            <button
                onClick={handleGenerate}
                disabled={isLoading}
                className="w-full flex items-center justify-center gap-2 bg-sky-500 hover:bg-sky-400 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-bold py-3.5 rounded-xl transition-colors text-base"
            >
                {isLoading ? (
                    <>
                        <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24" fill="none">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                        </svg>
                        클릭률 높은 제목 생성 중...
                    </>
                ) : '✨ 클릭률 높은 제목 10개 생성'}
            </button>

            {error && (
                <div className="bg-red-900/30 border border-red-700 rounded-xl px-4 py-3 text-red-300 text-sm">
                    ❌ {error}
                </div>
            )}

            {titles.length > 0 && (
                <div className="space-y-2">
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-wide">
                        생성된 제목 ({titles.length}개) — {category} &gt; {subCategory}
                    </p>
                    {titles.map((title, i) => (
                        <div key={i} className="flex items-center gap-3 bg-gray-800 rounded-xl px-4 py-3">
                            <span className="text-sky-400 font-black text-sm w-6 flex-shrink-0 text-center">{i + 1}</span>
                            <span className="flex-1 text-white text-sm leading-snug">{title}</span>
                            <button
                                onClick={() => handleCopy(title, i)}
                                className="flex-shrink-0 text-xs bg-gray-700 hover:bg-sky-600 text-gray-300 hover:text-white px-3 py-1.5 rounded-lg transition-colors"
                            >
                                {copied === i ? '✅' : '복사'}
                            </button>
                        </div>
                    ))}
                    <button
                        onClick={handleCopyAll}
                        className="w-full bg-gray-700 hover:bg-gray-600 text-gray-300 text-sm font-bold py-2.5 rounded-xl transition-colors"
                    >
                        {copied === -1 ? '✅ 전체 복사됨!' : '📋 전체 복사'}
                    </button>
                </div>
            )}
        </div>
    );
};
