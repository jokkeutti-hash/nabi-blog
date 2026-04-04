import { GoogleGenAI, Type, Modality, HarmCategory, HarmBlockThreshold } from "@google/genai";
import { ColorTheme, GeneratedContent, SupplementaryInfo, InternalLink } from '../types';

function getApiKey(): string {
  // 1. .env.local의 GEMINI_API_KEY 확인 (빌드 시 주입)
  const envKey = (process.env.API_KEY || process.env.GEMINI_API_KEY || '').trim();
  if (envKey) return envKey;

  // 2. 설정 모달에서 저장한 키 확인
  try {
    const stored = localStorage.getItem('geminiApiKey_b64');
    if (stored) {
      const decoded = atob(stored).trim();
      if (decoded) return decoded;
    }
  } catch {}
  throw new Error("Gemini API 키가 설정되지 않았습니다. 우측 상단 ⚙️ 설정에서 Gemini API 키를 입력해주세요.");
}

const getAi = () => new GoogleGenAI({ apiKey: getApiKey() });

// This helper function finds the end of a JSON object/array by balancing braces/brackets.
function findJsonEnd(str: string): number {
    let stack: ('{' | '[')[] = [];
    let inString = false;
    let isEscaped = false;

    if (str.length === 0 || (str[0] !== '{' && str[0] !== '[')) return -1;

    for (let i = 0; i < str.length; i++) {
        const char = str[i];

        if (isEscaped) {
            isEscaped = false;
            continue;
        }

        if (char === '\\') {
            isEscaped = true;
            continue;
        }

        if (char === '"') {
            inString = !inString;
        }

        if (!inString) {
            if (char === '{' || char === '[') {
                stack.push(char);
            } else if (char === '}') {
                if (stack.length === 0 || stack[stack.length - 1] !== '{') return -1; // Mismatched
                stack.pop();
            } else if (char === ']') {
                if (stack.length === 0 || stack[stack.length - 1] !== '[') return -1; // Mismatched
                stack.pop();
            }
        }

        if (stack.length === 0) {
            return i + 1;
        }
    }
    return -1;
}

// Helper to close truncated JSON strings
function closeJson(str: string): string {
    let stack: ('{' | '[')[] = [];
    let inString = false;
    let isEscaped = false;
    
    for (let i = 0; i < str.length; i++) {
        const char = str[i];
        
        if (isEscaped) {
            isEscaped = false;
            continue;
        }
        if (char === '\\') {
            isEscaped = true;
            continue;
        }
        if (char === '"') {
            inString = !inString;
        }
        
        if (!inString) {
            if (char === '{') stack.push('{');
            else if (char === '[') stack.push('[');
            else if (char === '}') {
                if (stack.length > 0 && stack[stack.length - 1] === '{') stack.pop();
            }
            else if (char === ']') {
                if (stack.length > 0 && stack[stack.length - 1] === '[') stack.pop();
            }
        }
    }
    
    // If string was left open, close it first
    let closer = '';
    if (inString) {
        closer += '"';
    }
    
    // Close remaining brackets in reverse order
    while (stack.length > 0) {
        const last = stack.pop();
        if (last === '{') closer += '}';
        else if (last === '[') closer += ']';
    }
    
    return str + closer;
}

// Helper to fix common issues like newlines/tabs inside strings which break JSON.parse
function fastFixJson(jsonStr: string): string {
    let inString = false;
    let isEscaped = false;
    let output = '';
    
    for (let i = 0; i < jsonStr.length; i++) {
        const char = jsonStr[i];
        
        if (inString) {
            if (isEscaped) {
                isEscaped = false;
                output += char;
            } else if (char === '\\') {
                isEscaped = true;
                output += char;
            } else if (char === '"') {
                inString = false;
                output += char;
            } else if (char === '\n') {
                output += '\\n'; // Escape newline inside string
            } else if (char === '\r') {
                // skip CR inside string
            } else if (char === '\t') {
                output += '\\t'; // Escape tab inside string
            } else {
                output += char;
            }
        } else {
            if (char === '"') {
                inString = true;
            }
            output += char;
        }
    }
    return output;
}

