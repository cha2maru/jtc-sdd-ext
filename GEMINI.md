# Design Workflow Extension (jtc-sdd-ext)

この拡張機能は、Agent Skillsを活用してソフトウェアの設計プロセスを体系的に支援します。
**`workflow-expert`** スキルが全体の司令塔となり、以下の「実行モード」を切り替えながらプロジェクトを前進させます。

## 重要な実行モード
1. **プロトタイプ優先モード (Prototype-First)**:
   - 迅速に動くもの（プロトタイプ）を作成してフィードバックを得るための最短経路。
   - **パス**: `requirements.md (REQ)` -> `PROTO` -> `REV` -> (必要なら) `Robust-Design`
2. **堅牢設計モード (Robust-Design)**:
   - 大規模・複雑な開発や、本番用の品質を確保するための標準経路。
   - **パス**: `requirements.md (REQ/SPEC)` -> `functions.md (FUNC/COMP)` -> **`TEST`/`ACC` (Behavior Spec)** -> `IMPL` -> `REV`

## 統合ドキュメント構成
- **`requirements.md`**: 要求（REQ）とその詳細要件（SPEC）を一つのファイルで管理し、トレーサビリティを確保します。
- **`functions.md`**: 機能定義（FUNC）とその論理構造（COMP）を一つのファイルで管理し、実装への橋渡しを行います。
- **`tests/` ディレクトリ**: 
  - 結合試験（TEST）を「振る舞い詳細設計書」として位置づけ、正常系・準正常系・異常系の期待動作をID（`TEST-XXX-XX`）で定義します。
- **`designs/` ディレクトリ**: 
  - すべてのID（REQ, SPEC, FUNC, COMP）に対して詳細な設計が必要な場合、`designs/[ID].md` を作成します。

- **ドキュメントテンプレート**: 
  - すべてのドキュメントは `jtc-sdd-ext/templates/` 配下のテンプレートを正典として作成・更新します。

## 設計・運用の原則 (Principles)
1. **Single Source of Truth**: 要求・要件、機能・構造は、それぞれ `requirements.md` と `functions.md` を唯一の正解とします。
2. **Template Compliance**: すべてのドキュメントは、指定されたテンプレートに従って作成し、構造の勝手な変更を禁止します。
3. **ID-Based Traceability**: すべての成果物（SPEC, FUNC, TEST, DD, FB等）は、必ず上位のIDに紐付かなければなりません。
...
3. **Recursive Deep Dive**: どの抽象度（REQ〜COMP）であっても、複雑性が高い場合は `designs/[ID].md` を作成して詳細化することを推奨します。
4. **Test-Driven Implementation**: 実装は常にテスト（Unit Test/Integration Test）によって裏付けられ、設計意図と乖離していないことを保証します。
5. **Feedback Loop**: 指摘や失敗は `feedback-management-expert` を通じて学習資産（FB）化し、ワークフローを自己進化させます。
6. **No Omission Placeholders**: ドキュメントやコードの作成・更新において、「中略」「後略」「...」などの省略用記号を一切使用せず、常に完全かつ有効な内容を提供します。
7. **Change Impact Management**: REQ, SPEC, FUNC のいずれかに変更（修正、統合、削除、リンク追加/削除）が発生した場合は、必ず関連する全ての下流資産への影響をチェックし、整合性が取れるまで再帰的に更新を行ってください。
8. **Upstream-First Correction**: 下流の資産（SPEC, FUNC, TEST, ACC等）に変更が必要になった際、それが上流の定義（REQ, SPEC等）の変更を伴う場合は、必ず先に上流ドキュメントを修正し、合意を得てから下流の更新に着手してください。

## 変更影響波及ルール (Impact Propagation Rules)
変更が発生した ID の種類に応じて、以下の資産を必ず確認・更新してください。

- **REQ 変更時**: 紐付く全 `SPEC` (内容/リンク)、`ACC` (シナリオ/紐付け)、および `functions.md` 内の関連箇所。
- **SPEC 変更時**: 紐付く全 `FUNC` (内容/関連要件ID)、`TEST` (シナリオ/判定基準)、および `ACC` (関連ドキュメント)。
- **FUNC 変更時**: 紐付く全 `COMP` (責務/ファイルパス)、`TEST` (対象機能/手順)、および `ACC` (関連ドキュメント)。
- **リンク削除時**: リンクが切れた下流資産（親を失った `SPEC` や `FUNC` 等）が孤立していないか、または削除すべきかを確認。

