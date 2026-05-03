import React, { useState } from 'react';
import { NaverSeoMethod, SEO_METHOD_LABELS } from '../types';
import { generateNaverTitles } from '../services/naverAI';

const CATEGORIES: { label: string; desc: string; subs: string[] }[] = [
    { label: '레시피/맛집/식품', desc: '압도적 1위 카테고리입니다. 요리 중 검색 수요가 발생하고, 레시피를 따라하며 자연스럽게 체류시간이 길어져 지속적으로 인기가 높습니다.', subs: ['요리', '레시피', '맛집', '식품 리뷰', 'AI 푸드/레시피 추천', '카페/디저트', '전통시장/로컬푸드', '다이어트 식단', '간편식/밀키트', '베이킹/디저트'] },
    { label: '여행/숙박', desc: '시즌별 검색량이 폭발적으로 증가하는 카테고리입니다. 실제 경험 후기와 구체적인 정보가 상위 노출에 유리합니다.', subs: ['국내여행', '해외여행', '숙박/호텔', '캠핑/글램핑', '맛집 여행', '여행 준비', '항공/교통', '제주도', '부산/경주', '해외 이민/유학'] },
    { label: 'IT 기기 리뷰', desc: '신제품 출시 시 검색량이 급등하는 카테고리입니다. 실사용 후기와 비교 분석이 클릭률을 높입니다.', subs: ['스마트폰', '노트북/PC', '태블릿', '웨어러블', '카메라', '오디오', '주변기기', 'TV/모니터', '게이밍 기기'] },
    { label: 'IT/인터넷', desc: '개발자부터 일반 사용자까지 폭넓은 독자층을 가진 카테고리입니다.', subs: ['앱 추천', '소프트웨어', '보안/해킹', '웹서비스', '클라우드', '코딩/개발', '블로그/유튜브 팁', 'SNS 마케팅'] },
    { label: 'AI/인공지능', desc: '2024~2026년 최고 성장 카테고리입니다. AI 도구 활용법과 최신 트렌드가 폭발적인 관심을 받고 있습니다.', subs: ['ChatGPT', 'AI 이미지 생성', 'AI 글쓰기', 'AI 활용법', 'AI 도구 추천', '프롬프트 엔지니어링', 'AI 뉴스', '생성형 AI'] },
    { label: '패션/의류/뷰티', desc: '구매 전 리뷰를 찾는 독자가 많아 전환율이 높습니다. 계절별 트렌드에 맞춘 글이 효과적입니다.', subs: ['스킨케어', '메이크업', '헤어', '패션/코디', '향수', '다이어트 뷰티', '남성 그루밍', '제품 리뷰'] },
    { label: '건강/웰빙/운동', desc: '꾸준한 검색 수요가 있는 스테디셀러 카테고리입니다. 전문성과 경험담이 함께 있는 글이 높은 평가를 받습니다.', subs: ['다이어트', '헬스/근력', '요가/필라테스', '영양/보충제', '정신건강', '한방/자연치유', '수면', '만성질환'] },
    { label: '재테크/금융/경제', desc: '고관여 독자층이 깊이 있는 정보를 찾는 카테고리입니다. 구체적인 수치와 사례가 신뢰도를 높입니다.', subs: ['주식/ETF', '부동산', '절약/저축', '연금/보험', '부업/N잡', '암호화폐', '해외투자', '세금/절세'] },
    { label: '육아/출산/교육', desc: '부모들의 정보 탐색 니즈가 매우 강한 카테고리입니다. 실제 경험과 전문 정보의 조합이 효과적입니다.', subs: ['임신/출산', '영유아', '초등교육', '학습법', '장난감/교구', '어린이집/유치원', '사교육', '독서/책'] },
    { label: '취업/자기개발', desc: '20~30대 직장인과 취준생이 집중된 카테고리입니다. 실용적이고 즉시 적용 가능한 정보가 인기입니다.', subs: ['이력서/면접', '자격증', '직장생활', '부업/창업', '자기계발 도서', '언어 학습', '온라인 강의', '커리어 전환'] },
    { label: '일상/생활/취미', desc: '폭넓은 주제로 다양한 독자층을 끌어들이는 카테고리입니다. 공감과 감성이 핵심입니다.', subs: ['인테리어', '청소/정리', '반려동물', '미니멀라이프', '독서/취미', 'DIY', '원예/식물', '반려식물'] },
    { label: '엔터테인먼트/문화', desc: '트렌드에 민감한 젊은 독자층이 많습니다. 최신 트렌드와 빠른 업데이트가 중요합니다.', subs: ['드라마/영화', '웹툰/웹소설', '게임', '음악', '스포츠', '공연/전시', 'K-pop', '애니메이션'] },
    { label: '수익형 블로그/유튜브', desc: '블로거와 크리에이터를 대상으로 하는 전문 카테고리입니다. 실제 수익 사례와 노하우가 높은 클릭률을 기록합니다.', subs: ['블로그 운영', '유튜브 운영', '애드센스', '제휴마케팅', 'SNS 마케팅', '디지털 노마드', '온라인 창업', '콘텐츠 제작'] },
];

