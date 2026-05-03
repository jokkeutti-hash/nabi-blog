import { NaverSeoMethod, NaviResult } from '../types';

// ─── API Key Helpers ───────────────────────────────────────────────────────────

function getOrKey(): string {
    try {
        const b64 = localStorage.getItem('nabi_or_b64');
        if (b64) { const k = atob(b64).trim(); if (k) return k; }
    } catch {}
    return '';
}

function getGeminiKey(): string {
    try {
        const b64 = localStorage.getItem('nabi_gemini_b64');
        if (b64) { const k = atob(b64).trim(); if (k) return k; }
    } catch {}
    return '';
}

function getFalKey(): string {
    try {
        const b64 = localStorage.getItem('nabi_fal_b64');
        if (b64) { const k = atob(b64).trim(); if (k) return k; }
    } catch {}
    return '';
}

// ─── Core AI Caller ───────────────────────────────────────────────────────────

async function callAI(prompt: string, temperature = 0.7): Promise<string> {
    const orKey = getOrKey();
    if (orKey) {
        const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${orKey}`,
                'Content-Type': 'application/json',
                'HTTP-Referer': 'https://nabi-blog.pages.dev',
            },
            body: JSON.stringify({
                model: 'google/gemini-2.0-flash-exp:free',
                messages: [{ role: 'user', content: prompt }],
                temperature,
                max_tokens: 8000,
            }),
        });
        if (res.ok) {
            const data = await res.json();
            const text = data.choices?.[0]?.message?.content?.trim();
            if (text) return text;
        }
    }
    const geminiKey = getGeminiKey();
    if (!geminiKey) throw new Error('API 키가 설정되지 않았습니다. 우측 상단 ⚙️ 설정에서 OpenRouter 또는 Gemini API 키를 입력해주세요.');
    const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${geminiKey}`,
        {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{ parts: [{ text: prompt }] }],
                generationConfig: { temperature, maxOutputTokens: 8000 },
            }),
        }
    );
    if (!res.ok) throw new Error(`Gemini 오류: ${res.status}`);
    const data = await res.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
    if (!text) throw new Error('AI 응답이 비어있습니다.');
    return text;
}

function extractJson(raw: string): any {
    const fence = raw.match(/```(?:json)?\s*([\s\S]*?)```/);
    const str = fence ? fence[1] : raw;
    const start = str.indexOf('{');
    const end = str.lastIndexOf('}');
    if (start === -1 || end === -1) throw new Error('JSON을 찾을 수 없습니다.');
    return JSON.parse(str.slice(start, end + 1));
}

// ─── SEO Method Prompts ───────────────────────────────────────────────────────

function getMethodInstructions(method: NaverSeoMethod): string {
    switch (method) {
        case 'crank': return `
## C-Rank 기본 방식 적용
- 핵심 키워드를 제목·첫 문단·소제목·마지막 문단에 자연스럽게 배치 (총 4~6회)
- 정보 충실도: 독자가 다른 곳을 찾아가지 않아도 될 만큼 완전한 정보
- H2 소제목 4개 이상, 이미지 3개 이상 자리 표시
- 문단당 최대 4문장, 공감·댓글 유도 문구 마지막 포함
- 이미지 ALT 텍스트 키워드 포함 필수`;

        case 'alcon': return `
## ALCON 최신 방식 (2025) 적용
- 글 전체를 하나의 주제로 일관성 있게 작성 (주제 이탈 절대 금지)
- 서론: 문제 제기 → 본론: 해결책 단계별 → 결론: 핵심 요약 명확히
- 구체적 수치·사례 최소 3개 이상 포함 (신뢰도 향상)
- 다른 블로그에 없는 독창적 관점 1개 이상 포함
- 최신 정보 기준으로 작성 (시간 표현은 "최근", "요즘" 등 상대적 표현 사용)`;

        case 'aeo': return `
## AEO (AI 브리핑 노출) 방식 적용
- 글 시작: 핵심 질문 + 30자 이내 명확한 직답으로 시작
- 각 섹션을 "질문 → 답변" 구조로 작성
- 단계별 설명은 반드시 번호 또는 불릿 리스트로 구조화
- 핵심 정의 박스 1개 이상 포함
- FAQ 섹션 필수 (7개 이상, 실제 검색 질문 형태)
- 각 답변은 2~3문장으로 간결하고 직접적으로`;

        case 'homeplate': return `
## Home-Plate (피드 추천) 방식 적용
- 첫 문단: 독자의 감정을 자극하는 강렬한 공감 훅 (나도 그랬어...)
- 스토리텔링 구조: 문제 상황 → 시행착오 → 해결 → 변화
- 문단은 2~3문장으로 짧고 임팩트 있게 (스크롤 유도)
- 감탄사·구어체 자연스럽게 활용 (진짜, 솔직히, 너무 등)
- 이미지 5개 이상 자리 표시 (시각적 풍부함)
- 마지막: 공감/저장 유도 강한 CTA`;

        case 'insightedge': return `
## Insight Edge (차별화 심층) 방식 적용
- 다른 블로그에서 다루지 않는 독창적 분석 관점 제시
- 데이터·통계·연구 결과 3개 이상 인용 (구체적 수치 필수)
- 전문 용어 사용 후 즉시 쉬운 설명 병기
- 비교 분석 섹션 포함 (A vs B, 장단점 표)
- 결론에 독자 행동 유도 (구체적 다음 단계 제시)
- 전문가 시각의 주의사항·함정 섹션 포함`;
    }
}

