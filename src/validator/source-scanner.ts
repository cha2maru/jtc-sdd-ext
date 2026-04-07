import fs from 'fs';
import path from 'path';
import { ExtractedId } from './parser.js';

export class SourceScanner {
  private readonly idRegex = /\[([A-Z]+-[A-Z0-9]+(?:-[A-Z0-9-]+)*)\]/g;
  private readonly extensions = ['.ts', '.js', '.tsx', '.jsx', '.py', '.go', '.rs', '.java', '.cpp', '.h', '.cs'];

  async scan(dirPath: string): Promise<ExtractedId[]> {
    const results: ExtractedId[] = [];
    await this.scanDir(dirPath, results);
    return results;
  }

  private async scanDir(dirPath: string, results: ExtractedId[]): Promise<void> {
    if (!fs.existsSync(dirPath)) return;
    
    const entries = fs.readdirSync(dirPath, { withFileTypes: true });
    
    for (const entry of entries) {
      const fullPath = path.join(dirPath, entry.name);
      
      if (entry.isDirectory()) {
        if (entry.name === 'node_modules' || entry.name === '.git' || entry.name === 'dist') continue;
        await this.scanDir(fullPath, results);
      } else if (entry.isFile()) {
        if (this.extensions.includes(path.extname(entry.name))) {
          await this.scanFile(fullPath, results);
        }
      }
    }
  }

  private async scanFile(filePath: string, results: ExtractedId[]): Promise<void> {
    const content = fs.readFileSync(filePath, 'utf-8');
    const lines = content.split('\n');
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (!line) continue;
      
      const matches = line.matchAll(this.idRegex);
      for (const match of matches) {
        const id = match[1];
        if (id && !id.includes('XXX')) {
          results.push({
            id,
            isDefinition: false, // ソースコード内は「参照/実装」扱い
            file: filePath,
            line: i + 1,
            metadata: {
              context: 'source_code',
              line_content: line.trim()
            }
          });
        }
      }
    }
  }
}