const METHODS: NaverSeoMethod[] = ['crank', 'alcon', 'aeo', 'insightedge', 'homeplate'];

export const NaviTitles: React.FC = () => {
    const [category, setCategory] = useState(CATEGORIES[0].label);
    const [subCategory, setSubCategory] = useState(CATEGORIES[0].subs[0]);
    const [topic, setTopic] = useState('');
    const [method, setMethod] = useState<NaverSeoMethod>('crank');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [titles, setTitles] = useState<string[]>([]);
    const [copied, setCopied] = useState<number | null>(null);

    const currentCat = CATEGORIES.find(c => c.label === category)!;

    const handleCategoryChange = (cat: string) => {
        setCategory(cat);
        const found = CATEGORIES.find(c => c.label === cat);
        if (found) setSubCategory(found.subs[0]);
    };

    const handleGenerate = async () => {
        setIsLoading(true);
        setError(null);
        setTitles([]);
        try {
            const result = await generateNaverTitles({
                category,
                subCategory,
                method,
                keyword: topic.trim() || undefined,
            });
            setTitles(result);
        } catch (e) {
            setError(e instanceof Error ? e.message : '생성 중 오류가 발생했습니다.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
            <div className="p-5 space-y-5">
                <div>
                    <h2 className="text-base font-black text-gray-800 mb-1">인기 카테고리 제목 추천</h2>
                    <p className="text-sm text-gray-500">상위 노출이 잘 되는 인기 카테고리를 선택하고, 최신 트렌드와 SEO 전략이 반영된 매력적인 블로그 제목 10개를 추천받아 보세요.</p>
                </div>

                {/* SEO Method */}
                <div>
                    <div className="text-xs font-bold text-gray-500 mb-2 uppercase tracking-wide">SEO 최적화 방식 선택</div>
                    <div className="grid grid-cols-3 gap-2 mb-2">
                        {METHODS.slice(0, 3).map(m => (
                            <button key={m} onClick={() => setMethod(m)}
                                className={`p-3 rounded-lg border-2 text-left transition-all text-sm font-semibold ${
                                    method === m ? 'border-green-600 bg-white text-green-700' : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
                                }`}
                            >{SEO_METHOD_LABELS[m]}</button>
                        ))}
                    </div>
                    <div className="grid grid-cols-2 gap-2 mb-2">
                        {METHODS.slice(3).map(m => (
                            <button key={m} onClick={() => setMethod(m)}
                                className={`p-3 rounded-lg border-2 text-left transition-all text-sm font-semibold ${
                                    method === m ? 'border-green-600 bg-white text-green-700' : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
                                }`}
                            >{SEO_METHOD_LABELS[m]}</button>
                        ))}
                    </div>
                </div>

                {/* Categories */}
                <div className="grid grid-cols-2 gap-3">
                    <div>
                        <label className="block text-sm text-gray-700 mb-1">1. 메인 카테고리 선택</label>
                        <select value={category} onChange={e => handleCategoryChange(e.target.value)}
                            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 bg-white"
                        >
                            {CATEGORIES.map(c => <option key={c.label} value={c.label}>{c.label}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm text-gray-700 mb-1">2. 서브 카테고리 선택</label>
                        <select value={subCategory} onChange={e => setSubCategory(e.target.value)}
                            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 bg-white"
                        >
                            {currentCat.subs.map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                    </div>
                </div>

                {/* Topic input */}
                <div>
                    <label className="block text-sm text-gray-700 mb-1">3. 구체적인 주제 입력 <span className="text-gray-400 text-xs">(선택사항)</span></label>
                    <input value={topic} onChange={e => setTopic(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && !isLoading && handleGenerate()}
                        placeholder="예: 제주도 가족 여행, 강남역 데이트, 아이폰16 프로 후기 (비워두면 AI가 트렌드를 분석해 추천합니다)"
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 placeholder-gray-400"
                    />
                </div>

                {/* Why box */}
                <div className="bg-gray-50 border border-gray-200 rounded-lg px-4 py-3 flex gap-2">
                    <span className="text-blue-500 flex-shrink-0 text-sm">ⓘ</span>
                    <div>
                        <span className="text-xs font-bold text-gray-700">왜 인기 카테고리일까요? </span>
                        <span className="text-xs text-gray-600">{currentCat.desc}</span>
                    </div>
                </div>

                {error && <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-red-600 text-sm">{error}</div>}

                <button onClick={handleGenerate} disabled={isLoading}
                    className="w-full flex items-center justify-center gap-2 bg-green-700 hover:bg-green-600 disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-bold py-3 rounded-xl transition-colors"
                >
                    {isLoading ? (
                        <><svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>제목 생성 중...</>
                    ) : '👤 제목 추천받기'}
                </button>
            </div>

            {/* Results */}
            {titles.length > 0 ? (
                <div className="border-t border-gray-100 p-5 space-y-2">
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-3">추천 제목 ({titles.length}개)</p>
                    {titles.map((title, i) => (
                        <div key={i} className="flex items-center gap-3 bg-gray-50 rounded-lg px-4 py-3 border border-gray-200">
                            <span className="text-green-600 font-black text-sm w-5 flex-shrink-0">{i + 1}</span>
                            <span className="flex-1 text-gray-800 text-sm">{title}</span>
                            <button onClick={async () => { await navigator.clipboard.writeText(title); setCopied(i); setTimeout(() => setCopied(null), 2000); }}
                                className="flex-shrink-0 text-xs bg-white border border-gray-200 hover:bg-green-50 hover:border-green-300 text-gray-500 hover:text-green-700 px-2.5 py-1 rounded-lg transition-colors"
                            >{copied === i ? '✅' : '복사'}</button>
                        </div>
                    ))}
                    <button onClick={async () => { await navigator.clipboard.writeText(titles.join('\n')); setCopied(-1); setTimeout(() => setCopied(null), 2000); }}
                        className="w-full mt-2 bg-gray-100 hover:bg-gray-200 text-gray-600 text-sm font-bold py-2.5 rounded-xl transition-colors"
                    >{copied === -1 ? '✅ 전체 복사됨!' : '📋 전체 복사'}</button>
                </div>
            ) : (
                <div className="border-t border-gray-100 py-10 text-center text-gray-400">
                    <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
                        <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"/>
                        </svg>
                    </div>
                    <p className="text-sm font-medium text-gray-500">추천 제목이 여기에 표시됩니다.</p>
                    <p className="text-xs text-gray-400 mt-1">카테고리를 선택하고 '제목 추천받기' 버튼을 눌러주세요.</p>
                </div>
            )}
        </div>
    );
};