const HTML_RULES = `
## 네이버 블로그 HTML 규칙 (절대 준수)
- 허용 CSS: color, font-size, font-weight, background-color, border-left, border, padding, margin, text-align, border-radius, line-height, width
- 절대 금지: linear-gradient, <script>, flex, grid, transform, transition, display:flex, display:grid
- 이미지 자리: <!-- 이미지N --> 주석으로 표시 (실제 <img> 태그 없음)
- HTML 속성값은 반드시 작은따옴표(') 사용
- 번호 목록 금지 → 불릿(●, ✓, →)만 사용`;

const JSON_STRUCTURE = `{
  "title": "SEO 최적화된 제목",
  "html": "<div>...</div>",
  "keywords": ["핵심키워드", "연관키워드1", "연관키워드2", "연관키워드3", "연관키워드4"],
  "imagePrompt": "Detailed English prompt for REAL everyday scene — no fantasy/sci-fi/holographic, real Korean lifestyle, DSLR photorealistic, natural candid, no text",
  "altText": "대표 이미지 한국어 ALT 텍스트",
  "subImagePrompts": [
    {"prompt": "English image prompt", "altText": "한국어 ALT 텍스트"},
    {"prompt": "English image prompt", "altText": "한국어 ALT 텍스트"},
    {"prompt": "English image prompt", "altText": "한국어 ALT 텍스트"}
  ],
  "thumbnailTitles": ["썸네일 제목 1 (15자 이내)", "썸네일 제목 2 (15자 이내)"],
  "seoReport": {
    "score": 85,
    "grade": "A",
    "checks": [
      {"category": "키워드", "label": "핵심 키워드 H1 포함", "pass": true, "detail": "설명"},
      {"category": "키워드", "label": "키워드 밀도 (2~5%)", "pass": true, "detail": "설명"},
      {"category": "구조", "label": "소제목(H2) 3개 이상", "pass": true, "detail": "설명"},
      {"category": "구조", "label": "이미지 3개 이상", "pass": true, "detail": "설명"},
      {"category": "분량", "label": "적정 글자 수 (2,500자 이상)", "pass": true, "detail": "설명"},
      {"category": "가독성", "label": "문단 길이 (4문장 이하)", "pass": true, "detail": "설명"},
      {"category": "AEO", "label": "FAQ 또는 Q&A 포함", "pass": true, "detail": "설명"}
    ],
    "summary": "한 줄 총평"
  }
}`;

// ─── Generate Naver Post ───────────────────────────────────────────────────────

export interface WriteOptions {
    topic: string;
    mainKeyword?: string;
    subKeywords?: string;
    method: NaverSeoMethod;
    humanize?: boolean;
    imageCount?: number;
    includeFaq?: boolean;
}

