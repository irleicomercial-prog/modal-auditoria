import React, { useState } from 'react';
import FileUpload from './components/FileUpload';
import Dashboard from './components/Dashboard';
import { QuestionnairePanel } from './components/QuestionnairePanel';
import { analyzeReports, ReportInput } from './services/geminiService';
import { AnalysisResult, AnalysisStatus, FileData } from './types';

function App() {
  // Mode selection: 'files' or 'text'
  const [inputType, setInputType] = useState<'files' | 'text'>('files');

  // File Inputs
  const [file1, setFile1] = useState<FileData | null>(null);
  const [file2, setFile2] = useState<FileData | null>(null);

  // Text Inputs
  const [textReport1, setTextReport1] = useState('');
  const [textReport2, setTextReport2] = useState('');

  const [status, setStatus] = useState<AnalysisStatus>(AnalysisStatus.IDLE);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [view, setView] = useState<'upload' | 'dashboard' | 'questionnaire'>('upload');

  const handleAnalyze = async () => {
    // Validation based on input type
    if (inputType === 'files' && (!file1 || !file2)) return;
    if (inputType === 'text' && (!textReport1.trim() || !textReport2.trim())) return;

    setStatus(AnalysisStatus.PROCESSING);
    setErrorMsg(null);

    try {
      let input1: ReportInput;
      let input2: ReportInput;

      if (inputType === 'files') {
        input1 = { type: 'file', base64: file1!.base64, mimeType: file1!.mimeType };
        input2 = { type: 'file', base64: file2!.base64, mimeType: file2!.mimeType };
      } else {
        input1 = { type: 'text', content: textReport1 };
        input2 = { type: 'text', content: textReport2 };
      }

      const data = await analyzeReports(input1, input2);
      setResult(data);
      setStatus(AnalysisStatus.SUCCESS);
      setView('dashboard');
    } catch (error) {
      console.error(error);
      setErrorMsg("Ocorreu um erro ao processar os dados com a IA. Verifique se os relatórios estão legíveis.");
      setStatus(AnalysisStatus.ERROR);
    }
  };

  const resetApp = () => {
    setFile1(null);
    setFile2(null);
    setTextReport1('');
    setTextReport2('');
    setResult(null);
    setStatus(AnalysisStatus.IDLE);
    setErrorMsg(null);
    setView('upload');
  };

  const startInvestigation = () => {
    setView('questionnaire');
  };

  const finishInvestigation = () => {
    resetApp();
  };

  // Helper to determine if button should be disabled
  const isAnalyzeDisabled = () => {
    if (status === AnalysisStatus.PROCESSING) return true;
    if (inputType === 'files') return !file1 || !file2;
    if (inputType === 'text') return !textReport1.trim() || !textReport2.trim();
    return true;
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans selection:bg-blue-100 selection:text-blue-900">
      
      {/* Navbar */}
      <nav className="bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold text-lg cursor-pointer" onClick={() => setView(result ? 'dashboard' : 'upload')}>
                M
              </div>
              <div className="flex flex-col">
                <span className="text-xl font-bold tracking-tight text-gray-900 leading-none">Modal<span className="text-blue-600">PDV</span></span>
                <span className="text-[10px] text-gray-500 font-medium uppercase tracking-wider">Criador: irlei gadir</span>
              </div>
            </div>
            <div className="flex items-center gap-4">
               {view === 'questionnaire' && (
                 <span className="text-sm font-medium text-blue-600 animate-pulse hidden sm:inline-block">Modo Investigação</span>
               )}
              <span className="text-xs sm:text-sm text-gray-500 bg-gray-100 px-3 py-1 rounded-full">Gemini 2.5 Flash</span>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        
        {/* Main Content Area */}
        {view === 'questionnaire' && result ? (
          <QuestionnairePanel result={result} onBack={() => setView('dashboard')} onFinish={finishInvestigation} />
        ) : view === 'dashboard' && result ? (
          <Dashboard result={result} onReset={resetApp} onInvestigate={startInvestigation} />
        ) : (
          <div className="max-w-4xl mx-auto animate-fade-in">
            
            {/* Hero Section */}
            <div className="text-center mb-8">
              <h1 className="text-4xl font-extrabold text-gray-900 mb-4">
                Auditoria de Validade <span className="text-blue-600">ModalPDV</span>
              </h1>
              <p className="text-lg text-gray-600 max-w-2xl mx-auto">
                Compare o relatório ANTIGO com o relatório ATUAL. 
                Nossa IA detecta divergências e guia a investigação de perdas.
              </p>
            </div>

            {/* Input Method Tabs */}
            <div className="flex justify-center mb-6">
              <div className="bg-white p-1 rounded-lg border border-gray-200 inline-flex shadow-sm">
                <button
                  onClick={() => setInputType('files')}
                  className={`px-6 py-2 rounded-md text-sm font-medium transition-all ${
                    inputType === 'files' 
                      ? 'bg-blue-600 text-white shadow-sm' 
                      : 'text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  Upload de Arquivos
                </button>
                <button
                  onClick={() => setInputType('text')}
                  className={`px-6 py-2 rounded-md text-sm font-medium transition-all ${
                    inputType === 'text' 
                      ? 'bg-blue-600 text-white shadow-sm' 
                      : 'text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  Colar Texto
                </button>
              </div>
            </div>

            {/* Upload Section */}
            <div className="bg-white rounded-2xl shadow-xl border border-gray-200 p-8">
              
              {inputType === 'files' ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
                  <FileUpload 
                    label="Relatório 1: ANTIGO" 
                    onFileSelect={setFile1} 
                    selectedFile={file1}
                    disabled={status === AnalysisStatus.PROCESSING}
                  />
                  <FileUpload 
                    label="Relatório 2: ATUAL" 
                    onFileSelect={setFile2} 
                    selectedFile={file2}
                    disabled={status === AnalysisStatus.PROCESSING}
                  />
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
                   <div className="flex flex-col h-64">
                      <label className="mb-2 text-sm font-bold text-gray-700">Relatório 1: ANTIGO (Texto)</label>
                      <textarea
                        className="flex-1 w-full p-4 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none bg-gray-50 text-sm font-mono"
                        placeholder="Cole aqui o conteúdo do relatório antigo..."
                        value={textReport1}
                        onChange={(e) => setTextReport1(e.target.value)}
                        disabled={status === AnalysisStatus.PROCESSING}
                      />
                   </div>
                   <div className="flex flex-col h-64">
                      <label className="mb-2 text-sm font-bold text-gray-700">Relatório 2: ATUAL (Texto)</label>
                      <textarea
                        className="flex-1 w-full p-4 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none bg-yellow-50 text-sm font-mono"
                        placeholder="Cole aqui o conteúdo do relatório atual..."
                        value={textReport2}
                        onChange={(e) => setTextReport2(e.target.value)}
                        disabled={status === AnalysisStatus.PROCESSING}
                      />
                   </div>
                </div>
              )}

              {errorMsg && (
                <div className="mb-6 p-4 bg-red-50 border-l-4 border-red-500 text-red-700 rounded-r">
                  <div className="flex">
                    <div className="py-1"><svg className="fill-current h-6 w-6 text-red-500 mr-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M2.93 17.07A10 10 0 1 1 17.07 2.93 10 10 0 0 1 2.93 17.07zm12.73-1.41A8 8 0 1 0 4.34 4.34a8 8 0 0 0 11.32 11.32zM9 11V9h2v6H9v-4zm0-6h2v2H9V5z"/></svg></div>
                    <div>
                      <p className="font-bold">Erro</p>
                      <p className="text-sm">{errorMsg}</p>
                    </div>
                  </div>
                </div>
              )}

              <div className="flex justify-center">
                <button
                  onClick={handleAnalyze}
                  disabled={isAnalyzeDisabled()}
                  className={`
                    w-full md:w-auto px-10 py-4 rounded-xl text-white font-bold text-lg shadow-lg transition-all transform
                    flex items-center justify-center gap-3
                    ${isAnalyzeDisabled()
                      ? 'bg-gray-300 cursor-not-allowed' 
                      : status === AnalysisStatus.PROCESSING
                        ? 'bg-blue-400 cursor-wait'
                        : 'bg-blue-600 hover:bg-blue-700 hover:-translate-y-1 hover:shadow-xl'
                    }
                  `}
                >
                  {status === AnalysisStatus.PROCESSING ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Cruzando dados...
                    </>
                  ) : (
                    <>
                      Comparar Relatórios
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                      </svg>
                    </>
                  )}
                </button>
              </div>
              
              <div className="mt-4 text-center">
                 <p className="text-xs text-gray-400">
                    A IA pode cometer erros. Verifique informações importantes.
                 </p>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

export default App;