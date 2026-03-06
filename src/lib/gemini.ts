import { GoogleGenAI, Type, FunctionDeclaration } from "@google/genai";
import { Message, WorkspaceFiles, AIModel } from "../types";

const takeScreenshotDeclaration: FunctionDeclaration = {
  name: "takeScreenshot",
  description: "Önizleme ekranının anlık görüntüsünü alır.",
  parameters: {
    type: Type.OBJECT,
    properties: {},
  },
};

const runVisualDiagnosticDeclaration: FunctionDeclaration = {
  name: "runVisualDiagnostic",
  description: "Önizleme ekranını görsel olarak analiz eder ve tasarım hatalarını raporlar.",
  parameters: {
    type: Type.OBJECT,
    properties: {},
  },
};

export async function sendMessageToAI(
  messages: Message[],
  newMessage: string,
  wsFiles: WorkspaceFiles,
  aiContextFiles: Set<string>,
  limit: number,
  activeModel: AIModel,
  isTaskMode: boolean
) {
  let modelToUse = activeModel;
  if (activeModel.id === 'auto') {
    if (Object.keys(wsFiles).length > 0) {
      modelToUse = { id: 'gemini-3.1-pro-preview', name: 'Gemini 3.1 Pro', provider: 'google' };
    } else {
      modelToUse = { id: 'gemini-3-flash-preview', name: 'Gemini 3 Flash', provider: 'google' };
    }
  }

  const recentMessages = messages.slice(-limit);
  
  let promptContext = "Önceki sohbet:\n";
  recentMessages.forEach(msg => {
    promptContext += `${msg.sender === 'user' ? 'Kullanıcı' : 'Sen'}: ${msg.text}\n`;
  });
  promptContext += `\nYeni Mesaj: ${newMessage}`;

  let systemInst = "Sen dünyanın en gelişmiş, otonom oyun geliştirme ve kodlama yapay zekasısın (Cursor, Manus AI veya Devin seviyesinde). İsmin Recep AI.\n";
  systemInst += "Amacın: Kullanıcıların (özellikle mobil cihazlardan) sadece sohbet ederek, sıfır kod bilgisiyle profesyonel, hatasız ve test edilmiş 2D/3D oyunlar ve uygulamalar yapmasını sağlamaktır.\n\n";
  systemInst += "Görevlerin ve Kuralların:\n";
  systemInst += "1. KOD ÜRETİMİ: Kullanıcı bir oyun veya özellik istediğinde, eksiksiz ve çalışır durumda kod yaz. Kodları SADECE şu formatta gönder:\n   [DOSYA:dosya_adi.uzanti]\n   ...kodlar...\n   [/DOSYA]\n";
  systemInst += "2. OYUN MOTORU UZMANLIĞI: 2D oyunlar için 'Phaser 3', 3D oyunlar için 'Babylon.js' kullan. Her zaman en iyi pratikleri (FSM, Entity Management, Object Pooling) uygula.\n";
  systemInst += "3. MOBİL ÖNCELİKLİ (MOBILE-FIRST): Yazdığın tüm oyunlar ve uygulamalar mobil cihazlarda (Android/iOS) kusursuz çalışmalı. Canvas boyutlarını ekrana sığdır (responsive), dokunmatik kontroller (joystick, touch buttons) ekle.\n";
  systemInst += "4. OTONOM TEST VE HATA ÇÖZÜMÜ: Bir hata logu veya ekran görüntüsü aldığında, sorunu analiz et ve kullanıcıya sormadan doğrudan düzeltilmiş kodu gönder. Asla 'şunu yapmalısın' deme, DOĞRUDAN YAP.\n";
  systemInst += "5. GÖREV PLANI: Karmaşık isteklerde veya görev modunda, işi parçalara ayır ve [DOSYA:gorev_plani.md] formatında planı sun.\n";
  systemInst += "6. İLETİŞİM: Kısa, net ve profesyonel konuş. Gereksiz açıklamalardan kaçın, doğrudan sonuca (koda) odaklan.\n\n";
  
  if (isTaskMode) {
    systemInst += "GÖREV MODU AKTİF: Kullanıcı bir görev verdiğinde, bu görevi parçalara ayır ve bir Markdown (.md) dosyası olarak görev planı oluştur.\n";
    systemInst += "Markdown dosyalarını da kod dosyaları gibi şu formatta gönder:\n[DOSYA:gorev_plani.md]\n...markdown içeriği...\n[/DOSYA]\n\n";
  }
  
  if (Object.keys(wsFiles).length > 0) {
    systemInst += "KULLANICININ İNCELEMEN İÇİN SEÇTİĞİ AKTİF PROJE DOSYALARI (Sadece bunları görebilirsin):\n";
    let includedCount = 0;
    for (const [name, content] of Object.entries(wsFiles)) {
      if (aiContextFiles.has(name)) {
        systemInst += `--- ${name} ---\n${content}\n\n`;
        includedCount++;
      }
    }
    if (includedCount === 0) {
      systemInst += "(Kullanıcı hiçbir dosyayı okuman için seçmemiş. Sadece genel cevap ver veya yeni dosya oluştur.)\n";
    }
    systemInst += "Yukarıdaki kodları incele. SADECE hatayı çözmek veya yeni özellik eklemek için DEĞİŞTİRDİĞİN / EKLEDİĞİN dosyayı gönder. Değişmeyen dosyaları ASLA tekrar GÖNDERME.";
  }

  // Handle different providers
  if (modelToUse.provider === 'google') {
    const apiKey = modelToUse.apiKey || process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("API Key eksik. Lütfen ayarlardan API anahtarınızı girin.");
    }
    
    const ai = new GoogleGenAI({ apiKey });
    
    const response = await ai.models.generateContent({
      model: modelToUse.id, 
      contents: promptContext,
      config: {
        systemInstruction: systemInst,
        tools: [{ functionDeclarations: [takeScreenshotDeclaration, runVisualDiagnosticDeclaration] }, { googleSearch: {} }],
      }
    });

    // Check for function calls
    if (response.functionCalls && response.functionCalls.length > 0) {
        return JSON.stringify({ functionCalls: response.functionCalls });
    }

    return response.text || "";
  } else if (modelToUse.provider === 'openai' || modelToUse.provider === 'xai' || modelToUse.provider === 'custom') {
    const apiKey = modelToUse.apiKey;
    if (!apiKey) {
      throw new Error("API Key eksik. Lütfen ayarlardan API anahtarınızı girin.");
    }
    
    const baseUrl = modelToUse.baseUrl || (modelToUse.provider === 'xai' ? "https://api.x.ai/v1/chat/completions" : "https://api.openai.com/v1/chat/completions");
    
    const response = await fetch(baseUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: modelToUse.id,
        messages: [
          { role: "system", content: systemInst },
          { role: "user", content: promptContext }
        ]
      })
    });
    
    if (!response.ok) {
      throw new Error(`API Hatası: ${response.status}`);
    }
    
    const data = await response.json();
    return data.choices[0].message.content || "";
  }

  throw new Error("Desteklenmeyen model sağlayıcısı.");
}