const HUMANIZE_INSTRUCTIONS = `
## 인간화 페르소나 적용 (AI 탐지 우회)
- AI 특유의 정형성을 파괴하고 덕후형 블로거의 말투를 재현합니다
- 패턴 흔들기: 상투적 클리셰("궁금하지 않으신가요?", "어떻게 생각하시나요?") 완전 제거
- 불균형한 문장 리듬(Burstiness) — 짧은 문장과 긴 문장을 의도적으로 혼합
- 1인칭 경험담 삽입("제가 직접 해봤는데...", "솔직히 말하면...")
- 구어체 질감 강화 — 자연스러운 입말체 표현 사용
- 섹션 길이 및 소제목 형식의 무작위성 부여`;

export async function generateNaverPost(opts: WriteOptions): Promise<NaviResult> {
    const imgCount = opts.imageCount ?? 3;
    const methodInstructions = getMethodInstructions(opts.method);

    const prompt = `당신은 네이버 블로그 SEO 전문 작가입니다.
아래 주제로 네이버 블로그 최적화 포스트를 작성하세요.

[주제] ${opts.topic}
${opts.mainKeyword ? `[메인 키워드] ${opts.mainKeyword}` : ''}
${opts.subKeywords ? `[서브 키워드] ${opts.subKeywords}` : ''}
${opts.humanize ? HUMANIZE_INSTRUCTIONS : ''}

${methodInstructions}

## 포스트 구성
- 분량: 3,000~5,000자 (네이버 최적)
- H1 제목 1개 (핵심 키워드 포함):
  <h1 style='font-size:24px; font-weight:800; color:#1a1a1a; line-height:1.6; margin:0 0 20px; word-break:keep-all;'>제목</h1>
- 메타 설명 박스 (80자 이내):
  <div style='background-color:#f0f9ff; border-left:4px solid #0ea5e9; padding:14px 18px; margin:16px 0 24px; border-radius:0 6px 6px 0;'><p style='color:#1a1a1a; font-size:14px; line-height:1.8; margin:0;'>요약</p></div>
- <!-- 이미지1 --> (대표 이미지 자리)
- H2 소제목 4개 이상:
  <h2 style='font-size:18px; font-weight:700; color:white; background-color:#0ea5e9; padding:10px 16px; border-radius:6px; margin:28px 0 14px;'>소제목</h2>
- 본문 문단 (최대 4문장):
  <p style='color:#374151; font-size:15px; line-height:1.9; margin:0 0 14px;'>내용</p>
- 불릿 리스트:
  <ul style='list-style:none; padding:0; margin:10px 0 18px;'><li style='padding:5px 0; color:#374151; line-height:1.75; font-size:14px;'><span style='color:#0ea5e9; font-weight:700; margin-right:8px;'>●</span>내용</li></ul>
- 강조 박스:
  <div style='background-color:#fefce8; border-left:4px solid #eab308; padding:12px 16px; margin:16px 0; border-radius:0 6px 6px 0;'><p style='color:#1a1a1a; margin:0; line-height:1.8; font-size:14px;'><strong>💡 포인트:</strong> 내용</p></div>
- 서브 이미지 ${imgCount}개: <!-- 이미지2 --> ... <!-- 이미지${imgCount + 1} -->
${opts.includeFaq !== false ? `- FAQ 섹션:
  <h2 style='font-size:18px; font-weight:700; color:white; background-color:#0ea5e9; padding:10px 16px; border-radius:6px; margin:28px 0 14px;'>❓ 자주 묻는 질문</h2>
  <div style='margin:10px 0; border:1px solid #e2e8f0; border-radius:6px; overflow:hidden;'><div style='padding:10px 14px; font-weight:700; font-size:13px; color:white; background-color:#0ea5e9;'>Q. 질문</div><div style='padding:12px 14px; color:#374151; line-height:1.8; font-size:14px;'>A. 답변</div></div>` : ''}
- 마무리 공감 유도 문구

${HTML_RULES}

## 출력 — 반드시 아래 JSON만 반환 (다른 텍스트 없음)
\`\`\`json
${JSON_STRUCTURE}
\`\`\``;

    const raw = await callAI(prompt, 0.72);
    const parsed = extractJson(raw);
    return {
        html: parsed.html || '',
        title: parsed.title || '',
        keywords: parsed.keywords || [],
        imagePrompt: parsed.imagePrompt || '',
        altText: parsed.altText || '',
        subImagePrompts: parsed.subImagePrompts || [],
        seoReport: parsed.seoReport || { score: 0, grade: 'F', checks: [], summary: '' },
        thumbnailTitles: parsed.thumbnailTitles || [],
    };
}

