import fs from 'fs';
import path from 'path';
import { ParseResult, ExtractedId } from './parser.js';
import { ID_PATTERNS } from './schemas.js';

export interface ValidationIssue {
  file: string;
  line?: number;
  id?: string;
  message: string;
  severity: 'error' | 'warning';
}

export class ProjectValidator {
  private allDefinitions = new Map<string, ExtractedId>();
  private allReferences: ExtractedId[] = [];
  private issues: ValidationIssue[] = [];

  validate(parseResults: ParseResult[], projectDir: string): ValidationIssue[] {
    this.issues = [];
    this.allDefinitions.clear();
    this.allReferences = [];

    // 1. 全IDの収集 (定義と参照を区別)
    for (const result of parseResults) {
      for (const err of result.errors) {
        this.issues.push({
          file: result.file,
          message: err,
          severity: 'error',
        });
      }

      for (const extracted of result.ids) {
        // ID形式チェック
        this.validateIdFormat(extracted);

        if (extracted.isDefinition) {
          if (this.allDefinitions.has(extracted.id)) {
            this.issues.push({
              file: extracted.file,
              line: extracted.line,
              id: extracted.id,
              message: `IDが重複定義されています: ${extracted.id} (以前の定義: ${this.allDefinitions.get(extracted.id)?.file})`,
              severity: 'error',
            });
          } else {
            this.allDefinitions.set(extracted.id, extracted);
          }

          // 物理ファイルの実在チェック (COMP用)
          if (extracted.files) {
            for (const filePath of extracted.files) {
              const fullPath = path.resolve(projectDir, filePath);
              if (!fs.existsSync(fullPath)) {
                this.issues.push({
                  file: extracted.file,
                  line: extracted.line,
                  id: extracted.id,
                  message: `構成ファイルが見つかりません: ${filePath}`,
                  severity: 'error',
                });
              }
            }
          }
        } else {
          this.allReferences.push(extracted);
        }
      }
    }

    // 2. 参照の整合性チェック
    for (const ref of this.allReferences) {
      if (!this.allDefinitions.has(ref.id)) {
        this.issues.push({
          file: ref.file,
          line: ref.line,
          id: ref.id,
          message: `参照されているIDが見つかりません: ${ref.id}`,
          severity: 'error',
        });
      }
    }

    // 3. 依存関係（親子、関連）のチェック
    for (const def of this.allDefinitions.values()) {
      if (def.parentId) {
        if (!this.allDefinitions.has(def.parentId)) {
          this.issues.push({
            file: def.file,
            line: def.line,
            id: def.id,
            message: `親IDが見つかりません: ${def.parentId}`,
            severity: 'error',
          });
        }
      }

      if (def.relatedIds) {
        for (const relatedId of def.relatedIds) {
          if (!this.allDefinitions.has(relatedId)) {
            this.issues.push({
              file: def.file,
              line: def.line,
              id: def.id,
              message: `関連IDが見つかりません: ${relatedId}`,
              severity: 'error',
            });
          }
        }
      }
    }

    // 4. 網羅性チェック
    this.checkCoverage();

    return this.issues;
  }

  private validateIdFormat(extracted: ExtractedId) {
    let matched = false;
    for (const [type, pattern] of Object.entries(ID_PATTERNS)) {
      if (extracted.id.startsWith(type)) {
        matched = true;
        if (!pattern.test(extracted.id)) {
          this.issues.push({
            file: extracted.file,
            line: extracted.line,
            id: extracted.id,
            message: `IDの形式が不正です: ${extracted.id} (期待形式: ${type}-XXX)`,
            severity: 'error',
          });
        }
        break;
      }
    }
    if (!matched) {
      this.issues.push({
        file: extracted.file,
        line: extracted.line,
        id: extracted.id,
        message: `不明なID種別です: ${extracted.id}`,
        severity: 'warning',
      });
    }
  }

  private checkCoverage() {
    const parentToChildren = new Map<string, string[]>();
    const idReferencedBy = new Map<string, Set<string>>(); // TargetID -> Set of Files referencing it

    // 依存関係と参照関係の整理
    for (const def of this.allDefinitions.values()) {
      if (def.parentId) {
        const children = parentToChildren.get(def.parentId) ?? [];
        children.push(def.id);
        parentToChildren.set(def.parentId, children);
      }
    }

    for (const ref of this.allReferences) {
      const refs = idReferencedBy.get(ref.id) ?? new Set<string>();
      refs.add(ref.file);
      idReferencedBy.set(ref.id, refs);
    }

    // 網羅性チェック
    for (const [id, def] of this.allDefinitions.entries()) {
      // 1. REQ -> SPEC の展開チェック (設計網羅性)
      if (id.startsWith('REQ') && !parentToChildren.has(id)) {
        this.issues.push({
          file: def.file,
          line: def.line,
          id: id,
          message: `要求(REQ)が詳細要件(SPEC)に展開されていません。`,
          severity: 'warning',
        });
      }

      // 2. REQ -> ACC の紐付けチェック (要求テスト網羅性)
      if (id.startsWith('REQ')) {
        const referencingFiles = idReferencedBy.get(id) ?? new Set<string>();
        const hasAcceptanceTest = Array.from(referencingFiles).some(file => 
          file.toLowerCase().includes('acceptance') || 
          file.split(/[\\\/]/).pop()?.startsWith('ACC-')
        );
        if (!hasAcceptanceTest) {
          this.issues.push({
            file: def.file,
            line: def.line,
            id: id,
            message: `要求(REQ)に対応する総合試験(ACC)が定義されていません。`,
            severity: 'warning',
          });
        }
      }

      // 3. SPEC -> TEST の紐付けチェック (要件テスト網羅性)
      if (id.startsWith('SPEC')) {
        const referencingFiles = idReferencedBy.get(id) ?? new Set<string>();
        const hasIntegrationTest = Array.from(referencingFiles).some(file => 
          file.toLowerCase().includes('integration') || 
          file.split(/[\\\/]/).pop()?.startsWith('TEST-')
        );
        if (!hasIntegrationTest) {
          this.issues.push({
            file: def.file,
            line: def.line,
            id: id,
            message: `要件(SPEC)に対応する結合試験(TEST)が定義されていません。`,
            severity: 'warning',
          });
        }
      }
    }
  }
}
