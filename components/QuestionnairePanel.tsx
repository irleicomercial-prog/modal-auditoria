
import React, { useState, useEffect } from 'react';
import { AnalysisResult, QuestionnaireAnswers } from '../types';
import { jsPDF } from "jspdf";
import html2canvas from "html2canvas";

interface QuestionnairePanelProps {
  result: AnalysisResult;
  onBack: () => void;
  onFinish: () => void;
}

const initialAnswers: QuestionnaireAnswers = {
  wasSold: null,
  hasExpired: null,
  inSalesArea: null,
  isOnOffer: null,
  wasMarkedDown: null,
  wasRemovedFromSalesArea: null,
};

// Questions exactly as requested
const questions = [
  { key: 'wasSold' as keyof QuestionnaireAnswers, label: 'O produto foi vendido?' },
  { key: 'hasExpired' as keyof QuestionnaireAnswers, label: 'O produto venceu?' },
  { key: 'inSalesArea' as keyof QuestionnaireAnswers, label: 'Produto se encontra na area de venda?' },
  { key: 'isOnOffer' as keyof QuestionnaireAnswers, label: 'O produto esta em oferta?' },
  { key: 'wasMarkedDown' as keyof QuestionnaireAnswers, label: 'Foi feita a rebaixa?' },
  { key: 'wasRemovedFromSalesArea' as keyof QuestionnaireAnswers, label: 'O produto foi retirado da area de venda?' },
];

// Specific observations exactly as requested
const NOTE_NOT_RELATED = "Produto nao foi relacionado verificar.";
const NOTE_KG = "Produto com Inconsistência no peso ( kg )";
const NOTE_DATE = "produto com inconsistência na data.";
const NOTE_DATE_KG = "produto com inconsistência na data e kg.";

// Helper to compact notes for Report/PDF
const getCompactNote = (note: string) => {
  if (note === NOTE_KG) return "Inconsistência Peso (KG)";
  if (note === NOTE_DATE) return "Inconsistência Data";
  if (note === NOTE_DATE_KG) return "Inconsistência Data e Peso";
  if (note === NOTE_NOT_RELATED) return "Não Relacionado";
  return note;
};

