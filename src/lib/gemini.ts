import { GoogleGenAI, Type, FunctionDeclaration, ThinkingLevel } from "@google/genai";
import { Message, WorkspaceFiles, AIModel } from "../types";
import { flattenWorkspace } from "./workspaceUtils";

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

const searchFilesDeclaration: FunctionDeclaration = {
  name: "searchFiles",
  description: "Projedeki dosyaları isimlerine göre arar.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      pattern: { type: Type.STRING, description: "Aranacak dosya adı veya uzantısı (örn: '.tsx', 'App')" },
    },
    required: ["pattern"],
  },
};

const readFileChunkDeclaration: FunctionDeclaration = {
  name: "readFileChunk",
  description: "Büyük bir dosyanın sadece belirli satır aralığını okur. Performans ve bağlam tasarrufu için tüm dosyayı okumak yerine bu aracı kullanın.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      path: { type: Type.STRING, description: "Okunacak dosyanın yolu" },
      startLine: { type: Type.NUMBER, description: "Başlangıç satırı (1'den başlar)" },
      endLine: { type: Type.NUMBER, description: "Bitiş satırı" },
    },
    required: ["path", "startLine", "endLine"],
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

const runDiagnosticDeclaration: FunctionDeclaration = {
  name: "runDiagnostic",
  description: "Kod tabanında statik analiz ve linter kontrolleri yaparak olası hataları ve sonsuz döngü risklerini tespit eder.",
  parameters: {
    type: Type.OBJECT,
    properties: {},
  },
};

const fetchGithubRepoDeclaration: FunctionDeclaration = {
  name: "fetchGithubRepo",
  description: "Belirtilen GitHub deposunu (repository) çeker ve çalışma alanına aktarır.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      repoUrl: {
        type: Type.STRING,
        description: "GitHub depo URL'si (örn: https://github.com/kullanici/repo)",
      },
    },
    required: ["repoUrl"],
  },
};

const readGithubFileDeclaration: FunctionDeclaration = {
  name: "readGithubFile",
  description: "Çalışma alanına aktarılan bir GitHub deposundaki belirli bir dosyanın içeriğini okur.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      url: {
        type: Type.STRING,
        description: "Okunacak dosyanın raw GitHub URL'si",
      },
    },
    required: ["url"],
  },
};

