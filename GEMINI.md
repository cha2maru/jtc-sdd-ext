# Design Workflow Extension (jtc-sdd-ext)

この拡張機能は、Agent Skillsを活用してソフトウェアの設計プロセスを体系的に支援します。
**`workflow-expert`** スキルが全体の司令塔となり、以下の「実行モード」を切り替えながらプロジェクトを前進させます。

## 重要な実行モード
1. **プロトタイプ優先モード (Prototype-First)**:
   - 迅速に動くもの（プロトタイプ）を作成してフィードバックを得るための最短経路。
   - **パス**: `requirements.md (REQ)` -> `PROTO` -> `REV` -> (必要なら) `Robust-Design`
2. **堅牢設計モード (Robust-Design)**:
   - 大規模・複雑な開発や、本番用の品質を確保するための標準経路。
   - **パス**: `requirements.md (REQ/SPEC)` -> **`specs/SPEC-XXX.md` (詳細設計/FUNC)** -> `functions.md (集約/COMP)` -> **`TEST`/`ACC` (Behavior Spec)** -> `IMPL` -> `REV`

## 統合ドキュメント構成
- **`requirements.md`**: 要求（REQ）とその詳細要件（SPEC）のインデックスを管理し、トレーサビリティを確保します。
- **`specs/` ディレクトリ**: 
  - 各 `SPEC-XXX` に対して個別の Markdown ファイル（`SPEC-XXX.md`）を作成します。
  - **役割**: 詳細な仕様定義、UIフロー、**詳細設計（アルゴリズム、データ構造、インターフェース）**、およびそこから派生する機能定義（FUNC）をすべてこのファイルに集約します。
- **`functions.md`**: 各 SPEC ファイルから抽出された機能（FUNC）を集約し、それらの論理構造（COMP）と実装場所を定義します。
- **`tests/` ディレクトリ**: 
  - 結合試験（TEST）を「振る舞い詳細設計書」として位置づけ、正常系・準正常系・異常系の期待動作をID（`TEST-XXX-XX`）で定義します。
- **`designs/` ディレクトリ**: 
  - 特定の SPEC に紐付かない横断的な設計（アーキテクチャ全体、共通基盤等）が必要な場合のみ使用します。

- **ドキュメントテンプレート**: 
  - すべてのドキュメントは `jtc-sdd-ext/templates/` 配下のテンプレートを正典として作成・更新します。

## 設計・運用の原則 (Principles)
1. **Single Source of Truth**: 要求・要件、機能・構造は、`requirements.md`, `specs/*.md`, `functions.md` を唯一の正解とします。
2. **Template Compliance**: すべてのドキュメントは、指定されたテンプレートに従って作成し、構造の勝手な変更を禁止します。
3. **ID-Based Traceability**: すべての成果物（SPEC, FUNC, TEST, DD, FB等）は、必ず上位のIDに紐付かなければなりません。
4. **1Spec 1File**: 詳細要件（SPEC）は個別のファイルで詳細化（詳細設計・機能抽出）し、作業の凝集度を高めます。
5. **Test-Driven Implementation**: 実装は常にテスト（Unit Test/Integration Test）によって裏付けられ、設計意図と乖離していないことを保証します。
6. **No Omission Placeholders**: ドキュメントやコードの作成・更新において、「中略」「後略」「...」などの省略用記号を一切使用せず、常に完全かつ有効な内容を提供します。
7. **Change Impact Management**: REQ, SPEC, FUNC のいずれかに変更が発生した場合は、必ず関連する全ての下流資産への影響をチェックし、整合性が取れるまで再帰的に更新を行ってください。
8. **Upstream-First Correction**: 下流の資産に変更が必要になった際、それが上流の定義の変更を伴う場合は、必ず先に上流ドキュメントを修正し、合意を得てから下流の更新に着手してください。

## 変更影響波及ルール (Impact Propagation Rules)
変更が発生した ID の種類に応じて、以下の資産を必ず確認・更新してください。
- **REQ 変更時**: 紐付く全 `SPEC` (内容/リンク)、`ACC` (シナリオ/紐付け)、および関連する `specs/*.md`。
- **SPEC 変更時**: 対象の `specs/SPEC-XXX.md` (詳細設計/FUNC)、`TEST` (シナリオ/判定基準)、および `ACC` (関連ドキュメント)。
- **FUNC 変更時**: 紐付く全 `COMP` (責務/ファイルパス)、`TEST` (対象機能/手順)、および `ACC` (関連ドキュメント)。

## 利用可能なスキル
- **workflow-expert**: プロジェクト全体の進捗を監視し、最適なスキルへのタスク委譲と実行モード（自律/対話）の制御を行います。
- **requirement-management**: ユーザーの要望を抽出し、`requirements.md` に要求（REQ）を登録します。
- **specification-management**: 抽象的な要求（REQ）を詳細な要件（SPEC）に分解し、一覧を `requirements.md` に追記します。
- **specification-detail-management**: 特定の SPEC に対して個別ファイル（`specs/SPEC-XXX.md`）を作成し、詳細仕様、詳細設計、機能（FUNC）を定義します。
- **component-structure-expert**: 各 SPEC ファイルの機能を `functions.md` に集約し、論理コンポーネント（COMP）に分割・配置します。
- **integration-test-expert**: 詳細仕様（SPEC）と機能定義（FUNC）に基づき、操作マニュアル形式の結合試験項目（TEST）を作成します。
- **acceptance-test-expert**: 要求（REQ）の達成を検証するためのチュートリアル形式の総合試験項目（ACC）を作成します。
- **design-implementation-expert**: `specs/SPEC-XXX.md` の詳細仕様・詳細設計に基づき、実装を行います。
- **implementation-review-expert**: 試験項目（TEST/ACC）に基づき、ソースコードの実装品質と要件適合性をレビュー（REV）します。
- **progress-management-expert**: 各作業の完了後にドキュメントのステータスを最新化し、進捗報告を生成します。

## ワークフローの運用指針
1. **開始時のプロジェクト確認**: 最初のアクションとして、必ずプロジェクトディレクトリが作成されているかを確認し、未設定の場合は `project-management-expert` で立ち上げてください。
2. **開始時のモード合意**: プロジェクトの開始時、またはフェーズの変わり目で、必ず `workflow-expert` を通じてどちらのモードで進めるかをユーザーと合意してください。
3. **成果物の階層化**: 全ての成果物は、作成されたプロジェクト用ディレクトリ配下（`projects/[プロジェクト名]/`）で一元管理してください。
4. **自律性の確認**: 「自律的に進めるか（Autonomous）」「確認を挟みながら進めるか（Interactive）」も合意の対象です。
5. **成果物の連鎖**: 各モードに応じて作成されるドキュメント間のリンク（ID）を維持し、トレーサビリティを確保してください。
6. **フィードバックの学習**: 指摘を受けた場合は `feedback-management-expert` で原因と対策を整理し、ガードレールを構築してください。
7. **不整合（ズレ）の解消**: 実装レビュー時にズレがある場合は、実装と試験項目のどちらを修正すべきか、論理的に判断してください。
