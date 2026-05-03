import React, { useState, useEffect } from 'react';
import { NaviWriter } from './components/NaviWriter';
import { NaviTitles } from './components/NaviTitles';
import { NaviOptimizer } from './components/NaviOptimizer';

type Tab = 'writer' | 'titles' | 'optimizer';

const TABS: { id: Tab; label: string; icon: string }[] = [
    { id: 'writer', label: '글 작성', icon: '✏️' },
    { id: 'titles', label: '제목 추천', icon: '📌' },
    { id: 'optimizer', label: '글 최적화', icon: '⚡' },
];

export const App: React.FC = () => {
    const [tab, setTab] = useState<Tab>('writer');
    const [showSettings, setShowSettings] = useState(false);
    const [orKey, setOrKey] = useState('');
    const [geminiKey, setGeminiKey] = useState('');
    const [falKey, setFalKey] = useState('');
    const [saved, setSaved] = useState(false);

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

    const handleSaveSettings = () => {
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

    const hasKey = !!(orKey.trim() || geminiKey.trim());

    return (
        <div className="min-h-screen bg-gray-950 text-white">
            {/* Header */}
            <header className="bg-gray-900 border-b border-gray-800 sticky top-0 z-40">
                <div className="max-w-3xl mx-auto px-4 py-3 flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                        <span className="text-3xl select-none">🦋</span>
                        <div>
                            <h1 className="text-xl font-black text-white leading-none tracking-tight">나비</h1>
                            <p className="text-xs text-sky-400 leading-none mt-0.5 font-medium">네이버 블로그 SEO 전문 도구</p>
                        </div>
                    </div>
                    <button
                        onClick={() => setShowSettings(true)}
                        className={`flex items-center gap-1.5 text-sm font-semibold px-3 py-1.5 rounded-lg transition-colors ${
                            hasKey
                                ? 'bg-green-900/40 text-green-400 hover:bg-green-900/60'
                                : 'bg-red-900/40 text-red-400 hover:bg-red-900/60 animate-pulse'
                        }`}
                    >
                        <span>{hasKey ? '✅' : '⚠️'}</span>
                        <span>{hasKey ? 'API 설정됨' : 'API 설정 필요'}</span>
                    </button>
                </div>

                {/* Tabs */}
                <div className="max-w-3xl mx-auto px-4">
                    <div className="flex gap-1 pb-3">
                        {TABS.map(t => (
                            <button
                                key={t.id}
                                onClick={() => setTab(t.id)}
                                className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-bold transition-all ${
                                    tab === t.id
                                        ? 'bg-sky-500 text-white shadow-lg shadow-sky-500/20'
                                        : 'text-gray-400 hover:text-white hover:bg-gray-800'
                                }`}
                            >
                                <span>{t.icon}</span>
                                <span>{t.label}</span>
                            </button>
                        ))}
                    </div>
                </div>
            </header>

            {/* Main content */}
            <main className="max-w-3xl mx-auto px-4 py-6">
                {tab === 'writer' && <NaviWriter />}
                {tab === 'titles' && <NaviTitles />}
                {tab === 'optimizer' && <NaviOptimizer />}
            </main>

            {/* Settings Modal */}
            {showSettings && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
                    onClick={e => { if (e.target === e.currentTarget) setShowSettings(false); }}
                >
                    <div className="bg-gray-900 border border-gray-700 rounded-2xl w-full max-w-md shadow-2xl">
                        <div className="flex items-center justify-between p-5 border-b border-gray-800">
                            <h2 className="text-lg font-black text-white">⚙️ API 키 설정</h2>
                            <button
                                onClick={() => setShowSettings(false)}
                                className="text-gray-400 hover:text-white text-2xl leading-none w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-800"
                            >
                                ×
                            </button>
                        </div>

                        <div className="p-5 space-y-4">
                            <div className="bg-sky-900/20 border border-sky-800 rounded-xl px-4 py-3 text-xs text-sky-300">
                                🔒 API 키는 이 기기의 브라우저 로컬스토리지에만 저장됩니다. 서버로 전송되지 않습니다.
                            </div>

                            <div>
                                <label className="block text-sm font-bold text-gray-300 mb-1">
                                    OpenRouter API 키
                                    <span className="ml-2 text-green-400 text-xs font-normal">권장 (무료 모델 사용)</span>
                                </label>
                                <input
                                    type="password"
                                    value={orKey}
                                    onChange={e => setOrKey(e.target.value)}
                                    placeholder="sk-or-v1-..."
                                    className="w-full bg-gray-800 border border-gray-600 rounded-lg px-3 py-2.5 text-white placeholder-gray-500 focus:ring-2 focus:ring-sky-500 text-sm"
                                />
                                <p className="text-xs text-gray-500 mt-1">openrouter.ai → API Keys에서 발급 (무료)</p>
                            </div>

                            <div>
                                <label className="block text-sm font-bold text-gray-300 mb-1">
                                    Gemini API 키
                                    <span className="ml-2 text-gray-400 text-xs font-normal">백업용</span>
                                </label>
                                <input
                                    type="password"
                                    value={geminiKey}
                                    onChange={e => setGeminiKey(e.target.value)}
                                    placeholder="AIza..."
                                    className="w-full bg-gray-800 border border-gray-600 rounded-lg px-3 py-2.5 text-white placeholder-gray-500 focus:ring-2 focus:ring-sky-500 text-sm"
                                />
                                <p className="text-xs text-gray-500 mt-1">aistudio.google.com에서 무료 발급</p>
                            </div>

                            <div>
                                <label className="block text-sm font-bold text-gray-300 mb-1">
                                    fal.ai API 키
                                    <span className="ml-2 text-gray-400 text-xs font-normal">이미지 생성용 (선택)</span>
                                </label>
                                <input
                                    type="password"
                                    value={falKey}
                                    onChange={e => setFalKey(e.target.value)}
                                    placeholder="fal_..."
                                    className="w-full bg-gray-800 border border-gray-600 rounded-lg px-3 py-2.5 text-white placeholder-gray-500 focus:ring-2 focus:ring-sky-500 text-sm"
                                />
                                <p className="text-xs text-gray-500 mt-1">없으면 Pollinations.ai 무료 이미지 자동 사용</p>
                            </div>
                        </div>

                        <div className="p-5 border-t border-gray-800">
                            <button
                                onClick={handleSaveSettings}
                                className={`w-full py-3 rounded-xl font-bold text-sm transition-all ${
                                    saved
                                        ? 'bg-green-600 text-white'
                                        : 'bg-sky-500 hover:bg-sky-400 text-white'
                                }`}
                            >
                                {saved ? '✅ 저장 완료!' : '💾 저장'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
