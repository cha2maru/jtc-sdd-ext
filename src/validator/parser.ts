import path from 'path';
import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkGfm from 'remark-gfm';
import type { Root, Table, Content, TableCell, ListItem } from 'mdast';
import { DocumentSchemaType, SCHEMAS, TableSchemaType } from './schemas.js';

export interface ExtractedId {
  id: string;
  isDefinition: boolean;
  parentId?: string;
  relatedIds?: string[];
  files?: string[];
  file: string;
  line: number;
  metadata?: Record<string, string>;
}

export interface ParseResult {
  file: string;
  title?: string;
  sectionsFound: string[];
  ids: ExtractedId[];
  errors: string[];
  // セクションごとの詳細データ (CSV出力用)
  detailedSections: {
    heading: string;
    level: number;
    table?: string[][];
    list?: string[];
  }[];
}

export class MarkdownParser {
  private processor = unified().use(remarkParse).use(remarkGfm);

  async parse(fileContent: string, fileName: string): Promise<ParseResult> {
    const tree = this.processor.parse(fileContent) as Root;
    const baseName = path.basename(fileName);
    const schema = SCHEMAS[baseName as keyof typeof SCHEMAS];
    const result: ParseResult = {
      file: fileName,
      sectionsFound: [],
      ids: [],
      errors: [],
      detailedSections: [],
    };

    let activeSchemaSection: string | null = null;
    let currentSection: string | null = null;

    for (const node of tree.children) {
      // Heading (H1, H2, H3)
      if (node.type === 'heading') {
        const text = this.getTextContent(node);
        console.log(`DEBUG: Heading found: depth=${node.depth}, text="${text}"`);
        if (node.depth === 1) {
          result.title = text;
          // スキーマチェック
          if (schema) {
            const isMatch = schema.title instanceof RegExp ? schema.title.test(text) : text === schema.title;
            if (!isMatch) result.errors.push(`H1タイトルが一致しません: 期待="${String(schema.title)}", 実際="${text}"`);
          }
          // ID抽出
          this.extractIdFromText(text, true, node.position?.start.line || 0, fileName, result);
        } else {
          currentSection = text;
          result.sectionsFound.push(text);
          result.detailedSections.push({ heading: text, level: node.depth });

          // スキーマに定義されているセクション名かチェック
          if (schema) {
            const matchedKey = Object.keys(schema.sections).find(key => 
              text.includes(key) || key.includes(text)
            );
            if (matchedKey) {
              activeSchemaSection = matchedKey;
            } else if (node.depth <= 2) {
              // 同レベル以上の未知のセクションが来たらリセット
              activeSchemaSection = null;
            }
          }
        }
      }

      // Table
      if (node.type === 'table') {
        const rows = node.children.map(row => row.children.map(cell => this.getTextContent(cell).trim()));
        if (result.detailedSections.length > 0) {
          result.detailedSections[result.detailedSections.length - 1]!.table = rows;
        }

        if (activeSchemaSection && schema?.sections[activeSchemaSection]?.table) {
          const tableResult = this.parseTable(node, schema.sections[activeSchemaSection]!.table!, fileName);
          result.ids.push(...tableResult.ids);
          result.errors.push(...tableResult.errors.map(err => `[${currentSection}] ${err}`));
        }
      }

      // List
      if (node.type === 'list') {
        const items = node.children.map(item => this.getTextContent(item).trim());
        if (result.detailedSections.length > 0) {
          result.detailedSections[result.detailedSections.length - 1]!.list = items;
        }

        if (activeSchemaSection && schema?.sections[activeSchemaSection]?.listIds) {
          this.extractIdsFromList(items, fileName, node.position?.start.line || 0, result);
        }
      }
    }

    // 必須セクションチェック
    if (schema) {
      for (const [name, sec] of Object.entries(schema.sections)) {
        if (sec.required !== false && !result.sectionsFound.includes(name)) {
          result.errors.push(`必須セクションが見つかりません: ${name}`);
        }
      }
    }

    return result;
  }

  private extractIdFromText(text: string, isDef: boolean, line: number, file: string, result: ParseResult) {
    const match = text.match(/([A-Z]+-[\d]+(?:-[A-Z0-9]+)?)/);
    if (match && !match[0].includes('XXX') && match[0] !== '[ID]') {
      result.ids.push({ id: match[0], isDefinition: isDef, file, line });
    }
  }

  private extractIdsFromList(items: string[], file: string, line: number, result: ParseResult) {
    for (const item of items) {
      const matches = item.matchAll(/([A-Z]+-[\d]+(?:-[A-Z0-9]+)?)/g);
      for (const m of matches) {
        if (!m[0].includes('XXX') && m[0] !== '[ID]') {
          result.ids.push({ id: m[0], isDefinition: false, file, line });
        }
      }
    }
  }

  private parseTable(node: Table, schema: TableSchemaType, fileName: string) {
    const result = { ids: [] as ExtractedId[], errors: [] as string[] };
    const rows = node.children;
    if (rows.length === 0) return result;

    const headers = rows[0]!.children.map(cell => this.getTextContent(cell).trim());
    console.log(`DEBUG: Table headers: [${headers.join(', ')}]`);
    const idIdx = headers.indexOf(schema.idColumn);
    console.log(`DEBUG: idIdx=${idIdx} for idColumn="${schema.idColumn}"`);
    const parentIdx = schema.parentColumn ? headers.indexOf(schema.parentColumn) : -1;
    const relatedIdx = schema.relatedColumn ? headers.indexOf(schema.relatedColumn) : -1;
    const fileIdx = schema.fileColumn ? headers.indexOf(schema.fileColumn) : -1;

    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      if (!row) continue;
      const cells = row.children;
      const idCell = idIdx !== -1 ? cells[idIdx] : undefined;
      const id = idCell ? this.getTextContent(idCell).trim() : '';
      if (!id || id.includes('XXX') || id === '[ID]' || id === '-') continue;

      const extracted: ExtractedId = {
        id, isDefinition: true, file: fileName, line: node.position?.start.line || 0, metadata: {}
      };

      if (parentIdx !== -1) {
        const cell = cells[parentIdx];
        if (cell) extracted.parentId = this.getTextContent(cell).trim();
      }
      if (relatedIdx !== -1) {
        const cell = cells[relatedIdx];
        if (cell) {
          const rel = this.getTextContent(cell).trim();
          extracted.relatedIds = rel.split(/[, \n]+/).filter(x => x && x !== '-');
        }
      }
      if (fileIdx !== -1) {
        const cell = cells[fileIdx];
        if (cell) {
          const f = this.getTextContent(cell).trim();
          extracted.files = f.split(/[, \n]+/).filter(x => x && x !== '-');
        }
      }

      for (let j = 0; j < headers.length; j++) {
        const cell = cells[j];
        const header = headers[j];
        if (cell && header && extracted.metadata) {
          extracted.metadata[header] = this.getTextContent(cell).trim();
        }
      }
      result.ids.push(extracted);
    }
    return result;
  }

  private getTextContent(node: Content | Root | TableCell | ListItem): string {
    if ('value' in node && typeof node.value === 'string') return node.value;
    if ('children' in node && Array.isArray(node.children)) {
      return node.children.map((c) => this.getTextContent(c as Content)).join('');
    }
    return '';
  }
}

