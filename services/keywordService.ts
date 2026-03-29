
import type { KeywordData, SearchSource, BlogPostData, KeywordMetrics, GeneratedTopic, BlogStrategyReportData, RecommendedKeyword, SustainableTopicCategory, GoogleSerpData, SerpStrategyReportData, NaverNewsData, NewsStrategyIdea, BlogAnalysisReport, NaverWebData, GoogleTrendItem } from '../types';
import { GoogleGenAI, Type } from "@google/genai";

function getApiKey(): string {
    try {
        const stored = localStorage.getItem('geminiApiKey_b64');
        if (stored) return atob(stored);
    } catch {}
    throw new Error("Gemini API 키가 설정되지 않았습니다. 우측 상단 ⚙️ 설정에서 Gemini API 키를 입력해주세요.");
}
const getAi = () => new GoogleGenAI({ apiKey: getApiKey() });

// NOTE: To combat the inherent unreliability of public CORS proxies, this service employs a highly resilient, multi-strategy approach.
interface Proxy {
    name: string;
    buildUrl: (url: string) => string;
    parseResponse: (response: Response) => Promise<string>;
}

const PROXIES: Proxy[] = [
    {
        name: 'jina-reader',
        buildUrl: (url) => `https://r.jina.ai/${url}`,
        parseResponse: (response) => response.text(),
    },
    {
        name: 'allorigins.win',
        buildUrl: (url) => `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`,
        parseResponse: (response) => response.text(),
    },
    {
        name: 'corsproxy.io',
        buildUrl: (url) => `https://corsproxy.io/?${encodeURIComponent(url)}`,
        parseResponse: (response) => response.text(),
    },
    {
        name: 'worker-proxy',
        buildUrl: (url) => `https://cors-anywhere.de-d.workers.dev/${url}`,
        parseResponse: (response) => response.text(),
    },
];

const MAX_RETRIES_PER_PROXY = 2;
const RETRY_DELAY_MS = 1000;
const FETCH_TIMEOUT_MS = 15000;

function findJsonEnd(str: string): number {
    let stack: ('{' | '[')[] = [];
    let inString = false;
    let isEscaped = false;
    if (str.length === 0 || (str[0] !== '{' && str[0] !== '[')) return -1;
    for (let i = 0; i < str.length; i++) {
        const char = str[i];
        if (isEscaped) { isEscaped = false; continue; }
        if (char === '\\') { isEscaped = true; continue; }
        if (char === '"') { inString = !inString; }
        if (!inString) {
            if (char === '{' || char === '[') { stack.push(char); }
            else if (char === '}') { if (stack.length === 0 || stack[stack.length - 1] !== '{') return -1; stack.pop(); }
            else if (char === ']') { if (stack.length === 0 || stack[stack.length - 1] !== '[') return -1; stack.pop(); }
        }
        if (stack.length === 0) { return i + 1; }
    }
    return -1;
}

function extractJsonFromText(text: string | undefined | null): any {
    if (!text || !text.trim()) { throw new Error('AI 응답이 비어있습니다.'); }
    let rawString = text.trim();
    const markdownMatch = rawString.match(/```(?:json)?\s*([\s\S]*?)\s*```/s);
    let content = markdownMatch && markdownMatch[1] ? markdownMatch[1].trim() : rawString;
    const firstBrace = content.indexOf('{');
    const firstBracket = content.indexOf('[');
    let startIndex = -1;
    if (firstBrace === -1 && firstBracket === -1) { throw new Error('JSON을 찾을 수 없습니다.'); }
    startIndex = (firstBrace !== -1 && (firstBracket === -1 || firstBrace < firstBracket)) ? firstBrace : firstBracket;
    let jsonCandidate = content.substring(startIndex);
    const endIndex = findJsonEnd(jsonCandidate);
    if (endIndex !== -1) { jsonCandidate = jsonCandidate.substring(0, endIndex); }
    let jsonToParse = jsonCandidate.replace(/rgba\{/g, 'rgba(');
    try {
        const repairedJson = jsonToParse.replace(/,\s*([}\]])/g, '$1');
        return JSON.parse(repairedJson);
    } catch (error) {
        console.error("JSON 파싱 실패:", text);
        throw new Error('AI가 반환한 데이터 형식이 잘못되었습니다.');
    }
}

