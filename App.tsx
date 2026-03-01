
import React, { useState, useCallback, useEffect } from 'react';
import { generateEeatTopicSuggestions, generateCategoryTopicSuggestions, generateEvergreenTopicSuggestions, generateTopicsFromMemo, generateLongtailTopicSuggestions, generateTopicSuggestionsFromTopic, generateViralTrendTitles, testGeminiApiKey } from './services/geminiService';
import { testNaverCredentials } from './services/keywordService';
import { KeywordFighter } from './components/KeywordFighter';
import { NaverBlogAnalyzer } from './components/NaverBlogAnalyzer';
import { CurrentStatus } from './components/CurrentStatus';
import { Shortcuts } from './components/Shortcuts';
import { BlogPostGenerator } from './components/BlogPostGenerator';

const Header: React.FC<{ onOpenSettings: () => void; }> = ({ onOpenSettings }) => (
  <header className="relative text-center p-4 md:p-6 border-b border-gray-700">
    <h1 className="text-3xl md:text-2xl font-bold text-white mb-2 font-korean title-effect">
        <span>지나 블로그 올인원</span>
    </h1>
    <p className="text-gray-400 text-sm md:text-base font-korean">블로그 글쓰기 모든것</p>
    <div className="absolute top-1/2 right-4 md:right-6 -translate-y-1/2 flex items-center space-x-1 sm:space-x-2">
      <button
        onClick={onOpenSettings}
        className="text-gray-400 hover:text-white transition-colors p-2 rounded-full hover:bg-gray-700"
        aria-label="설정"
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 sm:h-7 sm:w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066 2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      </button>
    </div>
  </header>
);

const Footer: React.FC = () => (
  <footer className="text-center p-6 mt-8 border-t border-gray-700 text-gray-500 text-sm">
    <p>지나 블로그 올인원</p>
  </footer>
);


const SettingsModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    geminiApiKey: string;
    setGeminiApiKey: (key: string) => void;
    onSaveGemini: () => void;
    geminiStatus: 'unconfigured' | 'testing' | 'success' | 'error';
    geminiError: string | null;
    onTestAndSaveGemini: () => void;
    showGeminiKey: boolean;
    setShowGeminiKey: (v: boolean) => void;
    clientId: string;
    setClientId: (id: string) => void;
    clientSecret: string;
    setClientSecret: (secret: string) => void;
    status: 'unconfigured' | 'testing' | 'success' | 'error';
    error: string | null;
    onTestAndSave: () => void;
    huggingFaceApiKey: string;
    setHuggingFaceApiKey: (key: string) => void;
    onSaveHuggingFace: () => void;
}> = ({
    isOpen, onClose,
    geminiApiKey, setGeminiApiKey, onSaveGemini, geminiStatus, geminiError, onTestAndSaveGemini, showGeminiKey, setShowGeminiKey,
    clientId, setClientId, clientSecret, setClientSecret, status, error, onTestAndSave,
    huggingFaceApiKey, setHuggingFaceApiKey, onSaveHuggingFace
}) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4" onClick={onClose}>
            <div className="bg-slate-800 rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
                <div className="p-4 sm:p-6 border-b border-slate-700 flex justify-between items-center">
                    <h2 className="text-xl sm:text-2xl font-bold text-white">설정</h2>
                    <button onClick={onClose} className="text-slate-400 hover:text-white text-3xl font-light">&times;</button>
                </div>
                <div className="p-4 sm:p-6 space-y-6">
                    <div>
                        <h3 className="text-lg font-semibold text-white mb-3">Gemini API 키 설정</h3>
                        <p className="text-sm text-slate-400 mb-4">AI 기능 전체(주제 추천, 포스트 생성 등)에 사용됩니다. <a href="https://aistudio.google.com/apikey" target="_blank" rel="noopener noreferrer" className="text-cyan-400 underline">Google AI Studio</a>에서 무료로 발급받을 수 있습니다.</p>
                        <div className="space-y-4">
                            <div className="relative">
                                <input
                                    type={showGeminiKey ? "text" : "password"}
                                    value={geminiApiKey}
                                    onChange={(e) => { setGeminiApiKey(e.target.value); }}
                                    placeholder="Gemini API Key (AIza...)"
                                    className="w-full bg-slate-900 border border-slate-600 rounded-md px-4 py-2 pr-20 text-white placeholder-slate-500 focus:ring-2 focus:ring-cyan-500"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowGeminiKey(!showGeminiKey)}
                                    className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-white px-2 py-1 rounded"
                                >{showGeminiKey ? '숨기기' : '보기'}</button>
                            </div>
                            <button
                                onClick={onTestAndSaveGemini}
                                disabled={!geminiApiKey || geminiStatus === 'testing'}
                                className="w-full bg-blue-600 text-white font-bold py-2 px-4 rounded-md hover:bg-blue-500 transition-colors disabled:bg-slate-600 flex items-center justify-center"
                            >
                                {geminiStatus === 'testing' ? (
                                    <><svg className="animate-spin h-5 w-5 mr-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path></svg>연결 테스트 중...</>
                                ) : '테스트 & 저장'}
                            </button>
                        </div>
                        <div className="mt-3 text-sm min-h-[24px]">
                            {geminiStatus === 'unconfigured' && <p className="text-slate-500">API 키를 입력하고 저장을 눌러주세요.</p>}
                            {geminiStatus === 'success' && <p className="text-green-400">✅ 저장 완료 — 이제 AI 기능을 사용할 수 있습니다.</p>}
                            {geminiStatus === 'error' && <p className="text-red-400">❌ {geminiError}</p>}
                        </div>
                    </div>

                    <div className="border-t border-slate-700 pt-6">
                        <h3 className="text-lg font-semibold text-white mb-3">Naver 검색 API 설정</h3>
                        <p className="text-sm text-slate-400 mb-4">'상위 블로그 분석', '네이버 실시간 뉴스' 등 일부 기능을 사용하려면 Naver Developers에서 발급받은 API 키가 필요합니다.</p>
                        <div className="space-y-4">
                            <input
                                type="text"
                                value={clientId}
                                onChange={(e) => setClientId(e.target.value)}
                                placeholder="Naver API Client ID"
                                className="w-full bg-slate-900 border border-slate-600 rounded-md px-4 py-2 text-white placeholder-slate-500 focus:ring-2 focus:ring-cyan-500"
                            />
                            <input
                                type="password"
                                value={clientSecret}
                                onChange={(e) => setClientSecret(e.target.value)}
                                placeholder="Naver API Client Secret"
                                className="w-full bg-slate-900 border border-slate-600 rounded-md px-4 py-2 text-white placeholder-slate-500 focus:ring-2 focus:ring-cyan-500"
                            />
                            <button
                                onClick={onTestAndSave}
                                disabled={status === 'testing' || !clientId || !clientSecret}
                                className="w-full bg-green-600 text-white font-bold py-2 px-4 rounded-md hover:bg-green-500 transition-colors disabled:bg-slate-600 flex items-center justify-center"
                            >
                                {status === 'testing' ? (
                                    <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path></svg>
                                ) : "연결 테스트 및 저장"}
                            </button>
                        </div>
                        <div className="mt-3 text-sm h-5">
                            {status === 'unconfigured' && <p className="text-yellow-400">💡 Naver API 키를 등록해주세요.</p>}
                            {status === 'success' && <p className="text-green-400">✅ API가 성공적으로 연결되었습니다.</p>}
                            {status === 'error' && <p className="text-red-400">❌ 연결 실패: {error}</p>}
                        </div>
                    </div>

                    <div className="border-t border-slate-700 pt-6">
                        <h3 className="text-lg font-semibold text-white mb-3">🎨 Pollinations.ai (이미지 생성)</h3>
                        <p className="text-sm text-slate-400 mb-3">블로그 대표 이미지 및 서브 이미지 생성에 사용됩니다. <strong className="text-white">API 키 불필요 · 완전 무료</strong></p>
                        <div className="flex items-center gap-2 bg-slate-900 border border-green-700 rounded-md px-4 py-3">
                            <span className="text-green-400 text-lg">✅</span>
                            <div>
                                <p className="text-green-400 font-semibold text-sm">활성화됨 — 설정 없이 바로 사용 가능</p>
                                <p className="text-slate-400 text-xs mt-0.5">FLUX → turbo 순서로 자동 시도 · 실패 시 Hugging Face로 전환</p>
                            </div>
                        </div>
                    </div>

                    <div className="border-t border-slate-700 pt-6">
                        <h3 className="text-lg font-semibold text-white mb-3">🎨 Hugging Face API 설정 (무료 이미지 생성)</h3>
                        <p className="text-sm text-slate-400 mb-1">이미지 생성 우선순위: <span className="text-cyan-400">Pollinations.ai (무료·키 불필요) → Hugging Face → Gemini</span></p>
                        <p className="text-sm text-slate-400 mb-4">Pollinations.ai가 실패할 때 Hugging Face FLUX 모델을 사용합니다. <a href="https://huggingface.co/settings/tokens" target="_blank" rel="noopener noreferrer" className="text-cyan-400 underline">Hugging Face</a>에서 무료 API 키 발급 가능.</p>
                        <div className="space-y-4">
                            <input
                                type="password"
                                value={huggingFaceApiKey}
                                onChange={(e) => setHuggingFaceApiKey(e.target.value)}
                                placeholder="hf_xxxxxxxxxxxx (선택사항)"
                                className="w-full bg-slate-900 border border-slate-600 rounded-md px-4 py-2 text-white placeholder-slate-500 focus:ring-2 focus:ring-cyan-500"
                            />
                            <button
                                onClick={onSaveHuggingFace}
                                className="w-full bg-yellow-600 text-white font-bold py-2 px-4 rounded-md hover:bg-yellow-500 transition-colors flex items-center justify-center"
                            >
                                저장
                            </button>
                        </div>
                        {huggingFaceApiKey && <p className="mt-3 text-sm text-green-400">✅ Hugging Face 키 설정됨</p>}
                    </div>
                </div>
            </div>
        </div>
    );
};

const EEAT_SUB_CATEGORIES_MAP: Record<string, string[]> = {
  "심층 가이드 및 'How-to'": ["IT/기술", "건강 (음식·약초·영양·한방)", "건강/피트니스·운동", "금융/투자", "요리/레시피", "DIY/공예", "학습/교육"],
  "비교 및 분석": ["전자기기", "소프트웨어/앱", "금융 상품", "자동차", "여행지/숙소", "온라인 강의", "건강기능식품·영양제"],
  "최신 정보 및 트렌드": ["기술 동향", "사회/문화", "경제 뉴스", "패션/뷰티", "엔터테인먼트", "스포츠", "건강·의학 정보"],
  "사례 연구 및 성공 사례": ["비즈니스/마케팅", "자기계발", "재테크 성공기", "건강 개선 (음식·약초 활용)", "다이어트·체중 관리", "학습법", "커리어 전환"],
  "개인 경험 (후기, 경험담)": ["제품 사용 후기", "여행기", "맛집 탐방", "도서/영화 리뷰", "건강식품·약초 체험", "육아 일기", "취미 생활"],
};

