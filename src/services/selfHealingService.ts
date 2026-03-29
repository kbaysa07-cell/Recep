import { GoogleGenAI } from "@google/genai";
import { logHealingAttempt } from "./selfHealingLog";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export async function analyzeAndFix(
  errorLog: string,
  fileContent: string,
  filePath: string,
  attemptNumber: number
): Promise<string> {
  await logHealingAttempt(filePath, errorLog, attemptNumber);
  
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: `
      Aşağıdaki test hatası oluştu:
      ${errorLog}
      
      Dosya içeriği:
      ${fileContent}
      
      Lütfen bu hatayı düzeltmek için gereken kodu yaz. Sadece düzeltilmiş dosya içeriğini döndür.
    `,
  });
  
  return response.text || fileContent;
}
