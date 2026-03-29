export class VectorStore {
  private documents: Map<string, string> = new Map();

  clear() {
    this.documents.clear();
  }

  async indexFile(path: string, content: string) {
    this.documents.set(path, content.toLowerCase());
  }

  async search(query: string, limit: number = 5): Promise<string[]> {
    const q = query.toLowerCase();
    const terms = q.split(/\s+/).filter(t => t.length > 1);
    
    if (terms.length === 0) return [];

    const scores = new Map<string, number>();

    for (const [path, content] of this.documents.entries()) {
      let score = 0;
      
      // Path match is highly relevant
      for (const term of terms) {
        if (path.toLowerCase().includes(term)) {
          score += 10;
        }
      }

      // Content match
      for (const term of terms) {
        try {
          const escapedTerm = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
          const regex = new RegExp(escapedTerm, 'g');
          const matches = content.match(regex);
          if (matches) {
            score += matches.length;
          }
        } catch (e) {
          // Ignore invalid regex
        }
      }

      if (score > 0) {
        scores.set(path, score);
      }
    }

    return Array.from(scores.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, limit)
      .map(entry => entry[0]);
  }
}
