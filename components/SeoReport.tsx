import React, { useState } from 'react';
import { SeoReport as SeoReportType } from '../types';

const GRADE_COLOR: Record<string, string> = {
    S: 'text-purple-400', A: 'text-green-400', B: 'text-blue-400',
    C: 'text-yellow-400', F: 'text-red-400',
};
const GRADE_BG: Record<string, string> = {
    S: 'bg-purple-900/40 border-purple-500', A: 'bg-green-900/40 border-green-500',
    B: 'bg-blue-900/40 border-blue-500', C: 'bg-yellow-900/40 border-yellow-500',
    F: 'bg-red-900/40 border-red-500',
};
const CATEGORY_COLOR: Record<string, string> = {
    '키워드': 'bg-blue-500/20 text-blue-300',
    '구조': 'bg-purple-500/20 text-purple-300',
    '분량': 'bg-green-500/20 text-green-300',
    '가독성': 'bg-orange-500/20 text-orange-300',
    'AEO': 'bg-cyan-500/20 text-cyan-300',
};

export const SeoReport: React.FC<{ report: SeoReportType }> = ({ report }) => {
    const [open, setOpen] = useState(false);
    const passCount = report.checks.filter(c => c.pass).length;

    return (
        <div className={`border rounded-xl overflow-hidden ${GRADE_BG[report.grade] || GRADE_BG['F']}`}>
            <button
                onClick={() => setOpen(v => !v)}
                className="w-full flex items-center justify-between p-4 text-left"
            >
                <div className="flex items-center gap-3">
                    <div className={`text-4xl font-black ${GRADE_COLOR[report.grade]}`}>{report.grade}</div>
                    <div>
                        <div className="text-white font-bold text-sm">SEO 분석 리포트</div>
                        <div className="text-gray-400 text-xs mt-0.5">{report.summary}</div>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <div className="text-right">
                        <div className={`text-2xl font-black ${GRADE_COLOR[report.grade]}`}>{report.score}점</div>
                        <div className="text-gray-500 text-xs">{passCount}/{report.checks.length} 통과</div>
                    </div>
                    <div className="text-gray-400 text-lg">{open ? '▲' : '▼'}</div>
                </div>
            </button>

            {/* Progress bar */}
            <div className="px-4 pb-3">
                <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
                    <div
                        className={`h-full rounded-full transition-all duration-700 ${
                            report.score >= 90 ? 'bg-purple-400' :
                            report.score >= 75 ? 'bg-green-400' :
                            report.score >= 60 ? 'bg-blue-400' :
                            report.score >= 45 ? 'bg-yellow-400' : 'bg-red-400'
                        }`}
                        style={{ width: `${report.score}%` }}
                    />
                </div>
            </div>

            {open && (
                <div className="px-4 pb-4 space-y-2 border-t border-white/10 pt-3">
                    {report.checks.map((c, i) => (
                        <div key={i} className="flex items-start gap-3 bg-gray-900/40 rounded-lg px-3 py-2">
                            <div className={`mt-0.5 text-lg ${c.pass ? 'text-green-400' : 'text-red-400'}`}>
                                {c.pass ? '✅' : '❌'}
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                    <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${CATEGORY_COLOR[c.category] || 'bg-gray-700 text-gray-300'}`}>
                                        {c.category}
                                    </span>
                                    <span className="text-white text-sm font-semibold">{c.label}</span>
                                </div>
                                <p className="text-gray-400 text-xs mt-1">{c.detail}</p>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};
