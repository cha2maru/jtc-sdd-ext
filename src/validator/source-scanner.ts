import fs from 'fs';
import path from 'path';
import { ExtractedId } from './parser.js';

export class SourceScanner {
  private readonly idRegex = /\[([A-Z]+-[A-Z0-9]+(?:-[A-Z0-9-]+)*)\]/;
  private readonly tagRegex = /@([a-z]+)\s+\[([A-Z]+-[A-Z0-9]+(?:-[A-Z0-9-]+)*)\]/;
  private readonly extensions = ['.ts', '.js', '.tsx', '.jsx', '.py', '.go', '.rs', '.java', '.cpp', '.h', '.cs'];

  // 言語ごとの「実態」を示す予約語
  private readonly keywords: Record<string, string[]> = {
    logic: ['function', 'async', 'const', 'class', 'def', 'fn', 'public', 'private', 'static', 'if', 'switch', 'for', 'while', 'return', 'let', 'var'],
    data: ['interface', 'type', 'class', 'struct', 'const', 'let', 'var', 'public', 'private', 'readonly', 'static', ':'],
    unit: ['class', 'module', 'export', 'package', 'function', 'async'],
  };

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
      if (!line || !line.trim()) continue;
      
      // 1. タグ付き形式のチェック (@logic [ID] ...)
      const tagMatch = line.match(this.tagRegex);
      if (tagMatch) {
        const tag = tagMatch[1];
        const id = tagMatch[2];
        if (id && !id.includes('XXX')) {
          // 次の実態のある行を探す (空行、コメント行をスキップ)
          let nextMeaningfulLine = '';
          for (let j = i + 1; j < lines.length; j++) {
            const next = (lines[j] || '').trim();
            if (next && !next.startsWith('//') && !next.startsWith('/*') && !next.startsWith('*')) {
              nextMeaningfulLine = next;
              break;
            }
          }

          const isValidPosition = this.validateTagPosition(tag || '', nextMeaningfulLine);
          results.push({
            id,
            isDefinition: false,
            file: filePath,
            line: i + 1,
            metadata: {
              context: 'source_code',
              line_content: line.trim(),
              tag: tag || '',
              is_valid_position: String(isValidPosition)
            }
          });
          continue;
        }
      }

      // 2. 従来のブラケット形式のチェック ([ID])
      const matches = line.matchAll(new RegExp(this.idRegex, 'g'));
      for (const match of matches) {
        const id = match[1];
        if (id && !id.includes('XXX')) {
          results.push({
            id,
            isDefinition: false,
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

  private validateTagPosition(tag: string, nextLine: string): boolean {
    if (!nextLine) return false;
    const keys = this.keywords[tag];
    if (!keys) return true; // 未定義タグは検証スキップ
    return keys.some(k => nextLine.includes(k));
  }
}