// Google Search grounding 응답에서 JSON이 없으면 grounding 없이 재시도
async function callGeminiForAnalysis(prompt: string): Promise<any> {
    // 1차: Google Search grounding (실시간 정보 반영)
    try {
        const response = await getAi().models.generateContent({
            model: "gemini-2.5-flash",
            contents: prompt,
            config: {
                tools: [{ googleSearch: {} }],
                temperature: 0.25,
                thinkingConfig: { thinkingBudget: 0 },
            }
        });
        const text = response.text || response.candidates?.[0]?.content?.parts
            ?.filter((p: any) => !p.thought)
            .map((p: any) => p.text ?? '').join('') || '';
        if (!text || (!text.includes('{') && !text.includes('['))) {
            throw new Error('grounding 응답에 JSON 없음');
        }
        return extractJsonFromText(text);
    } catch (_) {
        // 2차: JSON 강제 출력 (Google Search 없이)
        const response2 = await getAi().models.generateContent({
            model: "gemini-2.5-flash",
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                temperature: 0.25,
                thinkingConfig: { thinkingBudget: 0 },
            }
        });
        const text2 = response2.text || '';
        return extractJsonFromText(text2);
    }
}

const fetchWithTimeout = async (resource: RequestInfo, options: RequestInit & { timeout?: number } = {}): Promise<Response> => {
    const { timeout = FETCH_TIMEOUT_MS } = options;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort('Timeout'), timeout);
    try { return await fetch(resource, { ...options, signal: controller.signal }); }
    finally { clearTimeout(timeoutId); }
};

const fetchWithProxies = async (targetUrl: string, responseParser: (text: string) => any) => {
    let lastKnownError: Error | null = null;
    for (const proxy of PROXIES) {
        for (let attempt = 1; attempt <= MAX_RETRIES_PER_PROXY; attempt++) {
            try {
                const proxyUrl = proxy.buildUrl(targetUrl);
                const response = await fetchWithTimeout(proxyUrl, { timeout: FETCH_TIMEOUT_MS });
                if (!response.ok) { lastKnownError = new Error(`HTTP ${response.status}`); break; }
                const rawContent = await proxy.parseResponse(response);
                if (!rawContent) continue;
                return responseParser(rawContent);
            } catch (error) {
                lastKnownError = error instanceof Error ? error : new Error(String(error));
                if (attempt < MAX_RETRIES_PER_PROXY) await new Promise(r => setTimeout(r, RETRY_DELAY_MS));
            }
        }
    }
    throw lastKnownError || new Error('데이터 요청 실패');
};

const callNaverApi = async (endpoint: string, params: Record<string, string>, clientId: string, clientSecret: string) => {
    const queryString = new URLSearchParams(params).toString();
    const targetUrl = `https://openapi.naver.com${endpoint}?${queryString}`;
    let lastKnownError: Error | null = null;
    for (const proxy of PROXIES) {
        try {
            const proxyUrl = proxy.buildUrl(targetUrl);
            const response = await fetchWithTimeout(proxyUrl, {
                headers: { 'X-Naver-Client-Id': clientId, 'X-Naver-Client-Secret': clientSecret }
            });
            const responseData = await response.json();
            if (!response.ok) throw new Error(responseData.errorMessage || `HTTP ${response.status}`);
            return responseData;
        } catch (error) { lastKnownError = error instanceof Error ? error : new Error(String(error)); }
    }
    throw lastKnownError || new Error('Naver API 호출 실패');
};

export const fetchPageTitle = async (url: string): Promise<string> => {
    try {
        const html = await fetchWithProxies(url, text => text);
        const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
        return titleMatch ? titleMatch[1].trim() : url;
    } catch (e) { return url; }
};

export const testNaverCredentials = async (clientId: string, clientSecret: string): Promise<boolean> => {
    try {
        await callNaverApi('/v1/search/blog.json', { query: 'test', display: '1' }, clientId, clientSecret);
        return true;
    } catch (e) { throw e; }
};

export const fetchNaverNews = async (keyword: string, clientId: string, clientSecret: string): Promise<NaverNewsData[]> => {
    if (!keyword.trim()) throw new Error("키워드 공백");
    const data = await callNaverApi('/v1/search/news.json', { query: keyword, display: '10', sort: 'sim' }, clientId, clientSecret);
    const stripHtml = (html: string) => new DOMParser().parseFromString(html, 'text/html').body.textContent || "";
    return data.items.map((item: any) => ({
        id: item.link,
        title: stripHtml(item.title),
        url: item.link,
        description: stripHtml(item.description),
        pubDate: item.pubDate,
    }));
};

export const fetchNaverWebSearch = async (keyword: string, clientId: string, clientSecret: string): Promise<NaverWebData[]> => {
    if (!keyword.trim()) throw new Error("키워드 공백");
    const data = await callNaverApi('/v1/search/webkr.json', { query: keyword, display: '10' }, clientId, clientSecret);
    const stripHtml = (html: string) => new DOMParser().parseFromString(html, 'text/html').body.textContent || "";
    return data.items.map((item: any) => ({
        title: stripHtml(item.title),
        link: item.link,
        description: stripHtml(item.description),
    }));
};

