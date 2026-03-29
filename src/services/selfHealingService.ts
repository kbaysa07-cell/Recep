import { GoogleGenAI } from "@google/genai";

// Instead, let's pass the necessary tools to the selfHealing function.
// Or just implement the logic here and use the tools passed.

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export async function analyzeAndFix(
  errorLog: string,
  fileContent: string,
  filePath: string
): Promise<string> {
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
