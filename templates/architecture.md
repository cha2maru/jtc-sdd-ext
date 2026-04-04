# 物理構造定義書 (System Architecture)

## アーキテクチャ構成図 (Configuration Diagram)
システムの物理的な階層構造とユニット間の依存関係を可視化します。

```plantuml
@startuml
package "Example Layer" {
  [Example Component] as comp
  file "example.ts" as unit
}
@enduml
```

## ユニット集約セクション (Units)
論理的な機能（FUNC）やデータ（DATA）を、物理的なソースコード単位（UNIT）にまとめます。

| ID | ユニット名 | 役割・責務 | 包含する論理ID | 物理パス |
| :--- | :--- | :--- | :--- | :--- |
| UNIT-XXX | [ファイル名等] | [このユニットが担う物理的な役割] | FUNC-XXX, DATA-YYY | `src/...` |

## コンポーネント構造セクション (Components)
ユニットをディレクトリやサブシステムという大きな塊（COMP）に整理します。

| ID | コンポーネント名 | 概要 | 包含するユニットID | 物理パス |
| :--- | :--- | :--- | :--- | :--- |
| COMP-XXX | [モジュール名] | [物理的な階層構造としての定義] | UNIT-AAA, UNIT-BBB | `src/module/` |

## 依存関係セクション (Dependencies)
ユニット間、およびコンポーネント間の物理的な依存関係を定義します。
※実装後はスクリプトにより自動抽出・更新されることを主とします。

| ID | 種別 | ソース (From) | ターゲット (To) | 理由・性質 |
| :--- | :--- | :--- | :--- | :--- |
| DEP-XXX | UNIT間 / COMP間 | [ID] | [ID] | [静的依存 / 動的依存 等] |

## 変更履歴
| 日付 | 内容 | 理由 |
| :--- | :--- | :--- |
| 202X-MM-DD | 新規作成 | 初版定義 |
