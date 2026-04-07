# Design Workflow Extension (jtc-sdd-ext)

この拡張機能は、Agent Skillsを活用してソフトウェアの設計・実装プロセスを体系的に支援します。
**`workflow-expert`** スキルが全体の司令塔となり、プロジェクトの性質に応じて最適な「実行モード」を選択し、各専門スキルへタスクを委譲します。

---

## 1. 実行モード (Execution Modes)

### 1.1 プロトタイプ優先モード (Prototype-First)
- **目的**: 迅速な実装を通じて、要求の妥当性や技術的実現性を早期に検証します。
- **特徴**: 複数の小規模な要求を個別に分けず、**単一の要求パッケージ（例：`REQ-PROTO.md`）に集約** して定義します。
- **検証**: 試験項目（TEST, ACC）は通常通り別ファイルとして作成し、検証品質を確保します。
- **パス**: `requirements.md (Index)` -> **`REQ-PROTO.md` (要求集約)** -> `architecture.md` / `TEST-XXX.md` -> `IMPL` -> `REV`

### 1.2 堅牢設計モード (Robust-Design)
- **目的**: 大規模・複雑な開発において、高い品質と保守性、完全なトレーサビリティを確保します。
- **特徴**: 各詳細要件を独立したファイル（`specs/SPEC-XXX.md`）で詳細化し、厳格な設計・検証サイクルを回します。
- **パス**: `requirements.md (REQ/SPEC)` -> **`specs/SPEC-XXX.md` (詳細設計/FUNC)** -> `architecture.md` (配置) -> `TEST/ACC` -> `IMPL` -> `REV`

---

## 2. ID体系と定義場所 (ID Taxonomy)

| ID種別 | 名称 | 役割・定義内容 | 主な定義ファイル | 管理スキル |
| :--- | :--- | :--- | :--- | :--- |
| **REQ** | 要求 | ユーザーの目的、ビジネス価値。 | `requirements.md`, `REQ-XXX.md` | `requirement-management` |
| **SPEC** | 要件 | 要求を実現する具体的振る舞い。 | `REQ-XXX.md`, `specs/SPEC-XXX.md` | `specification-detail-management` |
| **DATA** | 論理データ | システムが扱う論理的なデータ構造。 | `REQ-XXX.md`, `specs/SPEC-XXX.md` | `specification-detail-management` |
| **FUNC** | 機能 | ロジックの最小単位（入出力・処理）。 | `REQ-XXX.md`, `specs/SPEC-XXX.md` | `specification-detail-management` |
| **COMP** | コンポーネント | 論理的な機能の塊、責務の単位。 | `architecture.md` | `architecture-design-expert` |
| **UNIT** | ユニット | 物理的なソースファイル単位。 | `architecture.md` | `architecture-design-expert` |
| **DEP** | 依存関係 | ユニット/コンポーネント間の物理依存。 | `architecture.md` | `architecture-design-expert` |
| **TEST** | 結合試験 | 要件（SPEC）に対する期待動作定義。 | `tests/integration/TEST-XXX.md` | `integration-test-expert` |
| **ACC** | 総合試験 | 要求（REQ）の達成を検証する物語。 | `tests/acceptance/ACC-XXX.md` | `acceptance-test-expert` |
| **REV** | レビュー | 設計・実装の整合性や品質確認結果。 | `reviews/REV-XXX.md` | `implementation-review-expert` |
| **FB** | フィードバック | ユーザー指摘事項と再発防止策。 | `feedbacks.md` | `feedback-management-expert` |
| **QUES** | 質問 | 設計・実装時の不明点と回答。 | `questions.md` | `question-management` |

---

## 3. 設計・運用の原則 (Principles)

1. **Single Source of Truth (SSOT)**: 
   - 要求は `requirements.md`、論理機能は `REQ-XXX.md` または `specs/*.md`、物理構造は `architecture.md` を唯一の正解とします。
2. **Template Compliance**: 
   - 全てのドキュメントは `jtc-sdd-ext/templates/` を正典として作成し、構造の勝手な変更を禁止します。
3. **ID-Based Traceability**: 
   - 全ての成果物（コード、テスト、詳細設計）は、必ず上位のIDに紐付かなければなりません。
4. **1Spec 1File (Robust-Designのみ)**: 
   - 詳細要件（SPEC）は個別のファイルで詳細化（詳細設計・機能抽出）し、作業の凝集度を高めます。
5. **Test-Driven Implementation**: 
   - 実装は常に試験（TEST/ACC）によって裏付けられ、設計意図と乖離していないことを保証します。
7. **No Omission Placeholders**: 
   - ドキュメントやコードにおいて「中略」「後略」を一切使用せず、常に完全な内容を提供します。
