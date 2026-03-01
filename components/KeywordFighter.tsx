
import React, { useState, useEffect, FC, useCallback } from 'react';
import { analyzeBlogFromUrl, generateTopicsFromMainKeyword, generateTopicsFromAllKeywords, generateBlogStrategy, fetchRecommendedKeywords, generateSustainableTopics, generateSerpStrategy, generateTopicsFromImage, generateCityBlogIdeas, analyzeKeywordCompetition, fetchRelatedKeywords, fetchNaverBlogPosts, generateRelatedKeywords } from '../services/keywordService';
import type { SearchSource, Feature, KeywordData, BlogPostData, KeywordMetrics, GeneratedTopic, BlogStrategyReportData, RecommendedKeyword, SustainableTopicCategory, GoogleSerpData, SerpStrategyReportData, PaaItem, SustainableTopicSuggestion, BlogAnalysisReport, NaverWebData, GoogleTrendItem } from '../types';
import { useSearch } from '../hooks/useSearch';
import ResultsTable from './ResultsTable';


// --- UI Components (Inlined for simplicity) ---

const LoadingSpinner: FC = () => (
    <div className="flex justify-center items-center p-8">
        <div className="w-12 h-12 border-4 border-t-transparent border-cyan-400 rounded-full animate-spin"></div>
    </div>
);

const ErrorMessage: FC<{ message: string | null }> = ({ message }) => (
    <div className="bg-red-900/50 border border-red-700 text-red-300 px-4 py-3 rounded-lg my-4" role="alert">
        <strong className="font-bold">오류: </strong>
        <span className="block sm:inline">{message}</span>
    </div>
);

const FeatureSelector: FC<{
    selectedFeature: Feature;
    onSelectFeature: (feature: Feature) => void;
    loading: boolean;
    onReset: () => void;
}> = ({ selectedFeature, onSelectFeature, loading, onReset }) => {
    const features: { id: Feature; name: string; description: string }[] = [
        { id: 'blog-analysis', name: '블로그 종합 분석', description: 'AI가 블로그를 진단하고 성장 전략과 맞춤형 주제를 제안합니다' },
        { id: 'image-posting', name: '공공데이터 도시 정보 생성', description: 'Google 지도 정보를 기반으로 특정 도시에 대한 블로그 콘텐츠 아이디어를 생성합니다.' },
        { id: 'google-trends', name: 'AI 구글 트렌드 분석', description: 'Google 실시간 검색어 트렌드를 AI가 심층 분석하고 주제를 제안합니다' },
        { id: 'competition', name: '키워드 경쟁력 분석', description: 'AI 기반 키워드 성공 가능성 및 전략 분석' },
        { id: 'keywords', name: '자동완성 키워드 분석', description: 'Google/Naver 자동완성 키워드 조회 및 주제 생성' },
        { id: 'related-keywords', name: 'AI 연관검색어 분석', description: 'Google SERP & PAA 분석 및 콘텐츠 갭 전략' },
        { id: 'sustainable-topics', name: '다각도 블로그 주제 발굴', description: '하나의 키워드를 4가지 다른 관점으로 확장' },
        { id: 'recommended', name: '오늘의 전략 키워드', description: 'AI가 실시간으로 발굴한 최신 이슈 키워드를 추천합니다' },
    ];
    
    const tabButtonStyle = (featureId: Feature) => {
        const isRecommendedFeature = featureId === 'recommended';
        const isTrendFeature = featureId === 'google-trends';
        const isImageFeature = featureId === 'image-posting';

        const baseClasses = "px-4 py-2 text-base font-semibold rounded-t-lg transition-colors duration-200 focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap";

        if (selectedFeature === featureId) {
            return `${baseClasses} bg-slate-800/50 text-cyan-400`;
        }

        if (isRecommendedFeature) {
            return `${baseClasses} bg-red-700 text-white hover:bg-red-600`;
        }

        if (isTrendFeature) {
            return `${baseClasses} bg-blue-700 text-white hover:bg-blue-600`;
        }

        if (isImageFeature) {
            return `${baseClasses} bg-purple-700 text-white hover:bg-purple-600`;
        }

        return `${baseClasses} bg-slate-700 text-slate-300 hover:bg-slate-600`;
    };


    return (
        <div className="mb-6 p-4 bg-slate-800/50 rounded-lg">
             <div className="mb-4 border-b border-slate-700">
                <nav className="flex space-x-2 overflow-x-auto pb-2 -mx-4 px-4" aria-label="Tabs">
                    {features.map(f => (
                         <button
                            key={f.id}
                            onClick={() => onSelectFeature(f.id)}
                            disabled={loading}
                            className={tabButtonStyle(f.id)}
                        >
                            {f.name}
                        </button>
                    ))}
                </nav>
            </div>
            
             <div className="flex flex-col md:flex-row md:items-center gap-2">
                 <p className="flex-grow text-center md:text-left text-cyan-200 text-sm bg-slate-900/50 p-3 rounded-md mb-2 md:mb-0">
                    💡 {features.find(f => f.id === selectedFeature)?.description}
                </p>
                <div className="flex">
                     <button
                        onClick={onReset}
                        disabled={loading}
                        className="w-full md:w-auto bg-slate-600 text-white font-bold py-2 px-3 rounded-md hover:bg-slate-500 transition-colors duration-200 disabled:opacity-50 flex items-center justify-center text-sm"
                    >
                        초기화
                    </button>
                </div>
            </div>
        </div>
    );
};