## 利用可能なスキル

- **workflow-expert**: プロジェクト全体の進捗を監視し、最適なスキルへのタスク委譲と実行モード（自律/対話）の制御を行います。「ワークフロー」で起動。
- **project-management-expert**: 新規プロジェクトのディレクトリ作成と、プロジェクト概要（OVERVIEW.md）の定義、一覧管理を行います。「プロジェクト作成」で起動。
- **reverse-document-expert**: 既存のソースコードを分析し、REQ, SPEC, FUNC, COMP などの設計ドキュメントを逆生成します。「ドキュメント逆生成」で起動。
- **skill-creator**: Claude Codeスキル（SKILL.md）の設計・作成・バリデーション・レビュー。「スキル作成」で起動。
- **requirement-management**: ユーザーの要望を抽出し、`requirements.md` に要求（REQ）を登録します。「要求抽出」で起動。
- **specification-management**: 抽象的な要求（REQ）を詳細な要件（SPEC）に分解し、同じ `requirements.md` 内に追記します。「要件定義」で起動。
- **function-management**: 要件（SPEC）を実現するための機能（FUNC）を定義し、`functions.md` に登録します。「機能定義」で起動。
- **question-management**: プロジェクト内の質疑応答、回答、意思決定事項を管理ドキュメント（QUES）に記録・更新します。「質問作成」で起動。
- **component-structure-expert**: 機能を論理コンポーネント（COMP）に分割し、同じ `functions.md` 内に追記します。「コンポーネント設計」で起動。
- **integration-test-expert**: 詳細要件（SPEC）と機能定義（FUNC）に基づき、操作マニュアル形式の結合試験項目（TEST）を作成します。「結合試験」で起動。
- **acceptance-test-expert**: 要求（REQ）の達成を検証するためのチュートリアル形式の総合試験項目（ACC）を作成します。「総合試験」で起動。
- **design-implementation-expert**: あらゆるID（REQ/SPEC/FUNC/COMP）に対し、詳細設計（`designs/[ID].md`）の作成と実装を行います。「詳細設計」「実装して」で起動。
- **implementation-review-expert**: 試験項目（TEST/ACC）に基づき、ソースコードの実装品質と要件適合性をレビュー（REV）します。「実装レビュー」で起動。
- **prototype-expert**: 要求（REQ）を早期に可視化するためのプロトタイプ（PROTO）を自律的に設計・実装します。「プロトタイプ作成」で起動。
- **prototype-review-expert**: 実装されたプロトタイプ（PROTO）を評価し、得られた知見を要件（SPEC）や機能（FUNC）へ反映します。「プロトタイプ評価」で起動。
- **feedback-management-expert**: ユーザーからの指摘・訂正を記録（FB）し、再発防止策（ガードレール）を策定して共有します。「指摘記録」で起動。
- **progress-management-expert**: 各作業の完了後にドキュメントのステータスを最新化し、進捗報告を生成します。「進捗更新」で起動。
- **uiflow-expert**: ユーザー体験（UX）を「見る・する」の連鎖として Mermaid 等で可視化します。「Uiflow作成」で起動。

## ワークフローの運用指針
1. **開始時のプロジェクト確認**: 最初のアクションとして、必ずプロジェクトディレクトリが作成されているかを確認し、未設定の場合は `project-management-expert` で立ち上げてください。
2. **開始時のモード合意**: プロジェクトの開始時、またはフェーズの変わり目で、必ず `workflow-expert` を通じてどちらのモードで進めるかをユーザーと合意してください。
3. **成果物の階層化**: 全ての成果物（`OVERVIEW`, `REQ`, `SPEC` 等）は、作成されたプロジェクト用ディレクトリ配下（`projects/[プロジェクト名]/`）で一元管理してください。
4. **自律性の確認**: 「自律的に進めるか（Autonomous）」「確認を挟みながら進めるか（Interactive）」も合意の対象です。
5. **成果物の連鎖**: 各モードに応じて作成されるドキュメント間のリンク（ID）を維持し、トレーサビリティを確保してください。
6. **フィードバックの学習**: 指摘を受けた場合は `feedback-management-expert` で原因と対策を整理し、ガードレールを構築してください。
7. **不整合（ズレ）の解消**: 実装レビュー時にズレがある場合は、実装と試験項目のどちらを修正すべきか、論理的に判断してください。
