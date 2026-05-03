export type NaverSeoMethod = 'crank' | 'alcon' | 'aeo' | 'homeplate' | 'insightedge';

export const SEO_METHOD_LABELS: Record<NaverSeoMethod, string> = {
    crank:      'C-Rank 기본',
    alcon:      'ALCON 최신 (2025)',
    aeo:        'AEO (AI 브리핑)',
    homeplate:  'Home-Plate (피드)',
    insightedge:'Insight Edge (심층)',
};

export const SEO_METHOD_DESCRIPTIONS: Record<NaverSeoMethod, string> = {
    crank:      '전통적 품질 지표 — 정보 충실도, 구조, 키워드 자연 배치',
    alcon:      '2025 최신 알고리즘 — 주제 일관성, 문서 완성도, 독창성',
    aeo:        'AI 브리핑 노출 최적화 — 질문·답변 구조, FAQ 강화',
    homeplate:  '피드 추천 알고리즘 — 감성 스토리텔링, 공감·공유 유도',
    insightedge:'차별화 심층 분석 — 데이터 기반 전문가 시각',
};

export interface SeoCheck {
    category: string;
    label: string;
    pass: boolean;
    detail: string;
}

export interface SeoReport {
    score: number;
    grade: 'S' | 'A' | 'B' | 'C' | 'F';
    checks: SeoCheck[];
    summary: string;
}

export interface NaviResult {
    html: string;
    title: string;
    keywords: string[];
    imagePrompt: string;
    altText: string;
    subImagePrompts: { prompt: string; altText: string }[];
    seoReport: SeoReport;
    thumbnailTitles: string[];
}

export interface NaviTitleResult {
    titles: string[];
}