// ─── Generate Titles ───────────────────────────────────────────────────────────

export interface TitleOptions {
    category: string;
    subCategory: string;
    method: NaverSeoMethod;
    keyword?: string;
}

export async function generateNaverTitles(opts: TitleOptions): Promise<string[]> {
    const prompt = `당신은 네이버 블로그 SEO 제목 전문가입니다.
아래 조건으로 클릭률 높은 제목 10개를 만들어주세요.

[카테고리] ${opts.category} > ${opts.subCategory}
${opts.keyword ? `[키워드] ${opts.keyword}` : ''}
[SEO 방식] ${opts.method === 'crank' ? 'C-Rank — 정보성 키워드 중심' :
             opts.method === 'alcon' ? 'ALCON — 완성도·독창성 강조' :
             opts.method === 'aeo' ? 'AEO — 질문형, 직접 답변 예고' :
             opts.method === 'homeplate' ? 'Home-Plate — 감성·공감·스토리' :
             'Insight Edge — 전문가 시각, 데이터 강조'}

## 제목 패턴 (각 2개씩)
1. 숫자형: "○가지 ~하는 법"
2. 문제해결형: "~때문에 고민이라면"
3. 이득강조형: "모르면 손해인 ~"
4. 궁금증형: "~하면 어떻게 될까?"
5. 경험담형: "직접 써봤더니 ~"

## 제목 규칙
- 25~35자 사이
- 핵심 키워드 반드시 포함
- 날짜·연도 금지
- 클릭을 유도하는 감정 자극

반드시 아래 JSON만 반환:
\`\`\`json
{"titles": ["제목1", "제목2", "제목3", "제목4", "제목5", "제목6", "제목7", "제목8", "제목9", "제목10"]}
\`\`\``;

    const raw = await callAI(prompt, 0.8);
    const parsed = extractJson(raw);
    return parsed.titles || [];
}

// ─── Optimize Existing Post ────────────────────────────────────────────────────

export async function optimizeNaverPost(content: string, method: NaverSeoMethod): Promise<NaviResult> {
    const methodInstructions = getMethodInstructions(method);

    const prompt = `당신은 네이버 블로그 SEO 최적화 전문가입니다.
아래 기존 글을 분석하고 완전히 최적화된 버전으로 재작성하세요.

[기존 글]
${content.slice(0, 4000)}

${methodInstructions}

## 최적화 작업
1. 제목 → SEO 최적화 재작성
2. 키워드 밀도 조정 (2~5%)
3. 문단 구조 개선 (최대 4문장)
4. 소제목 추가/개선 (H2 4개 이상)
5. 이미지 자리 표시 추가
6. FAQ 섹션 추가 또는 강화
7. 마무리 공감 유도 문구

${HTML_RULES}

## 출력 — 반드시 아래 JSON만 반환
\`\`\`json
${JSON_STRUCTURE}
\`\`\``;

    const raw = await callAI(prompt, 0.65);
    const parsed = extractJson(raw);
    return {
        html: parsed.html || '',
        title: parsed.title || '',
        keywords: parsed.keywords || [],
        imagePrompt: parsed.imagePrompt || '',
        altText: parsed.altText || '',
        subImagePrompts: parsed.subImagePrompts || [],
        seoReport: parsed.seoReport || { score: 0, grade: 'F', checks: [], summary: '' },
        thumbnailTitles: parsed.thumbnailTitles || [],
    };
}