export async function sendMessageToAI(
  messages: Message[],
  newMessage: string,
  wsFiles: WorkspaceFiles,
  contextFiles: Set<string>,
  limit: number,
  activeModel: AIModel,
  providerKeys: Record<string, string>,
  isTaskMode: boolean,
  onChunk: (chunk: string) => void,
  onActivity: (activity: {type: 'thought' | 'file' | 'terminal' | 'web', message: string, timestamp?: number}) => void,
  handlers: {
    editFile: (path: string, content: string) => void;
    createFile: (path: string, content: string) => void;
    readMultipleFiles: (paths: string[]) => Promise<string>;
    grepSearch: (pattern: string) => Promise<string>;
    searchFiles: (pattern: string) => Promise<string>;
    readFileChunk: (path: string, startLine: number, endLine: number) => Promise<string>;
    dependencyCheck: () => Promise<string>;
    testRunner: () => Promise<string>;
    runCommand: (command: string) => Promise<string>;
    runDiagnostic: () => Promise<string>;
    fetchGithubRepo: (repoUrl: string, token?: string) => Promise<string>;
    readGithubFile: (url: string, token?: string) => Promise<string>;
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
  systemInst += "1. KUSURSUZ KOD ÜRETİMİ: Kullanıcı bir oyun veya özellik istediğinde, eksiksiz ve çalışır durumda kod yaz. Kodları göndermek için SADECE 'createFile' veya 'editFile' araçlarını kullan. ASLA [DOSYA] formatını kullanma. Bir dosyayı düzenlemeden önce MUTLAKA 'readMultipleFiles' veya 'grepSearch' ile dosyanın var olup olmadığını ve içeriğini kontrol et. Dosya zaten varsa 'editFile', yoksa 'createFile' kullan. Kod yazarken açıklama yapma, SADECE araçları kullan. Eğer kullanıcı durdurmazsa, kod yazma işlemi sırasında sohbet mesajı gönderme.\n";
  systemInst += "2. OYUN MOTORU UZMANLIĞI: 2D oyunlar için 'Phaser 3', 3D oyunlar için 'Babylon.js' kullan. Her zaman en iyi pratikleri (FSM, Entity Management, Object Pooling) uygula.\n";
  systemInst += "3. MOBİL ÖNCELİKLİ (MOBILE-FIRST): Yazdığın tüm oyunlar ve uygulamalar mobil cihazlarda (Android/iOS) kusursuz çalışmalı. Canvas boyutlarını ekrana sığdır (responsive), dokunmatik kontroller (joystick, touch buttons) ekle.\n";
  systemInst += "4. TARAYICI UYUMLULUĞU (ÇOK ÖNEMLİ): Yazdığın kodlar doğrudan tarayıcıda (iframe) çalışacaktır. Webpack, Vite veya npm YOKTUR. Harici kütüphaneleri (Phaser, Babylon vb.) HTML dosyasının <head> kısmına CDN linki olarak ekle.\n";
  systemInst += "5. DİNAMİK PAKET YÜKLEME, REACT VE TAILWIND DESTEĞİ: Sistemde In-Browser Babel Bundler ve dinamik import map (esm.sh) aktiftir. Herhangi bir npm paketini (örn: framer-motion, lodash, lucide-react) doğrudan 'import { X } from \"paket-adi\";' şeklinde koduna ekleyebilirsin, sistem bunu otomatik olarak yükleyecektir. npm install yapmana GEREK YOKTUR. React, ReactDOM ve Tailwind CSS zaten yüklüdür. Stil için doğrudan Tailwind class'larını ('className=...') kullanabilirsin.\n";
  systemInst += "6. OTONOM TEST VE HATA ÇÖZÜMÜ (SIFIR BUG PRENSİBİ): Bir hata logu veya ekran görüntüsü aldığında, sorunu analiz et ve kullanıcıya sormadan doğrudan düzeltilmiş kodu gönder. Asla 'şunu yapmalısın' deme, DOĞRUDAN YAP. Kod yazarken console.log ile hata ayıklama mesajları ekle. Kodun KUSURSUZ çalıştığından emin ol.\n";
  systemInst += "7. BÜYÜK PROJE YÖNETİMİ VE MİMARİ: Büyük projelerde çalışırken Cursor veya Replit gibi davran. Proje yapısını iyi kur (örneğin: src/components, src/utils, src/assets). Modüler kod yaz. Birbirine bağımlı dosyaları güncellerken DİKKATLİ OL. Mevcut kodu bozmamak için değişiklik yapmadan önce MUTLAKA 'readMultipleFiles' ve 'grepSearch' araçlarını kullanarak kod tabanını anla.\n";
  systemInst += "8. GÖREV PLANI: Karmaşık isteklerde veya görev modunda, işi parçalara ayır ve 'gorev_plani.md' dosyasını oluşturup güncelle.\n";
  systemInst += "9. GITHUB KLONLAMA: Kullanıcı bir GitHub deposunu klonlamak isterse, 'runTerminalCommand' aracını kullanarak 'git clone <repo_url>' komutunu çalıştırabilirsin. Ancak bu ortamın bir tarayıcı içi sanal ortam olduğunu ve gerçek bir dosya sistemi olmadığını unutma. Klonlama işlemi başarılı olursa, dosyaları okumak için 'readMultipleFiles' aracını kullan.\n";
  systemInst += "10. WEB ARAŞTIRMASI: Bilgiye ihtiyacın olduğunda veya kullanıcı bir konuyu araştırmanı istediğinde, Google Search aracı otomatik olarak kullanılabilir durumdadır. Bu aracı kullanarak güncel bilgileri bul ve yanıtlarına entegre et.\n";
  systemInst += "11. İLETİŞİM: Kısa, net ve profesyonel konuş. Gereksiz açıklamalardan kaçın, doğrudan sonuca (koda) odaklan.\n";
  systemInst += "12. İŞLEM BİLDİRİMİ: Her işlem (kod yazma, dosya düzenleme, tanılama vb.) başarıyla tamamlandığında, kullanıcıya SADECE 'İşlem başarıyla tamamlandı.' şeklinde kısa bir mesaj gönder.\n\n";
  
  if (isTaskMode) {
    systemInst += "GÖREV MODU AKTİF: Kullanıcı bir görev verdiğinde, bu görevi parçalara ayır ve 'gorev_plani.md' adında bir dosya oluşturarak görev planını kaydet.\n";
    systemInst += "Görev planını güncellerken 'editFile' aracını kullan. Format şu şekilde olmalı:\n";
    systemInst += "### Yapılacaklar\n- [ ] Görev 1\n### Yapılıyor\n- [/] Görev 2\n### Tamamlandı\n- [x] Görev 3\n\n";
  }
  
  if (Object.keys(wsFiles).length > 0) {
    const flatFiles = flattenWorkspace(wsFiles);
    const flatFilesMap: { [name: string]: string } = {};
    flatFiles.forEach(({ path, node }) => {
      if (node.type === 'file') {
        flatFilesMap[path] = node.content || '';
      }
    });

    systemInst += "PROJE DOSYA AĞACI (Mevcut tüm dosyalar):\n";
    for (const name of Object.keys(flatFilesMap)) {
      systemInst += `- ${name}\n`;
    }
    systemInst += "\n";

    systemInst += "İLGİLİ PROJE DOSYALARI (İçerikleriyle birlikte):\n";
    let includedCount = 0;
    for (const [name, content] of Object.entries(flatFilesMap)) {
      if (contextFiles.has(name)) {
        systemInst += `--- ${name} ---\n${content}\n\n`;
        includedCount++;
      }
    }
    if (includedCount === 0) {
      systemInst += "(İlgili dosya bulunamadı. Gerekirse 'readMultipleFiles' aracıyla diğer dosyaları okuyabilirsin.)\n";
    }
    systemInst += "Yukarıdaki kodları incele. SADECE hatayı çözmek veya yeni özellik eklemek için DEĞİŞTİRDİĞİN / EKLEDİĞİN dosyayı gönder. Diğer dosyaları okumak istersen 'readMultipleFiles' veya 'grepSearch' araçlarını kullan.\n";
  }

  // Handle different providers
  if (modelToUse.provider === 'google') {
    // @ts-ignore
    const envApiKey = (typeof process !== 'undefined' && process.env && process.env.GEMINI_API_KEY) || (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_GEMINI_API_KEY);
    const apiKey = providerKeys[modelToUse.provider] || envApiKey;
    
    if (!apiKey) {
      throw new Error("Sistem API Anahtarı bulunamadı. Lütfen ayarlardan kendi API anahtarınızı girin.");
    }
    
    const ai = new GoogleGenAI({ apiKey });
    
    let currentPrompt = promptContext;
    let fullResponse = "";
    let loopCount = 0;
    const MAX_LOOPS = 5;
    let isDone = false;

    while (!isDone && loopCount < MAX_LOOPS) {
      loopCount++;
      onActivity({ type: 'thought', message: loopCount === 1 ? 'İsteği analiz ediyorum...' : `Hata kontrolü ve düzeltme (Deneme ${loopCount})...`, timestamp: Date.now() });

      let stream;
      let retries = 0;
      const MAX_RETRIES = 3;

      while (retries < MAX_RETRIES) {
        try {
          stream = await ai.models.generateContentStream({
            model: modelToUse.id, 
            contents: currentPrompt,
            config: {
              systemInstruction: systemInst + "\n8. OTONOM DÖNGÜ: Bir araç kullandığında sonuçları sana geri dönecek. Eğer hata varsa (örneğin test başarısızsa veya terminal hata verdiyse) kendi kendine düzeltip tekrar dene. İşlem tamamen bittiğinde araç KULLANMADAN kullanıcıya bilgi ver.",
              tools: [{ functionDeclarations: [editFileDeclaration, createFileDeclaration, readMultipleFilesDeclaration, grepSearchDeclaration, searchFilesDeclaration, readFileChunkDeclaration, dependencyCheckDeclaration, testRunnerDeclaration, runTerminalCommandDeclaration, runDiagnosticDeclaration, fetchGithubRepoDeclaration, readGithubFileDeclaration] }],
              thinkingConfig: { thinkingLevel: ThinkingLevel.HIGH }
            }
          });
          break;
        } catch (error: any) {
          if (error.status === 429 && retries < MAX_RETRIES) {
            retries++;
            const delay = Math.pow(2, retries) * 1000;
            onActivity({ type: 'thought', message: `Kota aşıldı, ${delay/1000} saniye bekleniyor (Deneme ${retries}/${MAX_RETRIES})...`, timestamp: Date.now() });
            await new Promise(resolve => setTimeout(resolve, delay));
          } else {
            throw error;
          }
        }
      }

      let iterationText = "";
      let hasToolCalls = false;
      let toolResults = "";

      for await (const chunk of stream) {
          // Tool çağrılarını yakala
          if (chunk.functionCalls && chunk.functionCalls.length > 0) {
              hasToolCalls = true;
              for (const call of chunk.functionCalls) {
                  onActivity({ type: 'terminal', message: `Fonksiyon çalıştırılıyor: ${call.name}`, timestamp: Date.now() });
                  try {
                    let result = "";
                    if (call.name === 'editFile') {
                        onActivity({ type: 'file', message: `Dosya düzenleniyor: ${call.args.path}`, timestamp: Date.now() });
                        handlers.editFile(call.args.path as string, call.args.content as string);
                        onActivity({ type: 'file', message: `Dosya düzenlendi: ${call.args.path}`, timestamp: Date.now() });
                        result = "Dosya başarıyla düzenlendi.";
                    } else if (call.name === 'createFile') {
                        onActivity({ type: 'file', message: `Dosya oluşturuluyor: ${call.args.path}`, timestamp: Date.now() });
                        handlers.createFile(call.args.path as string, call.args.content as string);
                        onActivity({ type: 'file', message: `Dosya oluşturuldu: ${call.args.path}`, timestamp: Date.now() });
                        result = "Dosya başarıyla oluşturuldu.";
                    } else if (call.name === 'readMultipleFiles') {
                        result = await handlers.readMultipleFiles(call.args.paths as string[]);
                        onActivity({ type: 'file', message: `Dosyalar okundu: ${result.substring(0, 50)}...`, timestamp: Date.now() });
                    } else if (call.name === 'grepSearch') {
                        result = await handlers.grepSearch(call.args.pattern as string);
                        onActivity({ type: 'terminal', message: `Arama sonucu: ${result.substring(0, 50)}...`, timestamp: Date.now() });
                    } else if (call.name === 'searchFiles') {
                        result = await handlers.searchFiles(call.args.pattern as string);
                        onActivity({ type: 'terminal', message: `Dosya arama sonucu: ${result.substring(0, 50)}...`, timestamp: Date.now() });
                    } else if (call.name === 'readFileChunk') {
                        result = await handlers.readFileChunk(call.args.path as string, call.args.startLine as number, call.args.endLine as number);
                        onActivity({ type: 'file', message: `Dosya bölümü okundu: ${call.args.path}...`, timestamp: Date.now() });
                    } else if (call.name === 'dependencyCheck') {
                        result = await handlers.dependencyCheck();
                        onActivity({ type: 'terminal', message: `Bağımlılık kontrolü: ${result.substring(0, 50)}...`, timestamp: Date.now() });
                    } else if (call.name === 'testRunner') {
                        result = await handlers.testRunner();
                        onActivity({ type: 'terminal', message: `Test sonucu: ${result.substring(0, 50)}...`, timestamp: Date.now() });
                    } else if (call.name === 'runTerminalCommand') {
                        result = await handlers.runCommand(call.args.command as string);
                        onActivity({ type: 'terminal', message: `Komut çalıştırıldı. Sonuç: ${result ? result.substring(0, 50) : 'Yok'}...`, timestamp: Date.now() });
                    } else if (call.name === 'runDiagnostic') {
                        result = await handlers.runDiagnostic();
                        onActivity({ type: 'terminal', message: `Tanılama sonucu: ${result.substring(0, 50)}...`, timestamp: Date.now() });
                    } else if (call.name === 'fetchGithubRepo') {
                        result = await handlers.fetchGithubRepo(call.args.repoUrl as string, providerKeys['github']);
                        onActivity({ type: 'web', message: `GitHub deposu çekildi: ${call.args.repoUrl}`, timestamp: Date.now() });
                    } else if (call.name === 'readGithubFile') {
                        result = await handlers.readGithubFile(call.args.url as string, providerKeys['github']);
                        onActivity({ type: 'web', message: `GitHub dosyası okundu: ${call.args.url}`, timestamp: Date.now() });
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
        // Eğer çok fazla araç çağrısı yapıldıysa, AI'yı özetlemeye zorla
        if (loopCount >= 3) {
            currentPrompt += `\n\nUYARI: Çok fazla araç çağrısı yaptın ve hala sonuca ulaşamadın. Lütfen şu ana kadar bulduğun bilgileri özetle ve hatanın nedenini açıkla. Artık araç kullanma, sadece çözüm önerisi sun.`;
        } else {
            currentPrompt += `\n\nSenin Cevabın:\n${iterationText}\n\nÇalıştırdığın Araçların Sonuçları:\n${toolResults}\nLütfen bu sonuçları incele. Eğer bir hata varsa düzeltmek için tekrar araçları kullan. Eğer her şey başarılıysa veya işlem tamamlandıysa kullanıcıya son durumu özetle.`;
        }
      } else {
        isDone = true;
      }
    }
    return fullResponse;
  } else if (modelToUse.provider === 'openai' || modelToUse.provider === 'anthropic' || modelToUse.provider === 'xai' || modelToUse.provider === 'custom') {
    // @ts-ignore
    const envApiKey = (typeof process !== 'undefined' && process.env && process.env[`${modelToUse.provider.toUpperCase()}_API_KEY`]) || (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env[`VITE_${modelToUse.provider.toUpperCase()}_API_KEY`]);
    const apiKey = providerKeys[modelToUse.provider] || envApiKey;
    
    if (!apiKey) {
      throw new Error(`Lütfen Ayarlar menüsünden ${modelToUse.provider} için API anahtarınızı girin.`);
    }
    
    const baseUrl = modelToUse.baseUrl || (
      modelToUse.provider === 'xai' ? "https://api.x.ai/v1/chat/completions" : 
      modelToUse.provider === 'anthropic' ? "https://api.anthropic.com/v1/messages" : 
      "https://api.openai.com/v1/chat/completions"
    );
    
    // OpenAI format tools
    const openAITools = [
      {
        type: "function",
        function: {
          name: "editFile",
          description: "Bir dosyanın içeriğini düzenler.",
          parameters: {
            type: "object",
            properties: {
              path: { type: "string", description: "Düzenlenecek dosyanın yolu" },
              content: { type: "string", description: "Dosyanın yeni içeriği" },
            },
            required: ["path", "content"],
          },
        }
      },
      {
        type: "function",
        function: {
          name: "createFile",
          description: "Yeni bir dosya oluşturur.",
          parameters: {
            type: "object",
            properties: {
              path: { type: "string", description: "Oluşturulacak dosyanın yolu" },
              content: { type: "string", description: "Dosyanın içeriği" },
            },
            required: ["path", "content"],
          },
        }
      },
      {
        type: "function",
        function: {
          name: "readMultipleFiles",
          description: "Birden fazla dosyanın içeriğini aynı anda okur.",
          parameters: {
            type: "object",
            properties: {
              paths: {
                type: "array",
                items: { type: "string" },
                description: "Okunacak dosyaların yolları"
              },
            },
            required: ["paths"],
          },
        }
      },
      {
        type: "function",
        function: {
          name: "grepSearch",
          description: "Projeyi belirli bir desen veya kod parçası için arar.",
          parameters: {
            type: "object",
            properties: {
              pattern: { type: "string", description: "Aranacak desen" },
            },
            required: ["pattern"],
          },
        }
      },
      {
        type: "function",
        function: {
          name: "searchFiles",
          description: "Projedeki dosyaları isimlerine göre arar.",
          parameters: {
            type: "object",
            properties: {
              pattern: { type: "string", description: "Aranacak dosya adı veya uzantısı" },
            },
            required: ["pattern"],
          },
        }
      },
      {
        type: "function",
        function: {
          name: "readFileChunk",
          description: "Büyük bir dosyanın sadece belirli satır aralığını okur.",
          parameters: {
            type: "object",
            properties: {
              path: { type: "string", description: "Okunacak dosyanın yolu" },
              startLine: { type: "number", description: "Başlangıç satırı" },
              endLine: { type: "number", description: "Bitiş satırı" },
            },
            required: ["path", "startLine", "endLine"],
          },
        }
      },
      {
        type: "function",
        function: {
          name: "runTerminalCommand",
          description: "Terminalde bir komut çalıştırır.",
          parameters: {
            type: "object",
            properties: {
              command: { type: "string", description: "Çalıştırılacak terminal komutu" },
            },
            required: ["command"],
          },
        }
      },
      {
        type: "function",
        function: {
          name: "runDiagnostic",
          description: "Kod tabanında statik analiz ve linter kontrolleri yaparak olası hataları ve sonsuz döngü risklerini tespit eder.",
          parameters: {
            type: "object",
            properties: {},
          },
        }
      },
      {
        type: "function",
        function: {
          name: "dependencyCheck",
          description: "Projedeki bağımlılıkları kontrol eder.",
          parameters: {
            type: "object",
            properties: {},
          },
        }
      },
      {
        type: "function",
        function: {
          name: "testRunner",
          description: "Projedeki testleri çalıştırır.",
          parameters: {
            type: "object",
            properties: {},
          },
        }
      },
      {
        type: "function",
        function: {
          name: "fetchGithubRepo",
          description: "Belirtilen GitHub deposunu (repository) çeker ve çalışma alanına aktarır.",
          parameters: {
            type: "object",
            properties: {
              repoUrl: { type: "string", description: "GitHub depo URL'si (örn: https://github.com/kullanici/repo)" },
            },
            required: ["repoUrl"],
          },
        }
      },
      {
        type: "function",
        function: {
          name: "readGithubFile",
          description: "Çalışma alanına aktarılan bir GitHub deposundaki belirli bir dosyanın içeriğini okur.",
          parameters: {
            type: "object",
            properties: {
              url: { type: "string", description: "Okunacak dosyanın raw GitHub URL'si" },
            },
            required: ["url"],
          },
        }
      }
    ];

    let currentMessages: any[] = [
      { role: "system", content: systemInst },
      { role: "user", content: promptContext }
    ];
    
    let fullResponse = "";
    let isDone = false;
    let loopCount = 0;
    const MAX_LOOPS = 10;

    while (!isDone && loopCount < MAX_LOOPS) {
      loopCount++;
      onActivity({ type: 'thought', message: loopCount === 1 ? 'İsteği analiz ediyorum...' : `İşlem devam ediyor (Adım ${loopCount})...`, timestamp: Date.now() });

      const requestBody: any = {
        model: modelToUse.id,
        messages: currentMessages,
      };

      // Sadece OpenAI uyumlu API'ler için tool ekle
      if (modelToUse.provider !== 'anthropic') {
        requestBody.tools = openAITools;
        requestBody.tool_choice = "auto";
      }

      const response = await fetch(baseUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${apiKey}`,
          ...(modelToUse.provider === 'anthropic' ? { "x-api-key": apiKey, "anthropic-version": "2023-06-01" } : {})
        },
        body: JSON.stringify(requestBody)
      });
      
      if (!response.ok) {
        throw new Error(`API Hatası: ${response.status}`);
      }
      
      const data = await response.json();
      console.log("API Yanıtı:", data);
      
      if (modelToUse.provider === 'anthropic') {
        // Anthropic response handling (simplified for now, tools not fully supported in this basic fetch)
        const text = data.content?.[0]?.text || "";
        fullResponse += text;
        onChunk(text);
        isDone = true;
      } else {
        // OpenAI format response handling
        const message = data.choices[0].message;
        
        if (message.tool_calls && message.tool_calls.length > 0) {
          currentMessages.push(message);
          isDone = false; // Döngü devam etmeli
          
          for (const toolCall of message.tool_calls) {
            
            let result = "";
            try {
              const args = JSON.parse(toolCall.function.arguments);
              
              if (toolCall.function.name === 'editFile') {
                  onActivity({ type: 'file', message: `Dosya düzenleniyor: ${args.path}`, timestamp: Date.now() });
                  handlers.editFile(args.path, args.content);
                  result = "Dosya başarıyla düzenlendi.";
              } else if (toolCall.function.name === 'createFile') {
                  onActivity({ type: 'file', message: `Dosya oluşturuluyor: ${args.path}`, timestamp: Date.now() });
                  handlers.createFile(args.path, args.content);
                  result = "Dosya başarıyla oluşturuldu.";
              } else if (toolCall.function.name === 'readMultipleFiles') {
                  result = await handlers.readMultipleFiles(args.paths);
                  onActivity({ type: 'file', message: `Dosyalar okundu: ${result.substring(0, 50)}...`, timestamp: Date.now() });
              } else if (toolCall.function.name === 'grepSearch') {
                  onActivity({ type: 'terminal', message: `Dosyalar analiz ediliyor: ${args.pattern}`, timestamp: Date.now() });
                  result = await handlers.grepSearch(args.pattern);
                  onActivity({ type: 'terminal', message: `Arama sonucu: ${result.substring(0, 50)}...`, timestamp: Date.now() });
              } else if (toolCall.function.name === 'searchFiles') {
                  onActivity({ type: 'terminal', message: `Dosyalar aranıyor: ${args.pattern}`, timestamp: Date.now() });
                  result = await handlers.searchFiles(args.pattern);
                  onActivity({ type: 'terminal', message: `Dosya arama sonucu: ${result.substring(0, 50)}...`, timestamp: Date.now() });
              } else if (toolCall.function.name === 'readFileChunk') {
                  onActivity({ type: 'file', message: `Dosya bölümü okunuyor: ${args.path}`, timestamp: Date.now() });
                  result = await handlers.readFileChunk(args.path, args.startLine, args.endLine);
                  onActivity({ type: 'file', message: `Dosya bölümü okundu: ${args.path}...`, timestamp: Date.now() });
              } else if (toolCall.function.name === 'dependencyCheck') {
                  onActivity({ type: 'terminal', message: `Bağımlılık kontrolü yapılıyor...`, timestamp: Date.now() });
                  result = await handlers.dependencyCheck();
                  onActivity({ type: 'terminal', message: `Bağımlılık kontrolü: ${result.substring(0, 50)}...`, timestamp: Date.now() });
              } else if (toolCall.function.name === 'testRunner') {
                  onActivity({ type: 'terminal', message: `Testler çalıştırılıyor...`, timestamp: Date.now() });
                  result = await handlers.testRunner();
                  onActivity({ type: 'terminal', message: `Test sonucu: ${result.substring(0, 50)}...`, timestamp: Date.now() });
              } else if (toolCall.function.name === 'runTerminalCommand') {
                  result = await handlers.runCommand(args.command);
                  onActivity({ type: 'terminal', message: `Komut çalıştırıldı. Sonuç: ${result ? result.substring(0, 50) : 'Yok'}...`, timestamp: Date.now() });
              } else if (toolCall.function.name === 'runDiagnostic') {
                  onActivity({ type: 'terminal', message: `Tanılama çalıştırılıyor...`, timestamp: Date.now() });
                  result = await handlers.runDiagnostic();
                  onActivity({ type: 'terminal', message: `Tanılama sonucu: ${result.substring(0, 50)}...`, timestamp: Date.now() });
              } else if (toolCall.function.name === 'fetchGithubRepo') {
                  onActivity({ type: 'web', message: `GitHub deposu çekiliyor: ${args.repoUrl}`, timestamp: Date.now() });
                  result = await handlers.fetchGithubRepo(args.repoUrl, providerKeys['github']);
                  onActivity({ type: 'web', message: `GitHub deposu çekildi: ${args.repoUrl}`, timestamp: Date.now() });
              } else if (toolCall.function.name === 'readGithubFile') {
                  onActivity({ type: 'web', message: `GitHub dosyası okunuyor: ${args.url}`, timestamp: Date.now() });
                  result = await handlers.readGithubFile(args.url, providerKeys['github']);
                  onActivity({ type: 'web', message: `GitHub dosyası okundu: ${args.url}`, timestamp: Date.now() });
              }
            } catch (err: any) {
              result = `Hata: ${err.message}`;
            }
            
            currentMessages.push({
              role: "tool",
              tool_call_id: toolCall.id,
              name: toolCall.function.name,
              content: result
            });
          }
        } else {
          isDone = true; // Araç yok, iş bitti
          const text = message.content || "";
          fullResponse += text;
          onChunk(text);
        }
      }
    }
    
    return fullResponse;
  }

  throw new Error("Desteklenmeyen model sağlayıcısı.");
}
