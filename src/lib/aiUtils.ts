import { toast } from 'sonner';

export async function withRetry<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  initialDelay: number = 1000
): Promise<T> {
  let lastError: any;
  
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error: any) {
      lastError = error;
      
      // Check if it's a rate limit error (429)
      const isRateLimit = error.message?.includes('429') || 
                          error.message?.toLowerCase().includes('rate limit') ||
                          error.message?.toLowerCase().includes('quota');
      
      if (isRateLimit) {
        const delay = initialDelay * Math.pow(2, attempt);
        console.warn(`AI Rate Limit hit. Retrying in ${delay}ms... (Attempt ${attempt + 1}/${maxRetries})`);
        
        if (attempt === 0) {
          toast.error("AI kullanım sınırı aşıldı. Otomatik olarak tekrar deneniyor...", {
            duration: 3000
          });
        }
        
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }
      
      // If it's not a rate limit error, throw immediately or handle other specific errors
      throw error;
    }
  }
  
  throw lastError;
}

export const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));
