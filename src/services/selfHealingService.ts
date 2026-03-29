import { GoogleGenAI } from "@google/genai";
import { logHealingAttempt, getHealingLogsForFile } from "./selfHealingLog";
import { withRetry } from "../lib/aiUtils";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export async function analyzeAndFix(
  errorLog: string,
  fileContent: string,
  filePath: string,
  attemptNumber: number
): Promise<string> {
  const previousLogs = getHealingLogsForFile(filePath);
  const historyPrompt = previousLogs.length > 0 
    ? `Önceki denemeler ve hatalar:\n${previousLogs.map(l => `Deneme ${l.attempt}: ${l.error}`).join('\n')}\n`
    : "";

  await logHealingAttempt(filePath, errorLog, attemptNumber);
  
  return withRetry(async () => {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `
        Aşağıdaki test hatası oluştu:
        ${errorLog}
        
        ${historyPrompt}
        
        Dosya içeriği:
        ${fileContent}
        
        Lütfen bu hatayı düzeltmek için gereken kodu yaz. Önceki hataları göz önünde bulundurarak aynı hatayı yapma. Sadece düzeltilmiş dosya içeriğini döndür.
      `,
    });
    
    return response.text || fileContent;
  });
}
