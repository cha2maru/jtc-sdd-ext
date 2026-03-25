import fs from 'fs';
import path from 'path';
import { ParseResult } from './parser.js';

export class TestExporter {
  exportToCsv(results: ParseResult[], outputPath: string): void {
    const csvRows: string[] = [];
    
    // ヘッダー (BOM付き)
    const header = ['種別', 'ドキュメントID', '試験項目ID', '関連ID', '試験項目名', '手順No', '操作手順', '期待される結果', '状態'];
    csvRows.push('\uFEFF' + header.map(h => `"${h}"`).join(','));

    for (const result of results) {
      const type = result.file.includes('acceptance') ? '総合試験' : '結合試験';
      const mainId = result.ids.find(id => id.isDefinition && !id.id.includes('-N-') && !id.id.includes('-S-') && !id.id.includes('-A-'))?.id || '';
      
      // ファイル全体から参照されている設計ID (REQ/SPEC/FUNC) を収集
      const relatedIds = Array.from(new Set(
        result.ids.filter(id => !id.isDefinition && (id.id.startsWith('REQ') || id.id.startsWith('SPEC') || id.id.startsWith('FUNC')))
                  .map(id => id.id)
      )).join(', ');

      // 試験項目一覧のメタデータを取得 (状態や名称の紐付け用)
      const testItemMetaMap = new Map<string, Record<string, string>>();
      for (const extracted of result.ids) {
        if ((extracted.id.includes('-N-') || extracted.id.includes('-S-') || extracted.id.includes('-A-')) && extracted.metadata) {
          testItemMetaMap.set(extracted.id, extracted.metadata);
        }
      }

      // 各セクションを走査して「手順」を抽出
      for (let i = 0; i < result.detailedSections.length; i++) {
        const section = result.detailedSections[i];
        if (!section) continue;
        
        // 結合試験の各項目セクション (例: ## [TEST-001-N-01])
        const itemIdMatch = section.heading.match(/\[(TEST-\d{3,4}-[NSA]-\d{2})\]/);
        if (itemIdMatch) {
          const itemId = itemIdMatch[1];
          if (!itemId) continue;
          const meta = testItemMetaMap.get(itemId) || {};
          const itemName = section.heading.replace(/\[.*\]\s*/, '').trim();

          // 「試験手順と期待結果」の表を探す (直後のセクションまたはその次)
          let stepsTable: string[][] | undefined;
          for (let j = i + 1; j < result.detailedSections.length; j++) {
            const nextSection = result.detailedSections[j];
            if (!nextSection || nextSection.level <= section.level) break; // 次の同等以上の見出しが来たら終了
            if (nextSection.table) {
              stepsTable = nextSection.table;
              break;
            }
          }

          if (stepsTable && stepsTable.length > 1) {
            const headers = stepsTable[0];
            if (!headers) continue;
            const noIdx = headers.findIndex(h => h.includes('No'));
            const stepIdx = headers.findIndex(h => h.includes('手順'));
            const resultIdx = headers.findIndex(h => h.includes('結果'));

            for (let k = 1; k < stepsTable.length; k++) {
              const row = stepsTable[k];
              if (!row) continue;
              csvRows.push([
                type,
                mainId,
                itemId,
                relatedIds,
                itemName,
                row[noIdx] || '',
                row[stepIdx] || '',
                row[resultIdx] || '',
                meta['状態'] || '未実施'
              ].map(this.escapeCsv).join(','));
            }
          }
        }

        // 総合試験のチュートリアル手順 (リスト形式)
        if (type === '総合試験' && (section.heading.includes('手順') || section.heading.includes('チュートリアル'))) {
          if (section.list) {
            section.list.forEach((item, index) => {
              const [step, expected] = item.split(/[ー-]-/).map(s => s.trim());
              csvRows.push([
                type,
                mainId,
                mainId,
                relatedIds,
                result.title || '',
                String(index + 1),
                step || item,
                expected || '',
                '未実施'
              ].map(this.escapeCsv).join(','));
            });
          }
        }
      }
    }

    fs.writeFileSync(outputPath, csvRows.join('\n'), 'utf-8');
  }

  private escapeCsv(value: string): string {
    const str = String(value).replace(/"/g, '""');
    return `"${str}"`;
  }
}
