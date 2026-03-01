// @ts-nocheck
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

class ErrorBoundary extends React.Component<{children: React.ReactNode}, {error: Error | null}> {
  constructor(props: {children: React.ReactNode}) {
    super(props);
    this.state = { error: null };
  }
  static getDerivedStateFromError(error: Error) {
    return { error };
  }
  render() {
    if (this.state.error) {
      return (
        <div style={{color:'#ff6b6b', padding:'40px', fontFamily:'monospace', background:'#1a1a2e', minHeight:'100vh'}}>
          <h1 style={{color:'#ff4757', fontSize:'24px', marginBottom:'16px'}}>앱 오류 발생</h1>
          <p style={{color:'#ffa502', marginBottom:'8px', fontSize:'16px'}}>오류 메시지:</p>
          <pre style={{background:'#16213e', padding:'20px', borderRadius:'8px', overflowX:'auto', color:'#ff6b6b', fontSize:'14px'}}>
            {this.state.error.message}{'\n'}{this.state.error.stack}
          </pre>
          <p style={{color:'#7bed9f', marginTop:'20px', fontSize:'14px'}}>이 화면의 내용을 캡처해서 보내주세요.</p>
        </div>
      );
    }
    return this.props.children;
  }
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>
);
