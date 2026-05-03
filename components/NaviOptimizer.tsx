import React, { useState } from 'react';
import { NaverSeoMethod, SEO_METHOD_LABELS, SEO_METHOD_DESCRIPTIONS, NaviResult as NaviResultType } from '../types';
import { optimizeNaverPost } from '../services/naverAI';
import { NaviResult } from './NaviResult';

const METHODS: NaverSeoMethod[] = ['crank', 'alcon', 'aeo', 'homeplate', 'insightedge'];
const METHOD_ICONS: Record<NaverSeoMethod, string> = {
    crank: '📊', alcon: '🚀', aeo: '🤖', homeplate: '💛', insightedge: '🔬',
};

export const NaviOptimizer: React.FC = () => {
    const [content, setContent] = useState('');
    const [method, setMethod] = useState<NaverSeoMethod>('alcon');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [result, setResult] = useState<NaviResultType | null>(null);

    const handleOptimize = async () => {
        if (!content.trim()) { setError('최적화할 기존 글을 입력해주세요.'); return; }
        setIsLoading(true);
        setError(null);
        setResult(null);
        try {
            const res = await optimizeNaverPost(content.trim(), method);
            setResult(res);
        } catch (e) {
            setError(e instanceof Error ? e.message : '최적화 중 오류가 발생했습니다.');
        } finally {
            setIsLoading(false);
        }
    };

    const charCount = content.length;
    const charColor = charCount === 0
        ? 'text-gray-500'
        : charCount < 500
            ? 'text-red-400'
            : charCount < 1500
                ? 'text-yellow-400'
                : 'text-green-400';

    return (
        <div className="space-y-5">
            {/* Info */}
            <div className="bg-sky-900/20 border border-sky-800 rounded-xl px-4 py-3">
                <p className="text-sky-300 text-sm font-semibold">✨ 기존 네이버 블로그 글을 SEO 최적화 버전으로 재작성합니다</p>
                <p className="text-gray-400 text-xs mt-1">기존 글의 핵심 내용은 유지하면서 SEO 구조, 키워드 배치, 가독성을 개선합니다 (최대 4,000자 분석)</p>
            </div>

            {/* Method */}
            <div>
                <label className="block text-sm font-bold text-gray-300 mb-2">📐 최적화 방식</label>
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
                <p className="mt-2 text-xs text-sky-400 bg-sky-900/20 rounded-lg px-3 py-2">
                    {METHOD_ICONS[method]} {SEO_METHOD_DESCRIPTIONS[method]}
                </p>
            </div>

            {/* Content Input */}
            <div>
                <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-sm font-bold text-gray-300">📝 기존 글 붙여넣기</label>
                    <span className={`text-xs font-semibold ${charColor}`}>
                        {charCount.toLocaleString()}자
                        {charCount > 0 && charCount < 500 && ' (너무 짧음)'}
                        {charCount >= 500 && charCount < 1500 && ' (적정)'}
                        {charCount >= 1500 && ' (충분)'}
                    </span>
                </div>
                <textarea
                    value={content}
                    onChange={e => setContent(e.target.value)}
                    placeholder="여기에 기존 네이버 블로그 글을 붙여넣으세요 (HTML 또는 텍스트 모두 가능)&#10;&#10;최소 500자 이상 권장 · 최대 4,000자까지 분석합니다"
                    rows={12}
                    className="w-full bg-gray-900 border border-gray-600 rounded-lg px-3 py-2.5 text-white placeholder-gray-500 focus:ring-2 focus:ring-sky-500 text-sm resize-none"
                />
            </div>

            {/* Optimize Button */}
            <button
                onClick={handleOptimize}
                disabled={isLoading || !content.trim()}
                className="w-full flex items-center justify-center gap-2 bg-sky-500 hover:bg-sky-400 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-bold py-3.5 rounded-xl transition-colors text-base"
            >
                {isLoading ? (
                    <>
                        <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24" fill="none">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                        </svg>
                        SEO 최적화 중...
                    </>
                ) : `⚡ ${SEO_METHOD_LABELS[method]} 방식으로 최적화`}
            </button>

            {error && (
                <div className="bg-red-900/30 border border-red-700 rounded-xl px-4 py-3 text-red-300 text-sm">
                    ❌ {error}
                </div>
            )}

            {result && <NaviResult result={result} topic="기존 글 최적화" />}
        </div>
    );
};