// ─── Generate Persona ──────────────────────────────────────────────────────────

export async function generatePersona(topic: string): Promise<string> {
    const prompt = `네이버 블로그 주제 "${topic}"에 맞는 글쓴이 페르소나를 한 문장으로 만들어주세요.
예시: "30대 직장맘, 육아와 살림을 병행하며 실용적인 정보를 찾는 독자층 타겟"
예시: "건강에 관심 많은 40대, 자연치유와 건강식품을 즐겨 찾는 독자층 타겟"
반드시 JSON으로만 반환: {"persona": "페르소나 설명"}`;

    const raw = await callAI(prompt, 0.85);
    try {
        const parsed = extractJson(raw);
        return parsed.persona || '';
    } catch {
        return '';
    }
}

// ─── Image Generation ─────────────────────────────────────────────────────────

export async function generateImage(
    prompt: string,
    aspectRatio: '1:1' | '16:9' = '1:1',
): Promise<string> {
    const falKey = getFalKey();

    if (falKey) {
        try {
            const submitRes = await fetch('https://queue.fal.run/fal-ai/flux/schnell', {
                method: 'POST',
                headers: { 'Authorization': `Key ${falKey}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    prompt: `${prompt}, photorealistic, high quality`,
                    image_size: aspectRatio === '16:9' ? 'landscape_16_9' : 'square_hd',
                    num_inference_steps: 4,
                    num_images: 1,
                }),
            });
            if (submitRes.ok) {
                const submitData = await submitRes.json();
                const requestId = submitData.request_id;
                if (requestId) {
                    for (let i = 0; i < 30; i++) {
                        await new Promise(r => setTimeout(r, 1500));
                        const statusRes = await fetch(`https://queue.fal.run/fal-ai/flux/schnell/requests/${requestId}`, {
                            headers: { 'Authorization': `Key ${falKey}` },
                        });
                        if (statusRes.ok) {
                            const statusData = await statusRes.json();
                            if (statusData.status === 'COMPLETED' && statusData.output?.images?.[0]?.url) {
                                const imgRes = await fetch(statusData.output.images[0].url);
                                const blob = await imgRes.blob();
                                return await new Promise((resolve, reject) => {
                                    const reader = new FileReader();
                                    reader.onload = () => resolve(reader.result as string);
                                    reader.onerror = reject;
                                    reader.readAsDataURL(blob);
                                });
                            }
                            if (statusData.status === 'FAILED') break;
                        }
                    }
                }
            }
        } catch {}
    }

    // Pollinations fallback (무료)
    try {
        const w = aspectRatio === '16:9' ? 1200 : 800;
        const h = aspectRatio === '16:9' ? 675 : 800;
        const encoded = encodeURIComponent(prompt.slice(0, 200));
        const url = `https://image.pollinations.ai/prompt/${encoded}?width=${w}&height=${h}&nologo=true&enhance=true`;
        const res = await fetch(url);
        if (res.ok) {
            const blob = await res.blob();
            return await new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = () => resolve(reader.result as string);
                reader.onerror = reject;
                reader.readAsDataURL(blob);
            });
        }
    } catch {}

    throw new Error('이미지 생성 실패');
}

// ─── Analyze Existing Post ─────────────────────────────────────────────────────

export async function analyzePost(content: string): Promise<{ title: string; mainKeyword: string; subKeywords: string }> {
    const prompt = `다음 블로그 글을 분석하여 SEO 최적화 제목과 키워드를 추출하세요.

[글 내용]
${content.slice(0, 3000)}

반드시 아래 JSON만 반환:
\`\`\`json
{"title": "SEO 최적화 제목", "mainKeyword": "핵심 키워드 1개", "subKeywords": "서브키워드1, 서브키워드2, 서브키워드3"}
\`\`\``;

    const raw = await callAI(prompt, 0.3);
    try {
        const parsed = extractJson(raw);
        return {
            title: parsed.title || '',
            mainKeyword: parsed.mainKeyword || '',
            subKeywords: parsed.subKeywords || '',
        };
    } catch {
        return { title: '', mainKeyword: '', subKeywords: '' };
    }
}