const SearchEngineSelector: FC<{
    selectedSource: SearchSource;
    onSelectSource: (source: SearchSource) => void;
    loading: boolean;
}> = ({ selectedSource, onSelectSource, loading }) => {
    const baseStyle = "flex-1 px-4 py-2 text-sm font-semibold rounded-md transition-colors duration-200 disabled:opacity-50";
    
    const googleButtonStyle = `${baseStyle} ${selectedSource === 'google' ? 'bg-cyan-500 text-white' : 'bg-slate-700 text-slate-300 hover:bg-slate-600'}`;
    const naverButtonStyle = `${baseStyle} ${selectedSource === 'naver' ? 'bg-cyan-500 text-white' : 'bg-green-700 text-white hover:bg-green-600'}`;

    return (
        <div className="mb-4 flex gap-2">
            <button onClick={() => onSelectSource('google')} disabled={loading} className={googleButtonStyle}>Google</button>
            <button onClick={() => onSelectSource('naver')} disabled={loading} className={naverButtonStyle}>Naver</button>
        </div>
    );
};

const KeywordInputForm: FC<{
    onSearch: (keyword: string) => void;
    loading: boolean;
    keyword: string;
    setKeyword: (keyword: string) => void;
    feature: Feature;
    apiOk: boolean;
}> = ({ onSearch, loading, keyword, setKeyword, feature, apiOk }) => {
    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSearch(keyword);
    };

    const getPlaceholder = () => {
        switch(feature) {
            case 'keywords': return "예: 캠핑";
            case 'related-keywords': return "예: 여름 휴가";
            case 'blogs': return "예: 제주도 맛집";
            case 'naver-news': return "예: 부동산 정책";
            case 'naver-search': return "예: 최신 스마트폰 트렌드";
            case 'sustainable-topics': return "예: 인공지능";
            case 'competition':
            default:
                return "예: 재택근무";
        }
    }

    const isApiFeature = feature === 'blogs' || feature === 'naver-news' || feature === 'naver-search';
    const isDisabled = loading || !keyword.trim() || (isApiFeature && !apiOk);

    return (
        <form onSubmit={handleSubmit} className="flex gap-2">
            <input
                type="text"
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                placeholder={getPlaceholder()}
                className="flex-grow bg-slate-800 border border-slate-600 rounded-md px-4 py-2 text-white placeholder-slate-500 focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 focus:outline-none"
                disabled={loading}
            />
            <button type="submit" disabled={isDisabled} className="bg-cyan-500 text-white font-bold py-2 px-6 rounded-md hover:bg-cyan-400 transition-colors duration-200 disabled:bg-slate-600 disabled:cursor-not-allowed">
                {loading ? '검색중...' : '키워드 검색'}
            </button>
        </form>
    );
};

