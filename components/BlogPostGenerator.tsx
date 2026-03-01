
// Add missing React and hooks imports
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { ColorTheme, ProcessedContent, InternalLink } from '../types';
// Add missing COLOR_THEMES import
import { COLOR_THEMES } from '../constants';
import { generateBlogPost, suggestInteractiveElementForTopic, generateImage, regenerateBlogPostHtml, recommendAffiliateProducts, generateAffiliateAdHook, generateProductDescription } from '../services/geminiService';
import { fetchPageTitle } from '../services/keywordService';
import { ErrorMessage, CopyToClipboardButton, base64ToBlobUrl, copyToClipboard } from './Common';
import { BulkLinkModal } from './BulkLinkModal';
import { ResultDisplay } from './ResultDisplay';

interface BlogPostGeneratorProps {
    topic: string;
    setTopic: (topic: string) => void;
    additionalRequest: string;
    setAdditionalRequest: (req: string) => void;
    activeSuggestionTab: string;
    memoContent: string;
    onAnalyzeUrl: (url: string, description?: string, anchor?: string) => void;
    onReset: () => void;
    detectedPlatform?: string;
}

const LANGUAGES = [
  { code: 'ko', name: '한국어 (Korean)' },
  { code: 'en', name: '영어 (English)' },
  { code: 'ja', name: '일본어 (Japanese)' },
  { code: 'zh', name: '중국어 (Chinese)' },
  { code: 'es', name: '스페인어 (Spanish)' },
  { code: 'fr', name: '프랑스어 (French)' },
  { code: 'de', name: '독일어 (German)' },
];

const PLATFORMS = [
  { value: 'auto',      label: '자동 (AI 판단)', chars: '주제에 따라 자동' },
  { value: 'tistory',   label: '티스토리',    chars: '8,000~10,000자' },
  { value: 'blogspot',  label: '블로그스팟',  chars: '8,000~10,000자' },
  { value: 'wordpress', label: '워드프레스',  chars: '8,000~12,000자' },
  { value: 'naver',     label: '네이버 블로그', chars: '3,000~5,000자' },
  { value: 'brunch',    label: '브런치',      chars: '4,000~6,000자' },
];

const TONES = [
  { value: 'default', label: '기본 (AI 자동)' },
  { value: 'tistory', label: '티스토리 친근한 형/언니 (해요체)' },
  { value: 'friendly', label: '친근한/공감하는' },
  { value: 'professional', label: '전문적인/분석적인' },
  { value: 'humorous', label: '유머러스하고 재치있는' },
  { value: 'formal', label: '차분하고 격식있는' },
  { value: 'enthusiastic', label: '열정적인/동기부여' },
];

const TARGETS = [
  { value: 'default', label: '기본 (일반 대중)' },
  { value: 'beginner', label: '초보자/입문자' },
  { value: 'expert', label: '전문가/실무자' },
  { value: 'student', label: '학생/취준생' },
  { value: 'parent', label: '주부/학부모' },
  { value: 'single', label: '1인 가구' },
  { value: 'senior', label: '시니어/은퇴자' },
];

const THUMBNAIL_COLORS = [
    '#FFFFFF', '#000000', '#F44336', '#E91E63', '#9C27B0', 
    '#673AB7', '#3F51B5', '#2196F3', '#03A9F4', '#00BCD4', 
    '#009688', '#4CAF50', '#8BC34A', '#CDDC39', '#FFEB3B', 
    '#FFC107', '#FF9800', '#FF5722', '#795548', '#9E9E9E', 
    '#607D8B'
];

const PRESET_INTERNAL_LINKS = [
    { url: "https://jinajang.com", anchor: "별잔치", description: "세상이라는 거대한 우주 속에서 자신만의 빛을 낸 세계 각국의 인물들을 조명합니다. 시대를 앞서간 리더, 예술혼을 불태운 거장, 그리고 묵묵히 세상을 바꾼 숨은 영웅들까지. 그들의 치열했던 삶과 빛나는 순간들을 이곳에 모았습니다. 당신의 가슴을 뛰게 할 별들의 이야기에 초대합니다." },
    { url: "https://honeypartner.jinajang.com", anchor: "꿀딴지", description: "실생활에 유익한 생활 꿀팁, 건강 정보, 여행 코디, 육아·출산 팁 등 다양한 주제 제공" },
    { url: "https://warehouse.jinajang.com", anchor: "보험창고", description: "보험 관련 정보와 노하우를 중심으로 다양한 콘텐츠를 제공하는 전문 블로그입니다." },
    { url: "https://healing-world.jinajang.com", anchor: "힐링세상", description: "스트레스와 바쁜 일상 속에서 진정한 쉼과 힐링을 찾고자 하는 분들을 위한 국내 여행 블로그입니다" },
    { url: "https://honey-tip.jinajang.com", anchor: "생활달인꿀팁", description: "살림과 생활 속에서 활용할 수 있는 실용적이고 스마트한 꿀팁을 소개하는 전문 콘텐츠 블로그입니다. 다양한 일상 문제에 대한 해결책을 깔끔하게 정리해 전달해요." },
    { url: "https://grandmotherwook.jinajang.com", anchor: "오늘도 멍냥해", description: "이 블로그에서는 반려동물의 건강관리, 훈련 꿀팁, 용품 리뷰, 펫보험 비교, 펫호텔 후기까지 진짜 집사의 경험을 바탕으로 한 유용한 정보만 담고 있어요." },
    { url: "https://mind-trainer.jinajang.com", anchor: "매일1%성장", description: "하루 1% 성장하는 삶을 꿈꾸며, 내면의 근육을 키우는 실천형 블로그입니다. 자기개발, 멘탈관리, 루틴 설계, 감정코칭까지! 진짜 변화는 마음을 다스리는 것에서 시작됩니다. 함께 실천하고 성장하는 공간, 지금 시작해보세요." },
    { url: "https://power-routine.jinajang.com", anchor: "루틴의힘", description: "영어, 자격증, 공부 루틴까지! 합격을 향한 모든 과정을 기록하는 성장형 블로그입니다. 매일 작게 쌓는 루틴으로 인생을 바꾸는 법, 실전 합격전략과 공부노하우를 공유합니다. 직장인부터 학생까지, 누구든 따라할 수 있도록 쉽게! 실천형 공부 블로그 지금 시작하세요." },
    { url: "https://it-life.jinajang.com", anchor: "IT생활백서", description: "노트북, 스마트폰, 태블릿, 주변기기까지! 직접 써보고 비교하며 진짜 가성비 제품만 소개하는 디지털 기기 리뷰 블로그입니다. 현직 IT 마케터 & 사용자 시점으로 사양 분석, 활용 팁, 구매 가이드까지 제공!" },
    { url: "https://house-guidebook.jinajang.com", anchor: "내집마련가이드북", description: "전·월세, 매매, 청약, 분양, 재개발까지! 실거래가 분석부터 지역 입지, 투자 리스크 관리까지 누구나 이해할 수 있도록 정리합니다. 실수요자, 부린이, 투자자까지 누구에게나 유익한 실전형 부동산 정보 블로그입니다." },
    { url: "https://worlds-storys.blogspot.com/", anchor: "하루의양식", description: "삶에 필요한 모든 이야기와 꿀팁 모음. 건강, IT, 부동산, 생활 지혜, 자기계발 등 일상에 활력을 더하는 정보를 하루 한 조각씩 제공합니다." },
    { url: "https://props2025.blogspot.com/", anchor: "이쁘니 소품이지", description: "최신 인테리어 트렌드를 반영하여, 좁은 자취방도 호텔처럼 꾸미는 소품 활용법을 공유합니다. 미니멀 수납, 조명 오브제 트렌드, 연말연시 선물 소품 추천 등 실생활에 바로 적용 가능한 감각적인 소품과 인테리어 팁을 심도 있게 다룹니다." },
    { url: "https://health-protector2025.blogspot.com/", anchor: "건강지킴이", description: "현대인의 삶의 질을 높이는 과학 기반의 건강 정보를 제공합니다. 수면, 정신 건강, 간 건강 관리부터 계절성 질환 극복 전략까지! 최신 의학 트렌드와 실용적인 영양제 정보를 통해 당신의 건강을 365일 지켜드립니다." },
    { url: "https://cafe-tour2025.blogspot.com/", anchor: "카페탐방", description: "단순히 사진만 예쁜 곳을 넘어, 맛과 분위기, 음악까지 오감을 만족시키는 진정한 감성 카페를 찾아 탐방합니다. 노을 뷰, 단풍 뷰 등 계절별 테마 카페 추천부터 BEST 디저트 조합, 힐링 음악이 있는 카페의 숨겨진 가치까지!" },
    { url: "https://with-skin.blogspot.com/", anchor: "피부미인", description: "민감성 피부 장벽 강화와 트러블 해결을 위한 과학적이고 실용적인 정보를 제공합니다. 홍조 응급 진정법, 시술 후 회복 노하우, 10분 아침 루틴 등 바쁜 현대인을 위한 효과 만점의 뷰티 팁과 스킨케어 트렌드 전망을 지금 만나보세요." },
];

