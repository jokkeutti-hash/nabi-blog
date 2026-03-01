
export interface ColorTheme {
  name: string;
  description: string;
  colors: {
    primary: string;
    primaryDark: string;
    secondary: string;
    background: string;
    text: string;
    highlightBg: string;
    infoBoxBg: string;
    infoBoxBorder: string;
    warningBoxBg: string;
    warningBoxBorder: string;
    tableHeaderBg: string;
    tableBorder: string;
    tableEvenRowBg: string;
  };
}

export interface SupplementaryInfo {
  keywords: string[];
  blogspotLabels: string[];
  metaDescription: string;
  imagePrompt: string;
  altText: string;
  seoTitles: string[];
  thumbnailTitles: string[];
  subImagePrompts: { prompt: string; altText: string }[];
  slug?: string;
}

export interface SocialMediaPosts {
  threads: string;
  instagram: string;
  facebook: string;
  x: string;
}

export interface GeneratedContent {
  blogPostHtml: string;
  supplementaryInfo: SupplementaryInfo;
  imageBase64: string | null;
  subImages: { prompt: string; altText: string; base64: string | null }[] | null;
  socialMediaPosts?: SocialMediaPosts;
}

// --- Refactoring Support Types ---

export interface ProcessedSubImage {
  prompt: string;
  altText: string;
  url: string | null;
}

export interface ProcessedContent {
  blogPostHtml: string;
  supplementaryInfo: SupplementaryInfo;
  imageUrl: string | null;
  subImages: ProcessedSubImage[] | null;
  socialMediaPosts?: SocialMediaPosts;
}

export interface InternalLink {
  id: number;
  url: string;
  anchor: string;
  description?: string;
  isFetchingAnchor?: boolean;
}


// --- Keyword Fighter Types ---

export type SearchSource = 'google' | 'naver';
export type Feature = 'blog-analysis' | 'image-posting' | 'competition' | 'keywords' | 'related-keywords' | 'naver-news' | 'blogs' | 'sustainable-topics' | 'recommended' | 'google-trends' | 'naver-search';

export interface KeywordData {
    id: number;
    keyword: string;
}

export interface NaverNewsData {
    id: string;
    title: string;
    url: string;
    description: string;
    pubDate: string;
}

export interface NaverWebData {
    title: string;
    link: string;
    description: string;
}

export interface GoogleTrendItem {
    id: number;
    keyword: string;
    reason: string;
    blogTopic: string;
    category: string;
}

export interface NewsStrategyIdea {
    id: number;
    title: string;
    keywords: string[];
    strategy: string;
}

export interface BlogPostData {
    id: number;
    title: string;
    url: string;
}

export interface KeywordMetrics {
    keyword: string;
    opportunityScore: number;
    searchVolumeEstimate: number;
    competitionScore: number;
    competitionLevel: string;
    documentCount: number;
    analysis: {
        title: string;
        reason: string;
        opportunity: string;
        threat: string;
        consumptionAndIssues: string;
        conclusion: string;
    };
    strategy?: {
        expandedKeywords: string[];
        blogTopics: {
            title: string;
            description: string;
        }[];
    };
    keywordLength: number;
    wordCount: number;
}

export interface GeneratedTopic {
    id: number;
    title: string;
    thumbnailCopy: string;
    strategy: string;
}

export interface BlogStrategyReportData {
    analysis: {
        structure: string;
        characteristics: string;
        commonKeywords: string;
    };
    suggestions: GeneratedTopic[];
}

export interface RecommendedKeyword extends GeneratedTopic {
    keyword: string;
    reason: string;
}

export interface SustainableTopicSuggestion {
    title: string;
    keywords: string[];
    strategy: string;
}

export interface SustainableTopicCategory {
    category: string;
    suggestions: SustainableTopicSuggestion[];
}

export interface PaaItem {
    question: string;
    answer: string;
    content_gap_analysis: string;
}

export interface GoogleSerpData {
    related_searches: string[];
    people_also_ask: PaaItem[];
}

export interface SerpStrategyReportData {
    analysis: {
        userIntent: string;
        pillarPostSuggestion: string;
    };
    suggestions: GeneratedTopic[];
}

export interface BlogAnalysisReport {
    blogUrl: string;
    identity: {
        title: string;
        description: string;
        latestPostExample?: string;
    };
    assessment: {
        strengths: string[];
        weaknesses: string[];
    };
    strategy: {
        growthDirections: string[];
        suggestedTopics: {
            title: string;
            reason: string;
        }[];
    };
}

export interface Prompt {
  id: number;
  title: string;
  template: string;
}

export interface PromptCategory {
  category: string;
  prompts: Prompt[];
}
