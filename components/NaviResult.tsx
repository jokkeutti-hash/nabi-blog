import React, { useState, useCallback } from 'react';
import { NaviResult as NaviResultType } from '../types';
import { SeoReport } from './SeoReport';

interface Props {
    result: NaviResultType;
}

export const NaviTextResult: React.FC<Props> = ({ result }) => {
    const [copied, setCopied] = useState(false);
    const [activeTab, setActiveTab] = useState<'preview' | 'html'>('preview');

    const handleCopy = useCallback(async () => {
        try {
            await navigator.clipboard.writeText(result.html);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch {}
    }, [result.html]);

    return (
        <div className="space-y-4">
            <SeoReport report={result.seoReport} />

            {/* Keywords & Titles */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
                    <p className="text-xs font-bold text-gray-400 mb-2 uppercase tracking-wide">핵심 키워드</p>
                    <div className="flex flex-wrap gap-1.5">
                        {result.keywords.map((k, i) => (
                            <span key={i} className={`text-xs px-2.5 py-1 rounded-full font-semibold ${
                                i === 0 ? 'bg-green-600 text-white' : 'bg-gray-100 text-gray-700'
                            }`}>{k}</span>
                        ))}
                    </div>
                </div>
                <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
                    <p className="text-xs font-bold text-gray-400 mb-2 uppercase tracking-wide">썸네일 제목</p>
                    <div className="space-y-1">
                        {result.thumbnailTitles.map((t, i) => (
                            <p key={i} className="text-sm text-gray-800 font-semibold leading-snug">{t}</p>
                        ))}
                    </div>
                </div>
            </div>

            {/* HTML Tabs */}
            <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
                <div className="flex border-b border-gray-200">
                    <button
                        onClick={() => setActiveTab('preview')}
                        className={`flex-1 py-3 text-sm font-bold transition-colors ${
                            activeTab === 'preview' ? 'text-green-700 border-b-2 border-green-600 bg-green-50/50' : 'text-gray-500 hover:text-gray-700'
                        }`}
                    >미리보기</button>
                    <button
                        onClick={() => setActiveTab('html')}
                        className={`flex-1 py-3 text-sm font-bold transition-colors ${
                            activeTab === 'html' ? 'text-green-700 border-b-2 border-green-600 bg-green-50/50' : 'text-gray-500 hover:text-gray-700'
                        }`}
                    >HTML 코드</button>
                </div>

                {activeTab === 'preview' && (
                    <div
                        className="p-5 prose prose-sm max-w-none overflow-auto max-h-[600px]"
                        dangerouslySetInnerHTML={{ __html: result.html }}
                    />
                )}
                {activeTab === 'html' && (
                    <div className="relative">
                        <button
                            onClick={handleCopy}
                            className="absolute top-3 right-3 bg-green-600 hover:bg-green-500 text-white text-xs font-bold px-3 py-1.5 rounded-lg z-10"
                        >
                            {copied ? '✅ 복사됨!' : '📋 복사'}
                        </button>
                        <pre className="p-5 text-xs text-gray-600 overflow-auto max-h-[500px] whitespace-pre-wrap break-all bg-gray-50">
                            {result.html}
                        </pre>
                    </div>
                )}
            </div>
        </div>
    );
};