function fixLdJsonTags(jsonStr: string): string {
    // Attempt to fix a common error where the AI fails to escape quotes inside the JSON-LD script tag.
    if (jsonStr.includes('application/ld+json')) {
         return jsonStr.replace(
            // Use a more robust regex to find the script tag
            /(<script[^>]*type=\\?["']application\/ld\+json\\?["'][^>]*>)([\s\S]*?)(<\/script>)/gi,
            (match, openTag, scriptContent, closeTag) => {
                let fixedContent = scriptContent;
                // 1. Fix Quotes: Normalize to escaped quotes.
                fixedContent = fixedContent.replace(/\\"/g, '"').replace(/"/g, '\\"');
                // 2. Fix Newlines
                fixedContent = fixedContent.replace(/\n/g, '\\n').replace(/\r/g, '');
                return openTag + fixedContent + closeTag;
            }
        );
    }
    return jsonStr;
}

function extractJsonFromText(text: string | undefined | null): any {
    if (!text || !text.trim()) {
        throw new Error('AI 응답이 비어있습니다. (Empty Response)');
    }
    
    let rawString = text.trim();

    // 1. Find the content within the JSON markdown block.
    const markdownMatch = rawString.match(/```(?:json)?\s*([\s\S]*?)\s*```/s);
    let content = markdownMatch && markdownMatch[1] ? markdownMatch[1].trim() : rawString;

    // 2. Find the start of the actual JSON object/array.
    const firstBrace = content.indexOf('{');
    const firstBracket = content.indexOf('[');
    let startIndex = -1;

    if (firstBrace === -1 && firstBracket === -1) {
        throw new Error('AI 응답에서 유효한 JSON을 찾을 수 없습니다.');
    }
    
    if (firstBrace !== -1 && (firstBracket === -1 || firstBrace < firstBracket)) {
        startIndex = firstBrace;
    } else {
        startIndex = firstBracket;
    }
    
    let jsonCandidate = content.substring(startIndex);

    // 3. Find the end by balancing braces/brackets.
    const endIndex = findJsonEnd(jsonCandidate);
    let finalCandidate = jsonCandidate;

    if (endIndex !== -1) {
        finalCandidate = jsonCandidate.substring(0, endIndex);
    } else {
        // If findJsonEnd returns -1, it means the JSON is likely truncated or malformed.
        // We take the whole candidate and try to close it automatically.
        finalCandidate = closeJson(jsonCandidate);
    }

    // Fix common AI typo in CSS rgba values and trailing commas
    finalCandidate = finalCandidate
        .replace(/rgba\{/g, 'rgba(')
        .replace(/,\s*([}\]])/g, '$1');

    // 4. Try parsing strategies
    // Strategy A: Direct Parse
    try {
        return JSON.parse(finalCandidate);
    } catch (e) {
        // Strategy B: Fast Fix (escapes newlines/tabs in strings)
        try {
            const fixed = fastFixJson(finalCandidate);
            return JSON.parse(fixed);
        } catch (e2) {
            // Strategy C: LD+JSON Fix then Fast Fix
            try {
                const ldFixed = fixLdJsonTags(finalCandidate);
                const fixed = fastFixJson(ldFixed);
                return JSON.parse(fixed);
            } catch (e3) {
                // Strategy D: Aggressive cleanup
                try {
                     const sanitized = fastFixJson(finalCandidate)
                        .replace(/[\u201C\u201D]/g, '"') // Smart quotes
                        .replace(/[\u0000-\u001F]+/g, ""); // Control chars
                     return JSON.parse(sanitized);
                } catch (finalError) {
                     console.error("JSON 파싱 최종 실패. 원본:", text);
                     console.error("최종 시도 문자열:", finalCandidate);
                     if (finalError instanceof Error) {
                        // Fix: Corrected 'error.message' to 'finalError.message'
                        throw new Error(`AI가 반환한 데이터의 형식이 잘못되었습니다. 오류: ${finalError.message}`);
                    }
                    throw new Error('AI가 반환한 데이터의 형식이 잘못되었습니다.');
                }
            }
        }
    }
}

const responseSchema = {
    type: Type.OBJECT,
    properties: {
        blogPostHtml: {
            type: Type.STRING,
        },
        supplementaryInfo: {
            type: Type.OBJECT,
            properties: {
                keywords: {
                    type: Type.ARRAY,
                    items: { type: Type.STRING },
                },
                blogspotLabels: {
                    type: Type.ARRAY,
                    items: { type: Type.STRING },
                },
                metaDescription: {
                    type: Type.STRING,
                },
                imagePrompt: {
                    type: Type.STRING,
                },
                altText: {
                    type: Type.STRING,
                },
                seoTitles: {
                    type: Type.ARRAY,
                    items: { type: Type.STRING },
                },
                thumbnailTitles: {
                    type: Type.ARRAY,
                    items: { type: Type.STRING },
                },
                subImagePrompts: {
                    type: Type.ARRAY,
                    items: {
                        type: Type.OBJECT,
                        properties: {
                            prompt: {
                                type: Type.STRING,
                            },
                            altText: {
                                type: Type.STRING,
                            }
                        },
                        required: ["prompt", "altText"]
                    },
                },
                slug: {
                    type: Type.STRING,
                }
            },
            required: ["keywords", "blogspotLabels", "metaDescription", "imagePrompt", "altText", "seoTitles", "thumbnailTitles", "subImagePrompts", "slug"]
        },
        socialMediaPosts: {
            type: Type.OBJECT,
            properties: {
                threads: {
                    type: Type.STRING,
                },
                instagram: {
                    type: Type.STRING,
                },
                facebook: {
                    type: Type.STRING,
                },
                x: {
                    type: Type.STRING,
                }
            },
            required: ["threads", "instagram", "facebook", "x"]
        }
    },
    required: ["blogPostHtml", "supplementaryInfo", "socialMediaPosts"]
};

const jsonStructureForPrompt = `{
    "blogPostHtml": "<div style='...'>...</div>",
    "supplementaryInfo": {
        "keywords": ["핵심키워드1", "핵심키워드2", "핵심키워드3", "연관키워드1", "연관키워드2"],
        "blogspotLabels": ["대분류", "핵심주제", "연관주제"],
        "metaDescription": "A compelling summary of the post without any dates or years.",
        "imagePrompt": "A detailed English prompt for a purely visual image — NO text, NO letters, NO watermark — emphasizing realistic Korean aesthetics, Korean lifestyle, K-aesthetic photography, cinematic composition...",
        "altText": "대표 이미지를 설명하는 한국어 ALT 텍스트 (반드시 한국어로 작성)",
        "seoTitles": ["숫자+키워드 제목 (예: 5가지 ~하는 법)", "문제해결형 제목 (예: ~때문에 고민이라면)", "이득강조형 제목 (예: 모르면 손해인 ~)", "궁금증형 제목 (예: ~하면 어떻게 될까)"],
        "thumbnailTitles": ["썸네일 제목 1", "썸네일 제목 2"],
        "subImagePrompts": [
            { "prompt": "A detailed English prompt describing the specific scene for this H2 section — NO text, NO letters, NO watermark — specific subject, background, mood, color palette, and composition related to the section topic, authentic South Korean lifestyle aesthetic, cinematic lighting, high-fidelity K-aesthetic photography, sharp detail, 8k resolution, purely visual image only", "altText": "해당 섹션 이미지를 설명하는 한국어 ALT 텍스트 (반드시 한국어로 작성)" }
        ],
        "slug": "english-url-slug-example"
    },
    "socialMediaPosts": {
        "threads": "Engaging post for Threads...",
        "instagram": "Visually focused caption for Instagram...",
        "facebook": "Summary post for Facebook...",
        "x": "Concise post for X (Twitter)..."
    }
}`;

interface AdDetails {
    style: 'card' | 'banner' | 'text';
    product: { name: string; description: string; link: string; image?: string; };
    disclosure: string | null;
    hookMessage: string | null;
}

const getToneInstruction = (tone: string) => {
  switch (tone) {
    case 'friendly': return "친근하고 공감하는 대화체, 이모지 적절히 사용";
    case 'professional': return "전문적이고 분석적인 어조, 객관적 데이터 중심";
    case 'humorous': return "유머러스하고 재치있는 표현, 가벼운 분위기";
    case 'formal': return "차분하고 격식있는 문체, 정중한 표현";
    case 'enthusiastic': return "열정적이고 동기부여를 주는 파이팅 넘치는 어조";
    case 'tistory': return "티스토리 블로그 특유의 친근한 '형/언니' 스타일 (해요체). 독자에게 말을 걸듯이 다정하고 경험을 나누는 듯한 구어체 사용. 딱딱한 설명보다는 '이건 이렇게 하는 게 좋아!', '저도 처음엔 몰랐는데~' 같은 공감 가는 화법과 이모지를 적극 사용하여 가독성을 높일 것.";
    default: return "일반적인 블로그 톤";
  }
};

const getTargetInstruction = (target: string) => {
  switch (target) {
    case 'beginner': return "해당 주제에 대해 잘 모르는 초보자나 입문자 (쉬운 용어 사용)";
    case 'expert': return "해당 주제에 지식이 있는 전문가나 실무자 (전문 용어 사용, 깊이 있는 내용)";
    case 'student': return "학업과 취업에 관심이 많은 학생이나 취준생";
    case 'parent': return "가정과 육아, 교육에 관심이 많은 주부나 학부모";
    case 'single': return "효율성과 가성비를 중시하는 1인 가구";
    case 'senior': return "건강과 은퇴 생활, 여가에 관심이 많은 시니어 계층 (이해하기 쉬운 표현, 정중한 어조)";
    default: return "일반 대중";
  }
};

const PLATFORM_CONFIG: Record<string, { total: string; body: string; perSection: string; faqCount: string; note: string }> = {
    tistory:   { total: '8,000~10,000자', body: '5,500~6,500자', perSection: '500~700자',   faqCount: '3~5개', note: '구글 SEO 최적화 (티스토리)' },
    blogspot:  { total: '8,000~10,000자', body: '5,500~6,500자', perSection: '500~700자',   faqCount: '3~5개', note: '구글 SEO 최적화 (블로그스팟)' },
    wordpress: { total: '8,000~12,000자', body: '6,000~7,500자', perSection: '600~900자',   faqCount: '3~5개', note: '구글 SEO 최적화 (워드프레스)' },
    naver:     { total: '3,000~5,000자',  body: '2,000~3,000자', perSection: '300~450자',   faqCount: '3~4개', note: '네이버 검색 알고리즘 최적화' },
    brunch:    { total: '4,000~6,000자',  body: '2,800~4,000자', perSection: '400~550자',   faqCount: '3~4개', note: '브런치 독자 가독성 최적화' },
    auto:      { total: '주제 복잡도에 따라 AI 자동 결정 (단순: 4,000~6,000자 / 일반: 6,000~9,000자 / 심층: 9,000~12,000자)', body: '주제 복잡도에 따라 AI 자동 결정', perSection: '주제 복잡도에 따라 AI 자동 결정', faqCount: '3~5개', note: 'AI가 주제 특성·복잡도에 따라 최적 분량 자동 결정' },
};

const getPrompt = (
    topic: string,
    theme: ColorTheme,
    interactiveElementIdea: string | null,
    rawContent: string | null,
    tone: string,
    targetAudience: string,
    additionalRequest: string | null,
    currentDate: string,
    internalLinks: InternalLink[],
    externalSourceOption: 'auto' | 'manual' | 'none',
    externalLinks: string,
    adDetails: AdDetails | null,
    generateCta: boolean,
    language: string,
    blogPlatform: string = 'tistory'
): string => {
  const pc = PLATFORM_CONFIG[blogPlatform] ?? PLATFORM_CONFIG['tistory'];
  const themeColors = JSON.stringify(theme.colors);
  const hasInternalLinks = internalLinks && internalLinks.length > 0 && internalLinks.some(l => l.url && l.url.trim());
  
  let languageInstructions = '';
  if (language !== 'ko') {
    languageInstructions = `
    ### **중요**: 언어 설정
    - **반드시** 이 블로그 포스트의 모든 내용(본문, 제목, 메타 설명, 소셜 미디어 포스트 등)을 **${language} (Target Language)**로 작성해야 합니다.
    - 한국어나 다른 언어를 사용하지 마세요.
    `;
  } else {
      languageInstructions = `
      ### **중요**: 언어 설정
      - **반드시** 한국어로 작성해주세요.
      `;
  }

  let interactiveElementInstructions = '';
  if (interactiveElementIdea) {
    interactiveElementInstructions = `
    ### **중요**: 인터랙티브 요소 포함
    - **반드시** 포스트 본문 내에 아래 아이디어를 기반으로 한 인터랙티브 요소를 포함시켜 주세요.
    - **요소 아이디어**: "${interactiveElementIdea}"
    - **구현 요건**:
      - 순수 HTML, 인라인 CSS, 그리고 \`<script>\` 태그만을 사용하여 구현해야 합니다. 외부 라이브러리(jQuery 등)는 사용하지 마세요.
      - 이 요소는 완벽하게 작동해야 합니다. 사용자가 값을 입력하거나 옵션을 선택하고 버튼을 누르면, 결과가 명확하게 표시되어야 합니다.
      - 요소의 UI(입력 필드, 버튼, 결과 표시 영역 등)는 제공된 \`${theme.name}\` 컬러 테마에 맞춰 디자인해주세요. 특히 버튼에는 \`background-color: ${theme.colors.primary}; color: white; border: none; padding: 10px 15px; border-radius: 5px; cursor: pointer;\` 스타일과, 호버 시 \`background-color: ${theme.colors.primaryDark}\`를 적용하여 일관성을 유지해주세요.
      - 요소 전체를 감싸는 \`<div>\`에 \`background-color: ${theme.colors.highlightBg}; padding: 20px; border-radius: 8px; margin: 25px 0;\` 스타일을 적용하여 시각적으로 구분되게 만들어주세요.
      - 모든 텍스트의 색상은 ${theme.colors.text} 를 사용해주세요.
      - **JSON 호환성**: 스크립트 코드 내에 사용되는 모든 큰따옴표(")는 반드시 백슬래시(\\)로 이스케이프 처리하여 (\\") 유효한 JSON을 보장해야 합니다. 예: \`element.innerHTML = \\"<p>결과입니다</p>\\";\`
      - **가장 중요**: 생성된 인터랙티브 요소의 HTML 코드 시작 부분에 **빈 줄을 추가한 후** \`<!-- Interactive Element Start -->\` 주석을, 그리고 끝 부분에는 \`<!-- Interactive Element End -->\` 주석 **다음에 빈 줄을 추가**하여 코드 블록을 명확하게 구분해주세요.
    `;
  }

  let adInstructions = '';
  if (adDetails) {
    const { style, product, disclosure, hookMessage } = adDetails;
    const disclosureHtml = disclosure ? `<p style='font-size: 10px; color: #888; text-align: center; margin-top: 8px;'>${disclosure}</p>` : '';
    
    const safeName = product.name.replace(/"/g, '&quot;');
    const safeDesc = product.description.replace(/"/g, '&quot;');
    const safeLink = product.link.replace(/"/g, '&quot;');
    const safeImage = product.image ? product.image.replace(/"/g, '&quot;') : '';
    const safeHook = hookMessage ? hookMessage.replace(/"/g, '&quot;') : (style === 'text' ? '지금 확인하기' : '상품 보러가기');

    const imageHtml = safeImage
      ? `<img src='${safeImage}' alt='${safeName}' style='width: 100%; height: 100%; object-fit: contain; border-radius: 8px;'>`
      : '상품 이미지';

    let adHtml = '';
    switch (style) {
        case 'card':
            adHtml = `
              <div style='border: 1px solid #e0e0e0; border-radius: 12px; padding: 16px; max-width: 300px; margin: 20px auto; font-family: "Noto Sans KR", sans-serif; box-shadow: 0 4px 12px rgba(0,0,0,0.08); background-color: #ffffff; text-align: center;'>
                <div style='width:100%; height: 300px; background: #f0f2f5; border-radius: 8px; margin-bottom: 12px; display: flex; align-items: center; justify-content: center; color: #a0a0a0; overflow: hidden;'>${imageHtml}</div>
                <h3 style='font-size: 16px; font-weight: 700; margin: 0 0 8px 0; color: #333; word-break: keep-all;'>${safeName}</h3>
                <p style='font-size: 13px; color: #666; margin: 0 0 16px 0; line-height: 1.4;'>${safeDesc}</p>
                <a href='${safeLink}' target='_blank' rel='noopener noreferrer sponsored' style='display: block; width: 100%; background-color: ${theme.colors.primary}; color: white; text-align: center; padding: 10px 0; border-radius: 8px; text-decoration: none; font-weight: bold; font-size: 15px; transition: background-color 0.2s;' onmouseover='this.style.backgroundColor="${theme.colors.primaryDark}"' onmouseout='this.style.backgroundColor="${theme.colors.primary}"'>
                  ${safeHook}
                </a>
                ${disclosureHtml}
              </div>
            `;
            break;
        case 'banner':
            adHtml = `
              <div style='border: 1px solid #e0e0e0; border-radius: 12px; padding: 16px; margin: 20px 0; font-family: "Noto Sans KR", sans-serif; box-shadow: 0 2px 8px rgba(0,0,0,0.05); background-color: #f8f9fa;'>
                <a href='${safeLink}' target='_blank' rel='noopener noreferrer sponsored' style='display: flex; align-items: center; gap: 16px; text-decoration: none;'>
                    <div style='width: 150px; height: 150px; background: #e9ecef; border-radius: 8px; flex-shrink: 0; display: flex; align-items: center; justify-content: center; color: #a0a0a0; font-size: 10px; overflow: hidden;'>${imageHtml}</div>
                    <div style='flex: 1;'>
                        <h3 style='font-size: 15px; font-weight: 700; margin: 0 0 4px 0; color: #333;'>${safeName}</h3>
                        <p style='font-size: 13px; color: #666; margin: 0;'>${safeDesc}</p>
                    </div>
                    <div style='background-color: ${theme.colors.primary}; color: white; padding: 8px 16px; border-radius: 20px; font-weight: bold; font-size: 14px; white-space: nowrap;'>
                      ${safeHook}
                    </div>
                </a>
                ${disclosureHtml}
              </div>
            `;
            break;
        case 'text':
            adHtml = `
                <div style='text-align: center; padding: 16px; margin: 20px 0; background-color: ${theme.colors.highlightBg}; border-radius: 8px; border: 1px dashed ${theme.colors.primary};'>
                    <p style='margin: 0 0 12px 0; font-size: 14px; color: ${theme.colors.text};'>${safeDesc}</p>
                    <a href='${safeLink}' target='_blank' rel='noopener noreferrer sponsored' style='display: inline-block; background-color: ${theme.colors.primary}; color: white; padding: 8px 16px; border-radius: 25px; text-decoration: none; font-weight: bold; font-size: 14px; transition: background-color 0.2s;' onmouseover='this.style.backgroundColor="${theme.colors.primaryDark}"' onmouseout='this.style.backgroundColor="${theme.colors.primary}"'>
                        ${safeHook}
                    </a>
                    ${disclosureHtml}
                </div>
            `;
            break;
    }

    adInstructions = `
    ### **중요**: 제휴 광고 포함 (필수)
    - **반드시** 아래에 제공된 [제휴 광고 HTML] 코드를 포스트 본문 내용 중 **문맥상 가장 자연스럽고 적절한 위치(본문의 약 60~80% 지점)**에 **그 그대로** 삽입해주세요.
    - 코드를 변경하거나 생략하지 마세요.
    
    [제휴 광고 HTML]
    ---
    ${adHtml}
    ---
    `;
  }

  let ctaInstructions = '';
  if (generateCta) {
      ctaInstructions = `
      ### **중요**: 행동 유도(CTA) 버튼 자동 생성
      - **반드시** 포스트의 주제와 내용을 분석하여, 독자의 다음 행동을 유도할 수 있는 가장 적절한 Call to Action (CTA) 문구를 생성해주세요.
      - 생성된 CTA 문구를 사용하여 독자의 눈길을 끄는 매력적인 HTML 버튼을 만들어주세요.
      - 이 CTA 섹션은 **반드시** 본문 내용이 끝나는 지점, 'FAQ' 섹션 바로 앞에 위치해야 합니다.
      - CTA 컨테이너 스타일: \`<div style='text-align: center; margin: 40px auto; padding: 25px; background-color: ${theme.colors.highlightBg}; border: 1px dashed ${theme.colors.primary}; border-radius: 10px; max-width: 90%;'>\`
      - CTA 버튼 스타일: \`<a href='#' style='display: inline-block; background: linear-gradient(to right, ${theme.colors.primary}, ${theme.colors.primaryDark}); color: white; padding: 12px 30px; border-radius: 25px; text-decoration: none; font-weight: bold; font-size: 17px; box-shadow: 0 4px 10px rgba(0,0,0,0.2); transition: all 0.3s ease;' onmouseover='this.style.transform=\\"translateY(-2px)\\"; this.style.boxShadow=\\"0 6px 12px rgba(0,0,0,0.3)\\"' onmouseout='this.style.transform=\\"translateY(0)\\"; this.style.boxShadow=\\"0 4px 10px rgba(0,0,0,0.2)\\"'>버튼 텍스트</a>\`
      - **JSON 호환성 필수**: 생성하는 CTA HTML 코드 내 모든 큰따옴표(")는 반드시 백슬래시로 이스케이프 처리(\\\")하여 JSON 파싱 오류를 방지할 것.
      `;
  }


  let contentInstructions = '';
  if (rawContent) {
    contentInstructions = `
    ### **중요**: 제공된 메모 기반 작성
    - **반드시** 아래에 제공된 사용자의 메모/초안을 핵심 기반으로 삼아 블로그 포스트를 작성해야 합니다.
    - 최종 포스트의 제목은 "${topic}"으로 합니다.

    [사용자 제공 메모]
    ---
    ${rawContent}
    ---
    `;
  }

  let additionalRequestInstructions = '';
    if (additionalRequest) {
      additionalRequestInstructions = `
### **중요**: 추가 요청사항
- **반드시** 아래의 추가 요청사항을 반영하여 포스트를 작성해주세요.

[추가 요청사항]
---
${additionalRequest}
---
    `;
    }

  let toneAndTargetInstructions = `
### **중요**: 톤앤매너 및 타겟 독자 설정
- **글의 분위기(Tone & Manner)**: ${getToneInstruction(tone)}
- **타겟 독자(Target Audience)**: ${getTargetInstruction(targetAudience)}
  `;

  let internalLinksInstructions = '';
  if (internalLinks && internalLinks.length > 0) {
      const validLinks = internalLinks.filter(l => l.url && l.url.trim());
      if (validLinks.length > 0) {
          const linkCardsHtml = validLinks.map(link =>
              `<a href='${link.url}' style='display:block; background:#f9fafb; border:1px solid #e5e7eb; border-radius:8px; padding:12px 16px; margin:8px 0; text-decoration:none; color:#111827; font-weight:600; font-size:15px;'>📌 ${link.anchor || link.url}${link.description ? `<span style='display:block; font-size:13px; font-weight:400; color:#6b7280; margin-top:4px;'>${link.description}</span>` : ''}</a>`
          ).join('\n');
          internalLinksInstructions = `
### **필수**: 내부 링크 (관련 글 보기 섹션)
아래에 제공된 내부 링크들을 **[Phase 5] 참고 자료 섹션** 안에 반드시 포함해주세요.

**⚠️ SEO 최적화 앵커텍스트 재작성 규칙 (매우 중요)**:
- 제공된 **URL은 절대 변경 금지**. 원본 URL 그대로 사용.
- 링크 앵커텍스트는 **사람들이 실제로 네이버·구글에 검색하는 키워드**를 포함한 문장으로 재작성할 것.
- 각 블로그의 설명에 있는 '검색 키워드' 중 **본문 주제와 가장 관련 있는 키워드**를 골라 앵커텍스트에 자연스럽게 녹일 것.
- SEO 앵커텍스트 패턴 (반드시 실제 검색어 포함):
  - "[구체적 검색어] 완벽 정리 / 총정리"
  - "[검색어], 이것만 알면 끝!"
  - "모르면 손해인 [검색어] 핵심 가이드"
  - "[검색어] 전문가가 알려드리는 방법"
  - "[검색어] 한 번에 해결하는 법"
- 앵커텍스트에 **구체적인 키워드**(예: "자동차보험", "당일치기 드라이브코스", "여드름 없애는 법")가 반드시 들어가야 함. 막연한 표현("다양한 정보", "유익한 콘텐츠") 사용 금지.
- 원본 블로그 이름은 카드 하단 설명에만 쓰고, 앵커 메인 텍스트는 반드시 SEO 키워드 문구로 작성할 것.

[내부 링크 목록 — 원본 제목은 참고용]
${validLinks.map(link => `- 원본 제목: "${link.anchor || '관련 글'}" / URL: ${link.url}${link.description ? ` / 설명: ${link.description}` : ''}`).join('\n')}

[카드 HTML 형식 — anchor 텍스트 자리에 후킹 제목을 직접 작성]
<h3 style='font-size:18px; color:${theme.colors.primary}; margin:25px 0 12px; font-weight:700;'>📌 관련 글 보기</h3>
${linkCardsHtml}
    `;
      }
  }

  let externalSourceInstructions = '';
  if (externalSourceOption === 'auto') {
      externalSourceInstructions = `
### **가장 중요**: Google 실시간 검색을 통한 정보 검증
- **반드시** Google Search Grounding 기능을 활용하여 오늘의 최신 정보와 데이터를 조사하십시오. 
- **오늘은 ${currentDate} 입니다.** 실시간 트렌드를 반영하되, **메타 설명(Meta Description)이나 메타 설명 박스에는 절대로 날짜나 시간 정보를 포함하지 마세요.**
    `;
  } else if (externalSourceOption === 'manual' && externalLinks && externalLinks.trim()) {
      externalSourceInstructions = `
### **중요**: 외부 정보 출처 포함
- 아래 제공된 URL들을 외부 출처로 자연스럽게 인용해주세요.
${externalLinks.trim()}
    `;
  }
  

  // Fix: Escaped backticks in template literal to avoid syntax error when parsing Korean text within backticks
  const humanizeInstructions = `
  ### **[Natural & Clean HTML Protocol]**
  1. **HTML 속성값에는 반드시 작은따옴표(')를 사용하세요.** (JSON 파싱 오류 방지)
  2. **메타 설명(Meta Description)**: \`supplementaryInfo.metaDescription\` 필드와 포스트 시작의 \`메타 설명 박스\`는 SEO 최적화 규칙을 따릅니다: ① 핵심 키워드를 앞부분에 포함, ② 검색 의도 반영, ③ **80~120자** (한글 기준 구글 스니펫 최적 표시 범위 — 이 범위를 꽉 채워야 클릭률이 높아짐. 짧으면 안 됨), ④ 클릭 유도 후킹 문구 포함, ⑤ 핵심 정보를 2~3문장으로 충실히 기술. **절대로 날짜(연도, 월, 일)나 '최근', '올해'와 같은 시점 정보를 포함하지 마세요.**
  `;

  // 면책 조항 박스 — 제휴 광고 활성화 시 제휴 공시 문구 추가
  const affiliateParagraph = adDetails?.disclosure
    ? `\n  <p style='margin: 12px 0 0; line-height: 1.8; color: #555; border-top: 1px solid #e0e0e0; padding-top: 12px;'><strong>제휴 마케팅 공시:</strong> ${adDetails.disclosure}</p>`
    : adDetails
    ? `\n  <p style='margin: 12px 0 0; line-height: 1.8; color: #555; border-top: 1px solid #e0e0e0; padding-top: 12px;'><strong>제휴 마케팅 공시:</strong> 본 포스트에는 제휴 링크가 포함되어 있으며, 링크를 통한 구매 시 소정의 수수료를 받을 수 있습니다. 이는 구매자에게 추가 비용을 발생시키지 않습니다.</p>`
    : '';

  const disclaimerBoxHtml = `<div style='margin: 40px auto 20px; padding: 24px 28px; border: 1px solid #e0e0e0; border-radius: 12px; background-color: #ffffff; font-size: 14px; color: #555; max-width: 95%; box-shadow: 0 1px 4px rgba(0,0,0,0.06);'>
  <div style='display: flex; align-items: center; gap: 12px; margin-bottom: 16px;'>
    <span style='display: inline-flex; align-items: center; justify-content: center; width: 32px; height: 32px; background-color: #f59e0b; border-radius: 50%; color: white; font-size: 16px; flex-shrink: 0;'>💡</span>
    <strong style='font-size: 16px; color: #1a1a1a; font-weight: 700;'>면책 조항 (Disclaimer)</strong>
  </div>
  <p style='margin: 0 0 12px; line-height: 1.8; color: #555;'>본 블로그의 콘텐츠는 일반적인 정보 제공을 위한 것이며, <strong>전문가의 조언</strong>이나 서비스를 대체하지 않습니다. 개인의 상황에 따라 관련 전문가의 상담이 필요할 수 있습니다.</p>
  <p style='margin: 0 0 12px; line-height: 1.8; color: #555;'>리뷰나 후기 등은 작성자의 주관적인 경험에 기반하며, 정보의 정확성이나 최신성을 보장하지 않습니다.</p>
  <p style='margin: 0; line-height: 1.8; color: #555;'>본 블로그를 이용하시는 분은 위의 내용에 동의하는 것으로 간주됩니다.</p>${affiliateParagraph}
</div>`;

  const instructions = `
당신은 전문 한국 블로그 SEO 전문 작가입니다. 아래 주제로 엄격한 규칙에 따라 고품질 블로그 포스트를 작성해주세요.

**[블로그 주제]**: ${topic}

---
${internalLinksInstructions}
---

## ⚠️ 절대 규칙 (반드시 준수 — 위반 금지)

1. **글자 수 배분** (${pc.note}):
   - **Phase 3 본문**: **${pc.body}** 내외 (전체의 핵심)
   - **Phase 4 FAQ**: Q&A **${pc.faqCount}** 간결하게 작성
   - **Phase 5~6**: 각 섹션 간결하게 — **반드시 생성**
   - **전체 합계**: **${pc.total}** 내외 목표
   - ⚠️ Phase 3 본문에 글자를 과도하게 쏟지 말 것. Phase 4~6까지 완성하는 것이 최우선.
2. **번호 목록 금지**: 본문에 "1. 2. 3." 형식의 번호 목록 **절대 사용 금지**. 반드시 아래 스타일의 컬러 불릿 목록으로만 작성.
3. **날짜 기재 금지**: 연도, 월, 일 등 날짜 정보 **절대 기재 금지** (본문, 메타 설명, 제목 모두 해당).
4. **HTML 속성값 따옴표**: 모든 HTML 속성값은 반드시 **작은따옴표(')** 사용 (JSON 파싱 오류 방지).
5. **구조 순서 고정**: 아래 Phase 1~6 순서를 반드시 준수. 임의로 순서를 바꾸거나 생략 금지.
6. **E-E-A-T 필수 적용** (구글 품질 평가 기준 — 모든 섹션에 반영):
   - **Experience(경험)**: 주제에 대한 실제 경험·사례를 녹여 작성. "실제로", "직접 확인한 결과", "경험을 바탕으로" 등 자연스럽게 삽입.
   - **Expertise(전문성)**: 해당 분야 전문 용어·구체적 수치·심층 분석을 포함. 단순 나열이 아닌 이유와 원리를 설명.
   - **Authoritativeness(권위성)**: 정부기관·연구기관·공식 보고서·전문가 의견을 본문에서 인용. "~에 따르면", "~기관 발표" 형식 활용.
   - **Trustworthiness(신뢰성)**: 사실 기반의 정확한 정보 제공. 과장·허위 정보 절대 금지. 균형 잡힌 시각 유지. 출처·면책조항 포함.

---

## 📋 필수 6단계 구조 (Phase 1~6)

### [Phase 1] 도입부
- **H1 제목 태그 (SEO + CTR 최적화 필수)**: 글 맨 앞, 메타 설명 박스보다 먼저 출력. 페이지당 H1은 반드시 1개만 사용.
  - **H1 제목 작성 공식** (CTR 극대화): 아래 패턴 중 하나를 반드시 적용.
    - 숫자 포함: "N가지 ~하는 법", "N분 만에 해결하는 ~", "N단계로 끝내는 ~"
    - 궁금증 자극: "~, 이렇게 하면 됩니다", "~하는 사람들이 몰랐던 사실"
    - 이득 강조: "~하면 달라지는 N가지", "모르면 손해인 ~ 완벽 정리"
    - 문제 해결: "~때문에 고민이라면 이 글 하나로 끝"
  - 스타일: \`<h1 style='font-size: 28px; font-weight: 800; color: ${theme.colors.text}; line-height: 1.4; margin: 0 0 24px; word-break: keep-all;'>블로그 포스트 제목</h1>\`
- **메타 설명 박스 (SEO 최적화 필수)**: H1 태그 바로 다음에 위치. 아래 SEO 규칙을 반드시 준수하여 작성:
  1. **핵심 키워드 포함**: 블로그 주제의 핵심 키워드를 문장 앞부분에 자연스럽게 포함할 것.
  2. **검색 의도 반영**: 독자가 이 글을 검색하는 이유(정보 습득, 문제 해결, 비교 등)를 정확히 반영할 것.
  3. **글자 수**: **80~120자** 내외 (한글은 글자 폭이 넓어 구글이 이 범위에서 스니펫 표시 — 초과 시 "..." 로 잘림).
  4. **후킹 문구**: "~하는 법", "~의 모든 것", "지금 바로 확인하세요" 등 클릭을 유도하는 강력한 문구로 시작할 것.
  5. **날짜/연도 절대 금지**: 시점 정보 일절 포함 금지.
  스타일: \`<div style='background: ${theme.colors.highlightBg}; border-left: 5px solid ${theme.colors.primary}; padding: 20px 25px; margin: 20px 0 30px; border-radius: 8px;'><p style='color: ${theme.colors.text}; font-size: 16px; line-height: 1.9; margin: 0;'>SEO 최적화 메타 설명 (80~120자)</p></div>\`
- **구글 스니펫 0위 답변 박스 (Featured Snippet 필수)**: 메타 설명 박스 바로 다음, 목차보다 먼저 위치. 독자의 핵심 질문에 **2~4문장으로 바로 답변**하는 박스. 구글이 이 박스를 검색 결과 최상단(Position 0)에 노출함.
  - 작성 규칙: "~란 무엇인가?", "~하는 방법은?" 같은 핵심 질문에 명확하고 간결하게 답변. 전문 용어 없이 누구나 이해할 수 있게 작성.
  - 스타일: \`<div style='background: linear-gradient(135deg, ${theme.colors.highlightBg}, ${theme.colors.highlightBg}); border: 2px solid ${theme.colors.primary}; border-radius: 12px; padding: 20px 25px; margin: 0 0 25px;'><p style='color: ${theme.colors.primary}; font-weight: 800; font-size: 15px; margin: 0 0 10px;'>💡 핵심 요약</p><p style='color: ${theme.colors.text}; font-size: 15px; line-height: 1.9; margin: 0;'>핵심 질문에 대한 2~4문장 직접 답변 (구글 스니펫 최적화)</p></div>\`

### [Phase 2] 목차
- ⚠️ **위치 고정**: 메타 설명 박스 바로 다음에 출력. 대표 이미지·서론 문단보다 먼저. 절대로 본문 중간·하단·FAQ 앞에 넣지 말 것.
- **목차 다음 순서**: 목차 박스 출력 후 → 대표 이미지 플레이스홀더(\`<!-- 대표 이미지 -->\`) → 서론 본문 2~3 문단 → Phase 3 본문 시작.
- **서론 첫 문단 키워드 배치 (SEO 필수)**: 서론의 **첫 번째 문단에 반드시 핵심 키워드를 자연스럽게 포함**할 것. 구글은 본문 초반 키워드를 주제 관련성 신호로 강하게 인식함. 억지스럽지 않게 문장 흐름 안에 녹여서 작성.
- 포스트의 모든 H2 제목을 나열한 **클릭 가능한 앵커 목차 박스** 작성.
- 각 목차 항목은 반드시 href='#section-N' 앵커 링크로 작성 (N=순서번호):
- 스타일: \`<div style='background: ${theme.colors.highlightBg}; border: 1px solid ${theme.colors.primary}; border-radius: 12px; padding: 20px 25px; margin: 30px 0;'><h3 style='color: ${theme.colors.primary}; margin: 0 0 15px; font-size: 18px;'>📋 목차</h3><ol style='margin: 0; padding-left: 20px; color: ${theme.colors.text}; line-height: 2;'><li><a href='#section-1' style='color: ${theme.colors.primary}; text-decoration: none;'>H2 제목 1</a></li></ol></div>\`
- **서브 이미지 개수 = H2 섹션 개수** (목차 수만큼 서브 이미지 프롬프트 생성).

### [Phase 3] 심층 본문
- **각 H2 섹션 바로 앞**에 서브 이미지 플레이스홀더 삽입. 형식: \`<!-- 서브 이미지 N -->\` (N은 순서 번호)
- H2 헤딩 HTML 스타일 — **반드시 id 속성 포함** (앵커 목차 연동):
  \`<h2 id='section-N' style='font-size: 22px; color: white; background: linear-gradient(135deg, ${theme.colors.primary}, ${theme.colors.primaryDark}); margin: 40px 0 20px; border-radius: 12px; padding: 15px 25px; font-weight: 700;'>제목</h2>\`
- H3 헤딩 HTML 스타일:
  \`<h3 style='font-size: 18px; color: ${theme.colors.primary}; border-bottom: 2px solid ${theme.colors.primary}; padding-bottom: 8px; margin: 30px 0 15px; font-weight: 700;'>소제목</h3>\`
- **각 H2 섹션당 ${pc.perSection}** 내외로 작성. (Phase 4~6 완성을 위해 과도하게 늘리지 말 것)
- **문단 길이 제한 (가독성·SEO 필수)**: 각 문단은 **최대 3~4문장** 이내로 작성. 문단이 길어지면 독자가 이탈하고 구글 크롤러의 내용 파악도 어려워짐. 5문장 이상이면 반드시 문단을 나눌 것.
- **LSI 키워드 활용 (SEO 필수)**: 본문 전체에 걸쳐 핵심 키워드와 **의미적으로 연관된 키워드(LSI) 3~5개**를 자연스럽게 분산 배치. 예: "강아지 사료" 주제라면 "반려견 영양", "단백질 함량", "소화 흡수율", "알레르기 성분", "원료 품질" 등을 본문 흐름 속에 녹일 것. 키워드를 억지로 반복하지 말고 독자에게 자연스럽게 읽힐 것.
- **문단 간격 (가독성 필수)**: 본문에서 **2~4개 문단마다** 아래 빈 줄 스페이서를 삽입하여 글이 답답해 보이지 않도록 할 것:
  \`<div style='margin: 24px 0;'></div>\`
- **목록 그룹 분할 (가독성 필수)**: 불릿 항목이 **4개 이상**이면 절대 한 번에 나열하지 말 것. 반드시 **2~3개씩 묶어서** 그룹 사이에 스페이서를 삽입:
  - 4개 → 2개 + 2개
  - 5개 → 2개 + 3개 (또는 3개 + 2개)
  - 6개 → 3개 + 3개 (또는 2개 + 2개 + 2개)
  - 7개 이상 → 2~3개씩 여러 그룹으로 분할
  그룹 사이 스페이서: \`<div style='margin: 16px 0;'></div>\`
- **번호 목록 절대 금지** → 아래 5가지 불릿 스타일을 문맥에 맞게 골라 사용. 한 섹션에 같은 스타일 연속 2회 이상 반복 금지. 섹션마다 스타일을 바꿔 가독성 향상:
  - **● 원형** (일반 나열): \`<ul style='list-style:none;padding:0;margin:12px 0;'><li style='display:flex;align-items:flex-start;gap:12px;padding:8px 0;color:${theme.colors.text};line-height:1.75;'><span style='display:inline-block;width:8px;height:8px;min-width:8px;background:${theme.colors.primary};border-radius:50%;margin-top:8px;'></span><span>내용</span></li></ul>\`
  - **→ 화살표** (단계·순서): \`<ul style='list-style:none;padding:0;margin:12px 0;'><li style='display:flex;align-items:flex-start;gap:12px;padding:8px 0;color:${theme.colors.text};line-height:1.75;'><span style='color:${theme.colors.primary};font-weight:700;flex-shrink:0;font-size:15px;'>→</span><span>내용</span></li></ul>\`
  - **◆ 다이아몬드** (특징·장점): \`<ul style='list-style:none;padding:0;margin:12px 0;'><li style='display:flex;align-items:flex-start;gap:12px;padding:8px 0;color:${theme.colors.text};line-height:1.75;'><span style='color:${theme.colors.primary};flex-shrink:0;font-size:11px;margin-top:4px;'>◆</span><span>내용</span></li></ul>\`
  - **✓ 체크** (팁·확인 사항): \`<ul style='list-style:none;padding:0;margin:12px 0;'><li style='display:flex;align-items:flex-start;gap:12px;padding:8px 0;color:${theme.colors.text};line-height:1.75;'><span style='color:${theme.colors.primary};font-weight:700;flex-shrink:0;'>✓</span><span>내용</span></li></ul>\`
  - **▸ 삼각형** (핵심 포인트): \`<ul style='list-style:none;padding:0;margin:12px 0;'><li style='display:flex;align-items:flex-start;gap:12px;padding:8px 0;color:${theme.colors.text};line-height:1.75;'><span style='color:${theme.colors.primary};flex-shrink:0;font-size:13px;'>▸</span><span>내용</span></li></ul>\`
- **시각 요소 3종 필수** — 글만 나열 금지. 아래 3가지를 본문에 골고루 분산 배치:

  **① 표(Table) 1개 이상** — 비교·수치·스펙 정리 시 사용:
  \`<table style='width: 100%; border-collapse: collapse; margin: 20px 0; border-radius: 8px; overflow: hidden;'><thead><tr><th style='background: ${theme.colors.primary}; color: white; padding: 12px 16px; text-align: left; font-weight: 700;'>항목</th><th style='background: ${theme.colors.primary}; color: white; padding: 12px 16px; text-align: left; font-weight: 700;'>내용</th></tr></thead><tbody><tr><td style='padding: 12px 16px; border-bottom: 1px solid ${theme.colors.highlightBg}; color: ${theme.colors.text};'>항목1</td><td style='padding: 12px 16px; border-bottom: 1px solid ${theme.colors.highlightBg}; color: ${theme.colors.text};'>내용1</td></tr></tbody></table>\`

  **② 정보 박스(Info Box) 1개 이상** — 팁·주의사항·핵심 노트 강조:
  \`<div style='background: ${theme.colors.highlightBg}; border-left: 4px solid ${theme.colors.primary}; padding: 15px 20px; margin: 20px 0; border-radius: 0 8px 8px 0;'><p style='color: ${theme.colors.text}; margin: 0; line-height: 1.8;'><strong>💡 핵심 포인트:</strong> 내용</p></div>\`

  **③ 핵심 요약 카드(Summary Card) 1개 이상** — 섹션 마무리 또는 전체 핵심 정리:
  \`<div style='background: linear-gradient(135deg, ${theme.colors.primary}15, ${theme.colors.primaryDark}25); border: 1px solid ${theme.colors.primary}40; border-radius: 12px; padding: 20px 24px; margin: 24px 0;'><h4 style='color: ${theme.colors.primary}; margin: 0 0 12px; font-size: 16px; font-weight: 700;'>📌 핵심 요약</h4><ul style='margin: 0; padding: 0; list-style: none;'><li style='color: ${theme.colors.text}; padding: 4px 0; font-size: 14px;'>▸ 요약 내용 1</li><li style='color: ${theme.colors.text}; padding: 4px 0; font-size: 14px;'>▸ 요약 내용 2</li></ul></div>\`

  **④ 단계별 박스(Step Box) 1개 이상** — How-to·순서 설명 시 사용 (구글 Featured Snippet 노출 유리):
  \`<div style='margin: 24px 0;'><div style='display:flex; align-items:flex-start; gap:16px; padding:14px 0; border-bottom:1px solid ${theme.colors.highlightBg};'><span style='display:flex; align-items:center; justify-content:center; min-width:32px; height:32px; background:${theme.colors.primary}; color:white; border-radius:50%; font-weight:700; font-size:14px;'>1</span><div><strong style='color:${theme.colors.text};'>단계 제목</strong><p style='color:${theme.colors.text}; margin:4px 0 0; font-size:14px; line-height:1.7;'>단계 설명</p></div></div></div>\`

  **⑤ 숫자 하이라이트 카드(Stat Card) 1개 이상** — 핵심 통계·수치를 시각적으로 강조:
  \`<div style='display:flex; gap:16px; flex-wrap:wrap; margin:24px 0;'><div style='flex:1; min-width:140px; background:${theme.colors.highlightBg}; border:1px solid ${theme.colors.primary}30; border-radius:12px; padding:20px; text-align:center;'><p style='font-size:36px; font-weight:800; color:${theme.colors.primary}; margin:0;'>숫자</p><p style='color:${theme.colors.text}; font-size:13px; margin:6px 0 0;'>설명</p></div></div>\`

  **⑥ 경고/주의 박스(Warning Box) 1개 이상** — 주의사항·실수하기 쉬운 포인트 강조:
  \`<div style='background:#fff7ed; border-left:4px solid #f97316; padding:15px 20px; margin:20px 0; border-radius:0 8px 8px 0;'><p style='color:#7c2d12; margin:0; line-height:1.8;'><strong>⚠️ 주의:</strong> 내용</p></div>\`
${hasInternalLinks ? '- 위에서 제공된 **내부 링크**를 본문에 자연스럽게 삽입. (제공된 URL 외 임의 링크 절대 금지)' : ''}
- **외부 링크 5~7개** 신뢰할 수 있는 출처에서 자연스럽게 인용.

### [Phase 4] FAQ 섹션
- **H2 소제목 (생략 절대 금지)**: FAQ 항목 앞에 반드시 아래 H2를 먼저 출력:
  \`<h2 style='font-size: 22px; color: white; background: linear-gradient(135deg, ${theme.colors.primary}, ${theme.colors.primaryDark}); margin: 40px 0 20px; border-radius: 12px; padding: 15px 25px; font-weight: 700;'><span style='margin-right:10px;'>❓</span> 자주 묻는 질문 (FAQ)</h2>\`
- 주제와 관련된 **${pc.faqCount}의 Q&A** 작성. (간결하게 — 답변은 2~3문장 이내)
- FAQ 항목 스타일:
  \`<div style='margin: 14px 0; border: 1px solid #e5e7eb; border-radius: 10px; overflow: hidden;'><div style='padding: 13px 18px; font-weight: 700; font-size: 15px; color: white; background: ${theme.colors.primary};'>Q. 질문</div><div style='padding: 14px 18px; color: #4b5563; line-height: 1.85; background: #ffffff;'>A. 답변</div></div>\`
- **스키마 마크업** — Q&A 항목을 모두 작성한 뒤, 맨 마지막에 아래 두 가지 JSON-LD를 순서대로 삽입:
  1. **FAQPage Schema** — FAQ 내용 기반 \`<script type='application/ld+json'>{"@context":"https://schema.org","@type":"FAQPage","mainEntity":[{"@type":"Question","name":"질문","acceptedAnswer":{"@type":"Answer","text":"답변"}}]}</script>\`
  2. **Article Schema** — 블로그 글 전체에 대한 \`<script type='application/ld+json'>{"@context":"https://schema.org","@type":"BlogPosting","headline":"글 제목","description":"메타설명","author":{"@type":"Person","name":"블로그 작성자"},"publisher":{"@type":"Organization","name":"블로그명"},"mainEntityOfPage":{"@type":"WebPage"}}</script>\`

### [Phase 5] 참고 자료 및 출처 ⚠️ 생략 절대 금지 — FAQ 다음 반드시 이어서 작성
- **반드시 포함** — Phase 4 FAQ 바로 다음에 위치. 이 섹션이 없으면 글이 미완성입니다.
- H2 헤딩: \`<h2 style='font-size: 22px; color: white; background: linear-gradient(135deg, ${theme.colors.primary}, ${theme.colors.primaryDark}); margin: 40px 0 20px; border-radius: 12px; padding: 15px 25px; font-weight: 700;'><span style='margin-right:10px;'>📚</span> 참고 자료 및 출처</h2>\`
${hasInternalLinks ? `- **내부 링크 소제목**: \`<h3 style='font-size: 16px; color: ${theme.colors.primary}; border-bottom: 2px solid ${theme.colors.primary}; padding-bottom: 8px; margin: 24px 0 14px; font-weight: 700;'>📌 함께 읽으면 도움되는 자료</h3>\` — 이 H3 바로 아래에 내부 링크 카드 나열.
  - 제공된 내부 링크 중 **주제와 가장 관련성 높은 5~7개**만 선택하여 클릭 가능한 카드로 표시. (전부 넣지 말 것)
  - **링크 제목(anchor text)은 후킹 문구로 재작성** (예: "강아지 사료 추천" → "🐶 수의사도 인정한 강아지 건강 비법, 이 사료가 답입니다").
  - **⚠️ 제공된 URL 외 임의 링크 추가 절대 금지. '#' 가짜 링크 생성 절대 금지.**
  - 후킹 패턴: "~하는 법 완벽 정리", "이것만 알면 OK!", "모르면 손해인 ~", "지금 확인해야 할 ~" 등 활용.` : `- 이번 글에 제공된 내부 링크가 없습니다. 내부 링크 카드 섹션 생성 금지. '#' 가짜 링크나 임의 내부 링크도 절대 금지. 외부 링크만 작성하세요.`}
- **외부 링크 소제목**: \`<h3 style='font-size: 16px; color: ${theme.colors.primary}; border-bottom: 2px solid ${theme.colors.primary}; padding-bottom: 8px; margin: 24px 0 14px; font-weight: 700;'>🔍 본문 참조 자료</h3>\` — 이 H3 바로 아래에 외부 링크 나열. 신뢰할 수 있는 외부 출처(공식 사이트, 연구기관, 뉴스 매체 등)에서 주제와 관련된 실제 링크 **5~7개**를 아래 스타일로 나열:
  \`<a href='외부URL' target='_blank' rel='noopener noreferrer' style='display:block; padding:10px 16px; margin:6px 0; background:#f9fafb; border:1px solid #e5e7eb; border-radius:6px; text-decoration:none; color:#374151; font-size:14px;'>🔗 <strong>한국어 출처 제목</strong> <span style='font-size:12px; color:#6b7280; margin-left:6px;'>— 어떤 기관/사이트인지 한국어로 한 줄 설명 (예: 미국 국립보건원 공식 자료, 서울대 연구팀 발표, 식품의약품안전처 공식 사이트 등)</span></a>\`
  - **출처 제목은 반드시 한국어로** 작성 (외국 사이트라도 한국어 번역명 사용. 예: "Mayo Clinic" → "메이요 클리닉", "WHO" → "세계보건기구(WHO)")
  - **사이트 설명 필수**: 링크마다 어떤 기관/사이트인지, 왜 신뢰할 수 있는지 한국어로 한 줄 설명 추가

### [Phase 6] 마무리 ⚠️ 생략 절대 금지 — 참고자료 다음 반드시 이어서 작성
- **반드시 포함** — Phase 5 참고 자료 바로 다음에 위치. 포스트의 마지막 섹션. 이 섹션이 없으면 글이 미완성입니다.
- **순서 고정**: ① 면책 조항 박스 → ② 마무리 문단 순으로 작성.

**① 면책 조항 박스** (항상 아래 HTML을 그대로 사용. 색상·내용 임의 변경 금지. 마무리 글보다 먼저 위치):
\`\`\`html
${disclaimerBoxHtml}
\`\`\`

**② 마무리 문단** (면책 조항 박스 바로 다음에 위치. 반드시 아래 형식으로 시작하고 이후 1~2문장 자연스러운 마무리 추가):
  \`지금까지 「[블로그 제목]」에 대해 자세히 알아보았습니다. 이 글이 여러분의 궁금증을 해결하는 데 큰 도움이 되었기를 바랍니다. 😊\`
  - \`[블로그 제목]\` 자리에는 실제 포스트 제목을 넣을 것
  - 이모지 😊 반드시 포함

---

## ✅ 출력 전 필수 확인 (모두 충족해야 출력 가능)
**글자 배분**: Phase3 본문 ${pc.body} | FAQ ${pc.faqCount} 간결 | Phase5~6 생략 절대 금지 | 전체 합계 ${pc.total}
**본문·형식**: H1 제목 1개(맨 앞) | 컬러 불릿 목록만(번호 금지) | 작은따옴표 | 날짜/연도 금지 | 스페이서 매 2~4문단 | 문단 최대 3~4문장 | LSI키워드 3~5개 분산배치
**이미지·구성**: 대표 이미지 주석 | 서브 이미지 주석 | 앵커 목차(id연동) | 표+정보박스+요약카드+단계박스+숫자카드+경고박스 각 1개 이상
**Phase 순서 (생략 금지)**: H1제목 → 메타설명 → 목차 → 대표이미지 → 서론 → 본문 → FAQ(H2소제목+Q&A+JSON-LD) → 참고자료(${hasInternalLinks ? '내부링크 5~7개(초과 금지) + ' : ''}외부링크 5~7개(초과 금지)) → 면책조항 → 마무리글

---

    ${languageInstructions}
    ${humanizeInstructions}
    ${toneAndTargetInstructions}
    ${contentInstructions}
    ${additionalRequestInstructions}
    ${interactiveElementInstructions}
    ${adInstructions}
    ${ctaInstructions}
    ${externalSourceInstructions}

    ### 🚨 MANDATORY ORDER — blogPostHtml 전체 순서 (절대 변경·생략 불가)
    blogPostHtml의 HTML은 반드시 아래 순서대로 작성해야 합니다. 순서 변경 시 출력이 무효입니다.

    1. **[Phase 1] 도입부** — H1 제목 태그 → 메타 설명 박스
    2. **[Phase 2] 목차 박스** ← ⚠️ 메타 설명 박스 바로 다음. 대표 이미지·서론 전에 위치.
    3. 대표 이미지 플레이스홀더(\`<!-- 대표 이미지 -->\`) → 서론 본문 2~3 문단
    4. **[Phase 3] 심층 본문** — H2 섹션들 (각 H2 앞에 \`<!-- 서브 이미지 N -->\`)
    5. **[Phase 4] FAQ 섹션** — "❓ 자주 묻는 질문 (FAQ)" H2 소제목 + Q&A ${pc.faqCount}개 + FAQPage JSON-LD + BlogPosting JSON-LD
    6. **[Phase 5] 참고 자료 및 출처** — H2 헤딩 + ${hasInternalLinks ? '"📌 함께 읽으면 도움되는 자료" H3 + 내부링크 카드(5~7개) + ' : ''}"🔍 본문 참조 자료" H3 + 외부링크 5~7개 ← 자주 빠짐, 반드시 포함
    7. **[Phase 6-①] 면책 조항 박스** — 위에서 제공된 disclaimerBoxHtml 그대로 ← 자주 빠짐, 반드시 포함
    8. **[Phase 6-②] 마무리 문단** — "지금까지 「제목」에 대해..." 로 시작하는 문단 ← 자주 빠짐, 반드시 포함

    Phase 2가 Phase 3 본문 이후에 나타나거나, Phase 5·6이 없으면 출력이 무효입니다.

    ### 최종 출력 형식
    - 오직 아래 구조를 가진 단일 JSON 객체만을 반환하십시오.
    - **blogPostHtml**: Phase 1~6 전체 포함 HTML (본문 ${pc.body} + FAQ·참고자료·면책조항·마무리 포함, 합계 ${pc.total} 내외)
    - **supplementaryInfo.imagePrompt**: 대표 이미지용 상세 영문 프롬프트 — 블로그 주제 전체를 상징하는 장면, 구체적인 피사체·배경·분위기·색감·구도까지 묘사. 50단어 이상. **이미지 배경·인물·분위기는 반드시 "${language}" 언어권 국가(${language === 'ko' ? '대한민국' : language === 'ja' ? '일본' : language === 'zh' ? '중국' : language === 'en' ? '영미권' : language === 'es' ? '스페인/중남미' : language === 'fr' ? '프랑스' : language === 'de' ? '독일' : language === 'pt' ? '포르투갈/브라질' : '해당 언어권'})의 실제 생활상과 문화를 반영할 것.**
    - **supplementaryInfo.subImagePrompts**: 서브 이미지 프롬프트 배열 (목차 H2 개수와 동일). 각 prompt는 해당 H2 섹션 내용을 구체적으로 시각화하는 상세 영문 프롬프트로 작성 — 대표 이미지 프롬프트와 동일한 수준의 상세도(50단어 이상) 유지. 동일하게 "${language}" 언어권 문화·생활상 반영.
    \`\`\`json
    ${jsonStructureForPrompt}
    \`\`\`
  `;

  return instructions;
};

// --- Implemented Exported Functions ---

export const generateViralTrendTitles = async (currentDate: string): Promise<string[]> => {
    const prompt = `
    Analyze real-time Google Search trends in South Korea for today, ${currentDate}.
    Identify 10 viral blog titles.
    Return ONLY a JSON array of strings.
    `;
    try {
        const response = await getAi().models.generateContent({
            model: "gemini-2.5-flash",
            contents: prompt,
            config: { tools: [{googleSearch: {}}], thinkingConfig: { thinkingBudget: 0 } }
        });
        return extractJsonFromText(response.text);
    } catch (error) {
        return ["트렌드 로딩 실패", "다시 시도해주세요"];
    }
};

export const generateEeatTopicSuggestions = async (subCategory: string, category: string, currentDate: string): Promise<string[]> => {
    const prompt = `
당신은 한국 블로그 주제 전문가입니다.
콘텐츠 유형: "${category}"
분야: "${subCategory}"

위 분야에서 E-E-A-T(경험·전문성·권위성·신뢰성) 원칙에 맞는 블로그 주제 10개를 추천해주세요.

중요 조건:
- 서로 겹치지 않도록 다양한 하위 주제를 골고루 포함할 것
- 분야가 건강 관련이면 음식/식단, 약초/한방, 영양소/건강기능식품, 운동, 질병 예방, 정신건강 등 여러 측면을 골고루 다룰 것
- 구체적이고 검색자의 의도가 명확한 제목으로 작성
- 반드시 한국어로 작성

JSON 배열 형식으로만 반환하세요. 예: ["제목1", "제목2", ...]
`;
    try {
        const response = await getAi().models.generateContent({
            model: "gemini-2.5-flash",
            contents: prompt,
            config: { responseMimeType: "application/json", thinkingConfig: { thinkingBudget: 0 } }
        });
        return extractJsonFromText(response.text);
    } catch (error) { return []; }
};

export const generateCategoryTopicSuggestions = async (category: string, currentDate: string): Promise<string[]> => {
    const prompt = `
당신은 한국 블로그 주제 전문가입니다.
카테고리: "${category}"

이 카테고리에서 최신 트렌드를 반영한 블로그 주제 10개를 추천해주세요.

중요 조건:
- 서로 겹치지 않도록 다양한 하위 주제를 골고루 포함할 것
- 카테고리가 건강 관련이면 음식/식단, 약초/한방, 영양소, 운동, 질병 예방, 다이어트, 정신건강 등 각각 다른 측면을 골고루 다룰 것
- 독자가 실제로 검색할 만한 구체적이고 실용적인 제목으로 작성
- 반드시 한국어로 작성

JSON 배열 형식으로만 반환하세요. 예: ["제목1", "제목2", ...]
`;
    try {
        const response = await getAi().models.generateContent({
            model: "gemini-2.5-flash",
            contents: prompt,
            config: { tools: [{googleSearch: {}}], thinkingConfig: { thinkingBudget: 0 } }
        });
        return extractJsonFromText(response.text);
    } catch (error) { return []; }
};

export const generateEvergreenTopicSuggestions = async (field: string, category: string, currentDate: string): Promise<string[]> => {
    const prompt = `
당신은 한국 블로그 주제 전문가입니다.
콘텐츠 유형: "${category}"
분야: "${field}"

시간이 지나도 꾸준히 검색되는 에버그린(Evergreen) 블로그 주제 10개를 추천해주세요.

중요 조건:
- 서로 겹치지 않도록 다양한 하위 주제를 골고루 포함할 것
- 분야가 건강 관련이면 음식/식단, 약초/한방, 영양소/건강기능식품, 운동, 만성질환 관리, 면역력, 수면, 정신건강 등 각각 다른 측면을 골고루 포함할 것
- 한 번 작성해두면 오래 가치를 유지하는 실용적인 내용으로 작성
- 반드시 한국어로 작성

JSON 배열 형식으로만 반환하세요. 예: ["제목1", "제목2", ...]
`;
    try {
        const response = await getAi().models.generateContent({
            model: "gemini-2.5-flash",
            contents: prompt,
            config: { responseMimeType: "application/json", thinkingConfig: { thinkingBudget: 0 } }
        });
        return extractJsonFromText(response.text);
    } catch (error) { return []; }
};

export const generateTopicsFromMemo = async (memo: string, currentDate: string): Promise<string[]> => {
    const prompt = `Extract 10 blog titles from this memo: ${memo}. Korean. JSON array.`;
    try {
        const response = await getAi().models.generateContent({
            model: "gemini-2.5-flash",
            contents: prompt,
            config: { responseMimeType: "application/json", thinkingConfig: { thinkingBudget: 0 } }
        });
        return extractJsonFromText(response.text);
    } catch (error) { return []; }
};

export const generateLongtailTopicSuggestions = async (category: string, currentDate: string): Promise<string[]> => {
    const prompt = `
당신은 한국 블로그 SEO 전문가입니다.
카테고리: "${category}"

검색량은 적지만 명확한 검색 의도를 가진 롱테일 키워드 기반 블로그 주제 10개를 추천해주세요.

중요 조건:
- 서로 겹치지 않도록 다양한 하위 주제를 골고루 포함할 것
- 카테고리가 건강 관련이면 특정 음식 효능, 특정 약초 활용법, 특정 영양소 섭취법, 특정 증상 완화 방법, 특정 식단 방법 등 구체적이고 세분화된 주제를 골고루 다룰 것
- "~하는 방법", "~효능과 부작용", "~먹으면 좋은 음식" 등 검색자가 실제로 입력할 구체적인 제목으로 작성
- 반드시 한국어로 작성

JSON 배열 형식으로만 반환하세요. 예: ["제목1", "제목2", ...]
`;
    try {
        const response = await getAi().models.generateContent({
            model: "gemini-2.5-flash",
            contents: prompt,
            config: { tools: [{googleSearch: {}}], thinkingConfig: { thinkingBudget: 0 } }
        });
        return extractJsonFromText(response.text);
    } catch (error) { return []; }
};

export const generateTopicSuggestionsFromTopic = async (topic: string, currentDate: string): Promise<string[]> => {
    const prompt = `
당신은 한국 블로그 주제 전문가입니다.
입력 주제: "${topic}"

이 주제를 다양한 각도로 확장한 블로그 제목 10개를 추천해주세요.

중요 조건:
- 서로 겹치지 않도록 효능/부작용, 활용법, 비교, 주의사항, 대상별(노인/어린이/임산부 등), 계절별, 조합법 등 다양한 측면을 골고루 포함할 것
- 독자가 실제로 검색할 만한 구체적이고 실용적인 제목으로 작성
- 반드시 한국어로 작성

JSON 배열 형식으로만 반환하세요. 예: ["제목1", "제목2", ...]
`;
    try {
        const response = await getAi().models.generateContent({
            model: "gemini-2.5-flash",
            contents: prompt,
            config: { responseMimeType: "application/json", thinkingConfig: { thinkingBudget: 0 } }
        });
        return extractJsonFromText(response.text);
    } catch (error) { return []; }
};

export const generateBlogPost = async (
    topic: string, 
    theme: ColorTheme, 
    shouldGenerateImage: boolean, 
    shouldGenerateSubImages: boolean, 
    interactiveElementIdea: string | null, 
    rawContent: string | null, 
    tone: string, 
    targetAudience: string, 
    additionalRequest: string | null, 
    thumbnailAspectRatio: '16:9' | '1:1', 
    currentDate: string,
    internalLinks: InternalLink[],
    externalSourceOption: 'auto' | 'manual' | 'none',
    externalLinks: string,
    adDetails: AdDetails | null,
    generateCta: boolean,
    language: string,
    blogPlatform: string = 'tistory'
): Promise<GeneratedContent> => {
    
    let lastError: Error | null = null;
    const maxRetries = 3;
    let currentExternalSourceOption = externalSourceOption;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            const prompt = getPrompt(
                topic, theme, interactiveElementIdea, rawContent, tone, targetAudience, 
                additionalRequest, currentDate, internalLinks, currentExternalSourceOption, 
                externalLinks, adDetails, generateCta, language, blogPlatform
            );

            const config: any = {
                temperature: 0.7,
                maxOutputTokens: 65536,
                safetySettings: [
                    { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_NONE },
                    { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_NONE },
                    { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_NONE },
                    { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_NONE },
                ],
            };

            // thinkingBudget: 0 → thinking 단계 완전 비활성화
            // gemini-2.5-flash 기본 thinking은 수백 초 소요 → 반드시 꺼야 함
            config.thinkingConfig = { thinkingBudget: 0 };

            if (currentExternalSourceOption === 'auto') {
                config.tools = [{googleSearch: {}}];
            } else {
                config.responseMimeType = "application/json";
            }

            const timeoutMs = currentExternalSourceOption === 'auto' ? 180000 : 120000;
            const timeoutPromise = new Promise<never>((_, reject) =>
                setTimeout(() => reject(new Error(`응답 시간 초과 (${timeoutMs / 1000}초). 재시도 중...`)), timeoutMs)
            );

            const response = await Promise.race([
                getAi().models.generateContent({
                    model: "gemini-2.5-flash",
                    contents: prompt,
                    config: config
                }),
                timeoutPromise
            ]);

            if (!response.text) { throw new Error("AI 응답 비어있음"); }

            const parsed = extractJsonFromText(response.text);
            
            let imageBase64 = null;
            if (shouldGenerateImage && parsed.supplementaryInfo?.imagePrompt) {
                try {
                    imageBase64 = await generateImage(parsed.supplementaryInfo.imagePrompt, thumbnailAspectRatio, blogPlatform, 'main', language);
                } catch { imageBase64 = null; }
            }

            let subImages = null;
            if (parsed.supplementaryInfo?.subImagePrompts) {
                 subImages = [];
                 for(const subPromptObj of parsed.supplementaryInfo.subImagePrompts) {
                     let subBase64 = null;
                     if (shouldGenerateSubImages) {
                        try {
                            subBase64 = await generateImage(subPromptObj.prompt, '16:9', blogPlatform, 'sub', language);
                        } catch { subBase64 = null; }
                     }
                     subImages.push({
                         prompt: subPromptObj.prompt,
                         altText: subPromptObj.altText,
                         base64: subBase64
                     });
                 }
            }

            // Google Search Grounding이 자동으로 붙이는 인용 번호 제거: [1], [3, 12], [1, 8, 13] 등
            const cleanHtml = (parsed.blogPostHtml || '').replace(/\s*\[\d+(?:,\s*\d+)*\]/g, '');

            return {
                blogPostHtml: cleanHtml,
                supplementaryInfo: parsed.supplementaryInfo,
                socialMediaPosts: parsed.socialMediaPosts,
                imageBase64: imageBase64,
                subImages: subImages
            };

        } catch (error: any) {
            lastError = error;
            if (attempt < maxRetries) {
                // 타임아웃이나 파싱 실패 시 Google Search 없이 재시도
                currentExternalSourceOption = 'none';
                await new Promise(resolve => setTimeout(resolve, 2000));
                continue;
            }
            break;
        }
    }
    throw lastError || new Error("생성 오류");
};

export const suggestInteractiveElementForTopic = async (topic: string): Promise<string> => {
    const prompt = `Suggest an interactive HTML idea for "${topic}". One sentence.`;
    try {
        const response = await getAi().models.generateContent({
            model: "gemini-2.5-flash",
            contents: prompt,
        });
        return response.text?.trim() || "Interactive Element";
    } catch (error) { return "Interactive Element"; }
};

const blobToBase64 = (blob: Blob): Promise<string | null> =>
    new Promise((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => {
            const result = reader.result as string;
            resolve(result.split(',')[1] || null);
        };
        reader.onerror = () => resolve(null);
        reader.readAsDataURL(blob);
    });

// 플랫폼별 권장 이미지 사이즈
const PLATFORM_IMAGE_SIZES: Record<string, {
    main: { '16:9': [number, number]; '1:1': [number, number] };
    sub: [number, number];
}> = {
    auto:      { main: { '16:9': [1280, 720],  '1:1': [1024, 1024] }, sub: [1280, 720]  },
    tistory:   { main: { '16:9': [1280, 720],  '1:1': [1024, 1024] }, sub: [1280, 720]  },
    blogspot:  { main: { '16:9': [1200, 628],  '1:1': [1080, 1080] }, sub: [1200, 628]  },
    wordpress: { main: { '16:9': [1920, 1080], '1:1': [1080, 1080] }, sub: [1200, 628]  },
    naver:     { main: { '16:9': [1080, 608],  '1:1': [800,  800]  }, sub: [800,  450]  },
    brunch:    { main: { '16:9': [1500, 750],  '1:1': [800,  800]  }, sub: [1200, 600]  },
};

const getPlatformImageSize = (
    type: 'main' | 'sub',
    aspectRatio: '16:9' | '1:1',
    blogPlatform: string
): [number, number] => {
    const sizes = PLATFORM_IMAGE_SIZES[blogPlatform] ?? PLATFORM_IMAGE_SIZES['tistory'];
    if (type === 'sub') return sizes.sub;
    return sizes.main[aspectRatio];
};

const generateImageWithPollinations = async (prompt: string, width: number, height: number): Promise<string | null> => {
    for (const model of ['flux', 'turbo']) {
        try {
            const url = `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?width=${width}&height=${height}&nologo=true&model=${model}`;
            const controller = new AbortController();
            const timer = setTimeout(() => controller.abort(), model === 'flux' ? 60000 : 20000);
            const response = await fetch(url, { signal: controller.signal });
            clearTimeout(timer);
            if (!response.ok) continue;
            const blob = await response.blob();
            return await blobToBase64(blob);
        } catch { continue; }
    }
    return null;
};

const generateImageWithGemini = async (prompt: string, aspectRatio: '16:9' | '1:1'): Promise<string | null> => {
    try {
        const ai = getAi();
        const ratio = aspectRatio === '16:9' ? '16:9' : '1:1';
        const fullPrompt = `${prompt}, ${ratio} format`;

        // 1순위: Imagen 4 Fast ($0.02/장)
        try {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const res = await (ai.models as any).generateImages({
                model: 'imagen-4.0-fast-generate-001',
                prompt: fullPrompt,
                config: { numberOfImages: 1, aspectRatio: ratio, outputMimeType: 'image/jpeg' },
            });
            const bytes = res?.generatedImages?.[0]?.image?.imageBytes;
            if (bytes) return `data:image/jpeg;base64,${bytes}`;
        } catch { /* fallback */ }

        // 2순위: Gemini 3.1 Flash Image ($0.045/장)
        const res = await ai.models.generateContent({
            model: 'gemini-3.1-flash-image-preview',
            contents: [{ role: 'user', parts: [{ text: fullPrompt }] }],
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            config: { responseModalities: [Modality.IMAGE, Modality.TEXT] } as any,
        });
        const parts = res.candidates?.[0]?.content?.parts ?? [];
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const imgPart = parts.find((p: any) => p.inlineData?.mimeType?.startsWith('image/')) as any;
        if (imgPart?.inlineData?.data) {
            return `data:${imgPart.inlineData.mimeType};base64,${imgPart.inlineData.data}`;
        }
        return null;
    } catch {
        return null;
    }
};

const getCountryAesthetic = (language: string): string => {
    switch (language) {
        case 'ko': return 'authentic South Korean lifestyle, vibrant Seoul cityscape or modern Korean interior, realistic Korean facial features and contemporary K-fashion, high-fidelity K-aesthetic photography';
        case 'ja': return 'authentic Japanese lifestyle, Tokyo cityscape or modern Japanese interior, Japanese aesthetic, Shibuya or Shinjuku street scene, J-style photography';
        case 'zh': return 'authentic Chinese lifestyle, modern Chinese cityscape or interior, contemporary Chinese aesthetic photography';
        case 'en': return 'authentic Western lifestyle, modern cosmopolitan cityscape or interior, contemporary lifestyle photography';
        case 'es': return 'authentic Latin lifestyle, vibrant local cityscape or interior, warm Mediterranean aesthetic, lifestyle photography';
        case 'fr': return 'authentic French lifestyle, Parisian aesthetic, modern French interior or street scene, elegant lifestyle photography';
        case 'de': return 'authentic German lifestyle, modern European cityscape or interior, contemporary lifestyle photography';
        case 'pt': return 'authentic Portuguese or Brazilian lifestyle, vibrant local cityscape or interior, warm aesthetic, lifestyle photography';
        default:   return 'authentic local lifestyle aesthetic, modern cityscape or interior appropriate for the target audience, cinematic lifestyle photography';
    }
};

export const generateImage = async (
    prompt: string,
    aspectRatio: '16:9' | '1:1',
    blogPlatform: string = 'tistory',
    imageType: 'main' | 'sub' = 'main',
    language: string = 'ko'
): Promise<string | null> => {
    const countryAesthetic = getCountryAesthetic(language);
    const enhancedPrompt = `NO text, NO letters, NO words, NO typography, NO watermark, NO captions, NO signs, NO labels, purely visual image only — ${prompt}, ${countryAesthetic}, cinematic lighting, sharp detail, 8k resolution.`;

    const [width, height] = getPlatformImageSize(imageType, aspectRatio, blogPlatform);

    // 1순위: Pollinations.ai (무료, API 키 불필요)
    const free = await generateImageWithPollinations(enhancedPrompt, width, height);
    if (free) return free;

    // 2순위: Gemini (유료 플랜일 때 자동 fallback)
    return await generateImageWithGemini(enhancedPrompt, aspectRatio);
};

/**
 * API 키가 유효한지 실제로 테스트합니다.
 * 성공 시 그냥 반환, 실패 시 에러 throw
 */
export const testGeminiApiKey = async (key: string): Promise<void> => {
    const trimmed = key.trim();
    if (!trimmed) throw new Error("API 키를 입력해주세요.");
    const testClient = new GoogleGenAI({ apiKey: trimmed });
    const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("연결 시간 초과 (10초). 네트워크를 확인해주세요.")), 10000)
    );
    try {
        await Promise.race([
            testClient.models.generateContent({
                model: 'gemini-2.5-flash',
                contents: 'Hi',
            }),
            timeoutPromise
        ]);
    } catch (error: any) {
        const msg: string = error?.message || String(error);
        if (msg.includes('timeout') || msg.includes('시간 초과')) throw error;
        if (msg.toLowerCase().includes('api key') || msg.includes('401') || msg.includes('403')) {
            throw new Error("API 키가 유효하지 않습니다. 키를 다시 확인해주세요.");
        }
        if (msg.toLowerCase().includes('failed to fetch') || msg.toLowerCase().includes('networkerror')) {
            throw new Error("네트워크 오류: Google API 서버에 연결할 수 없습니다. 인터넷 연결 또는 브라우저 확장 프로그램을 확인해주세요.");
        }
        throw new Error(`API 오류: ${msg}`);
    }
};

export const regenerateBlogPostHtml = async (currentHtml: string, feedback: string, theme: ColorTheme, currentDate: string): Promise<string> => {
     const prompt = `Revise this HTML based on feedback: "${feedback}". \n${currentHtml}`;
     try {
         const response = await getAi().models.generateContent({
             model: "gemini-2.5-pro",
             contents: prompt,
         });
         return response.text?.trim().replace(/^```html\s*|\s*```$/g, '') || currentHtml;
     } catch (error) { throw error; }
};

export const recommendAffiliateProducts = async (topic: string, contentContext?: string): Promise<{ name: string, description: string }[]> => {
    const contextPart = contentContext ? `\n\n블로그 글 핵심 내용:\n${contentContext}` : '';
    const prompt = `당신은 한국 블로그 제휴 마케팅 전문가입니다.
아래 블로그 글 주제와 내용을 분석하여, 독자가 실제로 구매할 가능성이 높은 쿠팡/제휴 상품 6개를 추천해주세요.

블로그 주제: "${topic}"${contextPart}

[추천 기준]
- 블로그 글의 주제·내용과 직접적으로 연관된 상품
- 독자가 글을 읽은 후 자연스럽게 필요로 할 상품
- 한국 쿠팡에서 실제로 판매되는 상품 카테고리
- 너무 비싸거나 광고처럼 보이지 않는 자연스러운 추천

[출력 형식 - JSON 배열만 출력, 다른 텍스트 금지]
[
  {"name": "상품명 (구체적으로)", "description": "이 상품을 추천하는 이유 (독자 입장에서 20자 이내)"},
  ...6개
]`;
    try {
         const response = await getAi().models.generateContent({
            model: "gemini-2.5-flash",
            contents: prompt,
            config: { tools: [{googleSearch: {}}], thinkingConfig: { thinkingBudget: 0 } }
        });
        return extractJsonFromText(response.text);
    } catch (error) { return []; }
};

export const generateAffiliateAdHook = async (product: { name: string, description: string }): Promise<string> => {
    const prompt = `제휴 광고 후킹 메시지를 작성하세요.
상품명: "${product.name}"

규칙:
- 구매 욕구를 자극하는 짧고 강렬한 한국어 문구
- 텍스트만 출력 (글자 수, 괄호, 마크다운, 따옴표 절대 포함 금지)
- 문구 이외의 어떤 설명도 붙이지 말 것

예시 출력: 지금 바로 최저가 확인!`;
    try {
        const response = await getAi().models.generateContent({
            model: "gemini-2.5-flash",
            contents: prompt,
            config: { thinkingConfig: { thinkingBudget: 0 } },
        });
        const raw = response.text?.trim() || "자세히 보기";
        // thinking 잔재(THOUGHTS: / ANSWER: 등) 및 마크다운 제거 후 첫 줄만 반환
        const cleaned = raw
            .split('\n')
            .map(l => l.replace(/\(.*?\)/g, '').replace(/["'*]/g, '').trim())
            .filter(l => l.length > 0 && !/^(THOUGHTS?|ANSWER|NOTE|EXPLANATION)\s*:/i.test(l))
            .find(l => l.length > 0) || "자세히 보기";
        return cleaned;
    } catch (error) { return "자세히 보기"; }
};

export const generateProductDescription = async (productName: string): Promise<string> => {
    const prompt = `제휴 광고용 상품 설명 한 줄을 작성하세요.
상품명: "${productName}"

규칙:
- 고객이 즉시 구매 버튼을 누르고 싶도록 핵심 혜택을 간결하게 전달
- 전문 용어 없이 누구나 이해하는 쉬운 표현 사용
- 텍스트만 출력 (글자 수, 괄호, 마크다운, 번호, 따옴표 절대 포함 금지)

예시 출력: 무료배송+최저가, 오늘 한정 특가!`;
    try {
        const response = await getAi().models.generateContent({
            model: "gemini-2.5-flash",
            contents: prompt,
            config: { thinkingConfig: { thinkingBudget: 0 } },
        });
        const raw = response.text?.trim() || "상품 상세 정보를 확인하세요.";
        const cleaned = raw
            .split('\n')
            .map(l => l.replace(/\(.*?\)/g, '').replace(/^[\d]+[\.\)]\s*/, '').replace(/[*"']/g, '').replace(/^[-•]\s*/, '').trim())
            .filter(l => l.length > 0 && !/^(THOUGHTS?|ANSWER|NOTE|EXPLANATION)\s*:/i.test(l))
            .find(l => l.length > 0) || "상품 상세 정보를 확인하세요.";
        return cleaned;
    } catch (error) { return "상품 상세 정보를 확인하세요."; }
};
