import { getEmbedding, cosineSimilarity } from './embeddingService';

interface VectorEntry {
  path: string;
  content: string;
  embedding: number[];
}

export class VectorStore {
  private entries: VectorEntry[] = [];

  async indexFile(path: string, content: string) {
    const embedding = await getEmbedding(content);
    this.entries.push({ path, content, embedding });
  }

  async search(query: string, limit: number = 3): Promise<string[]> {
    const queryEmbedding = await getEmbedding(query);
    
    return this.entries
      .map(entry => ({
        path: entry.path,
        similarity: cosineSimilarity(queryEmbedding, entry.embedding)
      }))
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, limit)
      .map(entry => entry.path);
  }
}
