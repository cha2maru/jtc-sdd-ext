import fs from 'fs';
import path from 'path';
import { ExtractedId, ParseResult } from './parser.js';
import { ValidationIssue } from './validator.js';

export class DependencyExtractor {
  extractMap(parseResults: ParseResult[], sourceIds: ExtractedId[], projectDir: string, issues: ValidationIssue[] = []) {
    const docIds = new Map<string, ExtractedId>();
    for (const result of parseResults) {
      // 生成されたレポート自体をソースにしないようにガード
      if (result.file.includes('traceability-report')) continue;

      for (const id of result.ids) {
        if (id.isDefinition) {
          const existing = docIds.get(id.id);
          // メタデータを持っている定義を優先する
          const newMetaCount = Object.keys(id.metadata || {}).length;
          const oldMetaCount = existing ? Object.keys(existing.metadata || {}).length : -1;
          
          if (!existing || newMetaCount > oldMetaCount) {
            docIds.set(id.id, id);
          }
        }
      }
    }

    const sourceRefs = new Map<string, ExtractedId[]>();
    for (const sid of sourceIds) {
      const refs = sourceRefs.get(sid.id) ?? [];
      refs.push(sid);
      sourceRefs.set(sid.id, refs);
    }

    const resolvedProjectDir = path.resolve(process.cwd(), projectDir);

    // 1. 全ての情報を統合したフラットなリストを作成
    const allItems = new Map<string, any>();
    for (const [id, def] of docIds.entries()) {
      const refs = sourceRefs.get(id) || [];
      allItems.set(id, {
        id,
        type: this.getIdType(id),
        document: path.relative(resolvedProjectDir, def.file),
        line: def.line,
        implemented: refs.length > 0,
        parentId: def.parentId,
        relatedIds: def.relatedIds || [],
        metadata: def.metadata || {},
        sources: refs.map(r => ({
          file: path.relative(resolvedProjectDir, r.file),
          line: r.line,
          context: r.metadata?.line_content
        }))
      });
    }

    // 2. 構造化データの生成
    return {
      logicView: this.buildLogicView(allItems),
      physicalView: this.buildPhysicalView(allItems),
      orphans: this.findOrphans(docIds, sourceRefs, resolvedProjectDir),
      issues: issues.map(i => ({
        ...i,
        file: path.relative(resolvedProjectDir, i.file)
      }))
    };
  }

  private buildLogicView(allItems: Map<string, any>) {
    const view: any[] = [];
    const reqs = Array.from(allItems.values()).filter(item => item.type === 'Requirement');

    for (const req of reqs) {
      const specs = Array.from(allItems.values()).filter(item => 
        item.type === 'Specification' && (item.parentId === req.id || item.id.startsWith(req.id.replace('REQ-', 'SPEC-')))
      );

      if (specs.length === 0) {
        view.push({ req, spec: null, func: null });
      } else {
        for (const spec of specs) {
          const funcs = Array.from(allItems.values()).filter(item => 
            item.type === 'Function' && (item.parentId === spec.id || item.id.startsWith(spec.id.replace('SPEC-', 'FUNC-')) || spec.relatedIds?.includes(item.id))
          );

          if (funcs.length === 0) {
            view.push({ req, spec, func: null });
          } else {
            for (const func of funcs) {
              view.push({ req, spec, func });
            }
          }
        }
      }
    }
    return view;
  }

  private buildPhysicalView(allItems: Map<string, any>) {
    const view: any[] = [];
    const comps = Array.from(allItems.values()).filter(item => item.type === 'Component');

    for (const comp of comps) {
      const units = Array.from(allItems.values()).filter(item => 
        item.type === 'Unit' && (comp.relatedIds?.includes(item.id) || item.id.startsWith(comp.id.replace('COMP-', 'UNIT-')))
      );

      if (units.length === 0) {
        // COMPに紐づくFUNCを直接探す
        const directFuncs = Array.from(allItems.values()).filter(item => 
          item.type === 'Function' && comp.relatedIds?.includes(item.id)
        );
        if (directFuncs.length === 0) {
          view.push({ comp, unit: null, func: null });
        } else {
          for (const func of directFuncs) {
            view.push({ comp, unit: null, func });
          }
        }
      } else {
        for (const unit of units) {
          const funcs = Array.from(allItems.values()).filter(item => 
            item.type === 'Function' && (unit.relatedIds?.includes(item.id) || item.id.startsWith(unit.id.replace('UNIT-', 'FUNC-')))
          );

          if (funcs.length === 0) {
            view.push({ comp, unit, func: null });
          } else {
            for (const func of funcs) {
              view.push({ comp, unit, func });
            }
          }
        }
      }
    }
    return view;
  }

  private findOrphans(docIds: Map<string, ExtractedId>, sourceRefs: Map<string, ExtractedId[]>, resolvedProjectDir: string) {
    const orphanSourceIds = Array.from(sourceRefs.keys()).filter(id => !docIds.has(id));
    return orphanSourceIds.map(id => ({
      id,
      type: this.getIdType(id),
      implemented: true,
      sources: sourceRefs.get(id)?.map(r => ({
        file: path.relative(resolvedProjectDir, r.file),
        line: r.line,
        context: r.metadata?.line_content
      }))
    }));
  }