8. **Conservative Section Management**: 
   - 既存ドキュメントのセクションを安易に削除することを厳禁します。削除を検討する際は、そのセクションが保持していた情報の必要性を再確認し、削除ではなく「現状に合わせた書き換え」が可能か、または別の適切な場所への移動が適当かを必ず検討してください。
9. **Clean Architecture Compliance**: 
   - 形態（CLI, Web, Library）を問わず、DIP（依存性の逆転）と SoC（関心の分離）を指針とします。
10. **Source-Based Containment**: 
   - UNITが包含する論理ID（FUNC/SPEC/DATA）は、ドキュメントではなくソースコード内のコメントから自動抽出します。
11. **Comment is Important Information**:
   - コメントは人が読むために必要な情報が含まれている。IDなど以外にも説明なども安易な削除をしないようにする。ただし現状の実装と合致していない場合は修正する。

## 5. スキル呼び出しの大方針 (Skill Invocation Policy)

状況に応じて、以下のスキルを優先的に召喚し、自律的な作業を委譲してください。

| 状況・入力の種類 | 優先召喚スキル | 役割・次のアクション |
| :--- | :--- | :--- |
| **プロジェクト開始前** | `project-management-expert` | ディレクトリ作成、`OVERVIEW.md` の定義。 |
| **漠然とした要望・新規機能** | `requirement-management` | ヒアリング、要求（REQ）の抽出と `requirements.md` 登録。 |
| **進め方の相談・実行戦略** | `strategy-decision-maker` | 「プロトタイプ優先」か「堅牢設計」かの戦略決定。 |
| **具体的な仕様・機能設計** | `specification-detail-management` | `REQ-XXX.md` や `specs/*.md` での SPEC/FUNC/DATA 詳細化。 |
| **物理的な配置・構造設計** | `architecture-design-expert` | `architecture.md` の更新。 |
| **ユーザーからの指摘・バグ報告** | `feedback-management-expert` | 指摘（FB）の記録と、再発防止策（ガードレール）の策定。 |
| **不明点・質疑応答・意思決定** | `question-management` | 質問（QUES）の記録、回答の管理。 |
| **実装後のレビュー・評価** | `reverse-document-expert` | 実装からの設計逆生成、プロトタイプの評価。 |
| **整合性チェック・一括検証** | `validator-expert` | プロジェクト全体の ID リンク・網羅性のバリデーション。 |
| **工程完了・進捗確認** | `progress-management-expert` | 進捗報告（PROGRESS）の生成とステータス更新。 |

- **司令塔としての `workflow-expert`**: 上記の各スキル間のバトンタッチや、モード（プロトタイプ/堅牢設計）の切り替えに迷った場合は、まず `workflow-expert` を召喚して次の最適解を求めてください。

---

## 6. 変更影響波及ルール (Impact Propagation Rules)

IDが変更・更新された際、以下の資産を必ず確認・更新してください。

- **REQ 変更時**: 紐付く全 `SPEC` (内容/リンク)、`ACC` (シナリオ/紐付け)、および関連する `REQ-XXX.md`。
- **SPEC 変更時**: 対象の `specs/SPEC-XXX.md` (詳細設計/FUNC)、`TEST` (シナリオ/判定基準)、および `ACC` (関連ドキュメント)。
- **FUNC 変更時**: 紐付く全 `COMP` (責務/割り当て)、`TEST` (対象機能/手順)、および `ACC` (関連機能)。
- **UNIT 変更時**: 紐付く `DEP` (依存方向/理由)、`architecture.md`、および影響を受ける他 `UNIT`。
- **Upstream-First Correction**: 下流の矛盾を発見した際は、必ず先に上流ドキュメントを修正し、合意を得てから下流の更新に着手してください。

---

## 5. ワークフローの運用指針 (Operational Guidelines)

1. **開始時のプロジェクト確認**: 最初のアクションとして、必ず `project-management-expert` でディレクトリ準備を確認してください。
2. **モードと自律性の合意**: フェーズの変わり目で、必ず `workflow-expert` を通じて「実行モード」および「自律/対話」をユーザーと合意してください。
3. **成果物の階層化**: 全ての成果物は `projects/[プロジェクト名]/` 配下で一元管理し、トレーサビリティを確保してください。
4. **フィードバックの学習**: 指摘を受けた場合は `feedback-management-expert` で原因と対策を整理し、ガードレール（再発防止）を構築してください。
5. **不整合（ズレ）の解消**: 実装レビュー時にズレがある場合は、SSOT（上流設計）に基づき、実装と試験項目のどちらを修正すべきか論理的に判断してください。
6. **バリデーションの定着**: 各フェーズの完了後、`validator-expert` を実行して機械的な整合性を保証してください。
7. **質問事項の記録**: 質問事項については`question-management`を実行して管理を行ってください。
