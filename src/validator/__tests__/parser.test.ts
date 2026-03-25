import { MarkdownParser } from '../parser.js';

describe('MarkdownParser', () => {
  let parser: MarkdownParser;

  beforeEach(() => {
    parser = new MarkdownParser();
  });

  test('TEST-009-N-01: 正しい requirements.md をパースできること', async () => {
    const content = `
# 要求・要件定義書 (Requirements & Specifications)

## 要求セクション (Requirements)
| ID | 内容 | 背景・詳細 | 状態 |
| :--- | :--- | :--- | :--- |
| REQ-001 | 要求1 | 背景1 | 実装済み |

## 詳細要件セクション (Specifications)
| ID | 親要求ID | 内容 | 優先度 | 状態 |
| :--- | :--- | :--- | :--- | :--- |
| SPEC-001 | REQ-001 | 内容1 | 高 | 未着手 |
`;
    const result = await parser.parse(content, 'requirements.md');
    
    expect(result.errors).toHaveLength(0);
    expect(result.ids).toContainEqual(expect.objectContaining({ id: 'REQ-001', isDefinition: true }));
    expect(result.ids).toContainEqual(expect.objectContaining({ id: 'SPEC-001', isDefinition: true, parentId: 'REQ-001' }));
  });

  test('TEST-009-N-02: 結合試験ドキュメントからメインIDとリストIDを抽出できること', async () => {
    const content = `
# 結合試験書: [TEST-001] (テストタイトル)

## 対象要件・機能
- 詳細要件: SPEC-001 (内容)
- 関連機能: FUNC-001 (内容)

## 試験項目一覧
| 項目ID | シナリオ種別 | 試験項目名 | 合否判定基準 | 状態 |
| :--- | :--- | :--- | :--- | :--- |
| TEST-001-N-01 | 正常系 | 項目1 | 基準1 | 未実施 |
`;
    const result = await parser.parse(content, 'TEST-XXX.md'); // スキーマ推論されるためパターン名を使用
    
    expect(result.errors).toHaveLength(0);
    expect(result.ids).toContainEqual(expect.objectContaining({ id: 'TEST-001', isDefinition: true }));
    expect(result.ids).toContainEqual(expect.objectContaining({ id: 'SPEC-001', isDefinition: false }));
    expect(result.ids).toContainEqual(expect.objectContaining({ id: 'FUNC-001', isDefinition: false }));
    expect(result.ids).toContainEqual(expect.objectContaining({ id: 'TEST-001-N-01', isDefinition: true }));
  });

  test('TEST-009-A-01: H1タイトルが不正な場合にエラーを返すこと', async () => {
    const content = '# 間違ったタイトル';
    const result = await parser.parse(content, 'requirements.md');
    expect(result.errors).toContainEqual(expect.stringContaining('H1タイトルが一致しません'));
  });

  test('TEST-009-A-02: 必須セクションが欠落している場合にエラーを返すこと', async () => {
    const content = '# 要求・要件定義書 (Requirements & Specifications)\n\n## 一部足りないセクション';
    const result = await parser.parse(content, 'requirements.md');
    expect(result.errors).toContainEqual(expect.stringContaining('必須セクションが見つかりません'));
  });
});