function App() {
  const [topic, setTopic] = useState<string>('');
  
  // --- Main Tab State ---
  type MainTab = 'generator' | 'keywordFighter' | 'naverAnalyzer' | 'shortcuts';
  // 기본 메인 탭을 'keywordFighter'로 설정
  const [mainTab, setMainTab] = useState<MainTab>('keywordFighter');
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState<boolean>(false);

  // --- Gemini API State ---
  const [geminiApiKey, setGeminiApiKey] = useState('');
  const [geminiStatus, setGeminiStatus] = useState<'unconfigured' | 'testing' | 'success' | 'error'>('unconfigured');
  const [geminiError, setGeminiError] = useState<string | null>(null);
  const [showGeminiKey, setShowGeminiKey] = useState(false);

  // --- Naver API State ---
  const [naverClientId, setNaverClientId] = useState('');
  const [naverClientSecret, setNaverClientSecret] = useState('');
  const [apiStatus, setApiStatus] = useState<'unconfigured' | 'testing' | 'success' | 'error'>('unconfigured');
  const [apiError, setApiError] = useState<string | null>(null);

  // --- Hugging Face API State ---
  const [huggingFaceApiKey, setHuggingFaceApiKey] = useState('');
  
  // --- State for linking Generator and KeywordFighter / NaverAnalyzer ---
  const [urlToAnalyze, setUrlToAnalyze] = useState<string | null>(null);
  const [urlBlogInfo, setUrlBlogInfo] = useState<{ description?: string; anchor?: string } | null>(null);
  const [naverBlogUrlToAnalyze, setNaverBlogUrlToAnalyze] = useState<string | null>(null);
  const [detectedBlogPlatform, setDetectedBlogPlatform] = useState<string | undefined>(undefined);

  useEffect(() => {
      try {
          // Gemini
          const gemini_b64 = localStorage.getItem('geminiApiKey_b64');
          if (gemini_b64) {
              setGeminiApiKey(atob(gemini_b64));
              setGeminiStatus('success');
          }

          // Naver
          const id_b64 = localStorage.getItem('naverClientId_b64');
          const secret_b64 = localStorage.getItem('naverClientSecret_b64');
          if (id_b64 && secret_b64) {
              const id = atob(id_b64);
              const secret = atob(secret_b64);
              setNaverClientId(id);
              setNaverClientSecret(secret);
              setApiStatus('success');
          }

          // Hugging Face
          const hf_b64 = localStorage.getItem('hfApiKey_b64');
          if (hf_b64) setHuggingFaceApiKey(atob(hf_b64));
      } catch (e) {
          console.error("Failed to load or decode API keys from localStorage:", e);
          localStorage.removeItem('naverClientId_b64');
          localStorage.removeItem('naverClientSecret_b64');
          setApiStatus('unconfigured');
      }
  }, []);

  const handleTestAndSaveCredentials = async () => {
      if (!naverClientId.trim() || !naverClientSecret.trim()) {
          setApiError('클라이언트 ID와 시크릿을 모두 입력해주세요.');
          setApiStatus('error');
          return;
      }
      setApiStatus('testing');
      setApiError(null);
      try {
          await testNaverCredentials(naverClientId, naverClientSecret);
          localStorage.setItem('naverClientId_b64', btoa(naverClientId));
          localStorage.setItem('naverClientSecret_b64', btoa(naverClientSecret));
          setApiStatus('success');
      } catch (err) {
          setApiStatus('error');
          setApiError(err instanceof Error ? err.message : '알 수 없는 오류가 발생했습니다.');
      }
  };

  const handleSaveGeminiKey = () => {}; // legacy, unused

  const handleTestAndSaveGeminiKey = async () => {
      const key = geminiApiKey.trim();
      if (!key) return;
      setGeminiStatus('testing');
      setGeminiError(null);
      try {
          await testGeminiApiKey(key);
          localStorage.setItem('geminiApiKey_b64', btoa(key));
          setGeminiStatus('success');
      } catch (err) {
          setGeminiStatus('error');
          setGeminiError(err instanceof Error ? err.message : 'API 키 확인 실패');
      }
  };


  const handleSaveHuggingFaceKey = () => {
      const key = huggingFaceApiKey.trim();
      if (key) {
          localStorage.setItem('hfApiKey_b64', btoa(key));
      } else {
          localStorage.removeItem('hfApiKey_b64');
      }
  };

  // --- Topic Suggestion State ---
  type TopicSuggestionTab = 'viral' | 'eeat' | 'category' | 'evergreen' | 'longtail' | 'memo' | 'expansion';
  const [activeSuggestionTab, setActiveSuggestionTab] = useState<TopicSuggestionTab>('viral');
  const [suggestedTopics, setSuggestedTopics] = useState<string[]>([]);
  const [isSuggestingTopics, setIsSuggestingTopics] = useState<boolean>(false);
  const [suggestionError, setSuggestionError] = useState<string | null>(null);
  
  const GENERAL_CATEGORIES = [
    "재정/투자 (부동산, 주식, 연금, 세금, 대출 등)",
    "IT/기술 (프로그래밍, 앱 사용법, 소프트웨어, 디지털기기 등)",
    "생활/라이프스타일 (인테리어, 요리, 미니멀라이프, 반려동물 등)",
    "건강/웰니스 (음식, 약초, 영양, 한방, 다이어트, 질병 관리 등)",
    "건강/자기계발 (운동, 독서, 습관, 정신건강 등)",
    "교육/학습 (외국어, 자격증, 온라인강의, 공부법 등)",
    "쇼핑/소비 (온라인쇼핑, 중고거래, 할인혜택, 가성비제품 등)",
    "자동차/교통 (자동차보험, 중고차, 대중교통, 주차 등)",
    "취업/직장 (이직, 연차, 퇴사, 직장생활, 4대보험 등)",
    "기타(사용자입력)"
  ];

  const EEAT_CATEGORIES = [
    "심층 가이드 및 'How-to'", "비교 및 분석", "최신 정보 및 트렌드", 
    "사례 연구 및 성공 사례", "개인 경험 (후기, 경험담)"
  ];
  const [selectedEeatCategory, setSelectedEeatCategory] = useState<string>(EEAT_CATEGORIES[0]);
  const [selectedEeatSubCategory, setSelectedEeatSubCategory] = useState<string>(EEAT_SUB_CATEGORIES_MAP[EEAT_CATEGORIES[0]][0]);

  const [selectedGenCategory, setSelectedGenCategory] = useState<string>(GENERAL_CATEGORIES[0]);
  const [customGenCategory, setCustomGenCategory] = useState<string>('');
  
  const EVERGREEN_CATEGORIES = [
    "사례 연구(Case Study)", "백서(White Paper)", "통계 및 데이터 정리", "제품 리뷰 (업데이트 가능)",
    "역사적 배경 설명", "How-to 가이드", "초보자 가이드", "리스트 콘텐츠 (Top 10, 체크리스트 등)",
    "체크리스트", "용어집(Glossary) & 정의", "베스트 프랙티스 (Best Practices)", "실패 사례 공유",
    "성공 사례 공유", "스토리텔링 기반 글", "FAQ(자주 묻는 질문) 정리", "튜토리얼 (단계별 안내)",
    "리소스 모음/큐레이션 (추천 툴·사이트 모음)", "비교 콘텐츠 (제품·서비스 비교)", "전문가 인터뷰",
    "종합 가이드(Ultimate Guide)", "문제 해결형 글 (솔루션 제시)", "핵심 팁 모음 (Tips & Tricks)",
    "오해와 진실(신화 깨기, Myth Busting)", "업계/분야 베스트 사례 아카이브"
  ];
  const [selectedEvergreenCategory, setSelectedEvergreenCategory] = useState<string>(EVERGREEN_CATEGORIES[0]);
  const [selectedEvergreenField, setSelectedEvergreenField] = useState<string>(GENERAL_CATEGORIES[0]);
  const [customEvergreenField, setCustomEvergreenField] = useState<string>('');

  const LONGTAIL_CATEGORIES = [
    "계절/이벤트", "건강 (음식·약초·영양·한방·다이어트)", "건강/피트니스·운동", "재테크/금융", "IT/기술/소프트웨어", "부동산/인테리어",
    "교육/학습/자기계발", "취업/커리어", "쇼핑/제품 리뷰", "여행 (국내/해외)", "자동차 (구매/관리)", "법률/세금",
  ];
  const [selectedLongtailCategory, setSelectedLongtailCategory] = useState<string>(LONGTAIL_CATEGORIES[0]);
  
  const [memoContent, setMemoContent] = useState<string>('');
  const [expansionTopic, setExpansionTopic] = useState<string>('');
  const [uploadedFileNames, setUploadedFileNames] = useState<string[]>([]);
  const [additionalRequest, setAdditionalRequest] = useState<string>('');

  const handleManualTabSwitch = (tab: MainTab) => {
    if (mainTab === tab) return;
    setSuggestedTopics([]);
    setSuggestionError(null);
    setMemoContent('');
    setUploadedFileNames([]);
    setMainTab(tab);
  };

  const handleAnalyzeBlogUrl = (url: string, description?: string, anchor?: string) => {
    const isNaver = /blog\.naver\.com/i.test(url);
    if (isNaver) {
        setNaverBlogUrlToAnalyze(url);
        setMainTab('naverAnalyzer');
    } else {
        setUrlToAnalyze(url);
        setUrlBlogInfo(description || anchor ? { description, anchor } : null);
        setMainTab('keywordFighter');
        setTimeout(() => {
            document.getElementById('keyword-fighter-section')?.scrollIntoView({ behavior: 'smooth' });
        }, 100);
    }
  };

  useEffect(() => {
    const newSubCategories = EEAT_SUB_CATEGORIES_MAP[selectedEeatCategory] || [];
    setSelectedEeatSubCategory(newSubCategories[0] || '');
  }, [selectedEeatCategory]);


  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsSettingsModalOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  const handleSuggestionTabChange = (tab: TopicSuggestionTab) => {
    setActiveSuggestionTab(tab);
    setSuggestedTopics([]);
    setSuggestionError(null);
    setExpansionTopic('');
  }
  
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      let combinedText = '';
      const names: string[] = [];
      let totalSize = 0;

      for (const file of files) {
        totalSize += file.size;
      }
      if (totalSize > 5 * 1024 * 1024) {
        setSuggestionError("총 파일 크기는 5MB를 초과할 수 없습니다.");
        return;
      }
      try {
        for (const file of files) {
          names.push(file.name);
          const text = await file.text();
          combinedText += `\n\n--- START OF FILE: ${file.name} ---\n\n${text}\n\n--- END OF FILE: ${file.name} ---\n\n`;
        }
        setMemoContent(combinedText.trim());
        setUploadedFileNames(names);
        setSuggestionError(null);
      } catch (err) {
        setSuggestionError("파일을 읽는 중 오류가 발생했습니다.");
      }
    }
  };

  const handleSuggestTopics = useCallback(async (generator: (currentDate: string) => Promise<string[]>) => {
    setIsSuggestingTopics(true);
    setSuggestionError(null);
    setSuggestedTopics([]);
    try {
      const currentDate = new Date();
      const formattedDate = new Intl.DateTimeFormat('ko-KR', {
        year: 'numeric', month: 'long', day: 'numeric', weekday: 'long'
      }).format(currentDate);
      const topics = await generator(formattedDate);
      setSuggestedTopics(topics);
    } catch (err) {
      const message = err instanceof Error ? err.message : '주제 추천 중 알 수 없는 오류가 발생했습니다.';
      setSuggestionError(message);
    } finally {
      setIsSuggestingTopics(false);
    }
  }, []);

  const handleSuggestFromTopic = useCallback(async () => {
    if (!expansionTopic.trim()) return;
    
    setIsSuggestingTopics(true);
    setSuggestionError(null);
    setSuggestedTopics([]);
    try {
      const currentDate = new Date();
      const formattedDate = new Intl.DateTimeFormat('ko-KR', {
        year: 'numeric', month: 'long', day: 'numeric', weekday: 'long'
      }).format(currentDate);

      const topics = await generateTopicSuggestionsFromTopic(expansionTopic, formattedDate);
      setSuggestedTopics([expansionTopic, ...topics]);

    } catch (err) {
        const message = err instanceof Error ? err.message : '주제 추천 중 알 수 없는 오류가 발생했습니다.';
        setSuggestionError(message);
    } finally {
        setIsSuggestingTopics(false);
    }
  }, [expansionTopic]);

  const handleTopicSelect = (selectedTopic: string) => {
    setTopic(selectedTopic);
    if (activeSuggestionTab !== 'memo') {
      setAdditionalRequest('');
    }
    setExpansionTopic('');
    document.querySelector('.bg-gray-800.rounded-lg.shadow-2xl')?.scrollIntoView({
        behavior: 'smooth',
        block: 'start'
    });
  };

  const handleTopicSelectFromFighter = (title: string, context: string) => {
    setTopic(title);
    setAdditionalRequest(context);
    document.querySelector('.bg-gray-800.rounded-lg.shadow-2xl')?.scrollIntoView({
        behavior: 'smooth',
        block: 'start'
    });
  };
  
  const handleGeneratorReset = () => {
    setTopic('');
    setAdditionalRequest('');
    setMemoContent('');
    setUploadedFileNames([]);
    setSuggestedTopics([]);
    setSuggestionError(null);
    setExpansionTopic('');
  };

  const mainTabButtonStyle = (tabName: MainTab) => 
    `px-4 sm:px-6 py-3 text-base sm:text-lg font-bold transition-colors duration-300 rounded-t-lg focus:outline-none ${
      mainTab === tabName
      ? 'bg-gray-800 text-white'
      : 'bg-gray-700 text-gray-400 hover:bg-gray-700/70 hover:text-white'
    }`;
  
  const suggestionTabButtonStyle = (tabName: TopicSuggestionTab) => 
    `px-3 sm:px-4 py-2 text-sm sm:text-base font-semibold border-b-2 transition-colors duration-200 focus:outline-none whitespace-nowrap ${
      activeSuggestionTab === tabName
      ? 'border-blue-500 text-blue-400'
      : 'border-transparent text-gray-400 hover:text-white'
    }`;
  
  const SuggestionButton: React.FC<{ onClick: () => void, disabled: boolean, text: string }> = ({ onClick, disabled, text }) => (
     <button
        onClick={onClick}
        disabled={disabled}
        className="w-full bg-indigo-600 text-white font-bold py-2 px-4 rounded-md hover:bg-indigo-700 transition-all duration-200 disabled:bg-gray-500 disabled:cursor-not-allowed flex items-center justify-center"
      >
        {disabled ? (
          <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
        ) : text}
      </button>
  );

  return (
    <div className="min-h-screen bg-gray-900 text-gray-200 font-sans flex flex-col">
      <div className="flex-grow">
        <Header onOpenSettings={() => setIsSettingsModalOpen(true)} />
        <main className="container mx-auto p-2 sm:p-4 md:p-6">
          <CurrentStatus />
          
          <div className="flex justify-between items-center border-b border-gray-700">
            <div className="flex space-x-1 sm:space-x-2 overflow-x-auto pb-2 -mx-2 px-2 sm:-mx-0 sm:px-0">
                <button onClick={() => handleManualTabSwitch('generator')} className={mainTabButtonStyle('generator')}>
                주제 아이디어 얻기
                </button>
                <button onClick={() => handleManualTabSwitch('keywordFighter')} className={mainTabButtonStyle('keywordFighter')}>
                블로그 분석<sup className="text-red-500 ml-1">PRO</sup>
                </button>
                <button onClick={() => handleManualTabSwitch('naverAnalyzer')} className={mainTabButtonStyle('naverAnalyzer')}>
                <span className="text-green-400">N</span> 블로그
                </button>
            </div>
            <div className="hidden sm:flex items-center space-x-4">
                <button onClick={() => handleManualTabSwitch('shortcuts')} className={mainTabButtonStyle('shortcuts')}>
                트렌드 바로가기
                </button>
                <a 
                    href="https://creator-advisor.naver.com/naver_blog" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="group flex items-center rounded-md bg-gradient-to-r from-yellow-500 via-amber-500 to-orange-500 px-4 py-2 text-sm font-bold text-slate-900 shadow-lg transition-transform duration-200 hover:scale-105"
                >
                    <span className="mr-2 filter drop-shadow">⭐</span>
                    <span>네이버 creator-advisor</span>
                </a>
            </div>
          </div>
          
          <div id="keyword-fighter-section" className="bg-gray-800 p-4 md:p-6 rounded-b-lg shadow-2xl mb-8">
            {mainTab === 'generator' && (
              <div>
                <div>
                  <div className="border-b border-gray-700 mb-4">
                      <nav className="-mb-px flex space-x-2 sm:space-x-4 overflow-x-auto" aria-label="Tabs">
                          <button onClick={() => handleSuggestionTabChange('viral')} className={`${suggestionTabButtonStyle('viral')} text-yellow-400 border-yellow-500`}>🔥 트렌드/클릭 치트키</button>
                          <button onClick={() => handleSuggestionTabChange('category')} className={suggestionTabButtonStyle('category')}>카테고리별</button>
                          <button onClick={() => handleSuggestionTabChange('eeat')} className={suggestionTabButtonStyle('eeat')}>E-E-A-T 기반</button>
                          <button onClick={() => handleSuggestionTabChange('evergreen')} className={suggestionTabButtonStyle('evergreen')}>에버그린 콘텐츠</button>
                          <button onClick={() => handleSuggestionTabChange('longtail')} className={suggestionTabButtonStyle('longtail')}>롱테일 키워드 주제</button>
                          <button onClick={() => handleSuggestionTabChange('memo')} className={suggestionTabButtonStyle('memo')}>메모/파일 기반</button>
                          <button onClick={() => handleSuggestionTabChange('expansion')} className={suggestionTabButtonStyle('expansion')}>주제 확장</button>
                      </nav>
                  </div>

                  <div className="pt-4">
                    {activeSuggestionTab === 'viral' && (
                        <div className="space-y-4">
                            <p className="text-yellow-200 text-sm bg-yellow-900/30 p-3 rounded-md border border-yellow-700/50">
                                🚀 <strong>블로그의 기본은 최신성과 클릭률입니다!</strong><br/>
                                실시간 구글 검색 트렌드와 인간 심리를 자극하는 클릭 치트키를 조합하여, 지금 당장 써야 하는 조회수 보장형 주제 10개를 뽑아드립니다.
                            </p>
                            <SuggestionButton
                                onClick={() => handleSuggestTopics((currentDate) => generateViralTrendTitles(currentDate))}
                                disabled={isSuggestingTopics}
                                text="🔥 실시간 트렌드/치트키 제목 10개 뽑기"
                            />
                        </div>
                    )}
                    {activeSuggestionTab === 'eeat' && (
                      <div className="space-y-4">
                        <p className="text-gray-400 text-sm">구글 SEO의 핵심인 E-E-A-T(경험, 전문성, 권위성, 신뢰성) 원칙을 만족시키는 주제를 추천받으세요. 사용자의 실제 경험과 전문 지식을 효과적으로 보여주어 블로그의 신뢰도를 높이고 검색 순위 상승을 목표로 합니다.</p>
                        <div>
                            <label htmlFor="eeat-category" className="block text-sm font-medium text-gray-300 mb-2">콘텐츠 유형 선택</label>
                            <select id="eeat-category" value={selectedEeatCategory} onChange={(e) => setSelectedEeatCategory(e.target.value)}
                              className="w-full bg-gray-900 border border-gray-600 rounded-md px-4 py-2 text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
                              {EEAT_CATEGORIES.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                            </select>
                        </div>
                        <div>
                            <label htmlFor="eeat-sub-category" className="block text-sm font-medium text-gray-300 mb-2">콘텐츠 분야 선택</label>
                            <select id="eeat-sub-category" value={selectedEeatSubCategory} onChange={(e) => setSelectedEeatSubCategory(e.target.value)}
                              className="w-full bg-gray-900 border border-gray-600 rounded-md px-4 py-2 text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
                              {(EEAT_SUB_CATEGORIES_MAP[selectedEeatCategory] || []).map(subCat => (
                                <option key={subCat} value={subCat}>{subCat}</option>
                              ))}
                            </select>
                        </div>
                        <SuggestionButton
                              onClick={() => {
                                handleSuggestTopics((currentDate) => generateEeatTopicSuggestions(selectedEeatSubCategory, selectedEeatCategory, currentDate));
                              }}
                              disabled={isSuggestingTopics || !selectedEeatSubCategory}
                              text="E-E-A-T 주제 추천받기"
                          />
                      </div>
                    )}
                    {activeSuggestionTab === 'category' && (
                      <div className="space-y-4">
                        <p className="text-gray-400 text-sm">선택한 카테고리 내에서 독자의 흥미를 끌고 소셜 미디어 공유를 유도할 만한 최신 트렌드 및 인기 주제를 추천받으세요. 광범위한 독자층을 대상으로 하는 매력적인 콘텐츠 아이디어를 얻을 수 있습니다.</p>
                        <div>
                          <label htmlFor="gen-category" className="block text-sm font-medium text-gray-300 mb-2">카테고리 선택</label>
                          <select id="gen-category" value={selectedGenCategory} onChange={(e) => setSelectedGenCategory(e.target.value)} className="w-full bg-gray-900 border border-gray-600 rounded-md px-4 py-2 text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
                            {GENERAL_CATEGORIES.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                          </select>
                        </div>
                        {selectedGenCategory === '기타(사용자입력)' && (
                          <div>
                            <label htmlFor="custom-gen-category" className="block text-sm font-medium text-gray-300 mb-2">사용자 입력</label>
                            <input type="text" id="custom-gen-category" value={customGenCategory} onChange={(e) => setCustomGenCategory(e.target.value)} placeholder="관심 카테고리를 입력하세요" className="w-full bg-gray-900 border border-gray-600 rounded-md px-4 py-2 text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500" />
                          </div>
                        )}
                        <SuggestionButton 
                          onClick={() => handleSuggestTopics((currentDate) => generateCategoryTopicSuggestions(selectedGenCategory === '기타(사용자입력)' ? customGenCategory : selectedGenCategory, currentDate))}
                          disabled={isSuggestingTopics || (selectedGenCategory === '기타(사용자입력)' && !customGenCategory.trim())}
                          text="카테고리별 주제 추천받기"
                        />
                      </div>
                    )}
                    {activeSuggestionTab === 'evergreen' && (
                      <div className="space-y-4">
                        <p className="text-gray-400 text-sm">시간이 흘러도 가치가 변하지 않아 꾸준한 검색 트래픽을 유도할 수 있는 '에버그린' 주제를 추천받으세요. 'How-to 가이드', '궁극의 가이드' 등 한번 작성해두면 장기적으로 블로그의 자산이 되는 콘텐츠 아이디어를 얻을 수 있습니다.</p>
                        <div>
                          <label htmlFor="evergreen-category" className="block text-sm font-medium text-gray-300 mb-2">콘텐츠 유형 선택</label>
                          <select id="evergreen-category" value={selectedEvergreenCategory} onChange={(e) => setSelectedEvergreenCategory(e.target.value)} className="w-full bg-gray-900 border border-gray-600 rounded-md px-4 py-2 text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
                            {EVERGREEN_CATEGORIES.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                          </select>
                        </div>
                        <div>
                          <label htmlFor="evergreen-field" className="block text-sm font-medium text-gray-300 mb-2">콘텐츠 분야 선택</label>
                            <select id="evergreen-field" value={selectedEvergreenField} onChange={(e) => setSelectedEvergreenField(e.target.value)}
                              className="w-full bg-gray-900 border border-gray-600 rounded-md px-4 py-2 text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
                              {GENERAL_CATEGORIES.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                            </select>
                        </div>
                        {selectedEvergreenField === '기타(사용자입력)' && (
                          <div>
                            <label htmlFor="custom-evergreen-field" className="block text-sm font-medium text-gray-300 mb-2">분야 직접 입력</label>
                            <input type="text" id="custom-evergreen-field" value={customEvergreenField} onChange={(e) => setCustomEvergreenField(e.target.value)} placeholder="관심 분야를 입력하세요" className="w-full bg-gray-900 border border-gray-600 rounded-md px-4 py-2 text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500" />
                          </div>
                        )}
                        <SuggestionButton 
                           onClick={() => {
                                const field = selectedEvergreenField === '기타(사용자입력)' ? customEvergreenField : selectedEvergreenField;
                                handleSuggestTopics((currentDate) => generateEvergreenTopicSuggestions(field, selectedEvergreenCategory, currentDate));
                            }}
                          disabled={isSuggestingTopics || (selectedEvergreenField === '기타(사용자입력)' && !customEvergreenField.trim())}
                          text="에버그린 주제 추천받기"
                        />
                      </div>
                    )}
                    {activeSuggestionTab === 'longtail' && (
                      <div className="space-y-4">
                          <p className="text-gray-400 text-sm">실시간 구글 검색을 활용하여, 검색량은 적지만 명확한 목적을 가진 사용자를 타겟으로 하는 '롱테일 키워드' 주제를 추천받으세요. 경쟁이 낮아 상위 노출에 유리하며, 구매나 특정 행동으로 이어질 확률이 높은 잠재고객을 유치하는 데 효과적입니다.</p>
                          <div>
                              <label htmlFor="longtail-category" className="block text-sm font-medium text-gray-300 mb-2">콘텐츠 유형 선택</label>
                              <select id="longtail-category" value={selectedLongtailCategory} onChange={(e) => setSelectedLongtailCategory(e.target.value)} className="w-full bg-gray-900 border border-gray-600 rounded-md px-4 py-2 text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
                                  {LONGTAIL_CATEGORIES.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                              </select>
                          </div>
                          <SuggestionButton 
                              onClick={() => handleSuggestTopics((currentDate) => generateLongtailTopicSuggestions(selectedLongtailCategory, currentDate))}
                              disabled={isSuggestingTopics}
                              text="롱테일 주제 추천받기"
                          />
                      </div>
                    )}
                    {activeSuggestionTab === 'memo' && (
                      <div className="space-y-4">
                        <p className="text-gray-400 text-sm">가지고 있는 아이디어 메모, 초안, 강의 노트, 관련 자료 파일 등을 기반으로 블로그 주제를 추천받으세요. AI가 핵심 내용을 분석하여 가장 매력적이고 발전 가능성이 높은 포스트 제목을 제안해 드립니다.</p>
                        <div>
                          <label htmlFor="memo-content" className="block text-sm font-medium text-gray-300 mb-2">메모/초안 입력</label>
                          <textarea id="memo-content" value={memoContent} onChange={(e) => setMemoContent(e.target.value)} rows={6} placeholder="여기에 아이디어를 자유롭게 작성하거나 아래 버튼을 통해 파일을 업로드하세요." className="w-full bg-gray-900 border border-gray-600 rounded-md px-4 py-2 text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"></textarea>
                        </div>
                        <div className="flex items-center space-x-2">
                            <label htmlFor="file-upload" className="cursor-pointer bg-gray-700 text-white font-bold py-2 px-4 rounded-md hover:bg-gray-600 transition-colors duration-200 inline-flex items-center">
                                <span className="mr-2">📤</span>
                                <span>파일 업로드 (.txt, .md 등)</span>
                            </label>
                            <input id="file-upload" type="file" multiple accept=".txt,.md,.html,.js,.jsx,.ts,.tsx,.json,.css" className="hidden" onChange={handleFileChange} />
                            {uploadedFileNames.length > 0 && (
                                <span className="text-sm text-gray-400 truncate">{uploadedFileNames.join(', ')}</span>
                            )}
                        </div>
                        <SuggestionButton 
                          onClick={() => handleSuggestTopics((currentDate) => generateTopicsFromMemo(memoContent, currentDate))}
                          disabled={isSuggestingTopics || !memoContent.trim()}
                          text="메모 기반 주제 추천받기"
                        />
                      </div>
                    )}
                     {activeSuggestionTab === 'expansion' && (
                      <div className="space-y-4">
                        <p className="text-gray-400 text-sm">아이디어가 있으신가요? 입력한 주제를 기반으로 AI가 더 매력적이고 구체적인 10가지 주제를 추가로 제안해 드립니다. 입력한 주제도 목록에 포함되어 선택할 수 있습니다.</p>
                        <div>
                          <label htmlFor="expansion-topic" className="block text-sm font-medium text-gray-300 mb-2">블로그 주제 아이디어</label>
                          <input
                            type="text"
                            id="expansion-topic"
                            value={expansionTopic}
                            onChange={(e) => setExpansionTopic(e.target.value)}
                            placeholder="예: 효과적인 시간 관리 방법"
                            className="w-full bg-gray-900 border border-gray-600 rounded-md px-4 py-2 text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          />
                        </div>
                        <SuggestionButton
                          onClick={handleSuggestFromTopic}
                          disabled={isSuggestingTopics || !expansionTopic.trim()}
                          text="주제 확장 아이디어 받기"
                        />
                      </div>
                    )}
                  </div>
                  {suggestionError && (
                    <div className="mt-4 p-3 bg-red-900/50 border border-red-700 text-red-300 rounded-md text-sm">{suggestionError}</div>
                  )}
                  {suggestedTopics.length > 0 && (
                    <div className="mt-4 p-4 bg-gray-900/50 border border-gray-700 rounded-lg">
                        <h4 className="text-md font-semibold text-white mb-3">추천 주제:</h4>
                        <ul className="space-y-2">
                            {suggestedTopics.map((sTopic, index) => (
                                <li key={index} 
                                    onClick={() => handleTopicSelect(sTopic)}
                                    className="p-3 bg-gray-800 rounded-md cursor-pointer hover:bg-blue-600 hover:text-white transition-colors duration-200 text-sm text-gray-300">
                                    {sTopic}
                                </li>
                            ))}
                        </ul>
                    </div>
                  )}
                </div>
              </div>
            )}
            {mainTab === 'keywordFighter' && (
               <KeywordFighter
                    onTopicSelect={handleTopicSelectFromFighter}
                    isNaverApiConfigured={apiStatus === 'success'}
                    naverClientId={naverClientId}
                    naverClientSecret={naverClientSecret}
                    initialUrlToAnalyze={urlToAnalyze}
                    initialBlogInfo={urlBlogInfo}
                    onAnalysisTriggered={() => { setUrlToAnalyze(null); setUrlBlogInfo(null); }}
                    onPlatformDetect={setDetectedBlogPlatform}
                />
            )}
            {mainTab === 'naverAnalyzer' && (
                <NaverBlogAnalyzer
                    onTopicSelect={handleTopicSelectFromFighter}
                    isNaverApiConfigured={apiStatus === 'success'}
                    naverClientId={naverClientId}
                    naverClientSecret={naverClientSecret}
                    initialBlogUrl={naverBlogUrlToAnalyze ?? undefined}
                    onInitialUrlHandled={() => setNaverBlogUrlToAnalyze(null)}
                />
            )}
            {mainTab === 'shortcuts' && (
                <Shortcuts />
            )}
          </div>
          
          <BlogPostGenerator
            topic={topic}
            setTopic={setTopic}
            additionalRequest={additionalRequest}
            setAdditionalRequest={setAdditionalRequest}
            activeSuggestionTab={activeSuggestionTab}
            memoContent={memoContent}
            onAnalyzeUrl={handleAnalyzeBlogUrl}
            onReset={handleGeneratorReset}
            detectedPlatform={detectedBlogPlatform}
          />

        </main>
      </div>
      <Footer />
      <SettingsModal
        isOpen={isSettingsModalOpen}
        onClose={() => setIsSettingsModalOpen(false)}
        geminiApiKey={geminiApiKey}
        setGeminiApiKey={setGeminiApiKey}
        onSaveGemini={handleSaveGeminiKey}
        geminiStatus={geminiStatus}
        geminiError={geminiError}
        onTestAndSaveGemini={handleTestAndSaveGeminiKey}
        showGeminiKey={showGeminiKey}
        setShowGeminiKey={setShowGeminiKey}
        clientId={naverClientId}
        setClientId={setNaverClientId}
        clientSecret={naverClientSecret}
        setClientSecret={setNaverClientSecret}
        status={apiStatus}
        error={apiError}
        onTestAndSave={handleTestAndSaveCredentials}
        huggingFaceApiKey={huggingFaceApiKey}
        setHuggingFaceApiKey={setHuggingFaceApiKey}
        onSaveHuggingFace={handleSaveHuggingFaceKey}
      />
    </div>
  );
}

export default App;
