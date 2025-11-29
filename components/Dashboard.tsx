import React, { useState, useEffect } from 'react';
import { AnalysisResult } from '../types';
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import html2canvas from "html2canvas";

interface DashboardProps {
  result: AnalysisResult;
  onReset: () => void;
  onInvestigate: () => void;
}

const SeverityBadge: React.FC<{ level: string }> = ({ level }) => {
  const colors = {
    low: 'bg-yellow-100 text-yellow-800',
    medium: 'bg-orange-100 text-orange-800',
    high: 'bg-red-100 text-red-800',
  };
  const labels = {
    low: 'Baixa',
    medium: 'Média',
    high: 'Crítica'
  };
  
  const key = level as keyof typeof colors;
  return (
    <span className={`px-2 py-1 rounded-full text-xs font-medium ${colors[key] || colors.low}`}>
      {labels[key] || level}
    </span>
  );
};

const Dashboard: React.FC<DashboardProps> = ({ result, onReset, onInvestigate }) => {
  // State for selected items (store indices)
  const [selectedIndices, setSelectedIndices] = useState<Set<number>>(new Set());

  // Initialize selection with all items when result loads
  useEffect(() => {
    if (result && result.details) {
      const allIndices = new Set(result.details.map((_, idx) => idx));
      setSelectedIndices(allIndices);
    }
  }, [result]);

  const toggleSelectAll = () => {
    if (selectedIndices.size === result.details.length) {
      setSelectedIndices(new Set());
    } else {
      setSelectedIndices(new Set(result.details.map((_, idx) => idx)));
    }
  };

  const toggleItem = (index: number) => {
    const newSet = new Set(selectedIndices);
    if (newSet.has(index)) {
      newSet.delete(index);
    } else {
      newSet.add(index);
    }
    setSelectedIndices(newSet);
  };
  
  const generateWhatsAppMessage = () => {
    let text = `🚨 *AUDITORIA PRELIMINAR - MODALPDV*\n`;
    text += `📅 Data: ${new Date().toLocaleDateString()}\n\n`;
    
    text += `📊 *RESUMO*\n`;
    text += `━━━━━━━━━━━━━━━━━━\n`;
    text += `📦 Itens: ${result.totalProductsChecked}\n`;
    text += `❗ Divergências: ${result.inconsistenciesFound}\n`;
    text += `━━━━━━━━━━━━━━━━━━\n\n`;
    
    text += `🔍 *DETALHES:*\n\n`;
    
    const details = result.details.map(item => 
      `📦 *${item.productName}*\n⚠️ ${item.issueType}\n📉 Antigo: ${item.report1Value} (Val: ${item.report1Date})\n➡ Atual: ${item.report2Value} (Val: ${item.report2Date})\n──────────────────`
    ).join('\n\n');
    
    text += details;
    
    return encodeURIComponent(text);
  };

  const handleDownloadPDF = () => {
    const doc = new jsPDF();

    // Filter items based on selection
    const selectedItems = result.details.filter((_, idx) => selectedIndices.has(idx));

    if (selectedItems.length === 0) {
      alert("Por favor, selecione pelo menos um item para gerar o PDF.");
      return;
    }

    // Header
    doc.setFontSize(20);
    doc.setTextColor(40, 40, 40);
    doc.text("Relatório de Auditoria ModalPDV", 14, 22);
    
    doc.setFontSize(10);
    doc.setTextColor(100, 100, 100);
    doc.text(`Criador: irlei gadir | Data: ${new Date().toLocaleString()}`, 14, 28);

    // Summary Box
    doc.setDrawColor(200, 200, 200);
    doc.setFillColor(248, 250, 252);
    doc.rect(14, 35, 182, 25, 'FD');
    
    doc.setFontSize(12);
    doc.setTextColor(0, 0, 0);
    doc.text("Resumo Executivo", 20, 42);
    
    doc.setFontSize(10);
    doc.text(`Produtos Verificados: ${result.totalProductsChecked}`, 20, 50);
    doc.text(`Itens neste Relatório: ${selectedItems.length}`, 100, 50);

    // Summary Text
    doc.setFontSize(9);
    doc.setTextColor(80, 80, 80);
    const splitSummary = doc.splitTextToSize(result.summary, 170);
    doc.text(splitSummary, 20, 56);

    // Table
    const tableBody = selectedItems.map(item => [
      item.productName,
      item.issueType,
      `${item.report1Value}\n${item.report1Date}`,
      `${item.report2Value}\n${item.report2Date}`,
      item.severity.toUpperCase(),
      item.description
    ]);

    autoTable(doc, {
      startY: 70,
      head: [['Produto', 'Tipo de Erro', 'Antigo (Qtd/Val)', 'Atual (Qtd/Val)', 'Sev.', 'Descrição']],
      body: tableBody,
      theme: 'grid',
      headStyles: { fillColor: [37, 99, 235], textColor: 255 },
      styles: { fontSize: 8, cellPadding: 3, valign: 'middle' },
      columnStyles: {
        0: { cellWidth: 40 }, // Produto
        5: { cellWidth: 'auto' } // Descrição gets remaining space
      }
    });

    doc.save("Relatorio_Auditoria_ModalPDV.pdf");
  };

  const handleDownloadPNG = async () => {
    const element = document.getElementById('dashboard-content');
    if (!element) return;

    try {
      const canvas = await html2canvas(element, { 
        scale: 2, // Higher resolution
        backgroundColor: '#ffffff',
        useCORS: true
      });
      
      const link = document.createElement('a');
      link.download = `ModalPDV_Dashboard_${new Date().getTime()}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    } catch (error) {
      console.error("Erro ao gerar PNG:", error);
      alert("Erro ao gerar a imagem.");
    }
  };

  const whatsappLink = `https://wa.me/?text=${generateWhatsAppMessage()}`;

  return (
    <div id="dashboard-content" className="animate-fade-in w-full max-w-6xl mx-auto p-4 space-y-8 bg-slate-50">
      
      {/* Header Actions */}
      <div className="flex flex-col md:flex-row justify-between items-center gap-4">
        <h2 className="text-2xl font-bold text-gray-800">Resultado da Auditoria</h2>
        <div className="flex gap-3 flex-wrap justify-center">

           <button 
             onClick={onInvestigate}
             className="px-4 py-2 text-sm text-white bg-blue-600 border border-blue-600 rounded-lg hover:bg-blue-700 transition-colors shadow-sm flex items-center gap-2"
           >
             <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"></path></svg>
             Questionário Investigação
           </button>
           
           <button 
             onClick={handleDownloadPNG}
             className="px-4 py-2 text-sm text-white bg-indigo-600 border border-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors shadow-sm flex items-center gap-2"
           >
             <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>
             PNG
           </button>

           <button 
             onClick={handleDownloadPDF}
             disabled={selectedIndices.size === 0}
             className={`px-4 py-2 text-sm text-white border rounded-lg transition-colors shadow-sm flex items-center gap-2
               ${selectedIndices.size === 0 ? 'bg-red-300 border-red-300 cursor-not-allowed' : 'bg-red-600 border-red-600 hover:bg-red-700'}
             `}
           >
             <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"></path></svg>
             PDF ({selectedIndices.size})
           </button>
           
           <a 
             href={whatsappLink}
             target="_blank"
             rel="noreferrer"
             className="px-4 py-2 text-sm text-white bg-green-500 border border-green-500 rounded-lg hover:bg-green-600 transition-colors shadow-sm flex items-center gap-2"
           >
             <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z"/></svg>
             Enviar WhatsApp
           </a>

          <button 
            onClick={onReset}
            className="px-4 py-2 text-sm text-gray-600 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors shadow-sm"
          >
            Nova Análise
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <p className="text-sm font-medium text-gray-500">Produtos Verificados</p>
          <p className="text-3xl font-bold text-gray-900 mt-2">{result.totalProductsChecked}</p>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <p className="text-sm font-medium text-gray-500">Inconsistências</p>
          <p className={`text-3xl font-bold mt-2 ${result.inconsistenciesFound > 0 ? 'text-red-600' : 'text-green-600'}`}>
            {result.inconsistenciesFound}
          </p>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 col-span-1 md:col-span-1">
           <p className="text-sm font-medium text-gray-500 mb-2">Resumo da IA</p>
           <p className="text-sm text-gray-700 leading-relaxed line-clamp-3">{result.summary}</p>
        </div>
      </div>

      {/* Details Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 bg-gray-50 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <h3 className="font-semibold text-gray-800">Detalhamento das Divergências</h3>
            <span className="text-xs text-blue-600 bg-blue-50 px-2 py-1 rounded border border-blue-100">
              {selectedIndices.size} selecionado(s)
            </span>
          </div>
          <span className="text-xs text-gray-500 bg-white border px-2 py-1 rounded">
            Comparativo: Antigo vs Atual
          </span>
        </div>
        
        {result.details.length === 0 ? (
          <div className="p-12 text-center text-gray-500">
            <svg className="w-16 h-16 mx-auto text-green-200 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-lg font-medium text-gray-900">Nenhuma inconsistência encontrada!</p>
            <p className="text-sm">Os relatórios parecem estar perfeitamente alinhados.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-gray-600">
              <thead className="bg-gray-50 text-gray-700 font-medium border-b border-gray-200">
                <tr>
                  <th className="px-4 py-3 w-10 text-center">
                    <input 
                      type="checkbox" 
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      checked={selectedIndices.size === result.details.length}
                      onChange={toggleSelectAll}
                    />
                  </th>
                  <th className="px-6 py-3">Produto</th>
                  <th className="px-6 py-3">Tipo de Erro</th>
                  <th className="px-6 py-3 text-center">Antigo</th>
                  <th className="px-6 py-3 text-center">Atual</th>
                  <th className="px-6 py-3">Severidade</th>
                  <th className="px-6 py-3">Descrição</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {result.details.map((item, idx) => (
                  <tr key={idx} className={`hover:bg-gray-50 transition-colors ${selectedIndices.has(idx) ? 'bg-blue-50/30' : ''}`}>
                    <td className="px-4 py-4 text-center">
                      <input 
                        type="checkbox" 
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        checked={selectedIndices.has(idx)}
                        onChange={() => toggleItem(idx)}
                      />
                    </td>
                    <td className="px-6 py-4 font-medium text-gray-900">{item.productName}</td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        {item.issueType}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center bg-gray-50/50">
                       <div className="font-mono text-gray-600">{item.report1Value}</div>
                       <div className="text-xs text-gray-400 mt-1">{item.report1Date}</div>
                    </td>
                    <td className="px-6 py-4 text-center bg-yellow-50/50">
                       <div className="font-mono text-gray-900 font-bold">{item.report2Value}</div>
                       <div className="text-xs text-gray-500 mt-1 font-medium">{item.report2Date}</div>
                    </td>
                    <td className="px-6 py-4"><SeverityBadge level={item.severity} /></td>
                    <td className="px-6 py-4 text-gray-500 max-w-xs truncate" title={item.description}>{item.description}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;