
import React, { useState } from 'react';

interface BulkLinkModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (text: string) => void;
}

export const BulkLinkModal: React.FC<BulkLinkModalProps> = ({ isOpen, onClose, onAdd }) => {
  const [text, setText] = useState('');

  if (!isOpen) return null;

  const handleAddClick = () => {
    onAdd(text);
    setText('');
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-slate-800 rounded-lg shadow-xl max-w-2xl w-full" onClick={e => e.stopPropagation()}>
        <div className="p-4 sm:p-6 border-b border-slate-700 flex justify-between items-center">
          <h2 className="text-xl sm:text-2xl font-bold text-white">내부 링크 대량 추가</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white text-3xl font-light">&times;</button>
        </div>
        <div className="p-4 sm:p-6 space-y-4">
            <p className="text-sm text-slate-400">
                한 줄에 하나의 링크를 입력하세요. URL과 앵커 텍스트는 쉼표(,), 탭, 또는 공백으로 구분합니다. 앵커 텍스트를 생략하면 AI가 페이지 제목을 자동으로 가져옵니다.
            </p>
            <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                rows={10}
                placeholder={`https://example.com/page1, AI 블로그 작성법\nhttps://example.com/page2\nhttps://example.com/page3 SEO 최적화 가이드`}
                className="w-full bg-slate-900 border border-slate-600 rounded-md px-4 py-2 text-white placeholder-slate-500 focus:ring-2 focus:ring-cyan-500"
            />
        </div>
        <div className="p-4 border-t border-slate-700 flex justify-end gap-3">
            <button onClick={onClose} className="bg-slate-600 text-white font-bold py-2 px-4 rounded-md hover:bg-slate-500 transition-colors">
                취소
            </button>
            <button onClick={handleAddClick} disabled={!text.trim()} className="bg-green-600 text-white font-bold py-2 px-4 rounded-md hover:bg-green-500 transition-colors disabled:bg-slate-600">
                링크 추가하기
            </button>
        </div>
      </div>
    </div>
  );
};