const CompetitionAnalysisResults: FC<{ data: KeywordMetrics; onTopicSelect: (title: string, context: string) => void; }> = ({ data, onTopicSelect }) => {
    const scoreColor = (score: number) => score >= 70 ? 'text-green-400' : score >= 40 ? 'text-yellow-400' : 'text-red-400';
    
    const handleSelect = (topic: {title: string, description: string}) => {
        const context = `[경쟁력 분석 기반 컨텍스트]\n- 확장 키워드: ${data.strategy?.expandedKeywords.join(', ')}\n- 상세 공략법: ${topic.description}`;
        onTopicSelect(topic.title, context);
    };

    // This function will strip out basic markdown like bolding.
    const removeMarkdown = (text: string) => {
        if (!text) return '';
        return text
            .replace(/\*\*(.*?)\*\*/g, '$1') // Bold **text** -> text
            .replace(/\*(.*?)\*/g, '$1')   // Italic *text* -> text
            .replace(/^- /gm, '');          // Leading hyphens for lists
    };
    
    return (
        <div className="bg-slate-800 rounded-lg p-4 sm:p-6 space-y-6">
            <h2 className="text-xl sm:text-2xl font-bold text-white">'{data.keyword}' 키워드 경쟁력 분석</h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-center">
                <div className="bg-slate-700 p-4 rounded-lg">
                    <div className="text-sm text-slate-400">성공 가능성 점수</div>
                    <div className={`text-4xl font-bold ${scoreColor(data.opportunityScore)}`}>{data.opportunityScore}<span className="text-lg">/100</span></div>
                </div>
                <div className="bg-slate-700 p-4 rounded-lg">
                    <div className="text-sm text-slate-400">검색 관심도 지수</div>
                    <div className={`text-4xl font-bold ${scoreColor(data.searchVolumeEstimate)}`}>{data.searchVolumeEstimate}<span className="text-lg">/100</span></div>
                </div>
                <div className="bg-slate-700 p-4 rounded-lg">
                    <div className="text-sm text-slate-400">경쟁 난이도 지수</div>
                    <div className={`text-4xl font-bold ${scoreColor(100 - data.competitionScore)}`}>{data.competitionScore}<span className="text-lg">/100</span></div>
                </div>
            </div>
            
            <div className="bg-slate-900/50 p-4 rounded-lg">
                <h3 className="font-semibold text-lg text-cyan-300 mb-2">{removeMarkdown(data.analysis.title)}</h3>
                <p className="text-sm text-slate-300 mb-4">{removeMarkdown(data.analysis.reason)}</p>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    <div className="bg-slate-700/50 p-3 rounded-md">
                        <h4 className="font-bold text-green-400 mb-1">✅ 기회 요인</h4>
                        <ul className="list-disc list-inside text-slate-300 space-y-1">
                            {data.analysis.opportunity.split('\n').map((item, i) => item && <li key={i}>{removeMarkdown(item)}</li>)}
                        </ul>
                    </div>
                    <div className="bg-slate-700/50 p-3 rounded-md">
                        <h4 className="font-bold text-red-400 mb-1">🚨 위협 요인</h4>
                        <ul className="list-disc list-inside text-slate-300 space-y-1">
                            {data.analysis.threat.split('\n').map((item, i) => item && <li key={i}>{removeMarkdown(item)}</li>)}
                        </ul>
                    </div>
                </div>
                 <div className="mt-4 bg-slate-700/50 p-3 rounded-md">
                    <h4 className="font-bold text-yellow-400 mb-1">📊 현재 소비 현황 및 최신 이슈</h4>
                    <ul className="list-disc list-inside text-slate-300 space-y-1 text-sm">
                        {data.analysis.consumptionAndIssues.split('\n').map((item, i) => item && <li key={i}>{removeMarkdown(item)}</li>)}
                    </ul>
                </div>
                <div className="mt-4 border-t border-slate-700 pt-4">
                     <h4 className="font-bold text-white mb-1">📝 최종 결론 및 실행 전략</h4>
                    <p className="text-slate-300 text-sm">{removeMarkdown(data.analysis.conclusion)}</p>
                </div>
            </div>

            {data.opportunityScore < 80 ? (
                data.strategy ? (
                    <div className="bg-indigo-900/50 p-4 rounded-lg border border-indigo-500">
                        <h3 className="font-semibold text-lg text-indigo-300 mb-3">🚀 SEO 공략 전략 제안 (성공 가능성 80점 미만)</h3>
                        <div className="mb-4">
                            <h4 className="font-bold text-white mb-1">확장 키워드</h4>
                            <div className="flex flex-wrap gap-2">
                                {data.strategy.expandedKeywords.map((kw, i) => <span key={i} className="bg-indigo-500 text-white text-xs font-semibold px-2.5 py-1 rounded-full">{kw}</span>)}
                            </div>
                        </div>
                        <div>
                             <h4 className="font-bold text-white mb-2">추천 블로그 주제</h4>
                             <div className="space-y-3">
                                {data.strategy.blogTopics.map((topic, i) => (
                                    <div key={i} onClick={() => handleSelect(topic)} className="bg-slate-800 p-3 rounded-md cursor-pointer hover:bg-slate-700 transition-colors">
                                        <p className="font-semibold text-indigo-300">{removeMarkdown(topic.title)}</p>
                                        <p className="text-xs text-slate-400 mt-1">{removeMarkdown(topic.description)}</p>
                                    </div>
                                ))}
                             </div>
                        </div>
                    </div>
                ) : (
                    <div className="bg-slate-900/50 p-4 rounded-lg border border-slate-700">
                        <h3 className="font-semibold text-lg text-slate-400 mb-2">🚀 SEO 공략 전략 제안</h3>
                        <p className="text-sm text-slate-500">AI가 이 키워드에 대한 구체적인 공략 전략을 생성하지 않았습니다. 일반적으로 성공 가능성이 높은 키워드는 별도 전략 없이 바로 콘텐츠를 제작해도 좋습니다.</p>
                    </div>
                )
            ) : (
                <div className="bg-slate-900/50 p-4 rounded-lg border border-slate-700">
                    <h3 className="font-semibold text-lg text-slate-400 mb-2">🚀 SEO 공략 전략 제안</h3>
                    <p className="text-sm text-slate-500">성공 가능성 점수가 80점 이상으로 높아, 별도의 확장 키워드 전략 없이 바로 콘텐츠 제작을 시작하는 것을 추천합니다.</p>
                </div>
            )}
        </div>
    );
};

const BlogTopicSuggestions: FC<{ title: string; data: GeneratedTopic[]; onTopicSelect: (title: string, context: string) => void; feature: Feature; }> = ({ title, data, onTopicSelect, feature }) => {
    const handleSelect = (topic: GeneratedTopic) => {
        let context = `[AI 추천 컨텍스트]\n- 썸네일 문구: ${topic.thumbnailCopy}\n- 공략법: ${topic.strategy}`;
        if (feature === 'image-posting') {
            context = `[도시 정보 기반 컨텍스트]\n- 썸네일 문구: ${topic.thumbnailCopy}\n- 공략법: ${topic.strategy}\n\n**중요 이미지 생성 지침**: 이 주제의 대표 이미지는 Google 지도 스트리트 뷰나 실제 여행 사진처럼 매우 사실적인(photorealistic) 스타일로 생성해주세요. AI가 그린 그림 느낌이 나지 않도록 주의해주세요.`;
        }
        onTopicSelect(topic.title, context);
    };

    return (
        <div className="bg-slate-800 rounded-lg p-4 sm:p-6 space-y-4">
            <h2 className="text-xl font-bold text-white">{title}</h2>
            {data.map(topic => (
                <div key={topic.id} onClick={() => handleSelect(topic)} className="bg-slate-700/50 p-4 rounded-lg cursor-pointer hover:bg-slate-600 transition-colors">
                    <h3 className="font-semibold text-cyan-300">{topic.id}. {topic.title}</h3>
                    <p className="text-sm text-yellow-300 my-2 bg-slate-800 p-2 rounded-md">💡 썸네일 문구: {topic.thumbnailCopy}</p>
                    <p className="text-sm text-slate-300">{topic.strategy}</p>
                </div>
            ))}
        </div>
    );
};

