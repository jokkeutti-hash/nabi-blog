
import React, { useState, useCallback, useEffect } from 'react';
import type { BlogAnalysisReport, BlogPostData, NaverNewsData, NewsStrategyIdea, NaverWebData } from '../types';
import { analyzeNaverBlogWithApi, fetchNaverBlogPosts, fetchNaverNews, fetchNaverWebSearch, generateStrategyFromNews } from '../services/keywordService';
import BlogResultsTable from './BlogResultsTable';
import NaverNewsResults from './NaverNewsResults';

interface NaverBlogAnalyzerProps {
    onTopicSelect: (title: string, context: string) => void;
    isNaverApiConfigured: boolean;
    naverClientId: string;
    naverClientSecret: string;
    initialBlogUrl?: string;
    onInitialUrlHandled?: () => void;
}

type NaverTab = 'myBlog' | 'competitorBlogs' | 'news' | 'webSearch';

const LoadingSpinner: React.FC<{ text?: string }> = ({ text = '분석 중...' }) => (
    <div className="flex flex-col items-center justify-center py-12 text-slate-400">
        <svg className="animate-spin h-10 w-10 mb-3 text-green-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
        <p className="text-sm">{text}</p>
    </div>
);

const NaverApiWarning: React.FC = () => (
    <div className="p-4 bg-yellow-900/30 border border-yellow-700 rounded-lg text-yellow-300 text-sm">
        <p className="font-bold mb-1">⚠️ 네이버 API 설정 필요</p>
        <p>우측 상단 ⚙️ 설정에서 Naver API 키를 먼저 등록해주세요.</p>
    </div>
);

