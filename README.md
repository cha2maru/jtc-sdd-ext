# JTC SDD Extension (jtc-sdd-ext)

Gemini CLI を活用して、ソフトウェア設計プロセス（SDD: Software Design Document）を体系的に管理・支援するための拡張機能です。

## 概要

`jtc-sdd-ext` は、日本の伝統的な企業（**JTC: Japanese Traditional Company**）における重厚なウォーターフォール開発の知見を現代の AI 開発プロセスに融合させた設計フレームワークです。

「ドキュメントが正典である」という JTC の美徳を継承しつつ、Agent Skills による自動化と ID ベースの厳密なトレーサビリティを導入することで、設計の「意図」から「振る舞い」までを完全に繋ぎます。単なる仕様書作成に留まらず、人間が読みやすく、AI が検証可能な「生きた設計資産」を構築することを目的としています。

## コア・コンセプト

### 1. 「伝統」と「自動化」の融合
JTC の大規模開発で培われた「要求、要件、機能、構造、試験」という段階的な詳細化プロセスをデジタル化。曖昧さを許さないドキュメント文化を、Agent Skills が自律的にメンテナンス・バリデーションすることで、品質を担保します。

### 2. IDベースのトレーサビリティ・ツリー
すべての設計要素に ID を付与し、親子・関連関係を定義することで、最上位の「経営要求」から最下位の「コードファイル」までを一本の糸で繋ぎます。

### 3. 「人間が読める」品質レビュー
出力される試験仕様書は、人間が操作マニュアルとして読み、機能性を直感的に判断できる形式を重視しています。これにより、実装前にステークホルダーが振る舞いをレビューし、早期に合意を形成することが可能です。

## ドキュメント ＆ ID ツリー構造

本拡張機能は、以下の ID 体系に基づき、設計の網羅性と一貫性を管理します。

| レベル | ID | 管理ドキュメント | 役割・説明 |
| :--- | :--- | :--- | :--- |
| **L1: 要求** | `REQ-XXX` | `requirements.md` | **ユーザーの意図**: 「何を実現したいか」という最上位のビジネス要求。 |
| **L2: 要件** | `SPEC-XXX` | `requirements.md` | **具体的要件**: 要求を分解した、テスト可能な詳細仕様。REQ に紐付く。 |
| **L3: 機能** | `FUNC-XXX` | `functions.md` | **論理機能**: 要件を実現するための具体的な機能定義。SPEC に紐付く。 |
| **L4: 構造** | `COMP-XXX` | `functions.md` | **論理コンポーネント**: 機能を実装レベルのモジュールに分割。FUNC に紐付く。 |
| **L5: 試験** | `TEST-XXX` | `tests/integration/` | **結合試験**: 機能の振る舞いを定義。SPEC/FUNC の妥当性を検証。 |
| **L6: 総合** | `ACC-XXX` | `tests/acceptance/` | **総合試験**: 要求達成を検証。REQ が満たされているかを定義。 |

### トレーサビリティの例
- `REQ-001` (ログインしたい)
  - `SPEC-001` (ID/PASSによる認証を行う)
    - `FUNC-001` (ユーザー認証処理)
      - `COMP-001` (`src/auth/AuthService.ts`)
      - `TEST-001` (認証処理の正常・異常系振る舞い定義)
  - `ACC-001` (ログインからマイページ表示までのチュートリアル)

## 主な特徴

- **Single Source of Truth**: `requirements.md` と `functions.md` を唯一の正典として、設計資産を一元管理。
- **Test-Driven Design**: 「試験仕様書 ＝ 振る舞い詳細設計」と位置づけ、コードを書く前に振る舞いを確定。
- **自動バリデーション**: `validator-expert` がドキュメント間の ID リンク切れや網羅性を機械的にチェック。
- **プロフェッショナルな Agent Skills**: 20 種類以上の専門スキルが、各設計フェーズで自律的に作業を支援。

## ディレクトリ構成

- `skills/`: 各種設計・管理タスクを担う Agent Skill の定義（SKILL.md）。
- `src/validator/`: 設計ドキュメントの整合性をチェックするバリデーターのソースコード。
- `templates/`: 各種設計ドキュメント（要求、機能、試験、詳細設計など）の標準テンプレート。
- `dist/`: バリデーターのビルド済みファイル。

## 利用可能なスキル

`jtc-sdd-ext` では、以下の専門特化したスキルが連携して設計・開発をサポートします。

### プロジェクト管理・司令塔
- **workflow-expert**: プロジェクト全体の司令塔。最適なスキルへのタスク委譲と実行モードの制御を行います。
- **project-management-expert**: 新規プロジェクトの立ち上げ、ディレクトリ準備、概要（OVERVIEW.md）の定義を担当。
- **progress-management-expert**: 各工程の完了ごとに進捗ステータスを更新し、報告書を生成。

### 要求・要件定義
- **requirement-management**: ユーザーの要望を抽出し、要求（REQ）として `requirements.md` に登録・管理。
- **specification-management**: 抽象的な要求（REQ）を、具体的でテスト可能な詳細要件（SPEC）に分解。
- **strategy-decision-maker**: 要求に対し、詳細分析に進むかプロトタイプを作成するかの実行戦略を決定。
- **question-management**: プロジェクト内の質疑応答や意思決定事項を Q&A 形式で記録。

### 機能設計・構造設計
- **function-management**: 詳細要件（SPEC）を実現するための具体的な機能（FUNC）を定義。
- **component-structure-expert**: 機能を実装レベルの論理コンポーネント（COMP）に分割し、構造を定義。
- **uiflow-expert**: ユーザー体験（UX）を「見る・する・遷移する」の連鎖として設計し、Mermaid 形式で可視化。

### 実装・プロトタイピング
- **design-implementation-expert**: 詳細設計（designs/[ID].md）の作成と、実際のコード実装を担当。
- **prototype-expert**: 要求を早期に可視化するためのプロトタイプ（PROTO）を迅速に実装。
- **prototype-review-expert**: プロトタイプを評価し、得られた知見を要件や機能定義にフィードバック。

### 検証・テスト・品質管理
- **integration-test-expert**: 結合試験項目（TEST）を作成し、正常・準正常・異常系の振る舞いを定義。
- **acceptance-test-expert**: 要求達成を検証するための総合試験項目（ACC）をチュートリアル形式で作成。
- **implementation-review-expert**: 試験項目に基づき、実装の品質と要件適合性をレビュー。
- **validator-expert**: 設計ドキュメント間の ID 関連性や網羅性を機械的にバリデーション。
- **feedback-management-expert**: 指摘事項を記録（FB）し、再発防止策（ガードレール）を策定。

### 補助・メタスキル
- **reverse-document-expert**: 既存コードから設計ドキュメントを逆生成。
- **skill-creator**: 新しいエージェントスキルの設計・作成・バリデーション。

## 使い方

詳細な運用ルールやスキルの使い方は `jtc-sdd-ext/GEMINI.md` を参照してください。

### バリデーターの実行

```bash
cd jtc-sdd-ext
npm install
npm run build
node dist/validator/main.js ../projects/[プロジェクト名]
```

## ライセンス

MIT License
