export type NaverSeoMethod = 'crank' | 'alcon' | 'aeo' | 'homeplate' | 'insightedge';

export const SEO_METHOD_LABELS: Record<NaverSeoMethod, string> = {
    crank:      '기존 방식 (C-Rank/D.I.A.+)',
    alcon:      '최신 방식 (RCON)',
    aeo:        'AI 브리핑 (AEO)',
    homeplate:  '네이버 홈판 (Home-Plate)',
    insightedge:'인사이트 엣지',
};

export const SEO_METHOD_DESCRIPTIONS: Record<NaverSeoMethod, string> = {
    crank:      '2025-2026 검색 환경 대응 (C-Rank/D.I.A.+): 키워드 반복보다 "진정성"과 "전문성"을 최우선으로 합니다. 직접 경험한 후기, 저자 정보 명시, 신뢰할 수 있는 출처 인용을 통해 네이버의 최신 알고리즘 점수를 극대화합니다.',
    alcon:      '2025-2026 최신 방식 (RCON): 사용자의 다중 인텐트(Intent)를 파악하여 세부 관심사별로 내용을 분할 서술합니다. 체류 시간과 스크롤 깊이를 극대화합니다.',
    aeo:        '2025-2026 AI 브리핑 (AEO/Cue:): 네이버의 생성형 AI 검색 서비스인 Cue:의 답변 소스로 채택되기 위한 전략입니다. AI가 파싱하기 좋은 정형화된 지식 구조를 갖춥니다.',
    homeplate:  '2025-2026 네이버 홈판 (Home-plate): 검색이 아닌 알고리즘 추천 피드 노출을 목표로 합니다. 사람의 심리를 자극하는 후킹과 스토리텔링이 핵심입니다.',
    insightedge:'인사이트 엣지: 단순 유행이 아닌 결핍(Pain Point)과 마이크로 니치(Micro-Niche)를 파고들어 독보적인 가치를 창출합니다.',
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
