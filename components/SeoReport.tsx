import React, { useState } from 'react';
import { SeoReport as SeoReportType } from '../types';

const GRADE_COLOR: Record<string, string> = {
    S: 'text-purple-600', A: 'text-green-600', B: 'text-blue-600',
    C: 'text-yellow-600', F: 'text-red-600',
};
const GRADE_BG: Record<string, string> = {
    S: 'bg-purple-50 border-purple-300', A: 'bg-green-50 border-green-300',
    B: 'bg-blue-50 border-blue-300', C: 'bg-yellow-50 border-yellow-300',
    F: 'bg-red-50 border-red-300',
};
const GRADE_BAR: Record<string, string> = {
    S: 'bg-purple-500', A: 'bg-green-500', B: 'bg-blue-500', C: 'bg-yellow-500', F: 'bg-red-500',
};
const CATEGORY_COLOR: Record<string, string> = {
    '키워드': 'bg-blue-100 text-blue-700',
    '구조':   'bg-purple-100 text-purple-700',
    '분량':   'bg-green-100 text-green-700',
    '가독성': 'bg-orange-100 text-orange-700',
    'AEO':    'bg-cyan-100 text-cyan-700',
};

export const SeoReport: React.FC<{ report: SeoReportType }> = ({ report }) => {
    const [open, setOpen] = useState(false);
    const passCount = report.checks.filter(c => c.pass).length;

    return (
        <div className={`border rounded-xl overflow-hidden ${GRADE_BG[report.grade] || GRADE_BG['F']}`}>
            <button
                onClick={() => setOpen(v => !v)}
                className="w-full flex items-center justify-between p-4 text-left hover:bg-black/5 transition-colors"
            >
                <div className="flex items-center gap-3">
                    <div className={`text-4xl font-black ${GRADE_COLOR[report.grade]}`}>{report.grade}</div>
                    <div>
                        <div className="text-gray-800 font-bold text-sm">SEO 분석 리포트</div>
                        <div className="text-gray-500 text-xs mt-0.5">{report.summary}</div>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <div className="text-right">
                        <div className={`text-2xl font-black ${GRADE_COLOR[report.grade]}`}>{report.score}점</div>
                        <div className="text-gray-400 text-xs">{passCount}/{report.checks.length} 통과</div>
                    </div>
                    <div className="text-gray-400">{open ? '▲' : '▼'}</div>
                </div>
            </button>

            <div className="px-4 pb-3">
                <div className="h-2 bg-white/60 rounded-full overflow-hidden border border-white">
                    <div
                        className={`h-full rounded-full transition-all duration-700 ${GRADE_BAR[report.grade] || GRADE_BAR['F']}`}
                        style={{ width: `${report.score}%` }}
                    />
                </div>
            </div>

            {open && (
                <div className="px-4 pb-4 space-y-1.5 border-t border-black/10 pt-3">
                    {report.checks.map((c, i) => (
                        <div key={i} className="flex items-start gap-3 bg-white rounded-lg px-3 py-2 border border-black/5">
                            <div className={`mt-0.5 ${c.pass ? 'text-green-500' : 'text-red-500'}`}>
                                {c.pass ? '✅' : '❌'}
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                    <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${CATEGORY_COLOR[c.category] || 'bg-gray-100 text-gray-600'}`}>
                                        {c.category}
                                    </span>
                                    <span className="text-gray-800 text-sm font-semibold">{c.label}</span>
                                </div>
                                <p className="text-gray-500 text-xs mt-0.5">{c.detail}</p>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};
