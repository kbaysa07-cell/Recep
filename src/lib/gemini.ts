import { GoogleGenAI, Type, FunctionDeclaration, ThinkingLevel } from "@google/genai";
import { Message, WorkspaceFiles, AIModel } from "../types";

const editFileDeclaration: FunctionDeclaration = {
  name: "editFile",
  description: "Bir dosyanın içeriğini düzenler.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      path: { type: Type.STRING, description: "Düzenlenecek dosyanın yolu" },
      content: { type: Type.STRING, description: "Dosyanın yeni içeriği" },
    },
    required: ["path", "content"],
  },
};

const createFileDeclaration: FunctionDeclaration = {
  name: "createFile",
  description: "Yeni bir dosya oluşturur. Resim veya ses dosyaları için content kısmına base64 string veya URL koyabilirsiniz.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      path: { type: Type.STRING, description: "Oluşturulacak dosyanın yolu (örn: 'assets/player.png')" },
      content: { type: Type.STRING, description: "Dosyanın içeriği (Metin veya Base64 URL)" },
    },
    required: ["path", "content"],
  },
};

const readMultipleFilesDeclaration: FunctionDeclaration = {
  name: "readMultipleFiles",
  description: "Birden fazla dosyanın içeriğini aynı anda okur.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      paths: {
        type: Type.ARRAY,
        items: { type: Type.STRING },
        description: "Okunacak dosyaların yolları (örn: ['src/App.tsx', 'src/types.ts'])"
      },
    },
    required: ["paths"],
  },
};

const grepSearchDeclaration: FunctionDeclaration = {
  name: "grepSearch",
  description: "Projeyi belirli bir desen veya kod parçası için arar.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      pattern: { type: Type.STRING, description: "Aranacak desen (örn: 'functionName')" },
    },
    required: ["pattern"],
  },
};

const dependencyCheckDeclaration: FunctionDeclaration = {
  name: "dependencyCheck",
  description: "package.json dosyasını analiz eder ve eksik bağımlılıkları raporlar.",
  parameters: {
    type: Type.OBJECT,
    properties: {},
  },
};

const testRunnerDeclaration: FunctionDeclaration = {
  name: "testRunner",
  description: "Projedeki testleri çalıştırır.",
  parameters: {
    type: Type.OBJECT,
    properties: {},
  },
};

const runTerminalCommandDeclaration: FunctionDeclaration = {
  name: "runTerminalCommand",
  description: "Terminalde bir komut çalıştırır. (örn: 'npm install lodash', 'ls -la')",
  parameters: {
    type: Type.OBJECT,
    properties: {
      command: {
        type: Type.STRING,
        description: "Çalıştırılacak terminal komutu",
      },
    },
    required: ["command"],
  },
};

