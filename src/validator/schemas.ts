import { z } from 'zod';

// ID 抽出パターンの定義 (階層型対応)
export const ID_PATTERNS = {
  REQ: /^REQ-[A-Z0-9-]+$/,
  SPEC: /^SPEC-[A-Z0-9-]+$/,
  FUNC: /^FUNC-[A-Z0-9-]+$/,
  DATA: /^DATA-[A-Z0-9-]+$/,
  COMP: /^COMP-[A-Z0-9-]+$/,
  UNIT: /^UNIT-[A-Z0-9-]+$/,
  DEP: /^DEP-[A-Z0-9-]+$/,
  NREQ: /^NREQ-[A-Z0-9-]+$/,
  TEST: /^TEST-[A-Z0-9-]+$/,
  ACC: /^ACC-[A-Z0-9-]+$/,
} satisfies Record<string, RegExp>;

export type IdType = keyof typeof ID_PATTERNS;

// スキーマの型定義
export const TableSchema = z.object({
  idColumn: z.string(), // ID が入っている列名
  parentColumn: z.string().optional(), // 親 ID が入っている列名
  relatedColumn: z.string().optional(), // 関連 ID が入っている列名（カンマ区切り可）
  fileColumn: z.string().optional(), // ファイルパスが入っている列名 (COMP用)
  requiredColumns: z.array(z.string()), // 必須の列名
});

export type TableSchemaType = z.infer<typeof TableSchema>;

export const SectionSchema = z.object({
  table: TableSchema.optional(),
  listIds: z.boolean().optional(),
  required: z.boolean().optional(), // デフォルトは true (parser側で制御)
});

export type SectionSchemaType = z.infer<typeof SectionSchema>;

export const DocumentSchema = z.object({
  title: z.string().or(z.instanceof(RegExp)), // H1 タイトル (文字列または正規表現)
  sections: z.record(z.string(), SectionSchema),
});

export type DocumentSchemaType = z.infer<typeof DocumentSchema>;

// 各ドキュメントの具体的な定義
export const SCHEMAS: Record<string, DocumentSchemaType> = {
  'requirements.md': {
    title: /^(要求・要件定義書|プロダクト要求仕様書) \(Requirements & Specifications|Product Requirements Specification\)$/,
    sections: {
      'プロダクト概要': { required: false },
      '共通・技術スタック': { required: false },
      '要求マップ': {
        required: false,
        table: {
          idColumn: '要求ID',
          requiredColumns: ['要求ID', '要求内容', '状態'],
        },
      },
      '横断的要件・非機能要求': {
        required: false,
        table: {
          idColumn: 'ID',
          requiredColumns: ['ID', '項目', '内容', '状態'],
        },
      },
    },
  },
  'architecture.md': {
    title: '物理構造定義書 (System Architecture)',
    sections: {
      '設計方針': { required: false },
      'アーキテクチャ構成図': { required: false },
      'ユニット集約セクション': {
        table: {
          idColumn: 'ID',
          fileColumn: '物理パス',
          requiredColumns: ['ID', 'ユニット名', '役割・責務', '物理パス'],
        },
      },
      'コンポーネント構造セクション': {
        table: {
          idColumn: 'ID',
          relatedColumn: '包含するユニットID',
          fileColumn: '物理パス',
          requiredColumns: ['ID', 'コンポーネント名', '概要', '包含するユニットID', '物理パス'],
        },
      },
      '依存関係セクション': {
        table: {
          idColumn: 'ID',
          requiredColumns: ['ID', '種別', 'ソース (From)', 'ターゲット (To)', '理由・性質'],
        },
      },
      '論理機能の割り当て': {
        table: {
          idColumn: 'コンポーネントID',
          relatedColumn: '割り当てられた機能ID (FUNC)',
          requiredColumns: ['コンポーネントID', '割り当てられた機能ID (FUNC)'],
        },
      },
    },
  },
  'REQ-XXX.md': {
    title: /^#? ?\[REQ-\d{3,4}\].*$/,
    sections: {
      '要求概要': { required: false },
      'ロバストネス分析': { required: false },
      '詳細要件': { required: false, listIds: true },
      '論理データ定義': { required: false, listIds: true },
      '機能設計': { required: false, listIds: true },
    },
  },
  'SPEC-XXX.md': {
    title: /^詳細仕様書: \[SPEC-\d{3,4}\].*$/,
    sections: {
      '関連要求': { listIds: true },
      '仕様詳細': { required: false },
      '詳細設計 (Detailed Design)': { required: false },
      '論理データ定義 (Data Entities)': {
        table: {
          idColumn: 'ID',
          requiredColumns: ['ID', '名称', '内容・状態遷移・不変条件', '状態'],
        },
      },
      '機能抽出 (Function Decomposition)': {
        table: {
          idColumn: 'ID',
          requiredColumns: ['ID', '機能名', '内容・詳細ロジック', '状態'],
        },
      },
      '技術検討・採用ライブラリ': { required: false },
    },
  },
  'ACC-XXX.md': {
    title: /^総合試験書: \[ACC-[A-Z0-9-]+\] \(.*\)$/,
    sections: {
      '対象要求': {
        listIds: true,
      },
      'シナリオタイトル': { required: false },
      'ストーリー・背景': { required: false },
      'チュートリアル手順': { required: false },
      'ゴール（要求達成の定義）': { required: false },
      '関連ドキュメント': {
        required: false,
        listIds: true,
      },
    },
  },
  'TEST-XXX.md': {
    title: /^結合試験書: \[TEST-[A-Z0-9-]+\] \(.*\)$/,
    sections: {
      '対象要件・機能': {
        listIds: true,
      },
      '試験目的': { required: false },
      '試験項目一覧': {
        table: {
          idColumn: '項目ID',
          requiredColumns: ['項目ID', 'シナリオ種別', '試験項目名', '合否判定基準', '状態'],
        },
      },
    },
  },
};

