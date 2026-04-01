import { z } from 'zod';

// ID 抽出パターンの定義
export const ID_PATTERNS = {
  REQ: /^REQ-\d{3,4}$/,
  SPEC: /^SPEC-\d{3,4}(-[A-Z0-9]+)?$/,
  FUNC: /^FUNC-\d{3,4}(-[A-Z0-9]+)?$/,
  DATA: /^DATA-\d{3,4}(-[A-Z0-9]+)?$/,
  COMP: /^COMP-\d{3,4}(-[A-Z0-9]+)?$/,
  UNIT: /^UNIT-\d{3,4}(-[A-Z0-9]+)?$/,
  DEP: /^DEP-\d{3,4}$/,
  NREQ: /^NREQ-\d{3,4}$/,
  TEST: /^TEST-\d{3,4}(-[A-Z]-\d{2})?$/,
  ACC: /^ACC-\d{3,4}$/,
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
    title: '要求・要件定義書 (Requirements & Specifications)',
    sections: {
      '技術スタック・制約 (Technical Stack & Constraints)': { required: false },
      '要求セクション (Requirements)': {
        table: {
          idColumn: 'ID',
          requiredColumns: ['ID', '内容', '背景・詳細', '状態'],
        },
      },
      '非機能要求セクション (Non-Functional Requirements)': {
        required: false,
        table: {
          idColumn: 'ID',
          requiredColumns: ['ID', '項目', '内容', '状態'],
        },
      },
      '詳細要件セクション (Specifications)': {
        table: {
          idColumn: 'ID',
          parentColumn: '親要求ID',
          requiredColumns: ['ID', '親要求ID', '内容', '優先度', '状態'],
        },
      },
      '変更履歴 (Change History)': { required: false },
    },
  },
  'functions.md': {
    title: '機能・構造定義書 (Functions & Components)',
    sections: {
      '採用検討ライブラリ・外部依存 (Recommended Libraries & Dependencies)': { required: false },
      '機能セクション (Functions)': {
        table: {
          idColumn: 'ID',
          relatedColumn: '関連要件ID',
          requiredColumns: ['ID', '機能名', '内容・詳細ロジック', '関連要件ID', '状態'],
        },
      },
      '論理構造セクション (Components)': {
        table: {
          idColumn: 'ID',
          relatedColumn: '関連機能ID',
          fileColumn: '構成ファイル',
          requiredColumns: ['ID', 'コンポーネント名', '役割・責務', '関連機能ID', '構成ファイル'],
        },
      },
    },
  },
  'architecture.md': {
    title: '物理構造定義書 (System Architecture)',
    sections: {
      'ユニット集約セクション (Units)': {
        table: {
          idColumn: 'ID',
          relatedColumn: '包含する論理ID',
          fileColumn: '物理パス',
          requiredColumns: ['ID', 'ユニット名', '役割・責務', '包含する論理ID', '物理パス'],
        },
      },
      'コンポーネント構造セクション (Components)': {
        table: {
          idColumn: 'ID',
          relatedColumn: '包含するユニットID',
          fileColumn: '物理パス',
          requiredColumns: ['ID', 'コンポーネント名', '概要', '包含するユニットID', '物理パス'],
        },
      },
      '依存関係セクション (Dependencies)': {
        table: {
          idColumn: 'ID',
          requiredColumns: ['ID', '種別', 'ソース (From)', 'ターゲット (To)', '理由・性質'],
        },
      },
      '変更履歴': { required: false },
    },
  },
  'TEST-XXX.md': {
    title: /^結合試験書: \[TEST-\d{3,4}\].*$/,
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
    title: /^総合試験書: \[ACC-\d{3,4}\].*$/,
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
};