export async function sendMessageToAI(
  messages: Message[],
  newMessage: string,
  wsFiles: WorkspaceFiles,
  aiContextFiles: Set<string>,
  limit: number,
  activeModel: AIModel,
  isTaskMode: boolean,
  onChunk: (chunk: string) => void,
  onActivity: (activity: {type: 'thought' | 'file' | 'terminal' | 'web', message: string}) => void,
  handlers: {
    editFile: (path: string, content: string) => void;
    createFile: (path: string, content: string) => void;
    readMultipleFiles: (paths: string[]) => Promise<string>;
    grepSearch: (pattern: string) => Promise<string>;
    dependencyCheck: () => Promise<string>;
    testRunner: () => Promise<string>;
    runCommand: (command: string) => Promise<string>;
  }
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
  systemInst += "1. KOD ÜRETİMİ: Kullanıcı bir oyun veya özellik istediğinde, eksiksiz ve çalışır durumda kod yaz. Kodları göndermek için 'createFile' veya 'editFile' araçlarını kullan. Asla [DOSYA] formatını kullanma.\n";
  systemInst += "2. OYUN MOTORU UZMANLIĞI: 2D oyunlar için 'Phaser 3', 3D oyunlar için 'Babylon.js' kullan. Her zaman en iyi pratikleri (FSM, Entity Management, Object Pooling) uygula.\n";
  systemInst += "3. MOBİL ÖNCELİKLİ (MOBILE-FIRST): Yazdığın tüm oyunlar ve uygulamalar mobil cihazlarda (Android/iOS) kusursuz çalışmalı. Canvas boyutlarını ekrana sığdır (responsive), dokunmatik kontroller (joystick, touch buttons) ekle.\n";
  systemInst += "4. TARAYICI UYUMLULUĞU (ÇOK ÖNEMLİ): Yazdığın kodlar doğrudan tarayıcıda (iframe) çalışacaktır. Webpack, Vite veya npm YOKTUR. Harici kütüphaneleri (Phaser, Babylon vb.) HTML dosyasının <head> kısmına CDN linki olarak ekle.\n";
  systemInst += "5. REACT, JSX VE TAILWIND DESTEĞİ: Sistemde In-Browser Babel Bundler aktiftir. React ve JSX kodları yazabilirsin. React, ReactDOM ve Tailwind CSS otomatik olarak CDN'den yüklenir. 'import { useState } from \"react\";' gibi importları kullanabilirsin, sistem bunları otomatik olarak global objelere dönüştürür. Stil için doğrudan Tailwind class'larını ('className=...') kullanabilirsin.\n";
  systemInst += "6. OTONOM TEST VE HATA ÇÖZÜMÜ: Bir hata logu veya ekran görüntüsü aldığında, sorunu analiz et ve kullanıcıya sormadan doğrudan düzeltilmiş kodu gönder. Asla 'şunu yapmalısın' deme, DOĞRUDAN YAP.\n";
  systemInst += "7. GÖREV PLANI: Karmaşık isteklerde veya görev modunda, işi parçalara ayır ve 'gorev_plani.md' dosyasını oluşturup güncelle.\n";
  systemInst += "8. GITHUB KLONLAMA: Kullanıcı bir GitHub deposunu klonlamak isterse, 'runTerminalCommand' aracını kullanarak 'git clone <repo_url>' komutunu çalıştırabilirsin. Ancak bu ortamın bir tarayıcı içi sanal ortam olduğunu ve gerçek bir dosya sistemi olmadığını unutma. Klonlama işlemi başarılı olursa, dosyaları okumak için 'readMultipleFiles' aracını kullan.\n";
  systemInst += "9. WEB ARAŞTIRMASI: Bilgiye ihtiyacın olduğunda veya kullanıcı bir konuyu araştırmanı istediğinde, Google Search aracı otomatik olarak kullanılabilir durumdadır. Bu aracı kullanarak güncel bilgileri bul ve yanıtlarına entegre et.\n";
  systemInst += "10. İLETİŞİM: Kısa, net ve profesyonel konuş. Gereksiz açıklamalardan kaçın, doğrudan sonuca (koda) odaklan.\n\n";
  
  if (isTaskMode) {
    systemInst += "GÖREV MODU AKTİF: Kullanıcı bir görev verdiğinde, bu görevi parçalara ayır ve 'gorev_plani.md' adında bir dosya oluşturarak görev planını kaydet.\n";
    systemInst += "Görev planını güncellerken 'editFile' aracını kullan. Format şu şekilde olmalı:\n";
    systemInst += "### Yapılacaklar\n- [ ] Görev 1\n### Yapılıyor\n- [/] Görev 2\n### Tamamlandı\n- [x] Görev 3\n\n";
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
    // @ts-ignore
    const envApiKey = (typeof process !== 'undefined' && process.env && process.env.GEMINI_API_KEY) || (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_GEMINI_API_KEY);
    const apiKey = modelToUse.apiKey || envApiKey;
    
    if (!apiKey) {
      throw new Error("Sistem API Anahtarı bulunamadı. Lütfen ayarlardan kendi API anahtarınızı girin.");
    }
    
    const ai = new GoogleGenAI({ apiKey });
    
    let currentPrompt = promptContext;
    let fullResponse = "";
    let loopCount = 0;
    const MAX_LOOPS = 3;
    let isDone = false;

    while (!isDone && loopCount < MAX_LOOPS) {
      loopCount++;
      onActivity({ type: 'thought', message: loopCount === 1 ? 'İsteği analiz ediyorum...' : `Hata kontrolü ve düzeltme (Deneme ${loopCount})...` });

      const stream = await ai.models.generateContentStream({
        model: modelToUse.id, 
        contents: currentPrompt,
        config: {
          systemInstruction: systemInst + "\n8. OTONOM DÖNGÜ: Bir araç kullandığında sonuçları sana geri dönecek. Eğer hata varsa (örneğin test başarısızsa veya terminal hata verdiyse) kendi kendine düzeltip tekrar dene. İşlem tamamen bittiğinde araç KULLANMADAN kullanıcıya bilgi ver.",
          tools: [{ functionDeclarations: [editFileDeclaration, createFileDeclaration, readMultipleFilesDeclaration, grepSearchDeclaration, dependencyCheckDeclaration, testRunnerDeclaration, runTerminalCommandDeclaration] }, { googleSearch: {} }],
          thinkingConfig: { thinkingLevel: ThinkingLevel.HIGH }
        }
      });

      let iterationText = "";
      let hasToolCalls = false;
      let toolResults = "";

      for await (const chunk of stream) {
          // Tool çağrılarını yakala
          if (chunk.functionCalls && chunk.functionCalls.length > 0) {
              hasToolCalls = true;
              for (const call of chunk.functionCalls) {
                  onActivity({ type: 'terminal', message: `Fonksiyon çalıştırılıyor: ${call.name}` });
                  try {
                    let result = "";
                    if (call.name === 'editFile') {
                        handlers.editFile(call.args.path as string, call.args.content as string);
                        result = "Dosya başarıyla düzenlendi.";
                    } else if (call.name === 'createFile') {
                        handlers.createFile(call.args.path as string, call.args.content as string);
                        result = "Dosya başarıyla oluşturuldu.";
                    } else if (call.name === 'readMultipleFiles') {
                        result = await handlers.readMultipleFiles(call.args.paths as string[]);
                        onActivity({ type: 'file', message: `Dosyalar okundu: ${result.substring(0, 50)}...` });
                    } else if (call.name === 'grepSearch') {
                        result = await handlers.grepSearch(call.args.pattern as string);
                        onActivity({ type: 'terminal', message: `Arama sonucu: ${result.substring(0, 50)}...` });
                    } else if (call.name === 'dependencyCheck') {
                        result = await handlers.dependencyCheck();
                        onActivity({ type: 'terminal', message: `Bağımlılık kontrolü: ${result.substring(0, 50)}...` });
                    } else if (call.name === 'testRunner') {
                        result = await handlers.testRunner();
                        onActivity({ type: 'terminal', message: `Test sonucu: ${result.substring(0, 50)}...` });
                    } else if (call.name === 'runTerminalCommand') {
                        result = await handlers.runCommand(call.args.command as string);
                        onActivity({ type: 'terminal', message: `Komut çalıştırıldı. Sonuç: ${result ? result.substring(0, 50) : 'Yok'}...` });
                    }
                    toolResults += `\n[Tool: ${call.name}] Sonuç:\n${result}\n`;
                  } catch (err: any) {
                    toolResults += `\n[Tool: ${call.name}] Hata:\n${err.message}\n`;
                  }
              }
          }

          const text = chunk.text;
          if (text) {
              iterationText += text;
              fullResponse += text;
              onChunk(text);
          }
      }

      if (hasToolCalls) {
        currentPrompt += `\n\nSenin Cevabın:\n${iterationText}\n\nÇalıştırdığın Araçların Sonuçları:\n${toolResults}\nLütfen bu sonuçları incele. Eğer bir hata varsa düzeltmek için tekrar araçları kullan. Eğer her şey başarılıysa veya işlem tamamlandıysa kullanıcıya son durumu özetle.`;
      } else {
        isDone = true;
      }
    }
    return fullResponse;
  } else if (modelToUse.provider === 'openai' || modelToUse.provider === 'anthropic' || modelToUse.provider === 'xai' || modelToUse.provider === 'custom') {
    // ... (diğer sağlayıcılar için streaming eklemesi sonraki adımda)
    // @ts-ignore
    const envApiKey = (typeof process !== 'undefined' && process.env && process.env[`${modelToUse.provider.toUpperCase()}_API_KEY`]) || (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env[`VITE_${modelToUse.provider.toUpperCase()}_API_KEY`]);
    const apiKey = modelToUse.apiKey || envApiKey;
    
    if (!apiKey) {
      throw new Error(`Lütfen Ayarlar menüsünden ${modelToUse.provider} için API anahtarınızı girin.`);
    }
    
    const baseUrl = modelToUse.baseUrl || (
      modelToUse.provider === 'xai' ? "https://api.x.ai/v1/chat/completions" : 
      modelToUse.provider === 'anthropic' ? "https://api.anthropic.com/v1/messages" : 
      "https://api.openai.com/v1/chat/completions"
    );
    
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
    const text = data.choices[0].message.content || "";
    onChunk(text);
    return text;
  }

  throw new Error("Desteklenmeyen model sağlayıcısı.");
}
