import { GoogleGenAI, Type } from "@google/genai";
import { AnalysisResult } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export type ReportInput = 
  | { type: 'file'; base64: string; mimeType: string }
  | { type: 'text'; content: string };

export const analyzeReports = async (
  input1: ReportInput,
  input2: ReportInput
): Promise<AnalysisResult> => {
  
  const prompt = `
    Atue como um Auditor de Prevenção de Perdas e Controle de Estoque.
    Sua missão é realizar o "Cruzamento de Estoque e Validade".

    DEFINIÇÃO DOS DADOS:
    - RELATÓRIO 1 (ANTIGO): É o relatório base, anterior ou do sistema antigo.
    - RELATÓRIO 2 (ATUAL): É o relatório recente, auditoria física ou contagem atual.

    TAREFA CRÍTICA:
    Compare o Relatório 2 (ATUAL) contra o Relatório 1 (ANTIGO) para encontrar inconsistências.
    
    *** REGRAS DE LÓGICA DE QUANTIDADE E DATA (MUITO IMPORTANTE) ***:
    
    1. CASO: VENDA NORMAL (Diminuição de Qtd, Mesma Data)
       - Se a Data de Validade for IGUAL nos dois relatórios.
       - E a Quantidade no ATUAL for MENOR que no ANTIGO.
       - AÇÃO: 
         - O campo 'issueType' DEVE SER EXATAMENTE: "------"
         - O campo 'description' DEVE SER: "Check-in Ok"
         - 'severity': "low"

    2. CASO: AUMENTO INJUSTIFICADO (Aumento de Qtd, Mesma Data)
       - Se a Data de Validade for IGUAL nos dois relatórios.
       - E a Quantidade no ATUAL for MAIOR que no ANTIGO (Dobrou ou aumentou do nada).
       - AÇÃO:
         - O campo 'issueType' DEVE SER EXATAMENTE: "Verificar inconsistência"
         - O campo 'description' DEVE SER: "Quantidade aumentou mantendo a mesma validade."
         - 'severity': "medium"

    3. CASO: DIVERGÊNCIA DE DATA
       - Se a Data de Validade for DIFERENTE.
       - AÇÃO: 'issueType': "Divergência de Data" ou "Produto Vencido" (se data < hoje).

    4. CASO: AUSÊNCIA OU NOVO
       - Produto no Antigo mas NÃO no Atual -> 'issueType': "Ausência no Atual".
       - Produto no Atual mas NÃO no Antigo -> 'issueType': "Produto Novo/Não Listado".

    OUTRAS INSTRUÇÕES:
    - Extraia a data de validade de AMBOS os relatórios. Normalizar formatos para DD/MM/AAAA.
    - Normalização de Unidade: Trate "1kg", "1.000kg" e "1000g" como iguais.

    OUTPUT:
    Retorne APENAS um JSON válido seguindo o schema fornecido.
  `;

  // Construct parts based on input type
  const parts: any[] = [{ text: prompt }];

  // Report 1 Input
  parts.push({ text: "\n--- INICIO RELATÓRIO 1 (ANTIGO) ---\n" });
  if (input1.type === 'file') {
    parts.push({ inlineData: { mimeType: input1.mimeType, data: input1.base64 } });
  } else {
    parts.push({ text: input1.content });
  }

  // Separator
  parts.push({ text: "\n--- FIM RELATÓRIO 1 --- INICIO RELATÓRIO 2 (ATUAL) ---\n" });

  // Report 2 Input
  if (input2.type === 'file') {
    parts.push({ inlineData: { mimeType: input2.mimeType, data: input2.base64 } });
  } else {
    parts.push({ text: input2.content });
  }

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: { parts },
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            summary: {
              type: Type.STRING,
              description: "Resumo executivo focado nas divergências encontradas entre o relatório antigo e o atual."
            },
            totalProductsChecked: {
              type: Type.NUMBER,
              description: "Total de SKUs/Produtos únicos analisados."
            },
            inconsistenciesFound: {
              type: Type.NUMBER,
              description: "Contagem total de divergências (Exclua os casos de '------' / Check-in Ok desta contagem se possível)."
            },
            details: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  productName: { type: Type.STRING },
                  issueType: { 
                    type: Type.STRING, 
                    description: "O Tipo do Erro. Use '------' se for apenas venda normal, ou 'Verificar inconsistência' se aumentou a qtd com mesma data." 
                  },
                  report1Value: { type: Type.STRING, description: "Quantidade no Antigo" },
                  report1Date: { type: Type.STRING, description: "Data de Validade no Antigo (DD/MM/AAAA) ou '-'" },
                  report2Value: { type: Type.STRING, description: "Quantidade no Atual" },
                  report2Date: { type: Type.STRING, description: "Data de Validade no Atual (DD/MM/AAAA) ou '-'" },
                  description: { type: Type.STRING, description: "Explicação curta." },
                  severity: { type: Type.STRING, enum: ["low", "medium", "high"] }
                },
                required: ["productName", "issueType", "report1Value", "report1Date", "report2Value", "report2Date", "description", "severity"]
              }
            }
          },
          required: ["summary", "totalProductsChecked", "inconsistenciesFound", "details"]
        }
      }
    });

    const text = response.text;
    if (!text) throw new Error("Sem resposta da IA");
    
    return JSON.parse(text) as AnalysisResult;

  } catch (error) {
    console.error("Erro na análise:", error);
    throw error;
  }
};