export const fetchGoogleTrendsAnalysis = async (): Promise<GoogleTrendItem[]> => {
const today = new Date().toLocaleDateString('ko-KR');
    const prompt = `대한민국 최고의 트렌드 분석가로서 ${today} 기준 실시간 검색 트렌드 상위 10개를 분석해 JSON 배열로 반환하세요. 카테고리, 이유, 추천 블로그 제목을 포함하세요.`;
    try {
        const response = await getAi().models.generateContent({
            model: "gemini-2.5-flash",
            contents: prompt,
            config: {
                tools: [{ googleSearch: {} }],
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.ARRAY,
                    items: {
                        type: Type.OBJECT,
                        properties: {
                            keyword: { type: Type.STRING },
                            category: { type: Type.STRING },
                            reason: { type: Type.STRING },
                            blogTopic: { type: Type.STRING }
                        },
                        required: ["keyword", "category", "reason", "blogTopic"]
                    }
                }
            },
        });
        const parsed = extractJsonFromText(response.text);
        return parsed.map((item: any, idx: number) => ({ ...item, id: idx + 1 }));
    } catch (e) { throw e; }
};

export const analyzeBlogFromUrl = async (blogUrl: string, blogInfo?: { description?: string; anchor?: string }): Promise<BlogAnalysisReport & { _foundPosts?: string[] }> => {
if (!blogUrl.trim()) throw new Error("URL 공백");

    const trimmedUrl = blogUrl.trim();

    // 네이버 블로그 감지 및 blogId 추출
    const naverBlogMatch = trimmedUrl.match(/(?:m\.)?blog\.naver\.com\/([^\/\?#]+)/);
    const naverBlogId = naverBlogMatch ? naverBlogMatch[1] : null;

    // 베이스 URL 추출 (특정 포스트 URL도 처리)
    let baseUrl = trimmedUrl;
    try {
        const u = new URL(baseUrl);
        if (naverBlogId) {
            // 네이버: blog.naver.com/myblog123 형태 유지
            baseUrl = `${u.protocol}//${u.host}/${naverBlogId}`;
        } else {
            baseUrl = `${u.protocol}//${u.host}`;
        }
    } catch {}

    const isBlogspot = baseUrl.includes('blogspot.com') || baseUrl.includes('blogger.com');
    const isNaver = !!naverBlogId;

    // RSS URL 결정
    let rssUrl: string;
    if (isNaver) {
        // 네이버 블로그 전용 RSS 주소
        rssUrl = `https://rss.blog.naver.com/${naverBlogId}`;
    } else if (isBlogspot) {
        rssUrl = `${baseUrl}/feeds/posts/default?alt=rss`;
    } else {
        rssUrl = `${baseUrl}/rss`; // 티스토리 및 기타 블로그
    }

    let scrapedContent = "";
    let foundPosts: string[] = [];

    // 1단계: RSS 피드로 기존 포스팅 전체 목록 수집 시도
    try {
        const rssTimeout = new Promise<never>((_, reject) => setTimeout(() => reject(new Error('rss timeout')), 6000));
        const rssText = await Promise.race([fetchWithProxies(rssUrl, text => text), rssTimeout]);
        const xmlDoc = new DOMParser().parseFromString(rssText, 'text/xml');
        // RSS 2.0: <item><title>, Atom: <entry><title>
        const titleEls = Array.from(xmlDoc.querySelectorAll('item > title, entry > title'));
        foundPosts = titleEls
            .map(el => el.textContent?.trim())
            .filter(Boolean)
            .slice(0, 50) as string[];
    } catch (_) {
        // RSS 실패, 2단계로 진행
    }

    // 2단계: RSS 실패/빈 경우 → 메인 페이지 스크래핑 시도
    if (foundPosts.length === 0) {
        try {
            const scrapeTimeout = new Promise<never>((_, reject) => setTimeout(() => reject(new Error('scrape timeout')), 4000));
            const html = await Promise.race([fetchWithProxies(blogUrl, text => text), scrapeTimeout]);
            const doc = new DOMParser().parseFromString(html, 'text/html');
            const pageTitle = doc.querySelector('title')?.textContent?.trim() || '';
            const headings = Array.from(doc.querySelectorAll('h1, h2, h3'))
                .map(h => h.textContent?.trim())
                .filter(Boolean)
                .slice(0, 20)
                .join(' / ');
            const bodyText = doc.body.textContent?.replace(/\s+/g, ' ').trim().substring(0, 2000) || "";
            scrapedContent = `[블로그 메인 페이지 분석]\n블로그명: ${pageTitle}\n최근 포스팅 주제(H1~H3): ${headings}\n본문 일부: ${bodyText}`;
        } catch (_) {
            if (isNaver && naverBlogId) {
                scrapedContent = `네이버 블로그(blog.naver.com/${naverBlogId})는 JavaScript 렌더링으로 직접 접근이 불가합니다. Google 검색 기능으로 "site:blog.naver.com/${naverBlogId}" 결과를 검색하여 이 블로그의 기존 포스팅 목록과 주제를 파악하십시오. 네이버 블로그 특성상 건강, 요리, 여행, 육아, 생활정보 등의 분야를 다루는 경우가 많습니다.`;
            } else {
                scrapedContent = `URL 직접 접근 실패. Google 검색 기능으로 "site:${baseUrl}" 결과를 검색하여 이 블로그의 기존 포스팅 목록과 주제를 직접 파악하십시오.`;
            }
        }
    } else {
        scrapedContent = `[RSS 피드로 수집한 기존 포스팅 목록 - 총 ${foundPosts.length}개]\n${foundPosts.map((t, i) => `${i + 1}. ${t}`).join('\n')}`;
    }

    // 내부링크에서 넘어온 블로그 정보 (사용자가 직접 입력한 설명)
    const hasBlogInfo = !!(blogInfo?.anchor || blogInfo?.description);
    const blogInfoHeader = hasBlogInfo
        ? `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
[최우선 참고 정보 - 절대 무시 금지]
아래는 블로그 운영자가 직접 입력한 이 블로그의 정확한 정보입니다.
Google 검색 결과나 블로그 URL보다 아래 정보를 반드시 우선합니다.
블로그명: ${blogInfo!.anchor || ''}
블로그 설명: ${blogInfo!.description || ''}
※ 이 설명을 기반으로 블로그 카테고리, 성격, 방향을 판단하십시오.
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`
        : '';

    const formattedDate = new Date().toLocaleDateString('ko-KR');
    const prompt = `
${blogInfoHeader}

당신은 대한민국 최고의 블로그 성장 컨설턴트이자 SEO/AEO 마스터 에디터입니다.
분석 기준일: ${formattedDate} (현재 2026년 상반기 흐름 반영)
대상 블로그 URL: ${blogUrl}

${scrapedContent}

[수행 과제]
${hasBlogInfo ? `⚠️ 이 블로그는 위 [최우선 참고 정보]에 명시된 "${blogInfo!.anchor || ''}" 블로그입니다. 블로그 제목이나 URL만으로 판단하지 말고 반드시 위 설명을 기반으로 분석하십시오.\n` : ''}1. **카테고리 실시간성 판별**: 이 블로그가 속한 카테고리를 정확히 분석하고, **2026년 현재** 해당 카테고리에서 가장 뜨거운 실시간 트렌드(Google, Naver, Daum, Bing, Nate 등)를 교차 수집하십시오.
2. **SEO & AEO 최적화 전략**: 단순한 검색 노출(SEO)뿐만 아니라, AI가 답변을 생성할 때 출처로 인용하기 쉬운 구조(AEO: AI Engine Optimization)를 고려한 제목을 생성하십시오. (명확한 정보성 질문, 데이터 기반 해결책 등)
3. **기존 글과 100% 차별화**: 위 분석된 '기존 포스팅 주제들'과 **절대 중복되지 않는** 완전히 새로운 각도의 주제만 추천해야 합니다.
4. **'클릭 치트키' 제목 10개 생성**: 독자의 호기심을 극대화하는 동시에 최신 흐름을 반영한 10개의 '조회수 보장형' 제목을 생성하십시오.
5. **추천 사유(Reason) 작성**: 각 제목이 왜 현재 트렌드에 적합한지(예: "현재 구글 트렌드 IT 급상승 키워드 반영", "네이트 이슈판 2030 관심사 통합" 등)를 전 플랫폼 데이터 근거와 함께 구체적으로 설명하십시오.
6. **블로그 약점 보완 주제 필수 포함**: assessment의 weaknesses를 분석하고, 그 약점을 직접 보완하는 주제를 10개 중 최소 2개 포함하십시오. 추천 사유에 "이 블로그의 약점인 ~을 보완"이라고 명시하십시오.
7. **EEAT 반영 의무화**: 10개 제목 중 최소 3개는 아래 EEAT 요소를 제목에서 직접 느낄 수 있어야 합니다:
   - E(경험): "직접 해봤더니", "써본 결과", "실제로 사용해보니"
   - E(전문성): "제대로 알아보는", "전문가가 알려주는", "과학적으로 보면"
   - A(권위): "공식 데이터로 확인한", "연구 결과에 따르면", "정확히 알아야 할"
   - T(신뢰): "사실인가 거짓인가", "오해와 진실", "검증된 ~"
8. **다양성 강제 규칙 ⚠️ 반드시 준수**: 아래 두 가지 다양성을 동시에 지켜야 합니다.

   ⚠️ **연도 제한**: '2026년', '2025년' 등 특정 연도로 시작하거나 포함하는 제목은 10개 중 최대 1개로 제한. 나머지 9개는 연도 없이 보편적이고 시의적인 표현으로 작성.

   **[주제 다양성]** 같은 하위 분야 주제 반복 금지. 블로그 카테고리 내 서로 다른 측면을 골고루 배분:
   - 건강 블로그: 특정 음식 효능 / 약초·한방 / 영양제·건강기능식품 / 다이어트 / 질병 예방 / 운동 / 정신건강 / 생활습관 등
   - IT 블로그: 앱 활용 / 기기 리뷰 / 보안 / AI 트렌드 / 개발 팁 / 플랫폼 활용 등
   - 그 외 카테고리도 동일하게 하위 분야별로 골고루 배분

   **[제목 형식 다양성 — 10개 제목에 아래 10가지 포맷을 각 1개씩 반드시 사용. 같은 포맷 2회 이상 절대 금지]**
   ① **How-to형**: "~하는 법", "~하는 방법 완벽 정리", "~하는 순서"
   ② **숫자 리스트형**: "~하는 N가지 방법", "꼭 알아야 할 N가지", "N가지 이유"
   ③ **질문형**: "~는 왜?", "~해도 될까?", "~가 정말 효과 있을까?"
   ④ **비교·선택형**: "A vs B 차이 총정리", "A와 B 중 뭐가 나을까", "어떤 게 더 좋을까"
   ⑤ **경고·반전형**: "~하면 절대 안 되는 이유", "~를 멈춰야 하는 신호", "~의 위험한 진실"
   ⑥ **EEAT 경험·전문성형**: "직접 써본 솔직 후기", "전문가가 알려주는 ~", "과학적으로 검증된 ~"
   ⑦ **시의성·트렌드형**: "요즘 뜨는 ~", "최근 주목받는 ~", "지금 당장 알아야 할 ~" (연도 직접 명시 금지)
   ⑧ **비밀·꿀팁형**: "아무도 알려주지 않는 ~ 비법", "전문가만 아는 ~", "이것 하나로 해결"
   ⑨ **타겟 맞춤형**: "초보자도 바로 따라하는 ~", "~를 위한 완벽 가이드", "~라면 꼭 알아야 할"
   ⑩ **약점 보완·신뢰형**: "~의 오해와 진실", "사실 ~는 이렇게 달라요", "~에 대해 제대로 알아보는"

[출력 형식 - 반드시 아래 JSON만 출력, 다른 텍스트 금지]
{
  "blogUrl": "${blogUrl}",
  "identity": { "title": "블로그명", "description": "블로그 설명", "latestPostExample": "최근 포스팅 예시" },
  "assessment": { "strengths": ["강점1", "강점2"], "weaknesses": ["약점1", "약점2"] },
  "strategy": {
    "growthDirections": ["방향1", "방향2", "방향3"],
    "suggestedTopics": [
      { "title": "추천 제목1", "reason": "추천 이유1" },
      { "title": "추천 제목2", "reason": "추천 이유2" },
      { "title": "추천 제목3", "reason": "추천 이유3" },
      { "title": "추천 제목4", "reason": "추천 이유4" },
      { "title": "추천 제목5", "reason": "추천 이유5" },
      { "title": "추천 제목6", "reason": "추천 이유6" },
      { "title": "추천 제목7", "reason": "추천 이유7" },
      { "title": "추천 제목8", "reason": "추천 이유8" },
      { "title": "추천 제목9", "reason": "추천 이유9" },
      { "title": "추천 제목10", "reason": "추천 이유10" }
    ]
  }
}
suggestedTopics는 반드시 10개를 정확히 채워야 합니다.
`;

    try {
        const result = await callGeminiForAnalysis(prompt) as BlogAnalysisReport;
        return { ...result, _foundPosts: foundPosts } as any;
    } catch (e) {
        console.error("Analysis failed:", e);
        const errMsg = e instanceof Error ? e.message : String(e);
        throw new Error(`블로그 분석 실패: ${errMsg}`);
    }
};

export const analyzeKeywordCompetition = async (keyword: string): Promise<KeywordMetrics> => {
const prompt = `키워드 '${keyword}'의 2026년 검색 경쟁력 분석 및 전략을 아래 JSON 형식으로만 반환하세요. 다른 텍스트 금지.\n{"keyword":"...","searchVolume":"...","competition":"...","trend":"...","recommendation":"..."}`;
    const response = await getAi().models.generateContent({
        model: "gemini-2.5-flash",
        contents: prompt,
        config: { tools: [{ googleSearch: {} }] }
    });
    const parsed = extractJsonFromText(response.text);
    return { ...parsed, keyword };
};

export const fetchRelatedKeywords = async (keyword: string, source: SearchSource): Promise<KeywordData[]> => {
    let url = source === 'google' ? `https://suggestqueries.google.com/complete/search?client=firefox&q=${encodeURIComponent(keyword)}` : `https://ac.search.naver.com/nx/ac?q=${encodeURIComponent(keyword)}&con=0&frm=nv&ans=2&r_format=json&r_enc=UTF-8&r_unicode=0&t_koreng=1&run=2&rev=4&q_enc=UTF-8&st=100`;
    return fetchWithProxies(url, (raw) => {
        const data = JSON.parse(raw);
        if (source === 'google') return (data[1] as string[]).map((kw, idx) => ({ id: idx + 1, keyword: kw }));
        return (data.items[0] as any[]).map((item, idx) => ({ id: idx + 1, keyword: item[0] }));
    });
};

export const fetchNaverBlogPosts = async (keyword: string, clientId: string, clientSecret: string): Promise<BlogPostData[]> => {
    const data = await callNaverApi('/v1/search/blog.json', { query: keyword, display: '10' }, clientId, clientSecret);
    return data.items.map((item: any, idx: number) => ({ id: idx + 1, title: item.title.replace(/<[^>]*>?/gm, ''), url: item.link }));
};

export const generateRelatedKeywords = async (keyword: string): Promise<GoogleSerpData> => {
const prompt = `키워드 '${keyword}'의 2026년 Google 관련 검색어와 PAA를 분석해 아래 JSON 형식으로만 반환하세요. 다른 텍스트 금지.\n{"relatedKeywords":["..."],"paaQuestions":["..."]}`;
    const response = await getAi().models.generateContent({ model: "gemini-2.5-flash", contents: prompt, config: { tools: [{ googleSearch: {} }] } });
    return extractJsonFromText(response.text);
};

export const generateTopicsFromMainKeyword = async (keyword: string): Promise<GeneratedTopic[]> => {
const prompt = `'${keyword}'로 2026년 트렌드에 최적화된 블로그 주제 5개를 제안하세요. { id, title, thumbnailCopy, strategy }[]`;
    const response = await getAi().models.generateContent({ model: "gemini-2.5-flash", contents: prompt, config: { responseMimeType: "application/json" } });
    return extractJsonFromText(response.text);
};

export const generateTopicsFromAllKeywords = async (mainKeyword: string, relatedKeywords: string[]): Promise<GeneratedTopic[]> => {
const prompt = `'${mainKeyword}'와 연관 키워드(${relatedKeywords.join(', ')})를 조합한 2026년 주제 5개를 제안하세요.`;
    const response = await getAi().models.generateContent({ model: "gemini-2.5-flash", contents: prompt, config: { responseMimeType: "application/json" } });
    return extractJsonFromText(response.text);
};

export const generateBlogStrategy = async (keyword: string, competitors: BlogPostData[]): Promise<BlogStrategyReportData> => {
const competitorTitles = competitors.map(c => c.title).join('\n');
    const prompt = `'${keyword}'의 경쟁 블로그 분석 및 2026년 1위 전략을 JSON으로 작성하세요.\n${competitorTitles}`;
    const response = await getAi().models.generateContent({ model: "gemini-2.5-pro", contents: prompt, config: { responseMimeType: "application/json" } });
    return extractJsonFromText(response.text);
};

export const fetchRecommendedKeywords = async (): Promise<RecommendedKeyword[]> => {
const prompt = `오늘 2026년 대한민국 블로그 수익을 위한 전략적 키워드 5개를 발굴해 아래 JSON 형식으로만 반환하세요. 다른 텍스트 금지.\n[{"keyword":"...","reason":"...","potential":"..."}]`;
    const response = await getAi().models.generateContent({ model: "gemini-2.5-flash", contents: prompt, config: { tools: [{ googleSearch: {} }] } });
    return extractJsonFromText(response.text);
};

export const generateSustainableTopics = async (keyword: string): Promise<SustainableTopicCategory[]> => {
const prompt = `'${keyword}'를 2026년 관점에서 확장한 주제 리스트를 JSON으로 반환하세요.`;
    const response = await getAi().models.generateContent({ model: "gemini-2.5-pro", contents: prompt, config: { responseMimeType: "application/json" } });
    return extractJsonFromText(response.text);
};

export const generateSerpStrategy = async (keyword: string, serpData: GoogleSerpData): Promise<SerpStrategyReportData> => {
const prompt = `'${keyword}' SERP 데이터 기반 2026년 전략 리포트 작성: ${JSON.stringify(serpData)}`;
    const response = await getAi().models.generateContent({ model: "gemini-2.5-pro", contents: prompt, config: { responseMimeType: "application/json" } });
    return extractJsonFromText(response.text);
};

export const generateStrategyFromNews = async (newsItems: NaverNewsData[]): Promise<NewsStrategyIdea[]> => {
const newsContext = newsItems.map(n => `- ${n.title}`).join('\n');
    const prompt = `최신 뉴스 기반 2026년 블로그 전략 3개 제안:\n${newsContext}`;
    const response = await getAi().models.generateContent({ model: "gemini-2.5-flash", contents: prompt, config: { responseMimeType: "application/json" } });
    return extractJsonFromText(response.text);
};

export const generateCityBlogIdeas = async (cityName: string, theme: string): Promise<GeneratedTopic[]> => {
const prompt = `'${cityName}'의 '${theme}' 주제 2026년 블로그 아이디어 5개를 아래 JSON 형식으로만 반환하세요. 다른 텍스트 금지.\n[{"id":1,"title":"...","thumbnailCopy":"...","strategy":"..."}]`;
    const response = await getAi().models.generateContent({ model: "gemini-2.5-flash", contents: prompt, config: { tools: [{ googleSearch: {} }] } });
    return extractJsonFromText(response.text);
};

export const generateTopicsFromImage = async (base64: string): Promise<GeneratedTopic[]> => {
const response = await getAi().models.generateContent({
        model: "gemini-2.5-flash",
        contents: { parts: [{ inlineData: { mimeType: "image/jpeg", data: base64 } }, { text: "이 이미지 기반 2026년 주제 5개 제안." }] },
        config: { responseMimeType: "application/json" }
    });
    return extractJsonFromText(response.text);
};

export const analyzeNaverBlogWithApi = async (blogUrl: string, clientId: string, clientSecret: string): Promise<BlogAnalysisReport> => {
    if (!blogUrl.trim()) throw new Error("URL 공백");

    // 네이버 블로그 ID 추출 (blog.naver.com/BLOGID 또는 m.blog.naver.com/BLOGID)
    const blogIdMatch = blogUrl.match(/(?:m\.)?blog\.naver\.com\/([^\/\?#]+)/);
    const blogId = blogIdMatch ? blogIdMatch[1] : null;

    let existingPostsInfo = "";
    let foundPosts: Array<{ title: string; link: string }> = [];

    if (blogId && clientId && clientSecret) {
        try {
            // Naver Blog Search API로 해당 블로거의 포스팅 목록 수집
            const searchResult = await callNaverApi(
                '/v1/search/blog.json',
                { query: blogId, display: '100', sort: 'date' },
                clientId,
                clientSecret
            );
            if (searchResult?.items) {
                // bloggerlink 또는 link에 blogId가 포함된 글만 필터링
                const myPosts = searchResult.items.filter((item: any) =>
                    (item.bloggerlink && item.bloggerlink.includes(blogId)) ||
                    (item.link && item.link.includes(`/${blogId}/`))
                );
                foundPosts = myPosts.map((item: any) => ({
                    title: item.title.replace(/<[^>]*>?/gm, ''),
                    link: item.link,
                }));
            }
        } catch (e) {
            // API 실패 시 AI가 Google 검색으로 보완
        }
    }

    if (foundPosts.length > 0) {
        existingPostsInfo = `[네이버 API로 수집한 기존 포스팅 목록 - 총 ${foundPosts.length}개]\n${foundPosts.map(p => `- ${p.title}`).join('\n')}`;
    } else {
        existingPostsInfo = blogId
            ? `네이버 API로 포스팅을 찾지 못했습니다. Google 검색으로 blog.naver.com/${blogId} 의 기존 글들을 직접 검색하여 파악하십시오.`
            : "블로그 ID를 추출할 수 없습니다. Google 검색 데이터를 기반으로 분석을 진행하십시오.";
    }

    const formattedDate = new Date().toLocaleDateString('ko-KR');
    const prompt = `
당신은 대한민국 최고의 블로그 성장 컨설턴트이자 SEO/AEO 마스터 에디터입니다.
분석 기준일: ${formattedDate} (현재 2026년 상반기 흐름 반영)
대상 블로그 URL: ${blogUrl}

${existingPostsInfo}

[수행 과제]
1. **카테고리 실시간성 판별**: 이 블로그가 속한 카테고리를 정확히 분석하고, **2026년 현재** 해당 카테고리에서 가장 뜨거운 실시간 트렌드를 교차 수집하십시오.
2. **SEO & AEO 최적화 전략**: 단순한 검색 노출(SEO)뿐만 아니라, AI가 답변을 생성할 때 출처로 인용하기 쉬운 구조(AEO)를 고려한 제목을 생성하십시오.
3. **기존 글과 100% 차별화**: 위 '기존 포스팅 목록'과 **절대 중복되지 않는** 완전히 새로운 각도의 주제만 추천해야 합니다.
4. **'클릭 치트키' 제목 10개 생성**: 독자의 호기심을 극대화하는 동시에 2026년 최신 흐름을 완벽히 반영한 10개의 제목을 생성하십시오.
5. **추천 사유(Reason) 작성**: 각 제목이 왜 현재 트렌드에 적합한지 구체적으로 설명하십시오.
6. **다양성 강제 규칙 ⚠️ 반드시 준수**: 아래 두 가지 다양성을 동시에 지켜야 합니다.

   **[주제 다양성]** 같은 하위 분야 주제 반복 금지. 블로그 카테고리 내 서로 다른 측면을 골고루 배분:
   - 건강 블로그: 특정 음식 효능 / 약초·한방 / 영양제·건강기능식품 / 다이어트 / 질병 예방 / 운동 / 정신건강 / 생활습관 등
   - IT 블로그: 앱 활용 / 기기 리뷰 / 보안 / AI 트렌드 / 개발 팁 / 플랫폼 활용 등
   - 그 외 카테고리도 동일하게 하위 분야별로 골고루 배분

   **[제목 형식 다양성 — 10개 제목에 아래 10가지 포맷을 각 1개씩 반드시 사용. 같은 포맷 2회 이상 절대 금지]**
   ① **How-to형**: "~하는 법", "~하는 방법 완벽 정리", "~하는 순서"
   ② **숫자 리스트형**: "~하는 N가지 방법", "꼭 알아야 할 N가지", "N가지 이유"
   ③ **질문형**: "~는 왜?", "~해도 될까?", "~가 정말 효과 있을까?"
   ④ **비교·선택형**: "A vs B 차이 총정리", "A와 B 중 뭐가 나을까", "어떤 게 더 좋을까"
   ⑤ **경고·반전형**: "~하면 절대 안 되는 이유", "~를 멈춰야 하는 신호", "~의 위험한 진실"
   ⑥ **후기·경험형**: "직접 써본 솔직 후기", "N개월 사용 후 달라진 점", "실제로 해봤더니"
   ⑦ **트렌드·최신형**: "2026 최신 트렌드", "요즘 뜨는 ~", "지금 당장 알아야 할 ~"
   ⑧ **비밀·꿀팁형**: "아무도 알려주지 않는 ~ 비법", "전문가만 아는 ~", "이것 하나로 해결"
   ⑨ **타겟 맞춤형**: "초보자도 바로 따라하는 ~", "~를 위한 완벽 가이드", "~라면 꼭 알아야 할"
   ⑩ **효과·결과형**: "~했더니 생긴 놀라운 변화", "~의 실제 효과", "실제로 효과 있는 ~"

[출력 형식 - 반드시 아래 JSON만 출력, 다른 텍스트 금지]
{
  "blogUrl": "${blogUrl}",
  "identity": { "title": "블로그명", "description": "블로그 설명", "latestPostExample": "최근 포스팅 예시" },
  "assessment": { "strengths": ["강점1", "강점2"], "weaknesses": ["약점1", "약점2"] },
  "strategy": {
    "growthDirections": ["방향1", "방향2", "방향3"],
    "suggestedTopics": [
      { "title": "추천 제목1", "reason": "추천 이유1" },
      { "title": "추천 제목2", "reason": "추천 이유2" },
      { "title": "추천 제목3", "reason": "추천 이유3" },
      { "title": "추천 제목4", "reason": "추천 이유4" },
      { "title": "추천 제목5", "reason": "추천 이유5" },
      { "title": "추천 제목6", "reason": "추천 이유6" },
      { "title": "추천 제목7", "reason": "추천 이유7" },
      { "title": "추천 제목8", "reason": "추천 이유8" },
      { "title": "추천 제목9", "reason": "추천 이유9" },
      { "title": "추천 제목10", "reason": "추천 이유10" }
    ]
  }
}
suggestedTopics는 반드시 10개를 정확히 채워야 합니다.
`;

    try {
        const result = await callGeminiForAnalysis(prompt) as BlogAnalysisReport;
        return { ...result, _foundPosts: foundPosts } as any;
    } catch (e) {
        console.error("Naver blog analysis failed:", e);
        const errMsg = e instanceof Error ? e.message : String(e);
        throw new Error(`블로그 분석 실패: ${errMsg}`);
    }
};
