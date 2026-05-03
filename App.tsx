import React, { useState, useEffect } from 'react';
import { NaviWriter } from './components/NaviWriter';
import { NaviTitles } from './components/NaviTitles';
import { NaviOptimizer } from './components/NaviOptimizer';
import { NaviTextResult } from './components/NaviResult';
import { MediaPanel } from './components/MediaPanel';
import { HelpModal } from './components/HelpModal';
import { NaviResult as NaviResultType } from './types';

type Tab = 'writer' | 'titles' | 'optimizer';

export const App: React.FC = () => {
    const [tab, setTab] = useState<Tab>('writer');
    const [showSettings, setShowSettings] = useState(false);
    const [showHelp, setShowHelp] = useState(false);
    const [orKey, setOrKey] = useState('');
    const [geminiKey, setGeminiKey] = useState('');
    const [falKey, setFalKey] = useState('');
    const [saved, setSaved] = useState(false);
    const [result, setResult] = useState<NaviResultType | null>(null);
    const [skipImages, setSkipImages] = useState(false);

    useEffect(() => {
        try {
            const or = localStorage.getItem('nabi_or_b64');
            const gem = localStorage.getItem('nabi_gemini_b64');
            const fal = localStorage.getItem('nabi_fal_b64');
            if (or) setOrKey(atob(or));
            if (gem) setGeminiKey(atob(gem));
            if (fal) setFalKey(atob(fal));
        } catch {}
    }, []);

    const handleSave = () => {
        try {
            if (orKey.trim()) localStorage.setItem('nabi_or_b64', btoa(orKey.trim()));
            else localStorage.removeItem('nabi_or_b64');
            if (geminiKey.trim()) localStorage.setItem('nabi_gemini_b64', btoa(geminiKey.trim()));
            else localStorage.removeItem('nabi_gemini_b64');
            if (falKey.trim()) localStorage.setItem('nabi_fal_b64', btoa(falKey.trim()));
            else localStorage.removeItem('nabi_fal_b64');
            setSaved(true);
            setTimeout(() => { setSaved(false); setShowSettings(false); }, 1200);
        } catch {}
    };

    const handleResult = (r: NaviResultType, _t: string) => {
        setResult(r);
        setTimeout(() => document.getElementById('nabi-result')?.scrollIntoView({ behavior: 'smooth' }), 100);
    };

    const handleTabChange = (t: Tab) => {
        setTab(t);
        setResult(null);
    };

    const TABS: { id: Tab; label: string }[] = [
        { id: 'writer', label: '주제로 생성하기' },
        { id: 'titles', label: '인기 제목 추천' },
        { id: 'optimizer', label: '기존 글 최적화' },
    ];

    return (
        <div className="min-h-screen bg-gray-100">
            {/* Header */}
            <header className="bg-gradient-to-r from-green-800 to-green-700 sticky top-0 z-40 shadow-lg">
                <div className="max-w-6xl mx-auto px-4">
                    <div className="flex items-center justify-between py-3">
                        <div className="flex items-center gap-2">
                            <span className="text-white text-lg select-none">✦</span>
                            <h1 className="text-white font-black text-base sm:text-lg leading-tight">네이버 블로그 SEO 최적화 도우미</h1>
                            <span className="hidden sm:flex items-center gap-1 bg-white/20 text-white text-xs px-2 py-0.5 rounded-full font-medium">
                                <span className="w-1.5 h-1.5 bg-blue-300 rounded-full animate-pulse"></span>
                                Gemini 3 Flash Preview
                            </span>
                        </div>
                        <div className="flex items-center gap-1.5">
                            <div className="w-8 h-8 bg-green-600 border-2 border-white/30 rounded-full flex items-center justify-center text-white font-black text-sm select-none">N</div>
                            <button onClick={() => setShowSettings(true)}
                                className="w-8 h-8 rounded-full flex items-center justify-center text-white hover:bg-white/20 transition-colors"
                                title="API 키 설정"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z"/>
                                </svg>
                            </button>
                            <button className="w-8 h-8 rounded-full flex items-center justify-center text-white hover:bg-white/20 transition-colors" title="모바일 뷰">
                                <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                    <rect x="5" y="2" width="14" height="20" rx="2" strokeLinecap="round" strokeLinejoin="round"/>
                                    <line x1="12" y1="18" x2="12.01" y2="18" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5"/>
                                </svg>
                            </button>
                            <button onClick={() => setShowHelp(true)}
                                className="w-8 h-8 rounded-full border border-white/40 flex items-center justify-center text-white hover:bg-white/20 transition-colors text-sm font-bold"
                                title="도움말"
                            >?</button>
                        </div>
                    </div>
                    {/* Tabs */}
                    <div className="flex gap-0.5">
                        {TABS.map(t => (
                            <button key={t.id} onClick={() => handleTabChange(t.id)}
                                className={`px-5 py-2.5 text-sm font-semibold rounded-t-lg transition-all ${
                                    tab === t.id
                                        ? 'bg-white text-green-800'
                                        : 'text-white/75 hover:text-white hover:bg-white/10'
                                }`}
                            >{t.label}</button>
                        ))}
                    </div>
                </div>
            </header>

            {/* Main */}
            <div className="max-w-6xl mx-auto px-4 py-4">
                <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-4 items-start">
                    {/* Content */}
                    <div className="space-y-4 min-w-0">
                        {tab === 'writer' && <NaviWriter onResult={handleResult} onSkipImages={setSkipImages} />}
                        {tab === 'titles' && <NaviTitles />}
                        {tab === 'optimizer' && <NaviOptimizer onResult={handleResult} onSkipImages={setSkipImages} />}
                        {result && (tab === 'writer' || tab === 'optimizer') && (
                            <div id="nabi-result">
                                <NaviTextResult result={result} />
                            </div>
                        )}
                    </div>
                    {/* Sidebar */}
                    <div className="hidden lg:block">
                        <MediaPanel result={result} skipImages={skipImages} />
                    </div>
                </div>
            </div>

            {/* Footer */}
            <footer className="text-center py-6 text-xs text-gray-400 border-t border-gray-200 mt-8 bg-white">
                <p>© 2026 네이버 블로그 SEO 최적화 도우미. All rights reserved.</p>
                <p className="mt-1">개발자: <span className="font-semibold text-green-700">나비 AI</span></p>
            </footer>

            {/* Settings Modal */}
            {showSettings && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
                    onClick={e => { if (e.target === e.currentTarget) setShowSettings(false); }}
                >
                    <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl">
                        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
                            <h2 className="text-base font-black text-gray-800">⚙️ API 키 설정</h2>
                            <button onClick={() => setShowSettings(false)} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">×</button>
                        </div>
                        <div className="p-6 space-y-4">
                            <div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-3 text-xs text-blue-700">
                                🔒 API 키는 이 기기의 브라우저 로컬스토리지에만 저장됩니다.
                            </div>
                            {[
                                { label: 'OpenRouter API 키', tag: '권장 (무료 모델)', value: orKey, set: setOrKey, ph: 'sk-or-v1-...' },
                                { label: 'Gemini API 키', tag: '백업용', value: geminiKey, set: setGeminiKey, ph: 'AIza...' },
                                { label: 'fal.ai API 키', tag: '이미지 생성 (선택)', value: falKey, set: setFalKey, ph: 'fal_...' },
                            ].map(f => (
                                <div key={f.label}>
                                    <label className="block text-sm font-semibold text-gray-700 mb-1">
                                        {f.label} <span className="text-green-600 text-xs font-normal">{f.tag}</span>
                                    </label>
                                    <input type="password" value={f.value} onChange={e => f.set(e.target.value)} placeholder={f.ph}
                                        className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                                    />
                                </div>
                            ))}
                        </div>
                        <div className="px-6 pb-6">
                            <button onClick={handleSave}
                                className={`w-full py-3 rounded-xl font-bold text-sm transition-all ${saved ? 'bg-green-600 text-white' : 'bg-green-700 hover:bg-green-600 text-white'}`}
                            >{saved ? '✅ 저장 완료!' : '💾 저장'}</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Help Modal */}
            {showHelp && <HelpModal onClose={() => setShowHelp(false)} />}
        </div>
    );
};
