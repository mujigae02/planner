import React from 'react';

interface Props {
  children: React.ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends React.Component<Props, State> {
  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Uncaught error in React ErrorBoundary:', error, errorInfo);
  }

  render() {
    const inst = this as any;
    const state: State = inst.state || { hasError: false, error: null };

    if (state.hasError) {
      return (
        <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 text-center">
          <div className="bg-white p-8 rounded-2xl shadow-lg max-w-md w-full border border-slate-200">
            <div className="w-12 h-12 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4 text-xl font-bold">
              !
            </div>
            <h1 className="text-xl font-bold text-slate-800 mb-2">화면을 불러오는 도중 오류가 발생했습니다</h1>
            <p className="text-sm text-slate-600 mb-6 bg-slate-100 p-3 rounded-lg text-left overflow-auto max-h-32 text-xs font-mono">
              {state.error?.message || '알 수 없는 오류가 발생했습니다.'}
            </p>
            <button
              onClick={() => {
                if (inst.setState) {
                  inst.setState({ hasError: false, error: null });
                }
                window.location.reload();
              }}
              className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-semibold transition"
            >
              페이지 새로고침
            </button>
          </div>
        </div>
      );
    }

    return inst.props?.children || null;
  }
}






