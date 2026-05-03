import React from 'react';

interface Props { onClose: () => void; }

export const HelpModal: React.FC<Props> = ({ onClose }) => (
    <div
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
        onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
        <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 flex-shrink-0">
                <h2 className="text-base font-black text-gray-800">사용 가이드 및 도움말</h2>
                <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">×</button>
            </div>
            <div className="overflow-y-auto p-6 space-y-8 text-sm text-gray-700">

                {/* 1 */}
                <section>
                    <h3 className="font-black text-gray-900 text-base mb-3 pb-2 border-l-4 border-green-600 pl-3">1. 시스템 철학 및 알고리즘 배경</h3>
                    <p className="text-gray-600 mb-3">네이버 블로그 검색 엔진은 매년 급격하게 진화하고 있습니다. 과거의 단순 키워드 반복 방식은 이제 통하지 않습니다. 본 서비스는 네이버의 3대 핵심 알고리즘을 완벽하게 분석하여 반영합니다.</p>
                    <div className="grid grid-cols-2 gap-2">
                        {[
                            { name: 'C-Rank', desc: '주제의 전문성과 지속성을 평가합니다.' },
                            { name: 'D.I.A. / D.I.A.+', desc: '문서의 정보성과 독창성을 평가합니다.' },
                            { name: 'RCON / DAN25', desc: '시의성과 개인화된 맥락을 강화합니다.' },
                            { name: 'AEO / Cue:', desc: 'AI 답변 소스 채택을 위한 지식 구조를 최적화합니다.' },
                            { name: 'Insight Edge', desc: '결핍(Pain Point)과 마이크로 니치를 파고듭니다.' },
                        ].map(a => (
                            <div key={a.name} className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                                <div className="text-green-700 font-bold text-xs mb-1">{a.name}</div>
                                <div className="text-gray-600 text-xs">{a.desc}</div>
                            </div>
                        ))}
                    </div>
                </section>

                {/* 2 */}
                <section>
                    <h3 className="font-black text-gray-900 text-base mb-3 pb-2 border-l-4 border-green-600 pl-3">2. 최적화 모드별 상세 가이드</h3>
                    {[
                        { name: '기본 SEO (Standard)', sub: '정보성/전문성 위주', color: 'text-green-700', bg: 'bg-green-50 border-green-200', tips: ['최소 2,000자 이상의 고밀도 텍스트 구성', 'H2, H3 태그를 활용한 논리적 위계 구조 형성', '데이터 시각화를 위한 마크다운 표(Table) 삽입'] },
                        { name: 'RCON (Context Reranking)', sub: '의도/시의성/개인화 위주', color: 'text-blue-700', bg: 'bg-blue-50 border-blue-200', tips: ['질문형 소제목을 통한 사용자 궁금증 선제적 해결', '체류 시간을 극대화하는 단계별 심층 분석', '개인화 맥락을 강화하는 1인칭 경험 포함'] },
                        { name: 'AI 브리핑 (AEO)', sub: '지식/팁/구조화 위주', color: 'text-orange-700', bg: 'bg-orange-50 border-orange-200', tips: ['롱테일 질문형 제목 및 FAQ 섹션 의무화', '2,500자 이상의 방대한 정보량으로 신뢰도 확보', '정보 요약 스니펫 및 비교 표 삽입'] },
                        { name: '네이버 홈판 (Home-plate)', sub: '추천/공감/CTR 위주', color: 'text-pink-700', bg: 'bg-pink-50 border-pink-200', tips: ['감성/반전형 제목(22~25자)으로 클릭률(CTR) 극대화', '1인칭 경험담 중심의 스토리텔링 및 강렬한 댓글 유도', '모바일 스크롤에 최적화된 피드형 짧은 문단 구조'] },
                        { name: '인사이트 엣지 (Insight Edge)', sub: '결핍/니치/통찰 위주', color: 'text-purple-700', bg: 'bg-purple-50 border-purple-200', tips: ['불편함과 미충족 욕구를 파고드는 페인 포인트 분석', '타겟을 극도로 좁힌 마이크로 니치(Micro-Niche) 접근', '대중적 상식에 의문을 제기하는 반골 기질(Contrarian)적 시각'] },
                    ].map(m => (
                        <div key={m.name} className={`rounded-lg p-3 border mb-2 ${m.bg}`}>
                            <div className="flex items-baseline gap-2 mb-2">
                                <span className={`font-bold text-sm ${m.color}`}>{m.name}</span>
                                <span className="text-gray-500 text-xs">{m.sub}</span>
                            </div>
                            <ul className="space-y-1">
                                {m.tips.map((t, i) => <li key={i} className="text-xs text-gray-600 flex gap-1.5"><span className="text-green-600 flex-shrink-0">•</span>{t}</li>)}
                            </ul>
                        </div>
                    ))}
                </section>

                {/* 3 */}
                <section>
                    <h3 className="font-black text-gray-900 text-base mb-3 pb-2 border-l-4 border-green-600 pl-3">3. 고급 AI 엔진 설정</h3>
                    <div className="grid grid-cols-2 gap-2">
                        <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                            <div className="font-bold text-sm text-gray-800 mb-1">인간화 페르소나</div>
                            <div className="text-xs text-gray-600">AI 특유의 정형성을 파괴하고 '덕후형 블로거'의 말투를 재현합니다.</div>
                        </div>
                        <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                            <div className="font-bold text-sm text-gray-800 mb-1">패턴 흔들기</div>
                            <div className="text-xs text-gray-600">검색 엔진의 저품질 판정을 피하기 위해 기계적 패턴을 제거합니다.</div>
                        </div>
                    </div>
                </section>

                {/* 4 */}
                <section>
                    <h3 className="font-black text-gray-900 text-base mb-3 pb-2 border-l-4 border-green-600 pl-3">4. 멀티미디어 생성 및 제어</h3>
                    <div className="grid grid-cols-2 gap-2">
                        {[
                            { name: '생성 제어 (Control)', desc: '이미지 생성 시 "미생성" 체크박스를 통해 이미지나 동영상 플레이스홀더 생성을 완전히 차단할 수 있습니다.' },
                            { name: '이미지 캡션 자동화', desc: '본문에 삽입된 이미지 하단에 AI가 생성한 상세 설명(Alt Tag)이 자동으로 캡션으로 추가됩니다.' },
                            { name: 'JFIF 헤더 클리닝', desc: '이미지 복사 시 발생할 수 있는 .jfif 확장자 문제를 방지하기 위해 JPEG 헤더를 강제 변환합니다.' },
                            { name: '일괄 생성 및 삽입', desc: '여러 장의 이미지를 한 번에 생성하고, 본문의 원하는 위치에 원클릭으로 삽입할 수 있습니다.' },
                        ].map(f => (
                            <div key={f.name} className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                                <div className="font-bold text-xs text-gray-800 mb-1">{f.name}</div>
                                <div className="text-xs text-gray-500">{f.desc}</div>
                            </div>
                        ))}
                    </div>
                </section>

                {/* 5 */}
                <section>
                    <h3 className="font-black text-gray-900 text-base mb-3 pb-2 border-l-4 border-green-600 pl-3">5. 데이터 기반 SEO 검증 도구</h3>
                    <div className="bg-gray-800 text-white rounded-xl p-4 mb-3">
                        <div className="font-bold text-sm mb-2">네이버 블로그 품질 검증 체크리스트 (v3)</div>
                        <p className="text-gray-300 text-xs mb-3">생성된 기사를 최대 16가지 핵심 지표로 자동 검증합니다.</p>
                        <div className="grid grid-cols-2 gap-1.5">
                            {['✓ 제목 25-35자 & 키워드 전진', '✓ 본문 분량 (모드별 1,500~2,500자)', '✓ 이미지/동영상 개수 및 일관성', '✓ 인간화 페르소나 7대 지표 (선택)'].map(c => (
                                <div key={c} className="bg-gray-700 rounded px-2 py-1 text-xs text-gray-300">{c}</div>
                            ))}
                        </div>
                    </div>
                </section>

                {/* 6 */}
                <section>
                    <h3 className="font-black text-gray-900 text-base mb-3 pb-2 border-l-4 border-green-600 pl-3">6. 완벽한 발행을 위한 6단계 워크플로우</h3>
                    {[
                        { n: 1, title: '전략 수립 및 주제 선정', desc: '카테고리별 트렌드를 분석하고, 타겟 독자에 맞춰 SEO 모드를 결정합니다.' },
                        { n: 2, title: '콘텐츠 생성 및 키워드 튜닝', desc: '주제를 입력하거나, 기존 글 붙여넣기/파일 업로드 후 "글 분석하기"로 제목·키워드를 자동 추출하세요.' },
                        { n: 3, title: '품질 검증 체크리스트 확인', desc: '하단의 검증 리포트를 확인하여 80점 이상(13개 항목 이상 통과)인지 확인하고 부족한 부분을 수정합니다.' },
                        { n: 4, title: '멀티미디어 에셋 제작', desc: '본문의 [이미지] 위치에 들어갈 사진들을 생성합니다.' },
                        { n: 5, title: '모바일 가독성 최종 점검', desc: '스마트폰 화면에서 글이 너무 빽빽하지 않은지 확인합니다.' },
                        { n: 6, title: '서식 유지 복사 및 발행', desc: '복사 버튼을 눌러 네이버 에디터에 붙여넣거나, HTML 코드를 직접 사용하세요.' },
                    ].map(s => (
                        <div key={s.n} className="flex gap-3 mb-3">
                            <div className="w-7 h-7 bg-green-600 text-white rounded-full flex-shrink-0 flex items-center justify-center font-black text-sm">{s.n}</div>
                            <div>
                                <div className="font-bold text-sm text-gray-800">{s.title}</div>
                                <div className="text-xs text-gray-500 mt-0.5">{s.desc}</div>
                            </div>
                        </div>
                    ))}
                </section>

                {/* 7 */}
                <section>
                    <h3 className="font-black text-gray-900 text-base mb-3 pb-2 border-l-4 border-green-600 pl-3">7. 자주 묻는 질문 (FAQ)</h3>
                    {[
                        { q: 'AI가 쓴 글인데 저품질에 걸리지 않을까요?', a: '네이버는 AI 글 자체보다도 "정보 가치"를 봅니다. 본 서비스는 "패턴 흔들기"와 "인간화 페르소나"를 통해 AI 특유의 기계적 패턴을 제거하여 안전성을 극대화했습니다.' },
                        { q: '이미지 속 인물이 왜 모두 한국인인가요?', a: '국내 블로그 독자들은 서구권 인물이 등장하는 스톡 사진에서 거부감을 느낍니다. 신뢰도와 친숙함을 위해 모든 인물 생성 프롬프트에 "Korean" 속성을 강제 적용하고 있습니다.' },
                    ].map(f => (
                        <div key={f.q} className="mb-3">
                            <p className="font-bold text-sm text-gray-800">Q. {f.q}</p>
                            <p className="text-gray-600 text-xs mt-1">A. {f.a}</p>
                        </div>
                    ))}
                    <div className="bg-gray-50 rounded-lg p-3 text-xs text-gray-400 text-center border border-gray-200 mt-4">
                        본 서비스는 네이버 블로그 SEO 최적화를 돕는 보조 도구이며, 상위 노출을 100% 보장하지는 않습니다.
                    </div>
                </section>
            </div>
            <div className="px-6 py-4 border-t border-gray-200 flex-shrink-0">
                <button onClick={onClose} className="w-full bg-green-700 hover:bg-green-600 text-white font-bold py-2.5 rounded-xl text-sm">확인</button>
            </div>
        </div>
    </div>
);