export const BlogPostGenerator: React.FC<BlogPostGeneratorProps> = ({
    topic, setTopic, additionalRequest, setAdditionalRequest, activeSuggestionTab, memoContent, onAnalyzeUrl, onReset, detectedPlatform
}) => {
  const [topicCopied, setTopicCopied] = useState<boolean>(false);
  const [selectedTheme, setSelectedTheme] = useState<ColorTheme>(COLOR_THEMES[0]);
  const [generatedContent, setGeneratedContent] = useState<ProcessedContent | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [isGeneratingImage, setIsGeneratingImage] = useState<boolean>(false);
  const [isGeneratingSubImages, setIsGeneratingSubImages] = useState<Record<number, boolean>>({});
  const [regenerationFeedback, setRegenerationFeedback] = useState<string>('');
  const [isRegenerating, setIsRegenerating] = useState<boolean>(false);
  const [isStateLoaded, setIsStateLoaded] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  // Link State
  const [shouldIncludeInternalLinks, setShouldIncludeInternalLinks] = useState<boolean>(true);
  const [internalLinksList, setInternalLinksList] = useState<InternalLink[]>([]);
  const [externalSourceOption, setExternalSourceOption] = useState<'auto' | 'manual' | 'none'>('auto');
  const [externalLinks, setExternalLinks] = useState<string>(`https://seo.google.com/search-central/docs/fundamentals/seo-starter-guide?hl=ko
https://searchadvisor.naver.com/
https://search.google.com/search-console/about
https://analytics.google.com/analytics/web/
https://trends.google.com/trends/
https://blackkiwi.net/`);
  const [isBulkLinkModalOpen, setIsBulkLinkModalOpen] = useState<boolean>(false);
  const internalLinkCounter = useRef(0);

  // Affiliate Ad State
  const [shouldGenerateAffiliateAd, setShouldGenerateAffiliateAd] = useState<boolean>(false);
  const [adStyle, setAdStyle] = useState<'card' | 'banner' | 'text'>('banner');
  const [adProduct, setAdProduct] = useState<{ name: string; description: string; link: string; image?: string; } | null>(null);
  const [isRecommendingProducts, setIsRecommendingProducts] = useState<boolean>(false);
  const [recommendedProducts, setRecommendedProducts] = useState<{ name: string; description: string; }[] | null>(null);
  const [adHookMessage, setAdHookMessage] = useState<string>('');
  const [isGeneratingHook, setIsGeneratingHook] = useState<boolean>(false);
  const [adDisclosureOption, setAdDisclosureOption] = useState<'none' | 'custom'>('custom');
  const [adDisclosureText, setAdDisclosureText] = useState('이 포스팅은 쿠팡 파트너스 활동의 일환으로, 이에 따른 일정액의 수수료를 제공받습니다.');
  const [adPreviewHtml, setAdPreviewHtml] = useState('');
  const [isGeneratingDescription, setIsGeneratingDescription] = useState<boolean>(false);

  // Generation Options
  const [shouldGenerateImage, setShouldGenerateImage] = useState<boolean>(false);
  const [shouldGenerateSubImages, setShouldGenerateSubImages] = useState<boolean>(false);
  const [shouldIncludeInteractiveElement, setShouldIncludeInteractiveElement] = useState<boolean>(false);
  const [interactiveElementIdea, setInteractiveElementIdea] = useState<string | null>(null);
  const [isSuggestingInteractiveElement, setIsSuggestingInteractiveElement] = useState<boolean>(false);
  const [shouldGenerateCta, setShouldGenerateCta] = useState<boolean>(false);
  
  // Tone & Target Audience
  const [tone, setTone] = useState<string>('default');
  const [targetAudience, setTargetAudience] = useState<string>('default');
  const [language, setLanguage] = useState<string>('ko');
  const [blogPlatform, setBlogPlatform] = useState<string>('auto');

  useEffect(() => {
    if (detectedPlatform) setBlogPlatform(detectedPlatform);
  }, [detectedPlatform]);
  
  // Thumbnail Options
  const [shouldAddThumbnailText, setShouldAddThumbnailText] = useState<boolean>(false);
  const [thumbnailText, setThumbnailText] = useState<string>('');
  const [thumbnailDataUrl, setThumbnailDataUrl] = useState<string | null>(null);
  const [isGeneratingThumbnail, setIsGeneratingThumbnail] = useState<boolean>(false);
  const [thumbnailAspectRatio, setThumbnailAspectRatio] = useState<'16:9' | '1:1'>('16:9');
  const [thumbnailFont, setThumbnailFont] = useState<string>('Pretendard');
  const [thumbnailColor, setThumbnailColor] = useState<string>('#FFFFFF');
  const [thumbnailFontSize, setThumbnailFontSize] = useState<number>(100);
  const [thumbnailOutlineWidth, setThumbnailOutlineWidth] = useState<number>(8);

  const blobUrlsToRevoke = useRef<string[]>([]);
  useEffect(() => {
    return () => {
      blobUrlsToRevoke.current.forEach(URL.revokeObjectURL);
    };
  }, []);

  const FORM_STATE_KEY = 'blogGeneratorFormState';
  const INTERNAL_LINKS_KEY = 'blogGeneratorInternalLinks';

  // Load/Save State Logic
  useEffect(() => {
      if (!isStateLoaded) return;
      const formState = {
        topic,
        selectedThemeName: selectedTheme.name,
        additionalRequest,
        externalLinks,
        shouldGenerateImage,
        shouldGenerateSubImages,
        shouldIncludeInteractiveElement,
        tone,
        targetAudience,
        language,
        blogPlatform,
        shouldAddThumbnailText,
        thumbnailAspectRatio,
        thumbnailFont,
        thumbnailFontSize,
        thumbnailOutlineWidth,
        thumbnailColor,
        thumbnailText,
        shouldGenerateCta,
        shouldGenerateAffiliateAd,
        adStyle,
        adDisclosureOption,
        adDisclosureText,
        shouldIncludeInternalLinks,
      };
      localStorage.setItem(FORM_STATE_KEY, JSON.stringify(formState));
    }, [
      isStateLoaded,
      topic, selectedTheme, additionalRequest, externalLinks,
      shouldGenerateImage, shouldGenerateSubImages,
      shouldIncludeInteractiveElement, tone, targetAudience, language, blogPlatform, shouldAddThumbnailText,
      thumbnailAspectRatio, thumbnailFont, thumbnailFontSize, thumbnailOutlineWidth, thumbnailColor, thumbnailText, shouldGenerateCta,
      shouldGenerateAffiliateAd, adStyle, adDisclosureOption, adDisclosureText,
      shouldIncludeInternalLinks
    ]);

    useEffect(() => {
        if (!isStateLoaded) return;
        localStorage.setItem(INTERNAL_LINKS_KEY, JSON.stringify(internalLinksList));
    }, [internalLinksList, isStateLoaded]);

    useEffect(() => {
      try {
        const savedStateJSON = localStorage.getItem(FORM_STATE_KEY);
        if (savedStateJSON) {
          const savedState = JSON.parse(savedStateJSON);
          if (!topic && savedState.topic) setTopic(savedState.topic);
          
          if (savedState.selectedThemeName) {
            const theme = COLOR_THEMES.find(t => t.name === savedState.selectedThemeName) || COLOR_THEMES[0];
            setSelectedTheme(theme);
          }
          if (savedState.additionalRequest) setAdditionalRequest(savedState.additionalRequest);
          if (savedState.externalLinks) setExternalLinks(savedState.externalLinks);
          if (typeof savedState.shouldGenerateImage === 'boolean') setShouldGenerateImage(savedState.shouldGenerateImage);
          if (typeof savedState.shouldGenerateSubImages === 'boolean') setShouldGenerateSubImages(savedState.shouldGenerateSubImages);
          if (typeof savedState.shouldIncludeInteractiveElement === 'boolean') setShouldIncludeInteractiveElement(savedState.shouldIncludeInteractiveElement);
          if (savedState.tone) setTone(savedState.tone);
          if (savedState.targetAudience) setTargetAudience(savedState.targetAudience);
          if (savedState.language) setLanguage(savedState.language);
          if (savedState.blogPlatform) setBlogPlatform(savedState.blogPlatform);
          if (typeof savedState.shouldAddThumbnailText === 'boolean') setShouldAddThumbnailText(savedState.shouldAddThumbnailText);
          if (savedState.thumbnailAspectRatio) setThumbnailAspectRatio(savedState.thumbnailAspectRatio);
          if (savedState.thumbnailFont) setThumbnailFont(savedState.thumbnailFont);
          if (typeof savedState.thumbnailFontSize === 'number') setThumbnailFontSize(savedState.thumbnailFontSize);
          if (typeof savedState.thumbnailOutlineWidth === 'number') setThumbnailOutlineWidth(savedState.thumbnailOutlineWidth);
          if (savedState.thumbnailColor) setThumbnailColor(savedState.thumbnailColor);
          if (savedState.thumbnailText !== undefined) setThumbnailText(savedState.thumbnailText);
          if (typeof savedState.shouldGenerateCta === 'boolean') setShouldGenerateCta(savedState.shouldGenerateCta);
          
          if (typeof savedState.shouldGenerateAffiliateAd === 'boolean') setShouldGenerateAffiliateAd(savedState.shouldGenerateAffiliateAd);
          if (savedState.adStyle) setAdStyle(savedState.adStyle);
          if (savedState.adDisclosureOption) setAdDisclosureOption(savedState.adDisclosureOption);
          if (savedState.adDisclosureText) setAdDisclosureText(savedState.adDisclosureText);
          if (typeof savedState.shouldIncludeInternalLinks === 'boolean') setShouldIncludeInternalLinks(savedState.shouldIncludeInternalLinks);
        }
      } catch (e) {
        console.error("Failed to load or parse form state from localStorage", e);
        localStorage.removeItem(FORM_STATE_KEY);
      } finally {
        setIsStateLoaded(true);
      }
    }, []); 

    useEffect(() => {
        try {
            const savedLinksJSON = localStorage.getItem(INTERNAL_LINKS_KEY);

            // localStorage에 키 자체가 있으면 (빈 배열 포함) 그대로 복원
            if (savedLinksJSON !== null) {
                const savedLinks = JSON.parse(savedLinksJSON);
                if (Array.isArray(savedLinks)) {
                    // 앱 재시작 시 가져오는 중/실패 상태 초기화
                    const cleanedLinks = savedLinks.map((link: InternalLink) => ({
                        ...link,
                        isFetchingAnchor: false,
                        anchor: (link.anchor === '제목 가져오는 중...' || link.anchor === '제목 가져오기 실패') ? '' : link.anchor,
                    }));
                    const maxId = cleanedLinks.reduce((max: number, item: InternalLink) => Math.max(max, item.id || 0), 0);
                    setInternalLinksList(cleanedLinks);
                    internalLinkCounter.current = maxId + 1;
                    return;
                }
            }

            // localStorage에 키 자체가 없을 때(최초 실행)만 프리셋으로 초기화
            const initialLinks = PRESET_INTERNAL_LINKS.map((preset, index) => ({
                id: index + 1,
                url: preset.url,
                anchor: preset.anchor,
                description: preset.description
            }));
            setInternalLinksList(initialLinks);
            internalLinkCounter.current = initialLinks.length + 1;
            localStorage.setItem(INTERNAL_LINKS_KEY, JSON.stringify(initialLinks));
        } catch (e) {
            console.error("Failed to load or parse internal links from localStorage", e);
            localStorage.removeItem(INTERNAL_LINKS_KEY);
            const initialLinks = PRESET_INTERNAL_LINKS.map((preset, index) => ({
                id: index + 1,
                url: preset.url,
                anchor: preset.anchor,
                description: preset.description
            }));
            setInternalLinksList(initialLinks);
            internalLinkCounter.current = initialLinks.length + 1;
        }
    }, []);

  const handleCopyTopic = useCallback(async () => {
    if (!topic) return;
    const success = await copyToClipboard(topic);
    if (success) {
      setTopicCopied(true);
      setTimeout(() => setTopicCopied(false), 2000);
    }
  }, [topic]);

  useEffect(() => {
    setInteractiveElementIdea(null);
    if (shouldIncludeInteractiveElement && topic.trim()) {
      setIsSuggestingInteractiveElement(true);
      const handler = setTimeout(async () => {
        try {
          const idea = await suggestInteractiveElementForTopic(topic);
          setInteractiveElementIdea(idea);
        } catch (e) {
          console.error("Failed to suggest interactive element", e);
          setInteractiveElementIdea("오류: 인터랙티브 요소 아이디어를 가져오지 못했습니다.");
        } finally {
          setIsSuggestingInteractiveElement(false);
        }
      }, 800);

      return () => {
        clearTimeout(handler);
        setIsSuggestingInteractiveElement(false);
      };
    }
  }, [shouldIncludeInteractiveElement, topic]);

  useEffect(() => {
    if (generatedContent?.supplementaryInfo) {
      setThumbnailText(topic);
    } else {
      setThumbnailText('');
    }
    setThumbnailDataUrl(null);
  }, [generatedContent, topic]);

  useEffect(() => {
    if (!shouldGenerateImage) {
        setShouldAddThumbnailText(false);
    }
  }, [shouldGenerateImage]);


  // Internal Links Handlers
  const handleAddInternalLink = () => {
    setInternalLinksList(prev => [...prev, { id: internalLinkCounter.current++, url: '', anchor: '', description: '' }]);
  };
  
  const handleUpdateInternalLink = (id: number, field: 'url' | 'anchor' | 'description', value: string) => {
    setInternalLinksList(prev => prev.map(link => link.id === id ? { ...link, [field]: value } : link));
  };
  
  const handleRemoveInternalLink = (id: number) => {
    setInternalLinksList(prev => prev.filter(link => link.id !== id));
  };

  const fetchAndSetAnchor = useCallback(async (id: number, url: string) => {
      if (!url || !url.startsWith('http')) {
          setInternalLinksList(prev => prev.map(link => 
              link.id === id ? { ...link, isFetchingAnchor: false, anchor: '' } : link
          ));
          return;
      }
      
      setInternalLinksList(prev => prev.map(link => 
          link.id === id ? { ...link, isFetchingAnchor: true, anchor: '제목 가져오는 중...' } : link
      ));

      try {
          const title = await fetchPageTitle(url);
          setInternalLinksList(prev => prev.map(link =>
              link.id === id ? { ...link, anchor: title || url, isFetchingAnchor: false } : link
          ));
      } catch (error) {
          console.error(`Failed to fetch title for ${url}:`, error);
          setInternalLinksList(prev => prev.map(link =>
              link.id === id ? { ...link, anchor: '제목 가져오기 실패', isFetchingAnchor: false } : link
          ));
      }
  }, []);

  const handleUrlBlur = useCallback((id: number, url: string) => {
      const link = internalLinksList.find(l => l.id === id);
      if (link && url.trim().startsWith('http') && !link.anchor.trim()) {
          fetchAndSetAnchor(id, url);
      }
  }, [internalLinksList, fetchAndSetAnchor]);

  const handleBulkAddLinks = useCallback((text: string) => {
      const lines = text.split('\n').filter(line => line.trim() !== '');
      const newLinks: InternalLink[] = [];
      const linksToFetch: { id: number; url: string }[] = [];

      lines.forEach(line => {
          const trimmedLine = line.trim();
          const separatorRegex = /[\s,	]+/; // Space, comma, or tab
          const parts = trimmedLine.split(separatorRegex);
          
          if (parts.length === 0 || !parts[0].startsWith('http')) {
              return; // Skip invalid lines
          }

          const url = parts[0];
          const anchor = parts.slice(1).join(' ').trim();
          const newId = internalLinkCounter.current++;

          if (anchor) {
              newLinks.push({ id: newId, url, anchor, description: '' });
          } else {
              newLinks.push({ id: newId, url, anchor: '', description: '', isFetchingAnchor: true });
              linksToFetch.push({ id: newId, url });
          }
      });

      if (newLinks.length > 0) {
          setInternalLinksList(prev => [...prev, ...newLinks]);
          setTimeout(() => {
              linksToFetch.forEach(linkToFetch => {
                  fetchAndSetAnchor(linkToFetch.id, linkToFetch.url);
              });
          }, 0);
      }
  }, [fetchAndSetAnchor]);

    // Affiliate Handlers
    const handleRecommendProducts = async () => {
        if (!topic) {
            setError("상품 추천을 위해 블로그 주제를 먼저 입력해주세요.");
            return;
        }
        setIsRecommendingProducts(true);
        setRecommendedProducts(null);
        setAdProduct(null);
        setAdHookMessage('');
        setError(null);
        try {
            // 생성된 블로그 내용이 있으면 키워드+메타설명을 맥락으로 전달
            const contentContext = generatedContent?.supplementaryInfo
                ? `키워드: ${generatedContent.supplementaryInfo.keywords?.join(', ') || ''}\n설명: ${generatedContent.supplementaryInfo.metaDescription || ''}`
                : undefined;
            const products = await recommendAffiliateProducts(topic, contentContext);
            setRecommendedProducts(products);
        } catch (err) {
            const message = err instanceof Error ? err.message : '상품 추천 중 알 수 없는 오류가 발생했습니다.';
            setError(message);
        } finally {
            setIsRecommendingProducts(false);
        }
    };
    
    const handleSelectProduct = async (product: { name: string, description: string }) => {
        setAdProduct({ ...product, link: '' });
        setAdHookMessage('');
        setIsGeneratingHook(true);
        setError(null);
        try {
            const hook = await generateAffiliateAdHook({ name: product.name, description: product.description });
            setAdHookMessage(hook);
        } catch (err) {
            const message = err instanceof Error ? err.message : '후킹 메시지 생성 중 오류가 발생했습니다.';
            setError(message);
            setAdHookMessage('');
        } finally {
            setIsGeneratingHook(false);
        }
    };

    const handleAdProductChange = async (field: 'name' | 'description' | 'link', value: string) => {
        let newName = '';
        let newImage = '';
        let newLink = value;
        let isHtml = false;

        // Check if it's HTML (Coupang Partners usually provides <a href... or <iframe...)
        if (field === 'link' && (value.includes('<a ') || value.includes('<iframe') || value.includes('</iframe>') || value.includes('</a>'))) {
            isHtml = true;
            try {
                const parser = new DOMParser();
                const doc = parser.parseFromString(value, 'text/html');
                const linkTag = doc.querySelector('a');
                const imgTag = doc.querySelector('img');
                
                newLink = linkTag?.href || value.match(/href="([^"]*)"/)?.[1] || value; // Fallback regex
                newImage = imgTag?.src || value.match(/src="([^"]*)"/)?.[1] || adProduct?.image || '';
                newName = imgTag?.alt || doc.querySelector('.name')?.textContent?.trim() || adProduct?.name || '';
  
            } catch (e) {
                console.error("Error parsing HTML:", e);
                newLink = value;
            }
        }
        
        setAdProduct(prev => {
            const newProduct = prev ? { ...prev } : { name: '', description: '', link: '', image: '' };
            if (isHtml) {
                newProduct.link = newLink;
                if (newImage) newProduct.image = newImage;
                if (newName) newProduct.name = newName;
            } else {
                newProduct[field as 'name' | 'description' | 'link'] = value;
            }
            return newProduct;
        });

        // Auto-generate description and hook if:
        // 1. It is HTML and we extracted something (link or name).
        // 2. OR it is a direct Link input (not HTML) that looks like a valid URL.
        const shouldAutoGenerate = (isHtml && (newName || newLink)) || 
                                   (!isHtml && field === 'link' && value.startsWith('http') && value.length > 10);

        if (shouldAutoGenerate) {
            setIsGeneratingDescription(true);
            setIsGeneratingHook(true);
            setAdHookMessage('');
            setError(null);
            
            // Determine the query to send to AI. Prefer Name, fallback to Link.
            const existingName = adProduct?.name || '';
            const queryName = isHtml ? newName : existingName;
            const queryLink = isHtml ? newLink : value;
            const query = queryName || queryLink;

            try {
                const description = await generateProductDescription(query);
                setAdProduct(prev => prev ? { ...prev, description } : null);
                
                // For hook generation, we need a name. If we don't have one, use "이 상품".
                const hookName = queryName || '이 상품';
                const hook = await generateAffiliateAdHook({ name: hookName, description });
                setAdHookMessage(hook);
            } catch (err) {
                 console.error("Auto-generation error:", err);
            } finally {
                setIsGeneratingDescription(false);
                setIsGeneratingHook(false);
            }
        }
    };

    const handleGenerateAdDescription = async () => {
        if (!adProduct?.name) {
            setError("상품명을 먼저 입력해주세요.");
            return;
        }
        setIsGeneratingDescription(true);
        setError(null);
        try {
            const description = await generateProductDescription(adProduct.name);
            handleAdProductChange('description', description);
        } catch (err) {
            const message = err instanceof Error ? err.message : '설명 생성 중 오류가 발생했습니다.';
            setError(message);
        } finally {
            setIsGeneratingDescription(false);
        }
    };

    const handleResetClick = () => {
        setShowResetConfirm(true);
    };

    const confirmReset = () => {
        setGeneratedContent(null);
        setError(null);
        setAdProduct(null);
        setRecommendedProducts(null);
        setAdHookMessage('');
        setRegenerationFeedback('');
        setAdPreviewHtml(''); // Clear preview
        onReset();
        setShowResetConfirm(false);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const cancelReset = () => {
        setShowResetConfirm(false);
    };

    useEffect(() => {
        if (!shouldGenerateAffiliateAd || !adProduct) {
            setAdPreviewHtml('<p class="text-gray-500 text-sm">AI 추천 받기 버튼을 눌러 상품을 추천 받으세요.</p>');
            return;
        }

        const disclosureHtml = adDisclosureOption === 'custom' && adDisclosureText
            ? `<p style="font-size: 10px; color: #888; text-align: center; margin-top: 8px;">${adDisclosureText}</p>`
            : '';
        
        const imageHtml = adProduct.image
            ? `<img src="${adProduct.image}" alt="${adProduct.name}" style="width: 100%; height: 100%; object-fit: contain; border-radius: 8px;">`
            : '상품 이미지';

        let adHtml = '';
        
        switch(adStyle) {
            case 'card':
                adHtml = `
                  <div style="border: 1px solid #e0e0e0; border-radius: 12px; padding: 16px; max-width: 300px; margin: auto; font-family: 'Noto Sans KR', sans-serif; box-shadow: 0 4px 12px rgba(0,0,0,0.08); background-color: #ffffff; text-align: center;">
                    <div style="width:100%; height: 300px; background: #f0f2f5; border-radius: 8px; margin-bottom: 12px; display: flex; align-items: center; justify-content: center; color: #a0a0a0; overflow: hidden;">${imageHtml}</div>
                    <h3 style="font-size: 16px; font-weight: 700; margin: 0 0 8px 0; color: #333; word-break: keep-all;">${adProduct.name}</h3>
                    <p style="font-size: 13px; color: #666; margin: 0 0 16px 0; line-height: 1.4;">${adProduct.description}</p>
                    <a href="${adProduct.link}" target="_blank" rel="noopener noreferrer sponsored" style="display: block; width: 100%; background-color: ${selectedTheme.colors.primary}; color: white; text-align: center; padding: 10px 0; border-radius: 8px; text-decoration: none; font-weight: bold; font-size: 15px;">
                      ${adHookMessage || '상품 보러가기'}
                    </a>
                    ${disclosureHtml}
                  </div>
                `;
                break;
            case 'banner':
                adHtml = `
                 <div style="border: 1px solid #e0e0e0; border-radius: 12px; padding: 16px; margin: auto; font-family: 'Noto Sans KR', sans-serif; box-shadow: 0 2px 8px rgba(0,0,0,0.05); background-color: #f8f9fa;">
                  <a href="${adProduct.link}" target="_blank" rel="noopener noreferrer sponsored" style="display: flex; align-items: center; gap: 16px; text-decoration: none;">
                    <div style="width: 150px; height: 150px; background: #e9ecef; border-radius: 8px; flex-shrink: 0; display: flex; align-items: center; justify-content: center; color: #a0a0a0; font-size: 10px; overflow: hidden;">${imageHtml}</div>
                    <div style="flex: 1;">
                        <h3 style="font-size: 15px; font-weight: 700; margin: 0 0 4px 0; color: #333;">${adProduct.name}</h3>
                        <p style="font-size: 13px; color: #666; margin: 0;">${adProduct.description}</p>
                    </div>
                    <div style="background-color: ${selectedTheme.colors.primary}; color: white; padding: 8px 16px; border-radius: 20px; font-weight: bold; font-size: 14px; white-space: nowrap;">
                      ${adHookMessage || '특가 확인'}
                    </div>
                  </a>
                   ${disclosureHtml}
                  </div>
                `;
                break;
            case 'text':
                adHtml = `
                    <div style="text-align: center; padding: 16px; margin: auto; background-color: ${selectedTheme.colors.highlightBg}; border-radius: 8px; border: 1px dashed ${selectedTheme.colors.primary};">${adProduct.description}</p>
                        <a href="${adProduct.link}" target="_blank" rel="noopener noreferrer sponsored" style="display: inline-block; background-color: ${selectedTheme.colors.primary}; color: white; padding: 8px 16px; border-radius: 25px; text-decoration: none; font-weight: bold; font-size: 14px;">
                            ${adHookMessage || '지금 확인하기'}
                        </a>
                        ${disclosureHtml}
                    </div>
                `;
                break;
        }
        setAdPreviewHtml(adHtml);

    }, [adStyle, adProduct, adDisclosureOption, adDisclosureText, adHookMessage, shouldGenerateAffiliateAd, selectedTheme]);


  const handleGenerate = useCallback(async () => {
    if (!topic) {
      setError('블로그 주제를 입력해주세요.');
      return;
    }
    setError(null);
    setIsLoading(true);
    setGeneratedContent(null);

    try {
      const finalInteractiveElementIdea = shouldIncludeInteractiveElement ? interactiveElementIdea : null;
      const finalRawContent = activeSuggestionTab === 'memo' ? memoContent : null;
      
      const currentDate = new Date();
      const formattedDate = new Intl.DateTimeFormat('ko-KR', {
        year: 'numeric', month: 'long', day: 'numeric', weekday: 'long'
      }).format(currentDate);

      // Only send internal links if the toggle is enabled
      const validInternalLinks = shouldIncludeInternalLinks
        ? internalLinksList
            .filter(link => link.url.trim())
            .map(link => ({
                ...link,
                // 시스템 메시지(가져오는 중/실패)는 빈 anchor로 정규화 → geminiService에서 URL로 대체됨
                anchor: (link.anchor && link.anchor !== '제목 가져오는 중...' && link.anchor !== '제목 가져오기 실패')
                    ? link.anchor : '',
            }))
        : [];

      const adDetails = (shouldGenerateAffiliateAd && adProduct) ? {
        style: adStyle,
        product: adProduct,
        disclosure: adDisclosureOption === 'custom' ? adDisclosureText : null,
        hookMessage: adHookMessage || null,
      } : null;

      const content = await generateBlogPost(
        topic, selectedTheme, shouldGenerateImage, 
        shouldGenerateSubImages, finalInteractiveElementIdea, 
        finalRawContent, tone, targetAudience, 
        additionalRequest, thumbnailAspectRatio, formattedDate,
        validInternalLinks, externalSourceOption, externalLinks,
        adDetails, shouldGenerateCta,
        language, blogPlatform
      );
      
      const newUrls: string[] = [];
      const imageUrl = content.imageBase64 ? base64ToBlobUrl(content.imageBase64) : null;
      if (imageUrl) newUrls.push(imageUrl);

      const subImagesWithUrls = content.subImages 
        ? content.subImages.map(img => {
            const url = img.base64 ? base64ToBlobUrl(img.base64) : null;
            if (url) newUrls.push(url);
            return { prompt: img.prompt, altText: img.altText, url: url };
          })
        : null;

      const processedContent: ProcessedContent = {
          blogPostHtml: content.blogPostHtml,
          supplementaryInfo: content.supplementaryInfo,
          socialMediaPosts: content.socialMediaPosts,
          imageUrl: imageUrl,
          subImages: subImagesWithUrls,
      };
      
      blobUrlsToRevoke.current.forEach(URL.revokeObjectURL);
      blobUrlsToRevoke.current = newUrls;

      setGeneratedContent(processedContent);

    } catch (err) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('알 수 없는 오류가 발생했습니다.');
      }
    } finally {
      setIsLoading(false);
    }
  }, [topic, selectedTheme, shouldGenerateImage, shouldGenerateSubImages, interactiveElementIdea, shouldIncludeInteractiveElement, activeSuggestionTab, memoContent, tone, targetAudience, additionalRequest, thumbnailAspectRatio, internalLinksList, shouldIncludeInternalLinks, externalSourceOption, externalLinks, shouldGenerateAffiliateAd, adProduct, adStyle, adDisclosureOption, adDisclosureText, adHookMessage, shouldGenerateCta, language]);

  const handleGenerateImage = async () => {
    if (!generatedContent?.supplementaryInfo.imagePrompt) return;

    setIsGeneratingImage(true);
    setError(null);
    try {
        const newImageBase64 = await generateImage(generatedContent.supplementaryInfo.imagePrompt, thumbnailAspectRatio, blogPlatform, 'main', language);
        if (newImageBase64) {
            const newImageUrl = base64ToBlobUrl(newImageBase64);
            setGeneratedContent(prev => {
                if (!prev) return null;
                if (prev.imageUrl) {
                    URL.revokeObjectURL(prev.imageUrl);
                    blobUrlsToRevoke.current = blobUrlsToRevoke.current.filter(url => url !== prev.imageUrl);
                }
                blobUrlsToRevoke.current.push(newImageUrl);
                return { ...prev, imageUrl: newImageUrl };
            });
        } else {
             setError("이미지를 생성하지 못했습니다.");
        }
    } catch (err) {
        if (err instanceof Error) {
            setError(err.message);
        } else {
            setError('이미지 생성 중 알 수 없는 오류가 발생했습니다.');
        }
    } finally {
        setIsGeneratingImage(false);
    }
  };
  
  const handleGenerateSubImage = async (index: number) => {
    if (!generatedContent?.subImages?.[index]?.prompt) return;

    setIsGeneratingSubImages(prev => ({ ...prev, [index]: true }));
    setError(null);
    try {
        const prompt = generatedContent.subImages[index].prompt;
        const newImageBase64 = await generateImage(prompt, '16:9', blogPlatform, 'sub', language);
        if (newImageBase64) {
            const newImageUrl = base64ToBlobUrl(newImageBase64);
            setGeneratedContent(prev => {
                if (!prev || !prev.subImages) return prev;
                const newSubImages = [...prev.subImages];
                const oldUrl = newSubImages[index].url;
                if(oldUrl) {
                    URL.revokeObjectURL(oldUrl);
                    blobUrlsToRevoke.current = blobUrlsToRevoke.current.filter(url => url !== oldUrl);
                }
                blobUrlsToRevoke.current.push(newImageUrl);
                newSubImages[index] = { ...newSubImages[index], url: newImageUrl };
                return { ...prev, subImages: newSubImages };
            });
        } else {
            setError(`서브 이미지 #${index + 1}을(를) 생성하지 못했습니다.`);
        }
    } catch (err) {
        if (err instanceof Error) {
            setError(err.message);
        } else {
            setError('서브 이미지 생성 중 알 수 없는 오류가 발생했습니다.');
        }
    } finally {
        setIsGeneratingSubImages(prev => ({ ...prev, [index]: false }));
    }
  };

  const handleRegenerate = useCallback(async () => {
    if (!regenerationFeedback.trim() || !generatedContent) {
      setError('피드백을 입력해주세요.');
      return;
    }
    setError(null);
    setIsRegenerating(true);

    try {
      const currentDate = new Date();
      const formattedDate = new Intl.DateTimeFormat('ko-KR', {
        year: 'numeric', month: 'long', day: 'numeric', weekday: 'long'
      }).format(currentDate);
      
      const newHtml = await regenerateBlogPostHtml(
        generatedContent.blogPostHtml, 
        regenerationFeedback, 
        selectedTheme, 
        formattedDate
      );

      setGeneratedContent(prev => prev ? ({ ...prev, blogPostHtml: newHtml }) : null);
      setRegenerationFeedback('');
      alert('본문이 성공적으로 재작성되었습니다.');
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('본문 재작성 중 알 수 없는 오류가 발생했습니다.');
      }
    } finally {
      setIsRegenerating(false);
    }
  }, [regenerationFeedback, generatedContent, selectedTheme]);

  const generateButtonGradient = () => {
    if (isLoading) return 'from-gray-500 to-gray-600 cursor-not-allowed';
    return 'from-blue-600 via-indigo-600 to-purple-600 hover:from-blue-500 hover:via-indigo-500 hover:to-purple-500 shadow-lg hover:shadow-cyan-500/50';
  };
  
  const handleGenerateThumbnail = async () => {
        if (!generatedContent?.imageUrl) return;
        setIsGeneratingThumbnail(true);
        try {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            const img = new Image();
            img.crossOrigin = "anonymous";
            
            await new Promise((resolve, reject) => {
                img.onload = resolve;
                img.onerror = reject;
                img.src = generatedContent.imageUrl!;
            });

            // Set dimensions
            canvas.width = thumbnailAspectRatio === '16:9' ? 1280 : 1080;
            canvas.height = thumbnailAspectRatio === '16:9' ? 720 : 1080;

            if (ctx) {
                // Draw Image
                const scale = Math.max(canvas.width / img.width, canvas.height / img.height);
                const x = (canvas.width / 2) - (img.width / 2) * scale;
                const y = (canvas.height / 2) - (img.height / 2) * scale;
                ctx.drawImage(img, x, y, img.width * scale, img.height * scale);

                // Add Overlay
                ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
                ctx.fillRect(0, 0, canvas.width, canvas.height);

                // Add Text
                if (shouldAddThumbnailText) {
                     const textToRender = thumbnailText || topic;
                     ctx.fillStyle = thumbnailColor;
                     ctx.font = `bold ${thumbnailFontSize}px ${thumbnailFont}, sans-serif`;
                     ctx.textAlign = 'center';
                     ctx.textBaseline = 'middle';
                     ctx.lineWidth = thumbnailOutlineWidth;
                     ctx.strokeStyle = 'black';

                     const words = textToRender.split(' ');
                     let line = '';
                     const lines = [];
                     const maxWidth = canvas.width * 0.8;

                     for(let n = 0; n < words.length; n++) {
                         const testLine = line + words[n] + ' ';
                         const metrics = ctx.measureText(testLine);
                         const testWidth = metrics.width;
                         if (testWidth > maxWidth && n > 0) {
                             lines.push(line);
                             line = words[n] + ' ';
                         } else {
                             line = testLine;
                         }
                     }
                     lines.push(line);
                     
                     const lineHeight = thumbnailFontSize * 1.2;
                     const startY = (canvas.height - (lines.length * lineHeight)) / 2 + (lineHeight / 2);

                     lines.forEach((l, i) => {
                         ctx.strokeText(l, canvas.width / 2, startY + (i * lineHeight));
                         ctx.fillText(l, canvas.width / 2, startY + (i * lineHeight));
                     });
                }
                
                const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
                setThumbnailDataUrl(dataUrl);
            }
        } catch (e) {
            console.error(e);
            alert('썸네일 생성 중 오류가 발생했습니다.');
        } finally {
            setIsGeneratingThumbnail(false);
        }
  };

  return (
    <div className="space-y-6">
        <div className="bg-gray-800 rounded-lg shadow-2xl p-4 md:p-8 space-y-6 border border-gray-700 relative">
            <div className="flex justify-between items-center pb-4 border-b border-gray-700">
                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                    <span>📝</span> 글 작성 설정
                </h2>
                
                {!showResetConfirm ? (
                    <button
                        onClick={handleResetClick}
                        className="flex items-center gap-2 bg-red-600/80 hover:bg-red-500 text-white px-3 py-1.5 rounded-md text-sm transition-colors font-medium shadow-sm"
                        title="모든 입력과 결과를 초기화하고 새로 시작합니다"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                        </svg>
                        초기화 (새 글 쓰기)
                    </button>
                ) : (
                    <div className="flex items-center gap-2 bg-gray-700 rounded-md p-1 animate-fade-in">
                        <span className="text-xs text-gray-300 px-2 font-medium">정말 초기화하시겠습니까?</span>
                        <button onClick={confirmReset} className="bg-red-600 hover:bg-red-500 text-white px-3 py-1 rounded text-xs font-bold transition-colors">예</button>
                        <button onClick={cancelReset} className="bg-gray-500 hover:bg-gray-400 text-white px-3 py-1 rounded text-xs font-bold transition-colors">아니오</button>
                    </div>
                )}
            </div>

            {/* Topic Input */}
            <div className="space-y-2">
                <label className="text-sm font-semibold text-gray-300">블로그 주제</label>
                <div className="flex gap-2">
                    <input
                        type="text"
                        value={topic}
                        onChange={(e) => setTopic(e.target.value)}
                        placeholder={`예: ${new Date().getFullYear()}년 최고의 서울 여행지 추천`}
                        className="flex-grow bg-gray-900 border border-gray-600 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 transition-all text-lg shadow-inner"
                    />
                    <button
                        onClick={handleCopyTopic}
                        disabled={!topic}
                        className="bg-gray-700 hover:bg-gray-600 text-white rounded-lg px-4 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        title="주제 복사"
                    >
                        {topicCopied ? '✅' : '📋'}
                    </button>
                </div>
            </div>

            {/* Theme Selection */}
            <div className="space-y-2">
                <label className="text-sm font-semibold text-gray-300">컬러 테마</label>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
                    {COLOR_THEMES.map((theme) => (
                        <button
                            key={theme.name}
                            onClick={() => setSelectedTheme(theme)}
                            className={`p-3 rounded-lg border-2 transition-all flex flex-col items-center justify-center space-y-2 ${selectedTheme.name === theme.name ? 'border-cyan-500 bg-gray-700 shadow-lg shadow-cyan-900/50 scale-105' : 'border-gray-600 bg-gray-800 hover:bg-gray-700 hover:border-gray-500'}`}
                        >
                            <div className="flex space-x-1">
                                <div className="w-4 h-4 rounded-full" style={{ backgroundColor: theme.colors.primary }}></div>
                                <div className="w-4 h-4 rounded-full" style={{ backgroundColor: theme.colors.secondary }}></div>
                                <div className="w-4 h-4 rounded-full" style={{ backgroundColor: theme.colors.highlightBg }}></div>
                            </div>
                            <span className={`text-xs font-medium ${selectedTheme.name === theme.name ? 'text-cyan-400' : 'text-gray-400'}`}>{theme.name}</span>
                        </button>
                    ))}
                </div>
            </div>
            
            {/* Additional Request */}
            <div className="space-y-2">
                <label className="text-sm font-semibold text-gray-300">추가 요청사항 (선택)</label>
                <textarea
                    value={additionalRequest}
                    onChange={(e) => setAdditionalRequest(e.target.value)}
                    placeholder="예: 독자에게 친근하게 말하듯이 써주세요. 30대 직장인을 타겟으로 해주세요."
                    className="w-full bg-gray-900 border border-gray-600 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 transition-all h-24 shadow-inner"
                />
            </div>

            {/* Advanced Options Toggle */}
            <div className="bg-gray-900 p-4 rounded-lg border border-gray-700 space-y-4">
                <h3 className="text-md font-semibold text-white mb-2">고급 옵션</h3>
                
                 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                     <div className="space-y-2">
                         <label className="text-sm font-medium text-gray-400">블로그 플랫폼</label>
                         <select
                             value={blogPlatform}
                             onChange={(e) => setBlogPlatform(e.target.value)}
                             className="w-full bg-gray-800 border border-gray-600 rounded-md px-3 py-2 text-white focus:ring-2 focus:ring-cyan-500"
                         >
                             {PLATFORMS.map(p => (
                                 <option key={p.value} value={p.value}>{p.label} ({p.chars})</option>
                             ))}
                         </select>
                     </div>
                     <div className="space-y-2">
                         <label className="text-sm font-medium text-gray-400">톤앤매너</label>
                         <select
                             value={tone}
                             onChange={(e) => setTone(e.target.value)}
                             className="w-full bg-gray-800 border border-gray-600 rounded-md px-3 py-2 text-white focus:ring-2 focus:ring-cyan-500"
                         >
                             {TONES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                         </select>
                     </div>
                     <div className="space-y-2">
                         <label className="text-sm font-medium text-gray-400">타겟 독자</label>
                         <select
                             value={targetAudience}
                             onChange={(e) => setTargetAudience(e.target.value)}
                             className="w-full bg-gray-800 border border-gray-600 rounded-md px-3 py-2 text-white focus:ring-2 focus:ring-cyan-500"
                         >
                             {TARGETS.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                         </select>
                     </div>
                     <div className="space-y-2">
                         <label className="text-sm font-medium text-gray-400">언어 (Language)</label>
                         <select
                             value={language}
                             onChange={(e) => setLanguage(e.target.value)}
                             className="w-full bg-gray-800 border border-gray-600 rounded-md px-3 py-2 text-white focus:ring-2 focus:ring-cyan-500"
                         >
                             {LANGUAGES.map(l => <option key={l.code} value={l.code}>{l.name}</option>)}
                         </select>
                     </div>
                 </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                    <label className="flex items-center space-x-3 cursor-pointer group">
                        <div className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${shouldGenerateImage ? 'bg-cyan-600 border-cyan-600' : 'border-gray-500 group-hover:border-cyan-500'}`}>
                            {shouldGenerateImage && <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7"></path></svg>}
                        </div>
                        <input type="checkbox" checked={shouldGenerateImage} onChange={(e) => setShouldGenerateImage(e.target.checked)} className="hidden" />
                        <span className="text-gray-300 group-hover:text-cyan-400 transition-colors">대표 이미지 자동 생성</span>
                    </label>

                    <label className="flex items-center space-x-3 cursor-pointer group">
                        <div className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${shouldGenerateSubImages ? 'bg-cyan-600 border-cyan-600' : 'border-gray-500 group-hover:border-cyan-500'}`}>
                            {shouldGenerateSubImages && <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7"></path></svg>}
                        </div>
                        <input type="checkbox" checked={shouldGenerateSubImages} onChange={(e) => setShouldGenerateSubImages(e.target.checked)} className="hidden" />
                        <span className="text-gray-300 group-hover:text-cyan-400 transition-colors">본문 서브 이미지 자동 생성</span>
                    </label>

                    <label className="flex items-center space-x-3 cursor-pointer group">
                        <div className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${shouldIncludeInteractiveElement ? 'bg-cyan-600 border-cyan-600' : 'border-gray-500 group-hover:border-cyan-500'}`}>
                            {shouldIncludeInteractiveElement && <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7"></path></svg>}
                        </div>
                        <input type="checkbox" checked={shouldIncludeInteractiveElement} onChange={(e) => setShouldIncludeInteractiveElement(e.target.checked)} className="hidden" />
                        <span className="text-gray-300 group-hover:text-cyan-400 transition-colors">인터랙티브 요소 포함</span>
                    </label>

                    <label className="flex items-center space-x-3 cursor-pointer group">
                         <div className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${shouldGenerateCta ? 'bg-cyan-600 border-cyan-600' : 'border-gray-500 group-hover:border-cyan-500'}`}>
                            {shouldGenerateCta && <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7"></path></svg>}
                        </div>
                        <input type="checkbox" checked={shouldGenerateCta} onChange={(e) => setShouldGenerateCta(e.target.checked)} className="hidden" />
                        <span className="text-gray-300 group-hover:text-cyan-400 transition-colors">CTA 버튼 자동 생성</span>
                    </label>

                    <label className="flex items-center space-x-3 cursor-pointer group">
                        <div className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${shouldAddThumbnailText ? 'bg-cyan-600 border-cyan-600' : 'border-gray-500 group-hover:border-cyan-500'}`}>
                            {shouldAddThumbnailText && <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7"></path></svg>}
                        </div>
                        <input type="checkbox" checked={shouldAddThumbnailText} onChange={(e) => setShouldAddThumbnailText(e.target.checked)} disabled={!shouldGenerateImage} className="hidden" />
                        <span className={`transition-colors ${!shouldGenerateImage ? 'text-gray-600 cursor-not-allowed' : 'text-gray-300 group-hover:text-cyan-400'}`}>썸네일용 텍스트 추가</span>
                    </label>
                </div>

                {shouldAddThumbnailText && (
                   <div className="pt-2 border-t border-gray-700 mt-2">
                       <label className="block text-sm font-medium text-gray-400 mb-2">썸네일 스타일 설정</label>
                       <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                           <div className="space-y-1">
                               <label className="text-xs text-gray-500">비율</label>
                               <div className="flex bg-gray-800 rounded-md p-1">
                                   <button onClick={() => setThumbnailAspectRatio('16:9')} className={`flex-1 py-1 text-xs rounded ${thumbnailAspectRatio === '16:9' ? 'bg-cyan-600 text-white' : 'text-gray-400 hover:text-white'}`}>16:9</button>
                                   <button onClick={() => setThumbnailAspectRatio('1:1')} className={`flex-1 py-1 text-xs rounded ${thumbnailAspectRatio === '1:1' ? 'bg-cyan-600 text-white' : 'text-gray-400 hover:text-white'}`}>1:1</button>
                               </div>
                           </div>
                           <div className="space-y-1">
                               <label className="text-xs text-gray-500">글꼴</label>
                               <select value={thumbnailFont} onChange={(e) => setThumbnailFont(e.target.value)} className="w-full bg-gray-800 text-white text-xs rounded px-2 py-1.5 border border-gray-600">
                                   <option value="Pretendard">프리텐다드</option>
                                   <option value="GmarketSans">Gmarket Sans</option>
                                   <option value="Cafe24Ssurround">카페24 서라운드</option>
                                   <option value="Black Han Sans">검은고딕</option>
                                   <option value="Jua">주아</option>
                                   <option value="Nanum Pen Script">나눔펜</option>
                               </select>
                           </div>
                           <div className="space-y-1">
                               <label className="text-xs text-gray-500">글자 크기 ({thumbnailFontSize}px)</label>
                               <input type="range" min="40" max="200" value={thumbnailFontSize} onChange={(e) => setThumbnailFontSize(Number(e.target.value))} className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer" />
                           </div>
                           <div className="space-y-1">
                               <label className="text-xs text-gray-500">테두리 두께 ({thumbnailOutlineWidth}px)</label>
                               <input type="range" min="0" max="20" value={thumbnailOutlineWidth} onChange={(e) => setThumbnailOutlineWidth(Number(e.target.value))} className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer" />
                           </div>
                           <div className="space-y-1 col-span-1 sm:col-span-2">
                               <label className="text-xs text-gray-500">텍스트 색상</label>
                               <div className="flex flex-wrap gap-2">
                                   {THUMBNAIL_COLORS.map(color => (
                                       <button key={color} onClick={() => setThumbnailColor(color)} className={`w-6 h-6 rounded-full border-2 ${thumbnailColor === color ? 'border-white scale-110' : 'border-transparent hover:scale-110 transition-transform'}`} style={{ backgroundColor: color }} aria-label={color} />
                                   ))}
                               </div>
                           </div>
                       </div>
                       <input type="text" value={thumbnailText} onChange={(e) => setThumbnailText(e.target.value)} placeholder="썸네일 텍스트 (기본값: 주제)" className="mt-3 w-full bg-gray-800 border border-gray-600 rounded-md px-3 py-2 text-white text-sm focus:ring-1 focus:ring-cyan-500" />
                   </div>
                )}
            </div>
            
            {/* Internal Links */}
            <div className="space-y-3 bg-gray-900 p-4 rounded-lg border border-gray-700">
                <div className="flex justify-between items-center mb-2">
                    <div className="flex items-center space-x-3">
                        <h3 className="text-md font-semibold text-white">내부 링크 설정</h3>
                        <label className="flex items-center space-x-2 cursor-pointer bg-gray-800 px-2 py-1 rounded border border-gray-700 hover:bg-gray-700 transition-colors">
                            <input 
                                type="checkbox" 
                                checked={shouldIncludeInternalLinks} 
                                onChange={(e) => setShouldIncludeInternalLinks(e.target.checked)} 
                                className="w-4 h-4 text-cyan-600 bg-gray-900 border-gray-600 rounded focus:ring-cyan-500" 
                            />
                            <span className="text-xs font-medium text-gray-300">내부 링크 활성화</span>
                            {internalLinksList.length > 0 && (
                                <span className="text-xs font-bold text-cyan-400 bg-cyan-900/40 px-1.5 py-0.5 rounded-full">{internalLinksList.length}</span>
                            )}
                        </label>
                    </div>
                    <div className="space-x-2">
                         <button onClick={() => setIsBulkLinkModalOpen(true)} className="text-xs bg-indigo-600 hover:bg-indigo-500 text-white px-3 py-1.5 rounded transition-colors">
                            대량 추가
                        </button>
                        <button onClick={handleAddInternalLink} className="text-xs bg-gray-700 hover:bg-gray-600 text-white px-3 py-1.5 rounded transition-colors">
                            + 링크 추가
                        </button>
                    </div>
                </div>
                <p className="text-xs text-gray-400 mb-2">
                    작성 중인 글에 포함하고 싶은 내 블로그의 다른 글 링크를 입력하세요. 활성화 시 AI가 문맥에 맞게 자연스럽게 삽입합니다.
                </p>
                {internalLinksList.length === 0 ? (
                    <div className="text-center py-4 text-gray-500 text-sm bg-gray-800 rounded border border-gray-700 border-dashed">
                        추가된 내부 링크가 없습니다.
                    </div>
                ) : (
                    <div className={`space-y-3 max-h-80 overflow-y-auto custom-scrollbar pr-1 transition-opacity ${shouldIncludeInternalLinks ? 'opacity-100' : 'opacity-50 pointer-events-none'}`}>
                        {internalLinksList.map((link) => (
                            <div key={link.id} className="bg-gray-800 p-3 rounded border border-gray-700 space-y-2">
                                <div className="flex flex-col sm:flex-row gap-2">
                                    <div className="flex-grow flex gap-2">
                                         <input
                                            type="text"
                                            value={link.url}
                                            onChange={(e) => handleUpdateInternalLink(link.id, 'url', e.target.value)}
                                            onBlur={(e) => handleUrlBlur(link.id, e.target.value)}
                                            placeholder="https://..."
                                            className="flex-1 bg-gray-900 border border-gray-600 rounded px-2 py-1 text-sm text-white focus:ring-1 focus:ring-cyan-500"
                                        />
                                         <button
                                            onClick={() => onAnalyzeUrl(link.url, link.description, link.anchor)}
                                            disabled={!link.url}
                                            className="p-1.5 bg-gray-700 text-gray-300 rounded hover:bg-cyan-600 hover:text-white disabled:opacity-30 disabled:hover:bg-gray-700 transition-colors"
                                            title="이 블로그 분석하기"
                                        >
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                            </svg>
                                        </button>
                                    </div>
                                    <div className="flex gap-2">
                                        <input
                                            type="text"
                                            value={link.anchor}
                                            onChange={(e) => handleUpdateInternalLink(link.id, 'anchor', e.target.value)}
                                            placeholder={link.isFetchingAnchor ? "제목 가져오는 중..." : "앵커 텍스트 (기존 제목)"}
                                            className="flex-1 sm:w-48 bg-gray-900 border border-gray-600 rounded px-2 py-1 text-sm text-white focus:ring-1 focus:ring-cyan-500"
                                            disabled={link.isFetchingAnchor}
                                        />
                                        <button
                                            onClick={() => handleRemoveInternalLink(link.id)}
                                            className="text-gray-400 hover:text-red-400 px-1"
                                            title="삭제"
                                        >
                                            &times;
                                        </button>
                                    </div>
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[10px] text-gray-500 uppercase tracking-wider font-bold">블로그 성격 (설명 - AI 참조용)</label>
                                    <input
                                        type="text"
                                        value={link.description || ''}
                                        onChange={(e) => handleUpdateInternalLink(link.id, 'description', e.target.value)}
                                        placeholder="이 블로그가 어떤 내용을 다루는지 간단히 설명해주세요 (예: 부동산 투자 전문)"
                                        className="w-full bg-gray-900/50 border border-gray-700 rounded px-2 py-1 text-xs text-gray-300 focus:ring-1 focus:ring-cyan-500 italic"
                                    />
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
            
            {/* External Source Options */}
            <div className="space-y-3 bg-gray-900 p-4 rounded-lg border border-gray-700">
                 <h3 className="text-md font-semibold text-white">정보 소스 및 최신성 설정</h3>
                 <div className="flex flex-wrap gap-4 mb-2">
                    <label className="flex items-center space-x-2 cursor-pointer">
                        <input type="radio" checked={externalSourceOption === 'auto'} onChange={() => setExternalSourceOption('auto')} className="text-cyan-500 focus:ring-cyan-500 bg-gray-800 border-gray-600" />
                        <span className="text-sm font-bold text-cyan-300">Google 실시간 검색 (최신 정보 보장)</span>
                    </label>
                    <label className="flex items-center space-x-2 cursor-pointer">
                        <input type="radio" checked={externalSourceOption === 'manual'} onChange={() => setExternalSourceOption('manual')} className="text-cyan-500 focus:ring-cyan-500 bg-gray-800 border-gray-600" />
                        <span className="text-sm text-gray-300">특정 출처 직접 지정</span>
                    </label>
                    <label className="flex items-center space-x-2 cursor-pointer">
                         <input type="radio" checked={externalSourceOption === 'none'} onChange={() => setExternalSourceOption('none')} className="text-cyan-500 bg-gray-800 border-gray-600" />
                         <span className="text-sm text-gray-300">사용 안 함</span>
                    </label>
                 </div>
                 {externalSourceOption === 'manual' && (
                     <textarea
                        value={externalLinks}
                        onChange={(e) => setExternalLinks(e.target.value)}
                        placeholder="참고할 외부 링크 URL들을 줄바꿈으로 구분하여 입력하세요."
                        rows={3}
                        className="w-full bg-gray-800 border border-gray-600 rounded px-3 py-2 text-sm text-white focus:ring-1 focus:ring-cyan-500"
                    />
                 )}
                 {externalSourceOption === 'auto' && (
                    <p className="text-xs text-yellow-400/80 italic">💡 AI가 Google 검색을 통해 오늘의 최신 정보와 통계를 실시간으로 수집하여 본문에 반영합니다.</p>
                 )}
            </div>

            {/* Affiliate Ad Section */}
            <div className="bg-gray-900 p-4 rounded-lg border border-gray-700 space-y-4">
                 <div className="flex items-center justify-between">
                    <h3 className="text-md font-semibold text-white flex items-center gap-2">
                        <span className="text-xl">💰</span> 제휴 마케팅 (쿠팡 파트너스 등)
                    </h3>
                    <label className="relative inline-flex items-center cursor-pointer">
                        <input 
                            type="checkbox" 
                            checked={shouldGenerateAffiliateAd} 
                            onChange={(e) => setShouldGenerateAffiliateAd(e.target.checked)} 
                            className="sr-only peer" 
                        />
                        <div className={`w-11 h-6 rounded-full peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-cyan-500 after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all ${shouldGenerateAffiliateAd ? 'bg-cyan-600 after:translate-x-full after:border-white' : 'bg-gray-700'}`}></div>
                    </label>
                 </div>

                 {shouldGenerateAffiliateAd && (
                    <div className="space-y-4 pt-2 border-t border-gray-700 animate-fade-in">
                        <div className="flex gap-2">
                            <button onClick={handleRecommendProducts} disabled={isRecommendingProducts || !topic} className="flex-1 bg-indigo-600 hover:bg-indigo-500 text-white py-2 px-4 rounded-md text-sm font-bold transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center">
                                {isRecommendingProducts ? <span className="animate-spin mr-2">⏳</span> : '🤖 AI 상품 추천 받기'}
                            </button>
                        </div>
                        
                        {recommendedProducts && (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-gray-800 p-3 rounded-md">
                                <p className="col-span-1 sm:col-span-2 text-xs text-gray-400 mb-1">AI가 추천하는 관련 상품 (클릭하여 선택)</p>
                                {recommendedProducts.map((prod, idx) => (
                                    <div key={idx} onClick={() => handleSelectProduct(prod)} className="cursor-pointer bg-gray-700 hover:bg-gray-600 p-3 rounded border border-gray-600 hover:border-cyan-500 transition-all">
                                        <div className="flex justify-between items-start mb-1">
                                            <h4 className="font-bold text-cyan-300 text-sm">{prod.name}</h4>
                                            <div onClick={(e) => e.stopPropagation()}>
                                                <CopyToClipboardButton textToCopy={prod.name} />
                                            </div>
                                        </div>
                                        <p className="text-xs text-gray-300">{prod.description}</p>
                                    </div>
                                ))}
                            </div>
                        )}

                        <div className="space-y-3 p-3 bg-gray-800 rounded border border-gray-700">
                             <div className="flex flex-col sm:flex-row gap-3">
                                 <div className="flex-1 space-y-1">
                                    <div className="flex justify-between items-center">
                                        <label className="text-xs text-gray-400">상품명</label>
                                        {adProduct?.name && <CopyToClipboardButton textToCopy={adProduct.name} />}
                                    </div>
                                    <input type="text" value={adProduct?.name || ''} onChange={(e) => handleAdProductChange('name', e.target.value)} className="w-full bg-gray-900 border border-gray-600 rounded px-2 py-1.5 text-sm text-white" placeholder="예: 아이폰 15 프로" />
                                 </div>
                                 <div className="flex-1 space-y-1">
                                    <label className="text-xs text-gray-400">설명</label>
                                    <div className="flex gap-2">
                                        <input 
                                            type="text" 
                                            value={adProduct?.description || ''} 
                                            onChange={(e) => handleAdProductChange('description', e.target.value)} 
                                            className="w-full bg-gray-900 border border-gray-600 rounded px-2 py-1.5 text-sm text-white" 
                                            placeholder="예: 역대급 성능과 티타늄 디자인" 
                                        />
                                        <button 
                                            onClick={handleGenerateAdDescription}
                                            disabled={!adProduct?.name || isGeneratingDescription}
                                            className="whitespace-nowrap bg-indigo-600 hover:bg-indigo-500 text-white px-3 py-1.5 rounded text-xs font-bold transition-colors disabled:opacity-50"
                                        >
                                            {isGeneratingDescription ? '생성중' : 'AI설명'}
                                        </button>
                                    </div>
                                 </div>
                             </div>
                             <div className="space-y-1">
                                <label className="text-xs text-gray-400">제휴 링크 (또는 쿠팡 HTML)</label>
                                <input type="text" value={adProduct?.link || ''} onChange={(e) => handleAdProductChange('link', e.target.value)} className="w-full bg-gray-900 border border-gray-600 rounded px-2 py-1.5 text-sm text-white font-mono" placeholder="https://link.coupang.com/..." />
                             </div>
                             <div className="flex flex-col sm:flex-row gap-3 items-end">
                                 <div className="flex-1 space-y-1 w-full">
                                    <label className="text-xs text-gray-400">후킹 메시지 (버튼 텍스트)</label>
                                    <div className="flex gap-2">
                                        <input type="text" value={adHookMessage} onChange={(e) => setAdHookMessage(e.target.value)} className="flex-1 bg-gray-900 border border-gray-600 rounded px-2 py-1.5 text-sm text-white" placeholder="예: 최저가 확인하기" />
                                        <button onClick={() => adProduct && handleSelectProduct(adProduct)} disabled={!adProduct || isGeneratingHook} className="bg-purple-600 hover:bg-purple-500 text-white px-3 py-1.5 rounded text-xs font-bold transition-colors disabled:opacity-50">
                                            {isGeneratingHook ? '생성중' : 'AI작성'}
                                        </button>
                                    </div>
                                 </div>
                             </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-400">광고 스타일</label>
                            <div className="flex bg-gray-800 rounded p-1">
                                <button onClick={() => setAdStyle('card')} className={`flex-1 py-1.5 text-sm rounded transition-colors ${adStyle === 'card' ? 'bg-cyan-600 text-white' : 'text-gray-400 hover:text-white'}`}>카드형</button>
                                <button onClick={() => setAdStyle('banner')} className={`flex-1 py-1.5 text-sm rounded transition-colors ${adStyle === 'banner' ? 'bg-cyan-600 text-white' : 'text-gray-400 hover:text-white'}`}>배너형</button>
                                <button onClick={() => setAdStyle('text')} className={`flex-1 py-1.5 text-sm rounded transition-colors ${adStyle === 'text' ? 'bg-cyan-600 text-white' : 'text-gray-400 hover:text-white'}`}>텍스트형</button>
                            </div>
                        </div>
                        
                        <div className="space-y-2">
                             <label className="text-sm font-medium text-gray-400">공정위 문구 (대가성 표기)</label>
                             <div className="flex items-center space-x-4">
                                <label className="flex items-center space-x-2 cursor-pointer">
                                    <input type="radio" checked={adDisclosureOption === 'none'} onChange={() => setAdDisclosureOption('none')} className="text-cyan-500 bg-gray-800 border-gray-600" />
                                    <span className="text-sm text-gray-300">면책 조항 섹션에만 표시</span>
                                </label>
                                <label className="flex items-center space-x-2 cursor-pointer">
                                    <input type="radio" checked={adDisclosureOption === 'custom'} onChange={() => setAdDisclosureOption('custom')} className="text-cyan-500 bg-gray-800 border-gray-600" />
                                    <span className="text-sm text-gray-300">광고 하단 + 면책 조항 섹션 (기본)</span>
                                </label>
                             </div>
                             {adDisclosureOption === 'custom' && (
                                 <input type="text" value={adDisclosureText} onChange={(e) => setAdDisclosureText(e.target.value)} className="w-full bg-gray-900 border border-gray-600 rounded px-2 py-1.5 text-xs text-gray-400" />
                             )}
                        </div>

                        <div className="mt-4 p-4 bg-white rounded-lg">
                            <p className="text-xs text-gray-500 mb-2 border-b pb-1">미리보기</p>
                            <div dangerouslySetInnerHTML={{ __html: adPreviewHtml }} />
                        </div>
                    </div>
                 )}
            </div>
            
            <button
                onClick={handleGenerate}
                disabled={isLoading || !topic}
                className={`w-full bg-gradient-to-r ${generateButtonGradient()} text-white font-bold py-4 rounded-lg text-xl transition-all duration-300 transform hover:scale-[1.01] active:scale-[0.99] flex items-center justify-center`}
            >
                {isLoading ? (
                    <>
                        <svg className="animate-spin -ml-1 mr-3 h-6 w-6 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path></svg>
                        AI 블로그 포스트 생성 중...
                    </>
                ) : '✨ AI 블로그 포스트 생성 시작'}
            </button>
            
            {error && <ErrorMessage message={error} />}
        </div>
        
        {generatedContent && (
            <ResultDisplay
                htmlContent={generatedContent.blogPostHtml}
                isLoading={isLoading}
                supplementaryInfo={generatedContent.supplementaryInfo}
                socialMediaPosts={generatedContent.socialMediaPosts}
                imageUrl={generatedContent.imageUrl}
                subImages={generatedContent.subImages}
                onGenerateImage={handleGenerateImage}
                isGeneratingImage={isGeneratingImage}
                onGenerateSubImage={handleGenerateSubImage}
                isGeneratingSubImages={isGeneratingSubImages}
                shouldAddThumbnailText={shouldAddThumbnailText}
                onGenerateThumbnail={handleGenerateThumbnail}
                isGeneratingThumbnail={isGeneratingThumbnail}
                thumbnailDataUrl={thumbnailDataUrl}
                thumbnailAspectRatio={thumbnailAspectRatio}
                blogPlatform={blogPlatform}
            />
        )}
        
        {generatedContent && (
            <div className="bg-gray-800 rounded-lg shadow-lg p-6 border border-gray-700 mt-6">
                <h3 className="text-lg font-semibold text-white mb-4">✍️ 본문 내용 수정/보완 (재생성)</h3>
                <p className="text-sm text-gray-400 mb-3">AI가 작성한 글이 마음에 들지 않거나 수정하고 싶은 부분이 있다면 구체적으로 요청해주세요. 본문 내용만 다시 작성됩니다.</p>
                <div className="flex flex-col sm:flex-row gap-3">
                    <input
                        type="text"
                        value={regenerationFeedback}
                        onChange={(e) => setRegenerationFeedback(e.target.value)}
                        placeholder="예: 서론을 더 짧게 줄여줘, 두 번째 문단에 예시를 추가해줘, 좀 더 전문적인 톤으로 바꿔줘"
                        className="flex-grow bg-gray-900 border border-gray-600 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:ring-2 focus:ring-cyan-500"
                    />
                    <button
                        onClick={handleRegenerate}
                        disabled={isRegenerating || !regenerationFeedback}
                        className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-3 px-6 rounded-lg transition-colors disabled:bg-gray-600 disabled:cursor-not-allowed flex items-center justify-center whitespace-nowrap"
                    >
                        {isRegenerating ? <span className="animate-spin mr-2">⏳</span> : '🔄'} 재생성
                    </button>
                </div>
            </div>
        )}

        <BulkLinkModal 
            isOpen={isBulkLinkModalOpen}
            onClose={() => setIsBulkLinkModalOpen(false)}
            onAdd={handleBulkAddLinks}
        />
    </div>
  );
};
