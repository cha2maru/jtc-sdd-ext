import { jest } from '@jest/globals';
import type { ProjectValidator as ProjectValidatorType, ValidationIssue } from '../validator.js';

// fs モックの設定
jest.unstable_mockModule('fs', () => ({
  default: {
    existsSync: jest.fn(),
  },
  existsSync: jest.fn(),
}));

// モジュールを動的にインポート (fs モックを反映させるため)
const { ProjectValidator } = await import('../validator.js') as any;
const { existsSync } = await import('fs') as any;

describe('ProjectValidator', () => {
  let validator: ProjectValidatorType;

  beforeEach(() => {
    validator = new ProjectValidator();
    jest.clearAllMocks();
  });

  test('TEST-010-N-01: 正しい依存関係を持つパース結果を検証できること', () => {
    const results = [
      {
        file: 'requirements.md',
        ids: [
          { id: 'REQ-001', isDefinition: true, file: 'requirements.md', line: 1 },
          { id: 'SPEC-001', isDefinition: true, parentId: 'REQ-001', file: 'requirements.md', line: 5 },
        ],
        errors: [],
        sectionsFound: ['要求セクション (Requirements)', '詳細要件セクション (Specifications)'],
      }
    ];
    const issues = validator.validate(results as any, '/dummy');
    expect(issues.filter((i: ValidationIssue) => i.severity === 'error')).toHaveLength(0);
  });

  test('TEST-010-A-01: ID定義の重複を検出できること', () => {
    const results = [
      {
        file: 'file1.md',
        ids: [{ id: 'REQ-001', isDefinition: true, file: 'file1.md', line: 1 }],
        errors: [],
        sectionsFound: [],
      },
      {
        file: 'file2.md',
        ids: [{ id: 'REQ-001', isDefinition: true, file: 'file2.md', line: 1 }],
        errors: [],
        sectionsFound: [],
      }
    ];
    const issues = validator.validate(results as any, '/dummy');
    expect(issues.some((i: ValidationIssue) => i.message.includes('重複定義されています'))).toBe(true);
  });

  test('TEST-010-A-03: 構成ファイルが不在の場合にエラーを返すこと', () => {
    (existsSync as jest.Mock).mockReturnValue(false); // ファイル不在をシミュレート

    const results = [
      {
        file: 'functions.md',
        ids: [{ id: 'COMP-001', isDefinition: true, files: ['src/missing.ts'], file: 'functions.md', line: 1 }],
        errors: [],
        sectionsFound: [],
      }
    ];
    const issues = validator.validate(results as any, '/dummy');
    expect(issues.some((i: ValidationIssue) => i.message.includes('構成ファイルが見つかりません'))).toBe(true);
  });

  test('TEST-010-W-01: 総合試験(ACC)がない要求に対して警告を出すこと', () => {
    const results = [
      {
        file: 'requirements.md',
        ids: [{ id: 'REQ-001', isDefinition: true, file: 'requirements.md', line: 1 }],
        errors: [],
        sectionsFound: [],
      }
    ];
    const issues = validator.validate(results as any, '/dummy');
    expect(issues.some((i: ValidationIssue) => i.message.includes('総合試験(ACC)が定義されていません'))).toBe(true);
  });
});