export const NaverBlogAnalyzer: React.FC<NaverBlogAnalyzerProps> = ({
    onTopicSelect,
    isNaverApiConfigured,
    naverClientId,
    naverClientSecret,
    initialBlogUrl,
    onInitialUrlHandled,
}) => {
    const [activeTab, setActiveTab] = useState<NaverTab>('myBlog');

    // --- 내 블로그 분석 상태 ---
    const [blogUrl, setBlogUrl] = useState('');
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [analysisResult, setAnalysisResult] = useState<BlogAnalysisReport & { _foundPosts?: Array<{ title: string; link: string }> } | null>(null);
    const [analysisError, setAnalysisError] = useState<string | null>(null);

    // --- 경쟁 블로그 분석 상태 ---
    const [competitorKeyword, setCompetitorKeyword] = useState('');
    const [isCompetitorLoading, setIsCompetitorLoading] = useState(false);
    const [competitorBlogs, setCompetitorBlogs] = useState<BlogPostData[] | null>(null);
    const [competitorError, setCompetitorError] = useState<string | null>(null);

    // --- 뉴스 검색 상태 ---
    const [newsKeyword, setNewsKeyword] = useState('');
    const [isNewsLoading, setIsNewsLoading] = useState(false);
    const [newsData, setNewsData] = useState<NaverNewsData[] | null>(null);
    const [newsError, setNewsError] = useState<string | null>(null);
    const [newsStrategy, setNewsStrategy] = useState<NewsStrategyIdea[] | null>(null);
    const [isNewsStrategyLoading, setIsNewsStrategyLoading] = useState(false);

    // --- 통합검색 상태 ---
    const [webKeyword, setWebKeyword] = useState('');
    const [isWebLoading, setIsWebLoading] = useState(false);
    const [webData, setWebData] = useState<NaverWebData[] | null>(null);
    const [webError, setWebError] = useState<string | null>(null);

    const handleMyBlogAnalysis = useCallback(async (urlOverride?: string) => {
        const targetUrl = urlOverride ?? blogUrl;
        if (!targetUrl.trim()) return;
        setActiveTab('myBlog');
        setIsAnalyzing(true);
        setAnalysisError(null);
        setAnalysisResult(null);
        try {
            const result = await analyzeNaverBlogWithApi(targetUrl, naverClientId, naverClientSecret);
            setAnalysisResult(result as any);
        } catch (e) {
            setAnalysisError(e instanceof Error ? e.message : '알 수 없는 오류가 발생했습니다.');
        } finally {
            setIsAnalyzing(false);
        }
    }, [blogUrl, naverClientId, naverClientSecret]);

    useEffect(() => {
        if (initialBlogUrl) {
            setBlogUrl(initialBlogUrl);
            handleMyBlogAnalysis(initialBlogUrl);
            onInitialUrlHandled?.();
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [initialBlogUrl]);

    const handleCompetitorSearch = useCallback(async () => {
        if (!competitorKeyword.trim()) return;
        setIsCompetitorLoading(true);
        setCompetitorError(null);
        setCompetitorBlogs(null);
        try {
            const blogs = await fetchNaverBlogPosts(competitorKeyword, naverClientId, naverClientSecret);
            setCompetitorBlogs(blogs);
        } catch (e) {
            setCompetitorError(e instanceof Error ? e.message : '알 수 없는 오류가 발생했습니다.');
        } finally {
            setIsCompetitorLoading(false);
        }
    }, [competitorKeyword, naverClientId, naverClientSecret]);

    const handleNewsSearch = useCallback(async () => {
        if (!newsKeyword.trim()) return;
        setIsNewsLoading(true);
        setNewsError(null);
        setNewsData(null);
        setNewsStrategy(null);
        try {
            const news = await fetchNaverNews(newsKeyword, naverClientId, naverClientSecret);
            setNewsData(news);
        } catch (e) {
            setNewsError(e instanceof Error ? e.message : '알 수 없는 오류가 발생했습니다.');
        } finally {
            setIsNewsLoading(false);
        }
    }, [newsKeyword, naverClientId, naverClientSecret]);

    const handleNewsStrategy = useCallback(async () => {
        if (!newsData) return;
        setIsNewsStrategyLoading(true);
        try {
            const strategy = await generateStrategyFromNews(newsData);
            setNewsStrategy(strategy);
        } catch (e) {
            setNewsError(e instanceof Error ? e.message : '전략 생성 실패');
        } finally {
            setIsNewsStrategyLoading(false);
        }
    }, [newsData]);

    const handleWebSearch = useCallback(async () => {
        if (!webKeyword.trim()) return;
        setIsWebLoading(true);
        setWebError(null);
        setWebData(null);
        try {
            const results = await fetchNaverWebSearch(webKeyword, naverClientId, naverClientSecret);
            setWebData(results);
        } catch (e) {
            setWebError(e instanceof Error ? e.message : '알 수 없는 오류가 발생했습니다.');
        } finally {
            setIsWebLoading(false);
        }
    }, [webKeyword, naverClientId, naverClientSecret]);

    const tabStyle = (tab: NaverTab) =>
        `px-4 py-2 text-sm font-semibold rounded-t-lg transition-colors duration-200 focus:outline-none whitespace-nowrap ${
            activeTab === tab
                ? 'bg-green-700 text-white'
                : 'bg-gray-700 text-gray-400 hover:bg-gray-600 hover:text-white'
        }`;

    const inputClass = "flex-grow bg-slate-800 border border-slate-600 rounded-md px-4 py-2 text-white placeholder-slate-500 focus:ring-2 focus:ring-green-500 text-sm";
    const searchBtnClass = "bg-green-600 text-white font-bold py-2 px-5 rounded-md hover:bg-green-500 transition-colors disabled:bg-slate-600 text-sm whitespace-nowrap";

    return (
        <div>
            {/* 서브탭 */}
            <div className="flex space-x-1 border-b border-gray-700 mb-4 overflow-x-auto">
                <button onClick={() => setActiveTab('myBlog')} className={tabStyle('myBlog')}>🏠 내 블로그 분석</button>
                <button onClick={() => setActiveTab('competitorBlogs')} className={tabStyle('competitorBlogs')}>📊 경쟁 블로그 분석</button>
                <button onClick={() => setActiveTab('news')} className={tabStyle('news')}>📰 실시간 뉴스</button>
                <button onClick={() => setActiveTab('webSearch')} className={tabStyle('webSearch')}>🔍 통합검색</button>
            </div>

            {/* 내 블로그 분석 */}
            {activeTab === 'myBlog' && (
                <div className="space-y-4">
                    <p className="text-sm text-slate-400 bg-slate-800/50 p-3 rounded-lg border border-slate-700">
                        <strong className="text-green-400">네이버 블로그 URL</strong>을 입력하면 Naver API로 기존 포스팅 목록을 가져온 뒤, 중복 없는 신규 제목 10개를 추천해드립니다.
                    </p>
                    {!isNaverApiConfigured && <NaverApiWarning />}
                    <form onSubmit={(e) => { e.preventDefault(); handleMyBlogAnalysis(); }} className="flex gap-2">
                        <input
                            type="text"
                            value={blogUrl}
                            onChange={(e) => setBlogUrl(e.target.value)}
                            placeholder="https://blog.naver.com/내블로그ID"
                            className={inputClass}
                            disabled={isAnalyzing}
                        />
                        <button
                            type="submit"
                            disabled={isAnalyzing || !blogUrl.trim() || !isNaverApiConfigured}
                            className={searchBtnClass}
                        >
                            분석 시작
                        </button>
                    </form>

                    {isAnalyzing && <LoadingSpinner text="네이버 API로 기존 포스팅 수집 중 + AI 분석 중..." />}
                    {analysisError && (
                        <div className="p-3 bg-red-900/40 border border-red-700 text-red-300 rounded-lg text-sm">{analysisError}</div>
                    )}

                    {analysisResult && !isAnalyzing && (
                        <div className="space-y-4">
                            {/* 블로그 정보 */}
                            <div className="bg-slate-800 rounded-lg p-4 border border-slate-700">
                                <h3 className="text-white font-bold text-lg mb-1">{analysisResult.identity?.title || '블로그'}</h3>
                                <p className="text-slate-400 text-sm">{analysisResult.identity?.description}</p>
                            </div>

                            {/* 기존 포스팅 목록 */}
                            {(analysisResult as any)._foundPosts && (analysisResult as any)._foundPosts.length > 0 && (
                                <div className="bg-slate-800 rounded-lg p-4 border border-slate-700">
                                    <h4 className="text-green-400 font-semibold mb-2 text-sm">
                                        📋 Naver API로 수집한 기존 포스팅 ({(analysisResult as any)._foundPosts.length}개)
                                    </h4>
                                    <ul className="space-y-1 max-h-40 overflow-y-auto">
                                        {(analysisResult as any)._foundPosts.map((post: { title: string; link: string }, i: number) => (
                                            <li key={i} className="text-slate-400 text-xs flex items-start gap-1">
                                                <span className="text-slate-600 shrink-0">{i + 1}.</span>
                                                <a href={post.link} target="_blank" rel="noopener noreferrer" className="hover:text-cyan-400 truncate">{post.title}</a>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            )}

                            {/* AI 추천 제목 */}
                            <div>
                                <h4 className="text-white font-bold mb-3">🎯 AI 추천 신규 제목 10개</h4>
                                <div className="space-y-2">
                                    {analysisResult.strategy?.suggestedTopics?.map((topic, i) => (
                                        <div
                                            key={i}
                                            onClick={() => onTopicSelect(topic.title, `[네이버 블로그 분석 기반 추천]\n추천 이유: ${topic.reason}`)}
                                            className="bg-slate-800 border border-slate-700 rounded-lg p-3 cursor-pointer hover:border-green-500 hover:bg-slate-700 transition-all group"
                                        >
                                            <p className="text-white font-semibold text-sm group-hover:text-green-300 transition-colors">
                                                {i + 1}. {topic.title}
                                            </p>
                                            <p className="text-slate-500 text-xs mt-1">{topic.reason}</p>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* 성장 방향 */}
                            {analysisResult.strategy?.growthDirections?.length > 0 && (
                                <div className="bg-slate-800 rounded-lg p-4 border border-slate-700">
                                    <h4 className="text-green-400 font-semibold mb-2 text-sm">📈 성장 방향</h4>
                                    <ul className="space-y-1">
                                        {analysisResult.strategy.growthDirections.map((dir, i) => (
                                            <li key={i} className="text-slate-300 text-sm flex gap-2">
                                                <span className="text-green-500">▸</span>{dir}
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            )}

            {/* 경쟁 블로그 분석 */}
            {activeTab === 'competitorBlogs' && (
                <div className="space-y-4">
                    <p className="text-sm text-slate-400">키워드로 상위 노출 중인 네이버 블로그 10개를 분석합니다.</p>
                    {!isNaverApiConfigured && <NaverApiWarning />}
                    <form onSubmit={(e) => { e.preventDefault(); handleCompetitorSearch(); }} className="flex gap-2">
                        <input
                            type="text"
                            value={competitorKeyword}
                            onChange={(e) => setCompetitorKeyword(e.target.value)}
                            placeholder="분석할 키워드 입력 (예: 강남 맛집)"
                            className={inputClass}
                            disabled={isCompetitorLoading}
                        />
                        <button type="submit" disabled={isCompetitorLoading || !competitorKeyword.trim() || !isNaverApiConfigured} className={searchBtnClass}>
                            {isCompetitorLoading ? '검색 중...' : '검색'}
                        </button>
                    </form>
                    {isCompetitorLoading && <LoadingSpinner text="상위 블로그 검색 중..." />}
                    {competitorError && <div className="p-3 bg-red-900/40 border border-red-700 text-red-300 rounded-lg text-sm">{competitorError}</div>}
                    {competitorBlogs && !isCompetitorLoading && <BlogResultsTable data={competitorBlogs} />}
                </div>
            )}

            {/* 실시간 뉴스 */}
            {activeTab === 'news' && (
                <div className="space-y-4">
                    <p className="text-sm text-slate-400">키워드 관련 네이버 실시간 뉴스를 검색합니다.</p>
                    {!isNaverApiConfigured && <NaverApiWarning />}
                    <form onSubmit={(e) => { e.preventDefault(); handleNewsSearch(); }} className="flex gap-2">
                        <input
                            type="text"
                            value={newsKeyword}
                            onChange={(e) => setNewsKeyword(e.target.value)}
                            placeholder="뉴스 검색 키워드 입력"
                            className={inputClass}
                            disabled={isNewsLoading}
                        />
                        <button type="submit" disabled={isNewsLoading || !newsKeyword.trim() || !isNaverApiConfigured} className={searchBtnClass}>
                            {isNewsLoading ? '검색 중...' : '검색'}
                        </button>
                    </form>
                    {isNewsLoading && <LoadingSpinner text="뉴스 검색 중..." />}
                    {newsError && <div className="p-3 bg-red-900/40 border border-red-700 text-red-300 rounded-lg text-sm">{newsError}</div>}
                    {newsData && !isNewsLoading && (
                        <NaverNewsResults
                            data={newsData}
                            onGenerateStrategy={handleNewsStrategy}
                            strategyLoading={isNewsStrategyLoading}
                            strategy={newsStrategy}
                            onTopicSelect={onTopicSelect}
                        />
                    )}
                </div>
            )}

            {/* 네이버 통합검색 */}
            {activeTab === 'webSearch' && (
                <div className="space-y-4">
                    <p className="text-sm text-slate-400">네이버 통합검색으로 웹 문서를 검색합니다.</p>
                    {!isNaverApiConfigured && <NaverApiWarning />}
                    <form onSubmit={(e) => { e.preventDefault(); handleWebSearch(); }} className="flex gap-2">
                        <input
                            type="text"
                            value={webKeyword}
                            onChange={(e) => setWebKeyword(e.target.value)}
                            placeholder="검색 키워드 입력"
                            className={inputClass}
                            disabled={isWebLoading}
                        />
                        <button type="submit" disabled={isWebLoading || !webKeyword.trim() || !isNaverApiConfigured} className={searchBtnClass}>
                            {isWebLoading ? '검색 중...' : '검색'}
                        </button>
                    </form>
                    {isWebLoading && <LoadingSpinner text="검색 중..." />}
                    {webError && <div className="p-3 bg-red-900/40 border border-red-700 text-red-300 rounded-lg text-sm">{webError}</div>}
                    {webData && !isWebLoading && (
                        <div className="space-y-2">
                            {webData.map((item, i) => (
                                <div key={i} className="bg-slate-800 rounded-lg p-3 border border-slate-700 hover:border-green-600 transition-colors">
                                    <a href={item.link} target="_blank" rel="noopener noreferrer" className="text-cyan-300 font-semibold text-sm hover:underline">
                                        {i + 1}. {item.title}
                                    </a>
                                    <p className="text-slate-400 text-xs mt-1">{item.description}</p>
                                    <p className="text-slate-600 text-xs mt-1 truncate">{item.link}</p>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};
