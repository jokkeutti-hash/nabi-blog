
import React, { useState, useEffect, useRef } from 'react';
import { workerBlob, copyToClipboard } from './Common';

interface InteractiveCodeModalProps {
  code: string;
  onClose: () => void;
}

export const InteractiveCodeModal: React.FC<InteractiveCodeModalProps> = ({ code, onClose }) => {
  const [copied, setCopied] = useState(false);
  const [formattedCode, setFormattedCode] = useState<string>('Formatting code...');
  const workerRef = useRef<Worker | null>(null);

  useEffect(() => {
    const workerUrl = URL.createObjectURL(workerBlob);
    const worker = new Worker(workerUrl);
    workerRef.current = worker;

    worker.onmessage = (event: MessageEvent<string>) => {
      setFormattedCode(event.data);
    };

    return () => {
      worker.terminate();
      URL.revokeObjectURL(workerUrl);
    };
  }, []);

  useEffect(() => {
    if (code) {
      setFormattedCode('Formatting code...');
      workerRef.current?.postMessage(code);
    } else {
      setFormattedCode('');
    }
  }, [code]);

  const handleCopy = async () => {
    const success = await copyToClipboard(code);
    if (success) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-slate-800 rounded-lg shadow-xl max-w-2xl w-full max-h-[80vh] flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="p-4 border-b border-slate-700 flex justify-between items-center">
          <h2 className="text-xl font-bold text-white">인터랙티브 요소 코드</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white text-3xl font-light">&times;</button>
        </div>
        <pre className="p-4 text-sm bg-gray-900 overflow-y-auto whitespace-pre-wrap break-all font-mono flex-grow custom-scrollbar text-white">
            <code>{formattedCode}</code>
        </pre>
        <div className="p-4 border-t border-slate-700 flex justify-end">
            <button onClick={handleCopy} className="flex items-center space-x-2 bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 transition-colors text-sm disabled:bg-gray-500" disabled={copied}>
              {copied ? <span>✅</span> : <span>📋</span>}
              <span>{copied ? '복사 완료!' : '코드 복사'}</span>
            </button>
        </div>
      </div>
    </div>
  );
};
