// @ts-nocheck
import React, { useState } from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

const PW = 'Mygirl35486***';

function PasswordGate({ children }) {
  const [auth, setAuth] = useState(() => sessionStorage.getItem('site_auth') === '1');
  const [input, setInput] = useState('');
  const [error, setError] = useState(false);
  if (auth) return children;
  const handleSubmit = (e) => {
    e.preventDefault();
    if (input === PW) { sessionStorage.setItem('site_auth', '1'); setAuth(true); }
    else { setError(true); setInput(''); }
  };
  return (
    <div style={{display:'flex',alignItems:'center',justifyContent:'center',minHeight:'100vh',background:'#1a1a2e'}}>
      <div style={{background:'#16213e',padding:'40px',borderRadius:'16px',width:'320px',boxShadow:'0 8px 32px rgba(0,0,0,0.4)'}}>
        <h2 style={{color:'#fff',textAlign:'center',marginBottom:'24px',fontSize:'20px'}}>접근 제한</h2>
        <form onSubmit={handleSubmit}>
          <input type="password" value={input} onChange={e => { setInput(e.target.value); setError(false); }} placeholder="비밀번호를 입력하세요" style={{width:'100%',padding:'12px',borderRadius:'8px',border:error?'2px solid #ff4757':'2px solid #0f3460',background:'#0f3460',color:'#fff',fontSize:'16px',outline:'none',boxSizing:'border-box'}} autoFocus />
          {error && <p style={{color:'#ff4757',fontSize:'14px',marginTop:'8px',textAlign:'center'}}>비밀번호가 틀렸습니다</p>}
          <button type="submit" style={{width:'100%',padding:'12px',marginTop:'16px',borderRadius:'8px',border:'none',background:'#e94560',color:'#fff',fontSize:'16px',cursor:'pointer',fontWeight:'bold'}}>확인</button>
        </form>
      </div>
    </div>
  );
}

const rootElement = document.getElementById('root');
if (!rootElement) throw new Error("Could not find root element to mount to");

ReactDOM.createRoot(rootElement).render(
  <React.StrictMode>
    <PasswordGate>
      <App />
    </PasswordGate>
  </React.StrictMode>
);