const BlogStrategyReport: FC<{ data: BlogStrategyReportData; onTopicSelect: (title: string, context: string) => void; }> = ({ data, onTopicSelect }) => {
    const handleSelect = (topic: GeneratedTopic) => {
        const context = `[상위 블로그 분석 기반 컨텍스트]\n- 썸네일 문구: ${topic.thumbnailCopy}\n- 공략법: ${topic.strategy}`;
        onTopicSelect(topic.title, context);
    };
    return (
        <div className="bg-slate-800 rounded-lg p-4 sm:p-6 space-y-6">
            <h2 className="text-xl font-bold text-white">상위 블로그 분석 및 1위 공략 제안</h2>
            <div className="bg-slate-900/50 p-4 rounded-lg">
                <h3 className="font-semibold text-lg text-cyan-300 mb-2">상위 10개 포스트 제목 분석</h3>
                <div className="space-y-2 text-sm">
                    <p><strong className="text-slate-300">구조적 특징:</strong> {data.analysis.structure}</p>
                    <p><strong className="text-slate-300">감성적 특징:</strong> {data.analysis.characteristics}</p>
                    <p><strong className="text-slate-300">공통 키워드:</strong> {data.analysis.commonKeywords}</p>
                </div>
            </div>
            <div>
                <h3 className="font-semibold text-lg text-cyan-300 mb-2">1위 공략을 위한 콘텐츠 제안</h3>
                <div className="space-y-4">
                    {data.suggestions.map(topic => (
                        <div key={topic.id} onClick={() => handleSelect(topic)} className="bg-slate-700/50 p-4 rounded-lg cursor-pointer hover:bg-slate-600 transition-colors">
                            <h4 className="font-semibold text-white">{topic.id}. {topic.title}</h4>
                            <p className="text-sm text-yellow-300 my-2 bg-slate-800 p-2 rounded-md">💡 썸네일 문구: ${topic.thumbnailCopy}</p>
                            <p className="text-sm text-slate-300">{topic.strategy}</p>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}

const RecommendedKeywordsDisplay: FC<{ data: RecommendedKeyword[]; onTopicSelect: (title: string, context: string) => void; }> = ({ data, onTopicSelect }) => {
    const handleSelect = (topic: RecommendedKeyword) => {
        const context = `[오늘의 전략 키워드 컨텍스트]\n- 핵심 키워드: ${topic.keyword}\n- 선정 이유: ${topic.reason}\n- 썸네일 문구: ${topic.thumbnailCopy}\n- 공략법: ${topic.strategy}`;
        onTopicSelect(topic.title, context);
    };

    return (
        <div className="bg-slate-800 rounded-lg p-4 sm:p-6 space-y-4">
            <h2 className="text-xl font-bold text-white">오늘의 전략 키워드 추천</h2>
            {data.map((item) => (
                <div key={item.id} onClick={() => handleSelect(item)} className="bg-slate-700/50 p-4 rounded-lg cursor-pointer hover:bg-slate-600 transition-colors">
                    <div className="flex items-baseline gap-2">
                        <h3 className="font-semibold text-xl text-cyan-300">{item.keyword}</h3>
                        <p className="text-sm text-slate-400">{item.reason}</p>
                    </div>
                    <div className="mt-2 bg-slate-800 p-3 rounded-md">
                         <h4 className="font-semibold text-white">{item.title}</h4>
                         <p className="text-sm text-yellow-300 my-2">💡 썸네일 문구: {item.thumbnailCopy}</p>
                         <p className="text-sm text-slate-300">{item.strategy}</p>
                    </div>
                </div>
            ))}
        </div>
    );
};

const GoogleTrendsDisplay: FC<{ data: GoogleTrendItem[]; onTopicSelect: (title: string, context: string) => void; }> = ({ data, onTopicSelect }) => {
    const handleSelect = (item: GoogleTrendItem) => {
        const context = `[구글 트렌드 분석 컨텍스트]\n- 키워드: ${item.keyword}\n- 트렌드 이유: ${item.reason}\n- 카테고리: ${item.category}`;
        onTopicSelect(item.blogTopic, context);
    };
    return (
        <div className="bg-slate-800 rounded-lg p-4 sm:p-6 space-y-4">
            <h2 className="text-xl font-bold text-blue-400 flex items-center gap-2">
                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M16 6l2.29 2.29-4.88 4.88-4-4L2 16.59 3.41 18l6-6 4 4 6.3-6.29L22 12V6z"/></svg>
                실시간 구글 트렌드 분석
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {data.map((item) => (
                    <div key={item.id} onClick={() => handleSelect(item)} className="bg-slate-700/50 p-4 rounded-lg cursor-pointer hover:bg-slate-600 transition-all border border-slate-700 hover:border-blue-500/50 group">
                        <div className="flex justify-between items-start mb-2">
                            <span className="text-xs font-bold bg-blue-900/50 text-blue-300 px-2 py-0.5 rounded-full">{item.category}</span>
                            <span className="text-xs text-slate-500 font-mono">TREND #{item.id}</span>
                        </div>
                        <h3 className="font-bold text-lg text-white group-hover:text-blue-300 transition-colors">{item.keyword}</h3>
                        <p className="text-sm text-slate-300 mt-2 line-clamp-2">{item.reason}</p>
                        <div className="mt-3 pt-3 border-t border-slate-700/50">
                            <p className="text-xs text-slate-400 mb-1">추천 주제:</p>
                            <p className="text-sm font-semibold text-yellow-400">{item.blogTopic}</p>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

const NaverSearchResultsDisplay: FC<{ data: NaverWebData[] }> = ({ data }) => {
    return (
        <div className="bg-slate-800 rounded-lg p-4 sm:p-6 space-y-4">
            <h2 className="text-xl font-bold text-green-400 flex items-center gap-2">
                네이버 통합 검색 결과
            </h2>
            <div className="space-y-4">
                {data.map((item, idx) => (
                    <div key={idx} className="bg-slate-800/50 p-4 rounded-lg border border-slate-700 hover:border-green-500/50 transition-colors">
                        <a href={item.link} target="_blank" rel="noopener noreferrer" className="block">
                             <h4 className="font-bold text-cyan-300 hover:underline mb-1">{item.title}</h4>
                             <p className="text-sm text-slate-400 text-xs mb-2 truncate">{item.link}</p>
                             <p className="text-sm text-slate-300 leading-relaxed line-clamp-2">{item.description}</p>
                        </a>
                    </div>
                ))}
            </div>
        </div>
    );
};

const BlogAnalysisReportDisplay: FC<{ data: BlogAnalysisReport; onTopicSelect: (title: string, context: string) => void; }> = ({ data, onTopicSelect }) => {
    const handleTopicSelect = (topic: { title: string; reason: string; }) => {
        const context = `[블로그 종합 분석 기반 컨텍스트]\n- 주제 선정 이유: ${topic.reason}`;
        onTopicSelect(topic.title, context);
    };

    return (
        <div className="bg-slate-800 rounded-lg p-4 sm:p-6 space-y-8 mt-4">
            <h2 className="text-xl sm:text-2xl font-bold text-white">'{data.blogUrl}' 블로그 종합 분석 리포트</h2>
            
            <section>
                <h3 className="text-lg font-semibold text-cyan-300 mb-2 border-b border-slate-700 pb-2">블로그 정체성</h3>
                <div className="bg-slate-900/50 p-4 rounded-lg text-sm space-y-2 text-slate-300">
                    <p><strong className="text-white">제목:</strong> {data.identity?.title}</p>
                    <p><strong className="text-white">설명:</strong> {data.identity?.description}</p>
                    {data.identity?.latestPostExample && <p><strong className="text-white">최신 포스트 예시:</strong> {data.identity.latestPostExample}</p>}
                </div>
            </section>

            <section>
                <h3 className="text-lg font-semibold text-cyan-300 mb-4 border-b border-slate-700 pb-2">AI 진단</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm">
                    {/* Strengths Card */}
                    <div className="bg-slate-900/50 rounded-xl overflow-hidden shadow-sm border border-slate-700/50">
                        <div className="bg-green-900/40 p-3 border-b border-green-800/50 flex items-center gap-2">
                            <div className="p-1.5 bg-green-500/20 rounded-full">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-green-400" viewBox="0 0 20 20" fill="currentColor">
                                    <path d="M2 10.5a1.5 1.5 0 113 0v6a1.5 1.5 0 01-3 0v-6zM6 10.333v5.43a2 2 0 001.106 1.79l.05.025A4 4 0 008.943 18h5.416a2 2 0 001.962-1.608l1.2-6A2 2 0 0015.56 8H12V4a2 2 0 00-2-2 1 1 0 00-1 1v.667a4 4 0 01-.8 2.4L6.8 7.933a4 4 0 00-.8 2.4z" />
                                </svg>
                            </div>
                            <h4 className="font-bold text-green-100 text-base">핵심 강점</h4>
                        </div>
                        <div className="p-4 space-y-3">
                            {(data.assessment?.strengths || []).map((s, i) => (
                                <div key={i} className="flex items-start gap-3">
                                    <span className="text-green-500 mt-0.5">✔</span>
                                    <p className="text-slate-300 leading-relaxed">{s}</p>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Weaknesses Card */}
                    <div className="bg-slate-900/50 rounded-xl overflow-hidden shadow-sm border border-slate-700/50">
                        <div className="bg-red-900/40 p-3 border-b border-red-800/50 flex items-center gap-2">
                            <div className="p-1.5 bg-red-500/20 rounded-full">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                                    <path d="M18 9.5a1.5 1.5 0 11-3 0v-6a1.5 1.5 0 013 0v6zM14 9.667v-5.43a2 2 0 00-1.106-1.79l-.05-.025A4 4 0 0011.057 2H5.642a2 2 0 00-1.962 1.608l-1.2 6A2 2 0 004.438 12H8v4a2 2 0 002 2 1 1 0 001-1v-.667a4 4 0 01.8-2.4l1.2-2.667a4 4 0 00.8-2.4z" />
                                </svg>
                            </div>
                            <h4 className="font-bold text-red-100 text-base">보완점 및 약점</h4>
                        </div>
                        <div className="p-4 space-y-3">
                            {(data.assessment?.weaknesses || []).map((w, i) => (
                                <div key={i} className="flex items-start gap-3">
                                    <span className="text-red-500 mt-0.5">⚠</span>
                                    <p className="text-slate-300 leading-relaxed">{w}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </section>

            <section>
                <h3 className="text-lg font-semibold text-cyan-300 mb-4 flex items-center gap-2 border-b border-slate-700 pb-2">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                    </svg>
                    <span>성장 전략 로드맵</span>
                </h3>
                <div className="relative border-l-2 border-cyan-800 ml-3 md:ml-6 space-y-8 py-2">
                    {(data.strategy?.growthDirections || []).map((direction, index) => (
                        <div key={index} className="relative pl-8 md:pl-10 group">
                            <span className="absolute -left-[9px] top-0 bg-gray-900 border-2 border-cyan-500 text-cyan-400 w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold z-10 group-hover:bg-cyan-500 group-hover:text-white transition-colors">
                                {index + 1}
                            </span>
                            <div className="bg-slate-700/30 p-4 rounded-lg border border-slate-600/50 hover:bg-slate-700/60 transition-colors">
                                <h4 className="font-bold text-white mb-1">Step {index + 1}</h4>
                                <p className="text-slate-300 text-sm leading-relaxed">{direction}</p>
                            </div>
                        </div>
                    ))}
                </div>
            </section>

            <section>
                <div className="flex flex-col mb-4 border-b border-slate-700 pb-2">
                    <div className="flex items-center justify-between">
                        <h3 className="text-lg font-semibold text-cyan-300">
                            🚀 조회수 폭발 & 수익 극대화 추천 주제 (10개)
                        </h3>
                        <span className="text-xs text-slate-400">클릭하여 적용</span>
                    </div>
                    <div className="flex flex-wrap gap-2 mt-2">
                        <span className="text-[10px] bg-blue-900/50 text-blue-300 px-2 py-0.5 rounded-full border border-blue-700/50">Google Trends</span>
                        <span className="text-[10px] bg-green-900/50 text-green-300 px-2 py-0.5 rounded-full border border-green-700/50">Naver</span>
                        <span className="text-[10px] bg-yellow-900/50 text-yellow-300 px-2 py-0.5 rounded-full border border-yellow-700/50">Daum</span>
                        <span className="text-[10px] bg-blue-800/50 text-blue-200 px-2 py-0.5 rounded-full border border-blue-600/50">Bing</span>
                        <span className="text-[10px] bg-red-900/50 text-red-300 px-2 py-0.5 rounded-full border border-red-700/50">Nate</span>
                        <span className="text-[10px] bg-cyan-900/50 text-cyan-300 px-2 py-0.5 rounded-full border border-cyan-700/50">전 플랫폼 실시간 분석 완료</span>
                    </div>
                </div>
                <div className="space-y-4">
                    {(data.strategy?.suggestedTopics || []).map((topic, i) => (
                        <div
                            key={i}
                            onClick={() => handleTopicSelect(topic)}
                            className="group relative bg-gray-700/40 border border-gray-600 hover:border-cyan-500 hover:bg-gray-700 p-5 rounded-xl transition-all duration-200 cursor-pointer shadow-sm hover:shadow-md hover:-translate-y-1"
                        >
                            <div className="flex justify-between items-start">
                                <h4 className="text-lg font-bold text-cyan-300 mb-3 group-hover:text-cyan-200">
                                    {topic.title}
                                </h4>
                                <span className="bg-cyan-900/50 text-cyan-300 text-xs px-2 py-1 rounded border border-cyan-700/50 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap ml-2">
                                    선택하기
                                </span>
                            </div>
                            <div className="bg-gray-800 p-4 rounded-lg border border-gray-600/50 mt-1 group-hover:bg-gray-700/80 transition-colors">
                                <p className="text-base text-gray-100 leading-relaxed font-medium">
                                    <span className="mr-2">💡</span>
                                    {topic.reason}
                                </p>
                            </div>
                        </div>
                    ))}
                </div>
            </section>
        </div>
    );
};


interface KeywordFighterProps {
    onTopicSelect: (title: string, context: string) => void;
    isNaverApiConfigured: boolean;
    naverClientId: string;
    naverClientSecret: string;
    initialUrlToAnalyze?: string | null;
    initialBlogInfo?: { description?: string; anchor?: string } | null;
    onAnalysisTriggered: () => void;
    onPlatformDetect?: (platform: string) => void;
}

const detectPlatformFromUrl = (url: string): string => {
    const lower = url.toLowerCase();
    if (lower.includes('tistory.com')) return 'tistory';
    if (lower.includes('blogspot.com') || lower.includes('blogger.com')) return 'blogspot';
    if (lower.includes('blog.naver.com') || lower.includes('naver.com')) return 'naver';
    if (lower.includes('brunch.co.kr')) return 'brunch';
    if (lower.includes('wordpress.com') || lower.includes('wordpress.org') || lower.includes('/wp-content')) return 'wordpress';
    return 'auto';
};

export const KeywordFighter: FC<KeywordFighterProps> = ({
    onTopicSelect,
    isNaverApiConfigured,
    naverClientId,
    naverClientSecret,
    initialUrlToAnalyze,
    initialBlogInfo,
    onAnalysisTriggered,
    onPlatformDetect,
}) => {
    // 기본 선택 기능을 'blog-analysis'로 설정
    const [selectedFeature, setSelectedFeature] = useState<Feature>('blog-analysis');
    const [selectedSource, setSelectedSource] = useState<SearchSource>('google');
    const [keyword, setKeyword] = useState('');
    const [urlToAnalyze, setUrlToAnalyze] = useState('');
    const [cityName, setCityName] = useState('');
    const [cityTheme, setCityTheme] = useState('');

    const {
        results,
        loading: searchLoading,
        error: searchError,
        search,
        setResults,
        setError: setSearchError,
    } = useSearch();

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [strategyLoading, setStrategyLoading] = useState(false);

    const [mainKeyword, setMainKeyword] = useState('');
    const [generatedTopics, setGeneratedTopics] = useState<GeneratedTopic[] | null>(null);
    const [strategyData, setStrategyData] = useState<BlogStrategyReportData | null>(null);
    const [serpStrategy, setSerpStrategy] = useState<SerpStrategyReportData | null>(null);
    const [sustainableTopics, setSustainableTopics] = useState<SustainableTopicCategory[] | null>(null);
    const [recommendedKeywords, setRecommendedKeywords] = useState<RecommendedKeyword[] | null>(null);
    const [blogAnalysis, setBlogAnalysis] = useState<BlogAnalysisReport | null>(null);
    const [cityTopics, setCityTopics] = useState<GeneratedTopic[] | null>(null);

    const isLoading = loading || searchLoading;
    const currentError = error || searchError;

    const handleReset = useCallback(() => {
        setKeyword('');
        setUrlToAnalyze('');
        setCityName('');
        setCityTheme('');
        setResults([]);
        setError(null);
        setSearchError(null);
        setMainKeyword('');
        setGeneratedTopics(null);
        setStrategyData(null);
        setSerpStrategy(null);
        setSustainableTopics(null);
        setRecommendedKeywords(null);
        setBlogAnalysis(null);
        setCityTopics(null);
    }, [setResults, setSearchError]);

    const handleSelectFeature = useCallback((feature: Feature) => {
        handleReset();
        setSelectedFeature(feature);
    }, [handleReset]);
    
    const handleUrlAnalysis = useCallback(async (url: string, blogInfo?: { description?: string; anchor?: string } | null) => {
        if (!url.trim() || !url.startsWith('http')) {
            setError("유효한 URL을 입력해주세요.");
            return;
        };
        onPlatformDetect?.(detectPlatformFromUrl(url));
        setLoading(true);
        setError(null);
        setBlogAnalysis(null);
        try {
            const data = await analyzeBlogFromUrl(url, blogInfo ?? undefined);
            setBlogAnalysis(data);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Unknown error');
        } finally {
            setLoading(false);
        }
    }, [onPlatformDetect]);
    
    useEffect(() => {
        if (initialUrlToAnalyze) {
            handleSelectFeature('blog-analysis');
            setUrlToAnalyze(initialUrlToAnalyze);
            handleUrlAnalysis(initialUrlToAnalyze, initialBlogInfo);
            onAnalysisTriggered();
        }
    }, [initialUrlToAnalyze, onAnalysisTriggered, handleUrlAnalysis, handleSelectFeature, initialBlogInfo]);

    useEffect(() => {
        if (selectedFeature === 'recommended') {
            const fetchKeywords = async () => {
                setLoading(true);
                setError(null);
                try {
                    const data = await fetchRecommendedKeywords();
                    setRecommendedKeywords(data);
                } catch (err) {
                    setError(err instanceof Error ? err.message : 'Unknown error');
                } finally {
                    setLoading(false);
                }
            };
            fetchKeywords();
        } else if (selectedFeature === 'google-trends') {
            handleSearch('');
        }
    }, [selectedFeature]);


    const handleSearch = (query: string) => {
        setMainKeyword(query);
        setGeneratedTopics(null);
        setStrategyData(null);
        setSerpStrategy(null);
        setSustainableTopics(null);
        search(query, selectedFeature, selectedSource, { naverClientId, naverClientSecret });
    };

    const handleGenerateTopics = async (type: 'main' | 'all') => {
        setLoading(true);
        setError(null);
        setGeneratedTopics(null);
        try {
            const related = (results as KeywordData[]).map(r => r.keyword);
            const topics = type === 'main'
                ? await generateTopicsFromMainKeyword(mainKeyword)
                : await generateTopicsFromAllKeywords(mainKeyword, related);
            setGeneratedTopics(topics);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Unknown error');
        } finally {
            setLoading(false);
        }
    };

    const handleGenerateStrategy = async () => {
        setStrategyLoading(true);
        setError(null);
        setStrategyData(null);
        try {
            const data = await generateBlogStrategy(mainKeyword, results as BlogPostData[]);
            setStrategyData(data);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Unknown error');
        } finally {
            setStrategyLoading(false);
        }
    };

    const handleGenerateSerpStrategy = async () => {
        setStrategyLoading(true);
        setError(null);
        setSerpStrategy(null);
        try {
            const data = await generateSerpStrategy(mainKeyword, results[0] as GoogleSerpData);
            setSerpStrategy(data);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Unknown error');
        } finally {
            setStrategyLoading(false);
        }
    };
    
    const handleGenerateSustainableTopics = async () => {
        setLoading(true);
        setError(null);
        setSustainableTopics(null);
        try {
            const data = await generateSustainableTopics(keyword);
            setSustainableTopics(data);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Unknown error');
        } finally {
            setLoading(false);
        }
    };

    const handleGenerateCityTopics = async () => {
        if (!cityName.trim() || !cityTheme.trim()) {
            setError('도시 이름과 테마를 모두 입력해주세요.');
            return;
        }
        setLoading(true);
        setError(null);
        setCityTopics(null);
        try {
            const data = await generateCityBlogIdeas(cityName, cityTheme);
            setCityTopics(data);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Unknown error');
        } finally {
            setLoading(false);
        }
    };

    const renderResults = () => {
        if (results.length > 0) {
            if (selectedFeature === 'keywords') return <ResultsTable data={results as KeywordData[]} onKeywordClick={setKeyword} onGenerateTopicsFromMain={() => handleGenerateTopics('main')} onGenerateTopicsFromAll={() => handleGenerateTopics('all')} loading={loading} feature={selectedFeature} />;
            if (selectedFeature === 'competition') return <CompetitionAnalysisResults data={results[0] as KeywordMetrics} onTopicSelect={onTopicSelect} />;
            if (selectedFeature === 'google-trends') return <GoogleTrendsDisplay data={results as GoogleTrendItem[]} onTopicSelect={onTopicSelect} />;
            if (selectedFeature === 'related-keywords') {
                const data = results[0] as GoogleSerpData;
                return (
                    <div className="space-y-4">
                        <ResultsTable data={data.related_searches.map((kw, i) => ({ id: i + 1, keyword: kw }))} onKeywordClick={setKeyword} onGenerateTopicsFromMain={() => {}} onGenerateTopicsFromAll={() => {}} loading={false} feature={selectedFeature} />
                    </div>
                );
            }
        }
        return null;
    };
    
    return (
        <div className="space-y-6">
            <FeatureSelector selectedFeature={selectedFeature} onSelectFeature={handleSelectFeature} loading={isLoading} onReset={handleReset} />

            {['competition', 'keywords', 'related-keywords', 'sustainable-topics'].includes(selectedFeature) && (
                <>
                    {selectedFeature === 'keywords' && <SearchEngineSelector selectedSource={selectedSource} onSelectSource={setSelectedSource} loading={isLoading} />}
                    <KeywordInputForm onSearch={selectedFeature === 'sustainable-topics' ? handleGenerateSustainableTopics : handleSearch} loading={isLoading} keyword={keyword} setKeyword={setKeyword} feature={selectedFeature} apiOk={isNaverApiConfigured} />
                </>
            )}

            {selectedFeature === 'blog-analysis' && (
                <form onSubmit={(e) => { e.preventDefault(); handleUrlAnalysis(urlToAnalyze); }} className="flex gap-2">
                     <input type="text" value={urlToAnalyze} onChange={(e) => setUrlToAnalyze(e.target.value)} placeholder="분석할 블로그 URL을 입력하세요 (예: https://...)" className="flex-grow bg-slate-800 border border-slate-600 rounded-md px-4 py-2 text-white placeholder-slate-500 focus:ring-2 focus:ring-cyan-500" disabled={isLoading} />
                     <button type="submit" disabled={isLoading || !urlToAnalyze.trim()} className="bg-cyan-500 text-white font-bold py-2 px-6 rounded-md hover:bg-cyan-400 transition-colors disabled:bg-slate-600">분석</button>
                </form>
            )}

            {selectedFeature === 'image-posting' && (
                 <form onSubmit={(e) => { e.preventDefault(); handleGenerateCityTopics(); }} className="space-y-4">
                     <div className="flex flex-col sm:flex-row gap-2">
                        <input type="text" value={cityName} onChange={(e) => setCityName(e.target.value)} placeholder="도시 이름 (예: 서울)" className="flex-grow bg-slate-800 border border-slate-600 rounded-md px-4 py-2 text-white placeholder-slate-500 focus:ring-2 focus:ring-purple-500" disabled={isLoading} />
                        <input type="text" value={cityTheme} onChange={(e) => setCityTheme(e.target.value)} placeholder="테마 (예: 숨겨진 야경 명소)" className="flex-grow bg-slate-800 border border-slate-600 rounded-md px-4 py-2 text-white placeholder-slate-500 focus:ring-2 focus:ring-purple-500" disabled={isLoading} />
                     </div>
                     <button type="submit" disabled={isLoading || !cityName.trim() || !cityTheme.trim()} className="w-full bg-purple-600 text-white font-bold py-2 px-6 rounded-md hover:bg-purple-500 transition-colors disabled:bg-slate-600">AI 아이디어 생성</button>
                </form>
            )}

            {isLoading && <LoadingSpinner />}
            {currentError && <ErrorMessage message={currentError} />}

            {!isLoading && !currentError && (
                <div className="space-y-6 mt-6">
                    {renderResults()}
                    {generatedTopics && <BlogTopicSuggestions title="AI 추천 블로그 주제" data={generatedTopics} onTopicSelect={onTopicSelect} feature={selectedFeature} />}
                    {strategyData && <BlogStrategyReport data={strategyData} onTopicSelect={onTopicSelect} />}
                    {serpStrategy && <BlogTopicSuggestions title="AI 연관검색어 기반 전략 제안" data={serpStrategy.suggestions} onTopicSelect={onTopicSelect} feature={selectedFeature} />}
                    {recommendedKeywords && <RecommendedKeywordsDisplay data={recommendedKeywords} onTopicSelect={onTopicSelect} />}
                    {blogAnalysis && <BlogAnalysisReportDisplay data={blogAnalysis} onTopicSelect={onTopicSelect} />}
                    {cityTopics && <BlogTopicSuggestions title={`${cityName} ${cityTheme} 추천`} data={cityTopics} onTopicSelect={onTopicSelect} feature={selectedFeature}/>}
                </div>
            )}
        </div>
    );
};