  private getIdType(id: string): string {
    if (id.startsWith('REQ-')) return 'Requirement';
    if (id.startsWith('SPEC-')) return 'Specification';
    if (id.startsWith('FUNC-')) return 'Function';
    if (id.startsWith('DATA-')) return 'Data';
    if (id.startsWith('UNIT-')) return 'Unit';
    if (id.startsWith('COMP-')) return 'Component';
    return 'Unknown';
  }

  saveAsJson(data: any, outputPath: string) {
    fs.writeFileSync(outputPath, JSON.stringify(data, null, 2), 'utf-8');
  }

  saveAsMarkdown(data: any, outputPath: string) {
    let md = '# 設計・実装トレーサビリティ報告書\n\n';

    md += '## 1. 論理トレーサビリティ (要求 → 仕様 → 機能)\n';
    md += '要求がどのように詳細化され、ソースコードで実装されているかを確認します。\n\n';
    md += '| 要求 (REQ) | 詳細要件 (SPEC) | 実装機能 (FUNC) | 実装状況 | ソース箇所 |\n';
    md += '| :--- | :--- | :--- | :--- | :--- |\n';

    for (const row of data.logicView) {
      const reqDisp = `**${row.req.id}**`;
      const specDisp = row.spec ? row.spec.id : '-';
      const funcDisp = row.func ? row.func.id : '-';
      const status = row.func ? (row.func.implemented ? '✅' : '❌') : (row.spec?.implemented ? '✅' : '❌');
      const source = row.func ? this.formatSources(row.func.sources) : (row.spec ? this.formatSources(row.spec.sources) : '-');

      md += `| ${reqDisp} | ${specDisp} | ${funcDisp} | ${status} | ${source} |\n`;
    }

    md += '\n## 2. 物理トレーサビリティ (コンポーネント → ユニット → 機能)\n';
    md += 'システム構成要素（物理パス）に対して、どの機能が配置されているかを確認します。\n\n';
    md += '| コンポーネント (COMP) | ユニット (UNIT) | 機能 (FUNC) | 実装状況 | 物理パス |\n';
    md += '| :--- | :--- | :--- | :--- | :--- |\n';

    for (const row of data.physicalView) {
      const compDisp = `**${row.comp.id}**`;
      const unitDisp = row.unit ? row.unit.id : '-';
      const funcDisp = row.func ? row.func.id : '-';
      const status = row.func ? (row.func.implemented ? '✅' : '❌') : (row.unit?.implemented ? '✅' : '❌');
      
      // 物理パスの決定: UNIT定義のメタデータ(物理パス等)を優先
      let pathDisp = '-';
      if (row.unit) {
        const metadata = row.unit.metadata || {};
        const potentialPath = metadata['物理パス'] || metadata['構成ファイル'] || metadata['物理ユニット'] || metadata['パス'];
        
        if (potentialPath) {
          pathDisp = potentialPath.replace(/`/g, '');
        } else if (row.unit.sources.length > 0) {
          pathDisp = row.unit.sources.map((s: any) => `\`${s.file}\``).join('<br>');
        }
      } else if (row.comp) {
        const metadata = row.comp.metadata || {};
        const potentialPath = metadata['物理パス'] || metadata['構成ファイル'];
        if (potentialPath) {
          pathDisp = potentialPath.replace(/`/g, '');
        }
      }

      md += `| ${compDisp} | ${unitDisp} | ${funcDisp} | ${status} | ${pathDisp} |\n`;
    }

    if (data.orphans.length > 0) {
      md += '\n## 3. 定義不明な実装ID (Orphan IDs)\n';
      md += 'ソースコード内に存在するが、設計ドキュメント側に定義が見当たらないIDです。\n\n';
      md += '| ID | 種別 | ソース箇所 | コンテキスト |\n';
      md += '| :--- | :--- | :--- | :--- |\n';
      for (const item of data.orphans) {
        for (const s of item.sources) {
          md += `| ${item.id} | ${item.type} | \`${s.file}:${s.line}\` | \`${s.context}\` |\n`;
        }
      }
    }

    if (data.issues && data.issues.length > 0) {
      md += '\n## 4. 設計不整合・指摘事項 (Validation Issues)\n';
      md += '自動バリデーションによって検出された不整合です。優先的に修正してください。\n\n';
      md += '| 判定 | 対象ファイル | 場所 | ID | 指摘内容 |\n';
      md += '| :--- | :--- | :--- | :--- | :--- |\n';
      
      // エラーを優先して表示
      const sortedIssues = [...data.issues].sort((a: any, b: any) => a.severity === 'error' ? -1 : 1);
      
      for (const issue of sortedIssues) {
        const severity = issue.severity === 'error' ? '🔴 致命的' : '🟡 警告';
        const line = issue.line ? `L${issue.line}` : '-';
        const id = issue.id || '-';
        md += `| ${severity} | \`${issue.file}\` | ${line} | ${id} | ${issue.message} |\n`;
      }
    }

    fs.writeFileSync(outputPath, md, 'utf-8');
  }

  private formatSources(sources: any[]) {
    if (!sources || sources.length === 0) return '-';
    return sources.map(s => `\`${s.file}:${s.line}\``).join('<br>');
  }
}
