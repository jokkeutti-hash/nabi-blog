
import { useState, useCallback } from 'react';
import type { KeywordData, SearchSource, Feature, BlogPostData, KeywordMetrics, GoogleSerpData, NaverNewsData, NaverWebData, GoogleTrendItem } from '../types';
import { generateRelatedKeywords, fetchRelatedKeywords, fetchNaverBlogPosts, analyzeKeywordCompetition, fetchNaverNews, fetchNaverWebSearch, fetchGoogleTrendsAnalysis } from '../services/keywordService';

export const useSearch = () => {
  const [results, setResults] = useState<(KeywordData | BlogPostData | KeywordMetrics | GoogleSerpData | NaverNewsData | NaverWebData | GoogleTrendItem)[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [initialLoad, setInitialLoad] = useState<boolean>(true);

  const search = useCallback(async (keyword: string, feature: Feature, source: SearchSource, options?: { naverClientId?: string, naverClientSecret?: string }) => {
    setInitialLoad(false);
    setLoading(true);
    setError(null);
    setResults([]);

    try {
      let data;
      if (feature === 'keywords') {
        data = await fetchRelatedKeywords(keyword, source);
      } else if (feature === 'blogs') {
        if (!options?.naverClientId || !options?.naverClientSecret) {
          throw new Error('상위 블로그 분석을 사용하려면 먼저 Naver API 설정을 완료해주세요.');
        }
        data = await fetchNaverBlogPosts(keyword, options.naverClientId, options.naverClientSecret);
      } else if (feature === 'naver-search') {
        if (!options?.naverClientId || !options?.naverClientSecret) {
          throw new Error('네이버 통합 검색을 사용하려면 먼저 Naver API 설정을 완료해주세요.');
        }
        data = await fetchNaverWebSearch(keyword, options.naverClientId, options.naverClientSecret);
      } else if (feature === 'related-keywords') {
        const serpData = await generateRelatedKeywords(keyword);
        data = [serpData];
      } else if (feature === 'naver-news') {
        if (!options?.naverClientId || !options?.naverClientSecret) {
          throw new Error('실시간 뉴스 분석을 사용하려면 먼저 Naver API 설정을 완료해주세요.');
        }
        data = await fetchNaverNews(keyword, options.naverClientId, options.naverClientSecret);
      } else if (feature === 'google-trends') {
        data = await fetchGoogleTrendsAnalysis();
      } else { // feature === 'competition'
        const competitionData = await analyzeKeywordCompetition(keyword);
        data = [competitionData];
      }
      setResults(data);
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('알 수 없는 오류가 발생했습니다.');
      }
    } finally {
      setLoading(false);
    }
  }, []);

  return { results, loading, error, search, initialLoad, setResults, setError, setInitialLoad, setLoading };
};