export const QuestionnairePanel: React.FC<QuestionnairePanelProps> = ({ result, onBack, onFinish }) => {
  // Map product index to answers
  const [answersMap, setAnswersMap] = useState<Record<number, QuestionnaireAnswers>>({});
  // Map product index to selected observations (notes)
  const [notesMap, setNotesMap] = useState<Record<number, Set<string>>>({});
  // Map product index to selected questions (checkboxes next to questions)
  const [questionSelectionMap, setQuestionSelectionMap] = useState<Record<number, Set<string>>>({});
  
  const [submitted, setSubmitted] = useState(false);
  const [selectedIndices, setSelectedIndices] = useState<Set<number>>(new Set());
  
  // PDF Options state
  const [pdfOptions, setPdfOptions] = useState({
    includeQuestions: true,
    includeNotes: true
  });

  // Initialize selection with all items
  useEffect(() => {
    if (result && result.details) {
      const allIndices = new Set(result.details.map((_, idx) => idx));
      setSelectedIndices(allIndices);
    }
  }, [result]);

  const toggleItem = (index: number) => {
    const newSet = new Set(selectedIndices);
    if (newSet.has(index)) {
      newSet.delete(index);
    } else {
      newSet.add(index);
    }
    setSelectedIndices(newSet);
  };

  const handleAnswer = (index: number, key: keyof QuestionnaireAnswers, value: boolean) => {
    setAnswersMap(prev => ({
      ...prev,
      [index]: {
        ...(prev[index] || initialAnswers),
        [key]: value
      }
    }));
  };

  const toggleNote = (index: number, note: string) => {
    setNotesMap(prev => {
      const currentNotes = prev[index] ? new Set(prev[index]) : new Set<string>();
      if (currentNotes.has(note)) {
        currentNotes.delete(note);
      } else {
        currentNotes.add(note);
      }
      return { ...prev, [index]: currentNotes };
    });
  };

  const toggleQuestionSelection = (index: number, key: string) => {
    setQuestionSelectionMap(prev => {
      const currentSet = prev[index] ? new Set(prev[index]) : new Set<string>();
      if (currentSet.has(key)) {
        currentSet.delete(key);
      } else {
        currentSet.add(key);
      }
      return { ...prev, [index]: currentSet };
    });
  };

  const toggleAllQuestions = (index: number) => {
    setQuestionSelectionMap(prev => {
      const currentSet = prev[index] || new Set<string>();
      // If all are selected, deselect all. Otherwise, select all.
      if (currentSet.size === questions.length) {
        return { ...prev, [index]: new Set<string>() };
      } else {
        const newSet = new Set<string>(questions.map(q => q.key));
        return { ...prev, [index]: newSet };
      }
    });
  };

  const isComplete = (index: number) => {
    const ans = answersMap[index];
    if (!ans) return false;
    // Check if at least one question has been answered (relaxed validation for better UX)
    return Object.values(ans).some(v => v !== null);
  };

  const allComplete = result.details.length > 0 && result.details.every((_, idx) => isComplete(idx));

  const handleSubmit = () => {
    setSubmitted(true);
  };

  const generateWhatsAppMessage = (isFinal: boolean = true) => {
    const date = new Date().toLocaleDateString();
    
    // Header
    let text = isFinal 
      ? `✅ *RELATÓRIO FINAL - MODALPDV*\n` 
      : `📋 *FICHA DE INVESTIGAÇÃO - MODALPDV*\n`;
      
    text += `📅 Data: ${date}\n`;
    text += `👨‍💻 Criador: irlei gadir\n\n`;
    
    // Summary Section
    text += `📊 *RESUMO GERAL*\n`;
    text += `━━━━━━━━━━━━━━━━━━\n`;
    text += `📦 Total de Itens: ${result.totalProductsChecked}\n`;
    text += `❗ Divergências: ${result.inconsistenciesFound}\n`;
    text += `━━━━━━━━━━━━━━━━━━\n\n`;
    
    text += `🔍 *DETALHAMENTO DOS ITENS*\n\n`;

    // Items Loop
    const items = result.details.map((item, idx) => {
      if (!selectedIndices.has(idx)) return '';

      const ans = answersMap[idx];
      const notes = notesMap[idx];
      const selectedQs = questionSelectionMap[idx] || new Set<string>();
      
      let itemText = `📦 *${item.productName}*\n`;
      itemText += `⚠️ *Status:* ${item.issueType}\n`;
      itemText += `📉 *Antigo:* ${item.report1Value} (Val: ${item.report1Date})\n`;
      itemText += `➡ *Atual:* ${item.report2Value} (Val: ${item.report2Date})\n`;

      // Add Notes Compactly
      if (notes && notes.size > 0) {
        const compactNotes = Array.from(notes as Set<string>).map((note) => getCompactNote(note)).join(", ");
        itemText += `📝 *Obs:* ${compactNotes}\n`;
      }

      if (isFinal && ans) {
          // Investigation Results for Final Report (Only show answered YES and selected)
          const reasons = [];
          
          if (selectedQs.has('wasSold') && ans.wasSold) reasons.push("✅ Foi Vendido");
          if (selectedQs.has('hasExpired') && ans.hasExpired) reasons.push("✅ Está Vencido");
          if (selectedQs.has('inSalesArea') && ans.inSalesArea) reasons.push("✅ Está na Loja");
          if (selectedQs.has('isOnOffer') && ans.isOnOffer) reasons.push("✅ Está em Oferta");
          if (selectedQs.has('wasMarkedDown') && ans.wasMarkedDown) reasons.push("✅ Foi Rebaixado");
          if (selectedQs.has('wasRemovedFromSalesArea') && ans.wasRemovedFromSalesArea) reasons.push("✅ Retirado da Área");
          
          if (selectedQs.size > 0) {
             itemText += `📋 *Conclusão:* ${reasons.length > 0 ? reasons.join(', ') : 'Nenhuma positiva encontrada.'}`;
          }
      } else if (!isFinal) {
         // Checklist for Field Work (Show specific checkboxes requested)
         if (selectedQs.size > 0) {
           itemText += `🕵️ *Verificar:*\n`;
           if (selectedQs.has('wasSold')) itemText += `[ ] Vendido?\n`;
           if (selectedQs.has('hasExpired')) itemText += `[ ] Venceu?\n`;
           if (selectedQs.has('inSalesArea')) itemText += `[ ] Na Loja?\n`;
           if (selectedQs.has('isOnOffer')) itemText += `[ ] Em Oferta?\n`;
           if (selectedQs.has('wasMarkedDown')) itemText += `[ ] Rebaixado?\n`;
           if (selectedQs.has('wasRemovedFromSalesArea')) itemText += `[ ] Retirado?`;
         }
      }
      return itemText;
    }).filter(t => t !== '').join('\n\n──────────────────\n\n');
    
    text += items;
    text += `\n\nGenerated by ModalPDV`;
    
    return encodeURIComponent(text);
  };

  const handleDownloadFieldSheetPDF = () => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    let y = 20;

    const filteredDetails = result.details.filter((_, idx) => selectedIndices.has(idx));

    if (filteredDetails.length === 0) {
      alert("Selecione pelo menos um produto para gerar a ficha.");
      return;
    }

    doc.setFontSize(18);
    doc.text("ModalPDV - Questionário de Investigação", 14, y);
    y += 8;
    
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(`Criador: irlei gadir | Data: ${new Date().toLocaleString()}`, 14, y);
    y += 12;

    doc.setFontSize(11);
    doc.setTextColor(0);
    doc.text(`Instruções: Utilize este questionário para verificar ${filteredDetails.length} itens selecionados.`, 14, y);
    y += 10;
    doc.setLineWidth(0.5);
    doc.line(14, y, pageWidth - 14, y);
    y += 10;

    // Filter result details but map back to original index to get notes
    result.details.forEach((item, originalIndex) => {
      if (!selectedIndices.has(originalIndex)) return;

      const displayIndex = originalIndex + 1;
      const notes = notesMap[originalIndex];
      const selectedQs = questionSelectionMap[originalIndex] || new Set<string>();
      const hasNotes = notes && notes.size > 0;
      const hasQuestions = selectedQs.size > 0;
      
      // Calculate height based on content
      let boxHeight = 45; 
      if (hasQuestions) boxHeight += (selectedQs.size * 7) + 5;
      if (hasNotes) boxHeight += (notes!.size * 7) + 5; 

      if (y + boxHeight > 280) {
        doc.addPage();
        y = 20;
      }

      // Box
      doc.setDrawColor(220);
      doc.setFillColor(252);
      doc.rect(14, y, pageWidth - 28, boxHeight, 'FD');
      
      let boxY = y + 8;

      // Item Header
      doc.setFontSize(12);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(0);
      doc.text(`${displayIndex}. ${item.productName}`, 18, boxY);
      
      // Issue Type
      doc.setFontSize(10);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(200, 0, 0); // Red
      doc.text(`Motivo: ${item.issueType}`, pageWidth - 20, boxY, { align: "right" });
      
      boxY += 8;
      doc.setTextColor(0);
      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      doc.text(`Antigo: ${item.report1Value} (Val: ${item.report1Date})`, 18, boxY);
      doc.text(`Atual: ${item.report2Value} (Val: ${item.report2Date})`, 18 + 80, boxY);
      
      boxY += 8;

      const checkX = 22;

      // 1. Render Observations (Notes) first
      if (hasNotes) {
         doc.setFont("helvetica", "bold");
         doc.setFontSize(9);
         doc.setTextColor(0, 0, 0); // BLACK COLOR
         
         const compactNotes = Array.from(notes as Set<string>).map((n) => getCompactNote(n));
         
         compactNotes.forEach(note => {
             // Draw Box
             doc.setDrawColor(0);
             doc.rect(checkX, boxY - 3, 4, 4); // Checkbox square
             
             // Draw Red X inside because it IS selected
             doc.setDrawColor(200, 0, 0); 
             doc.setLineWidth(0.5);
             doc.line(checkX, boxY - 3, checkX + 4, boxY + 1);
             doc.line(checkX + 4, boxY - 3, checkX, boxY + 1);

             // Text
             doc.setTextColor(0, 0, 0);
             doc.text(note, checkX + 6, boxY);
             boxY += 7;
         });
         
         doc.setFont("helvetica", "normal");
         doc.setFontSize(10);
         if (hasQuestions) boxY += 2;
      }
      
      // 2. Render Questions
      if (hasQuestions) {
        doc.setTextColor(0, 0, 0);
        questions.forEach((q) => {
            if (selectedQs.has(q.key)) {
                doc.setDrawColor(0);
                doc.rect(checkX, boxY - 3, 4, 4); // Checkbox square
                doc.setTextColor(0);
                doc.text(q.label, checkX + 6, boxY);
                boxY += 7;
            }
        });
      }

      y += boxHeight + 5;
    });

    doc.save("Questionario_Investigacao_ModalPDV.pdf");
  };

  const handleDownloadFinalReportPDF = () => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    let y = 20;

    const filteredIndices = (Array.from(selectedIndices) as number[]).sort((a, b) => a - b);
    
    if (filteredIndices.length === 0) {
      alert("Selecione pelo menos um produto para gerar o relatório.");
      return;
    }

    doc.setFontSize(18);
    doc.text("ModalPDV - Relatório Final de Investigação", 14, y);
    y += 8;
    
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(`Criador: irlei gadir | Concluído em: ${new Date().toLocaleString()}`, 14, y);
    y += 15;

    filteredIndices.forEach((originalIdx) => {
      const item = result.details[originalIdx];
      const notes = notesMap[originalIdx];
      const selectedQs = questionSelectionMap[originalIdx] || new Set<string>();
      const hasNotes = notes && notes.size > 0 && pdfOptions.includeNotes;
      
      if (y > 250) {
        doc.addPage();
        y = 20;
      }

      const ans = answersMap[originalIdx] || initialAnswers;
      const reasons: string[] = [];
      
      // Only include reasons for SELECTED questions
      if (selectedQs.has('wasSold') && ans.wasSold) reasons.push("Foi Vendido");
      if (selectedQs.has('hasExpired') && ans.hasExpired) reasons.push("Está Vencido");
      if (selectedQs.has('inSalesArea') && ans.inSalesArea) reasons.push("Está na Área de Venda");
      if (selectedQs.has('isOnOffer') && ans.isOnOffer) reasons.push("Está em Oferta");
      if (selectedQs.has('wasMarkedDown') && ans.wasMarkedDown) reasons.push("Foi Rebaixado");
      if (selectedQs.has('wasRemovedFromSalesArea') && ans.wasRemovedFromSalesArea) reasons.push("Retirado da Área");

      // Calculate Box Height dynamic
      let height = 35;
      if (hasNotes) height += (notes!.size * 6) + 5;

      // Card
      doc.setDrawColor(200);
      doc.setLineWidth(0.1);
      doc.rect(14, y, pageWidth - 28, height);
      
      doc.setFont("helvetica", "bold");
      doc.setFontSize(11);
      doc.text(item.productName, 18, y + 8);
      
      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      doc.setTextColor(100);
      doc.text(`Motivo: ${item.issueType}`, 18, y + 14);
      doc.text(`Antigo: ${item.report1Value} (Val: ${item.report1Date}) vs Atual: ${item.report2Value} (Val: ${item.report2Date})`, 18, y + 20);

      let textY = y + 28;

      // Render Notes (Observations) - Left Aligned Black
      if (hasNotes) {
        doc.setTextColor(0, 0, 0); // BLACK forced
        doc.setFont("helvetica", "bold");
        doc.setFontSize(9);
        const compactNotes = Array.from(notes as Set<string>).map((n) => getCompactNote(n));
        
        compactNotes.forEach(note => {
             doc.text(`• ${note}`, 18, textY);
             textY += 5;
        });
        
        doc.setFont("helvetica", "normal");
        textY += 2; // Spacing after notes
      }

      doc.setTextColor(0);
      doc.setFontSize(10);
      
      const conclusionY = textY;

      doc.text("Conclusão:", 18, conclusionY); 
      
      if (reasons.length > 0) {
        doc.setTextColor(0, 100, 0); // Green
        doc.text(reasons.join(", "), 40, conclusionY);
      } else {
        doc.setTextColor(150);
        doc.text("Nenhuma justificativa selecionada.", 40, conclusionY);
      }
      doc.setTextColor(0);

      y += height + 5;
    });

    doc.save("Relatorio_Final_Investigacao_ModalPDV.pdf");
  };

  const handleDownloadPNG = async (elementId: string) => {
    const element = document.getElementById(elementId);
    if (!element) return;

    try {
      const canvas = await html2canvas(element, { 
        scale: 2, 
        backgroundColor: '#ffffff',
        useCORS: true,
        ignoreElements: (node) => {
            // Ignore buttons for cleaner screenshot if desired, but request says "escolho se eu quero enviar"
            return false;
        }
      });
      
      const link = document.createElement('a');
      link.download = `ModalPDV_Investigacao_${new Date().getTime()}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    } catch (error) {
      console.error("Erro ao gerar PNG:", error);
      alert("Erro ao gerar a imagem.");
    }
  };

  if (submitted) {
    const whatsappLink = `https://wa.me/?text=${generateWhatsAppMessage(true)}`;

    return (
      <div id="final-report-content" className="w-full max-w-4xl mx-auto p-4 sm:p-8 animate-fade-in bg-white min-h-screen">
        
        {/* Header */}
        <div className="text-center mb-8 border-b pb-6">
          <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-4">
             <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg>
          </div>
          <h2 className="text-3xl font-bold text-gray-900">Relatório Final de Investigação</h2>
          <p className="text-gray-500 mt-2">Divergências analisadas e justificadas via ModalPDV.</p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row justify-center gap-4 mb-10 flex-wrap">
           
           {/* PDF Options */}
           <div className="flex items-center gap-2 px-4 bg-gray-50 rounded-lg border border-gray-200 h-12">
              <label className="flex items-center text-sm text-gray-600 gap-2 cursor-pointer">
                <input 
                  type="checkbox" 
                  checked={pdfOptions.includeNotes}
                  onChange={(e) => setPdfOptions(prev => ({ ...prev, includeNotes: e.target.checked }))}
                  className="rounded text-blue-600 focus:ring-blue-500" 
                />
                Incluir Obs.
              </label>
           </div>
          
           <button 
             onClick={() => handleDownloadPNG('final-report-content')}
             className="flex items-center justify-center px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors shadow-sm font-medium"
           >
             <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2-2H6a2 2 0 00-2-2H6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>
             PNG
           </button>

           <button 
             onClick={handleDownloadFinalReportPDF}
             disabled={selectedIndices.size === 0}
             className={`flex items-center justify-center px-6 py-3 rounded-lg transition-colors shadow-sm font-medium
               ${selectedIndices.size === 0 ? 'bg-red-300 cursor-not-allowed text-white' : 'bg-red-600 text-white hover:bg-red-700'}`}
           >
             <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"></path></svg>
             Baixar PDF ({selectedIndices.size})
           </button>
           
           <a 
             href={whatsappLink} 
             target="_blank" 
             rel="noreferrer"
             className="flex items-center justify-center px-6 py-3 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors shadow-sm font-medium"
           >
             <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 24 24"><path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z"/></svg>
             Enviar WhatsApp
           </a>

           <button 
             onClick={onFinish} 
             className="px-6 py-3 bg-white text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors shadow-sm font-medium"
           >
             Novo Relatório
           </button>
        </div>
        
        {/* ... (Final Report View Logic) ... */}
      </div>
    );
  }

  // ACTIVE FORM VIEW
  const whatsappLink = `https://wa.me/?text=${generateWhatsAppMessage(false)}`;

  return (
    <div id="investigation-form" className="w-full max-w-5xl mx-auto p-4 sm:p-6 bg-gray-50 min-h-screen">
      
      {/* Active Form Header */}
      <div className="flex flex-col md:flex-row justify-between items-center mb-8 gap-4 border-b border-gray-200 pb-6 bg-white p-6 rounded-xl shadow-sm">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Questionário de Investigação</h2>
          <p className="text-sm text-gray-500 mt-1">Selecione as perguntas para gerar a ficha ou responda para o relatório final.</p>
        </div>
        <div className="flex flex-wrap justify-center gap-3">
             <button 
               onClick={() => handleDownloadPNG('investigation-form')}
               className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 flex items-center gap-2"
             >
               <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2-2H6a2 2 0 00-2-2H6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>
               PNG
             </button>
             <button 
               onClick={handleDownloadFieldSheetPDF}
               className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 flex items-center gap-2"
             >
               <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"></path></svg>
               PDF (Ficha)
             </button>
             <a 
               href={whatsappLink}
               target="_blank"
               rel="noreferrer"
               className="px-4 py-2 bg-green-500 text-white rounded-lg text-sm font-medium hover:bg-green-600 flex items-center gap-2"
             >
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z"/></svg>
               WhatsApp
             </a>
             <button 
               onClick={onBack}
               className="px-4 py-2 border border-gray-300 text-gray-700 bg-white rounded-lg text-sm font-medium hover:bg-gray-50"
             >
               Voltar
             </button>
        </div>
      </div>
       
       <div className="flex justify-end mb-2 px-2">
         <span className="text-xs text-gray-500">Selecione os itens para o PDF:</span>
       </div>
       
       <div className="space-y-6 pb-24">
         {result.details.map((item, idx) => (
        <div key={idx} className={`bg-white rounded-xl shadow-sm border overflow-hidden transition-all ${isComplete(idx) ? 'border-green-200 shadow-md' : 'border-gray-200'}`}>
          {/* Header of Card */}
          <div className={`px-6 py-4 flex flex-col md:flex-row md:items-center justify-between gap-4 border-b ${isComplete(idx) ? 'bg-green-50/50' : 'bg-gray-50'}`}>
            <div className="flex items-center gap-3">
               <input 
                  type="checkbox" 
                  className="w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  checked={selectedIndices.has(idx)}
                  onChange={() => toggleItem(idx)}
                />
              <div>
                <h3 className="text-lg font-bold text-gray-900">{item.productName}</h3>
                <div className="mt-2 space-y-1">
                  <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-gray-700">Motivo:</span>
                      <span className="text-xs font-bold uppercase tracking-wide text-red-600 bg-red-50 px-2 py-0.5 rounded border border-red-100">
                        {item.issueType}
                      </span>
                  </div>
                  {item.description && <p className="text-sm text-gray-500 italic">{item.description}</p>}
                </div>
              </div>
            </div>
            <div className="text-right text-xs text-gray-500 ml-8 md:ml-0">
              <div className="font-mono">
                Antigo: <span className="text-gray-900 font-semibold">{item.report1Value}</span> <span className="text-gray-400">({item.report1Date})</span>
              </div>
              <div className="font-mono">
                Atual: <span className="text-gray-900 font-semibold">{item.report2Value}</span> <span className="text-gray-400">({item.report2Date})</span>
              </div>
            </div>
          </div>

          {/* Questions Body */}
          <div className="p-6">
            
            {/* Additional Observations Buttons - UPDATED TO CHECKBOX STYLE FOR PNG */}
            <div className="mb-6 pb-4 border-b border-gray-100">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Observações (Selecione se houver):</p>
              <div className="flex flex-wrap gap-3">
                {[NOTE_NOT_RELATED, NOTE_KG, NOTE_DATE, NOTE_DATE_KG].map((note) => {
                  const isSelected = notesMap[idx]?.has(note);
                  return (
                    <button 
                      key={note}
                      onClick={() => toggleNote(idx, note)}
                      className="flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors shadow-sm bg-white"
                    >
                      <div className={`w-5 h-5 border rounded flex items-center justify-center transition-colors ${isSelected ? 'border-red-500 bg-white' : 'border-gray-300 bg-white'}`}>
                        {isSelected && (
                          <span className="text-red-600 font-bold text-sm leading-none">✕</span>
                        )}
                      </div>
                      <span className={`text-xs font-medium ${isSelected ? 'text-gray-900' : 'text-gray-600'}`}>{note}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="flex justify-end mb-2">
               <button onClick={() => toggleAllQuestions(idx)} className="text-xs text-blue-600 hover:underline">
                  {questionSelectionMap[idx]?.size === questions.length ? "Desmarcar Todos" : "Marcar Todos"}
               </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-y-4 gap-x-8">
              {questions.map((q) => {
                const currentAnswer = answersMap[idx]?.[q.key];
                const isSelected = questionSelectionMap[idx]?.has(q.key);

                return (
                  <div key={q.key} className={`flex items-center justify-between p-2 rounded transition-colors ${isSelected ? 'bg-blue-50/50' : 'hover:bg-gray-50'}`}>
                    <div className="flex items-center gap-3">
                      <input 
                         type="checkbox" 
                         checked={!!isSelected}
                         onChange={() => toggleQuestionSelection(idx, q.key)}
                         className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span className={`text-sm font-medium ${isSelected ? 'text-blue-900' : 'text-gray-700'}`}>{q.label}</span>
                    </div>
                    
                    {/* Web UI Buttons */}
                    <div className={`flex gap-2 transition-opacity ${isSelected ? 'opacity-100' : 'opacity-40 hover:opacity-100'}`}>
                      <button
                        onClick={() => handleAnswer(idx, q.key, true)}
                        className={`px-3 py-1 text-xs font-bold rounded-md transition-colors border shadow-sm ${
                          currentAnswer === true 
                            ? 'bg-blue-600 text-white border-blue-600' 
                            : 'bg-white text-gray-500 border-gray-200 hover:border-blue-400 hover:text-blue-600'
                        }`}
                      >
                        SIM
                      </button>
                      <button
                        onClick={() => handleAnswer(idx, q.key, false)}
                        className={`px-3 py-1 text-xs font-bold rounded-md transition-colors border shadow-sm ${
                          currentAnswer === false 
                            ? 'bg-gray-700 text-white border-gray-700' 
                            : 'bg-white text-gray-500 border-gray-200 hover:border-gray-400 hover:text-gray-700'
                        }`}
                      >
                        NÃO
                      </button>
                    </div>

                  </div>
                );
              })}
            </div>
          </div>
        </div>
      ))}
       </div>

      <div className="fixed bottom-4 left-0 right-0 max-w-5xl mx-auto px-4">
        <div className="bg-white/95 backdrop-blur p-4 rounded-xl shadow-2xl border border-gray-200 flex justify-between items-center">
          <div className="text-sm text-gray-600 hidden sm:block">
            Respondido: <span className="font-bold text-gray-900">{Object.keys(answersMap).filter(k => isComplete(Number(k))).length}</span> / {result.details.length}
          </div>
          <button
            onClick={handleSubmit}
            className={`w-full sm:w-auto px-8 py-3 rounded-lg font-bold shadow-md transition-all ${
              allComplete || true // Allow submission even if incomplete for flexibility
                ? 'bg-green-600 text-white hover:bg-green-700 hover:scale-105' 
                : 'bg-gray-300 text-gray-500 cursor-not-allowed'
            }`}
          >
            Finalizar Investigação
          </button>
        </div>
      </div>
    </div>
  );
};
