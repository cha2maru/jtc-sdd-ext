# Design Workflow Extension (jtc-sdd-ext v2)

この拡張機能は、Agent Skills を活用してソフトウェアの設計・実装プロセスを体系的に支援します。
**`workflow-expert`** スキルが全体の司令塔となり、プロジェクトの性質に応じて最適な「実行モード」を選択し、専門グループへタスクを委譲します。

---

## 0. 設計思想 (Rationale)

本拡張機能が厳格な ID 管理を行う理由は、**「AI と人間が、膨大なドキュメントとコードの整合性を瞬時に検証可能にするため」**です。
- **インパクト分析の自動化**: 要求の変更が、どの設計、どの試験、どの実装に影響するかを秒単位で特定します。
- **実装の証跡 (Traceability)**: コード内のタグ（`// @logic` 等）により、「その 1 行がどの要求に基づいているか」を機械的に証明します。
- **専門スキル間の共通言語**: 複数の Skill（AI エージェント）が共通の ID を参照することで、情報の断絶や意図の齟齬を排除します。

---

## 1. 実行モード (Execution Modes)

### 1.1 プロトタイプ優先モード (Prototype-First)
- **目的**: 迅速な実装を通じて、要求の妥当性や技術的実現性を早期に検証します。
- **特徴**: 複数の小規模な要求を個別に分けず、**単一の要求パッケージ（例：`REQ-PROTO.md`）に集約**して定義します。
- **検証**: 試験項目（TEST, ACC）は通常通り別ファイルとして作成し、検証品質を確保します。
- **パス**: `requirements.md` (Index) -> **`REQ-PROTO.md`** -> `architecture.md` / `TEST-XXX.md` -> `IMPL` -> `REV`

### 1.2 堅牢設計モード (Robust-Design)
- **目的**: 大規模・複雑な開発において、高い品質と保守性、完全なトレーサビリティを確保します。
- **特徴**: 各要求を独立したパッケージファイル（**`REQ-XXX.md`**）で定義し、その内部で詳細要件（SPEC）、論理データ（DATA）、機能（FUNC）を完結させます。
- **パス**: `requirements.md` -> **`REQ-XXX.md`** (自己完結型パッケージ) -> `architecture.md` (配置) -> `TEST/ACC` -> `IMPL` -> `REV`

---

## 2. ID体系と管理責任 (ID Taxonomy)

各 ID は情報の最小単位であり、以下のスキルグループが責任を持って管理します。

| ID種別 | 名称 | 主な定義場所 | 管理責任スキル |
| :--- | :--- | :--- | :--- |
| **REQ** | 要求 | `requirements.md`, `REQ-XXX.md` | `requirement-expert` |
| **SPEC** | 要件 | `REQ-XXX.md` | `system-designer` |
| **DATA** | 論理データ | `REQ-XXX.md` | `system-designer` |
| **FUNC** | 機能 | `REQ-XXX.md` | `system-designer` |
| **COMP** | コンポーネント | `architecture.md` | `system-designer` |
| **UNIT** | ユニット | `architecture.md` | `system-designer` |
| **DEP** | 依存関係 | `architecture.md` | `system-designer` |
| **TEST** | 結合試験 | `tests/integration/TEST-XXX.md` | `test-engineer` |
| **ACC** | 総合試験 | `tests/acceptance/ACC-XXX.md` | `test-engineer` |
| **REV** | レビュー | `reviews/REV-XXX.md` | `qa-specialist` |
| **FB** | フィードバック | `feedbacks.md` | `software-engineer` |
| **QUES** | 質問 | `questions.md` | `qa-specialist` |

---

## 3. 設計・運用の原則 (Principles)

1. **Single Source of Truth (SSOT)**: 
   - 要求は `requirements.md`、論理機能は `REQ-XXX.md`、物理構造は `architecture.md` を唯一の正解とします。
2. **Template Snippets**: 
   - 巨大なテンプレートの代わりに `templates/sections/` の部品を活用し、`<!-- [SECTION:XXX] -->` マーカーを用いて最小限の差分更新を行ってください。
3. **ID-Based Traceability**: 
   - 全ての成果物は上位 ID に紐付け、`validator --query` を用いて常に整合性を確認してください。
4. **Source-Based Containment**: 
   - ユニットが包含する ID は、ソースコード内のタグ付きコメント（例: `// @logic [FUNC-001]`）から自動抽出します。
5. **Clean Architecture**: 
   - 形態を問わず、DIP（依存性の逆転）と SoC（関心の分離）を指針とします。
6. **Conservative Section Management**: 
   - 既存ドキュメントのセクションを安易に削除せず、現状に合わせた書き換えを優先してください。
7. **Preservation of Educational Assets (具体例の継承と進化)**: ★GUARDRAIL
   - ドキュメント（特に README.md）の最新化において、既存の「具体例（ID ツリーの繋がりなど）」は、新仕様に合わせてアップデートして維持すること。
   - README は「技術仕様書」であると同時に、人間と AI のメンタルモデルを同期させる「最高の入門書」であるべきであり、教育的要素を削ぎ落としてはならない。

---

## 4. スキル呼び出しの大方針 (Skill Invocation Policy)

| 状況・入力の種類 | 優先召喚スキル | 役割・次のアクション |
| :--- | :--- | :--- |
| **開始・進行・戦略** | `workflow-expert` | プロジェクト準備、モード決定、タスク委譲。 |
| **要望・UX・遷移** | `requirement-expert` | ヒアリング、要求（REQ）抽出、Uiflow 設計。 |
| **仕様・機能・構造** | `system-designer` | SPEC/FUNC 詳細化、物理配置（architecture.md）。 |
| **実装・解析・修正** | `software-engineer` | TDD 実装、リバース解析、FB 反映、試作。 |
| **試験シナリオ作成** | `test-engineer` | 結合試験（TEST）、総合試験（ACC）の策定。 |
| **検証・進捗・Q&A** | `qa-specialist` | バリデーション、レビュー、進捗報告、質問管理。 |

---

## 5. ワークフローの運用指針 (Operational Guidelines)

1. **バリデータの知能活用**: 修正に着手する前に `validator --query impact --id [ID]` を実行し、影響範囲を特定してください。
2. **位置検証付き ID コメント**: 実装時には `// @logic`, `// @data`, `// @unit` タグを使い、バリデータによる位置検証をパスするように記述してください。
3. **プロトタイプの昇華**: `REQ-PROTO.md` の内容が固まったら、`software-engineer` が速やかに堅牢設計モードの各資産へ分割・展開してください。
4. **不整合の即時解決**: `qa-specialist` が不整合を検知した際は、作業を中断して設計ドキュメントの修正を最優先してください。
