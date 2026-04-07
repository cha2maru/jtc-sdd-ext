import fs from 'fs';
import path from 'path';
import { ParseResult, ExtractedId } from './parser.js';
import { ID_PATTERNS } from './schemas.js';

export interface ValidationIssue {
  file: string;
  line?: number | undefined;
  id?: string;
  message: string;
  severity: 'error' | 'warning';
}

export class ProjectValidator {
  private allDefinitions = new Map<string, ExtractedId>();
  private allReferences: ExtractedId[] = [];
  private issues: ValidationIssue[] = [];

  validate(parseResults: ParseResult[], projectDir: string, sourceIds: ExtractedId[] = []): ValidationIssue[] {
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
          const existing = this.allDefinitions.get(extracted.id);
          if (existing) {
            // 重複チェックの緩和ルール
            const isExistingIndex = existing.file.endsWith('requirements.md');
            const isNewIndex = extracted.file.endsWith('requirements.md');
            const isSameFile = existing.file === extracted.file;
            
            if (isSameFile) {
              // 同一ファイル内での重複（見出しと表など）は許可し、情報を統合
              const existingMetaCount = Object.keys(existing.metadata || {}).length;
              const newMetaCount = Object.keys(extracted.metadata || {}).length;
              if (newMetaCount > existingMetaCount) {
                this.allDefinitions.set(extracted.id, extracted);
              }
              continue;
            } else if (isExistingIndex && !isNewIndex) {
              // 一覧(requirements.md)から詳細(specs/)への上書きは許可
              this.allDefinitions.set(extracted.id, extracted);
            } else if (!isExistingIndex && isNewIndex) {
              // 詳細が既にある場合の一覧での定義はスキップ（エラーにしない）
              continue;
            } else {
              // それ以外の重複（詳細同士など）はエラー
              this.issues.push({
                file: extracted.file,
                line: extracted.line,
                id: extracted.id,
                message: `IDが重複定義されています: ${extracted.id} (以前の定義: ${existing.file})`,
                severity: 'error',
              });
            }
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

    // 1.1 ソースコードからのIDも参照リストに追加
    for (const sourceId of sourceIds) {
      this.allReferences.push(sourceId);
    }

    // 2. 参照の整合性チェック
    for (const ref of this.allReferences) {
      if (!this.allDefinitions.has(ref.id)) {
        // ソースコードからの参照の場合はメッセージを変える
        const isSource = ref.metadata?.context === 'source_code';
        this.issues.push({
          file: ref.file,
          line: ref.line,
          id: ref.id,
          message: isSource 
            ? `ソースコード内に定義不明なIDが見つかりました: ${ref.id}` 
            : `参照されているIDが見つかりません: ${ref.id}`,
          severity: isSource ? 'warning' : 'error', // ソースコード内は警告に留める
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

    // 5. 分割密度チェック (REQ < SPEC < FUNC)
    this.checkDecompositionDensity();

    // 6. 実装網羅性チェック (All FUNCs assigned to COMPs)
    this.checkImplementationCoverage(sourceIds);

    // 8. ソースコード実装網羅性チェック
    if (sourceIds.length > 0) {
      this.checkSourceImplementation(sourceIds);
    }

    return this.issues;
  }

  private checkSourceImplementation(sourceIds: ExtractedId[]) {
    const implementedFuncIds = new Set(
      sourceIds
        .filter(s => s.id.startsWith('FUNC-'))
        .map(s => s.id)
    );

    const allFuncIds = Array.from(this.allDefinitions.keys())
      .filter(id => id.startsWith('FUNC-'));

    for (const funcId of allFuncIds) {
      if (!implementedFuncIds.has(funcId)) {
        const def = this.allDefinitions.get(funcId);
        this.issues.push({
          file: def?.file || 'requirements.md',
          line: def?.line,
          id: funcId,
          message: `機能(FUNC)がソースコード内に実装（IDコメント）されていません。`,
          severity: 'warning',
        });
      }
    }

    // UNITのチェック
    const implementedUnitIds = new Set(
      sourceIds
        .filter(s => s.id.startsWith('UNIT-'))
        .map(s => s.id)
    );

    const allUnitIds = Array.from(this.allDefinitions.keys())
      .filter(id => id.startsWith('UNIT-'));

    for (const unitId of allUnitIds) {
      if (!implementedUnitIds.has(unitId)) {
        const def = this.allDefinitions.get(unitId);
        this.issues.push({
          file: def?.file || 'architecture.md',
          line: def?.line,
          id: unitId,
          message: `ユニット(UNIT)がソースコード内に定義（IDコメント）されていません。`,
          severity: 'warning',
        });
      }
    }
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
    const idReferencedBy = new Map<string, Set<string>>();

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

    for (const [id, def] of this.allDefinitions.entries()) {
      if (id.startsWith('REQ') && !parentToChildren.has(id)) {
        this.issues.push({
          file: def.file,
          line: def.line,
          id: id,
          message: `要求(REQ)が詳細要件(SPEC)に展開されていません。`,
          severity: 'warning',
        });
      }

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

  private checkDecompositionDensity() {
    let reqCount = 0;
    let specCount = 0;
    let funcCount = 0;

    for (const id of this.allDefinitions.keys()) {
      if (id.startsWith('REQ-')) reqCount++;
      else if (id.startsWith('SPEC-')) specCount++;
      else if (id.startsWith('FUNC-')) funcCount++;
    }

    if (reqCount > 0 && specCount > 0 && reqCount >= specCount) {
      this.issues.push({
        file: 'requirements.md',
        message: `要求(REQ: ${reqCount})に対し詳細要件(SPEC: ${specCount})の数が不足しています。十分な詳細化が行われていません。`,
        severity: 'warning',
      });
    }

    if (specCount > 0 && funcCount > 0 && specCount >= funcCount) {
      this.issues.push({
        file: 'requirements.md',
        message: `詳細要件(SPEC: ${specCount})に対し機能定義(FUNC: ${funcCount})の数が不足しています。実装に向けた分解が不十分です。`,
        severity: 'warning',
      });
    }
  }

  private checkImplementationCoverage(sourceIds: ExtractedId[] = []) {
    const allFuncIds = Array.from(this.allDefinitions.keys()).filter(id => id.startsWith('FUNC-'));
    const assignedFuncIds = new Set<string>();

    const unitToContainedIdsFromSource = new Map<string, Set<string>>();
    const fileToIds = new Map<string, string[]>();
    
    for (const sid of sourceIds) {
      const ids = fileToIds.get(sid.file) || [];
      ids.push(sid.id);
      fileToIds.set(sid.file, ids);
    }

    for (const [file, ids] of fileToIds.entries()) {
      const units = ids.filter(id => id.startsWith('UNIT-'));
      const logicals = ids.filter(id => id.startsWith('FUNC-') || id.startsWith('SPEC-') || id.startsWith('DATA-'));
      
      for (const unit of units) {
        const contained = unitToContainedIdsFromSource.get(unit) || new Set<string>();
        for (const logical of logicals) {
          contained.add(logical);
        }
        unitToContainedIdsFromSource.set(unit, contained);
      }
    }

    for (const def of this.allDefinitions.values()) {
      if (def.id.startsWith('COMP-') && def.relatedIds) {
        for (const relatedId of def.relatedIds) {
          if (relatedId.startsWith('FUNC-')) {
            assignedFuncIds.add(relatedId);
          }
          if (relatedId.startsWith('UNIT-')) {
            const unitDef = this.allDefinitions.get(relatedId);
            if (unitDef && unitDef.relatedIds) {
              for (const unitRelatedId of unitDef.relatedIds) {
                if (unitRelatedId.startsWith('FUNC-')) {
                  assignedFuncIds.add(unitRelatedId);
                }
              }
            }
            const sourceContained = unitToContainedIdsFromSource.get(relatedId);
            if (sourceContained) {
              for (const logicalId of sourceContained) {
                if (logicalId.startsWith('FUNC-')) {
                  assignedFuncIds.add(logicalId);
                }
              }
            }
          }
        }
      }
    }

    for (const funcId of allFuncIds) {
      const isAssigned = Array.from(assignedFuncIds).some(assignedId => 
        funcId === assignedId || (assignedId.endsWith('-') === false && funcId.startsWith(assignedId + '-'))
      );

      if (!isAssigned) {
        const def = this.allDefinitions.get(funcId);
        this.issues.push({
          file: def?.file || 'requirements.md',
          line: def?.line,
          id: funcId,
          message: `機能(FUNC)がどのコンポーネント(COMP)にも割り当てられていません。実装配置が不明です。`,
          severity: 'error',
        });
      }
    }
  }
}
