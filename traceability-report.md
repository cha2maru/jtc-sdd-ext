# 設計・実装トレーサビリティ報告書

## 1. 論理トレーサビリティ (要求 → 仕様 → 機能)
要求がどのように詳細化され、ソースコードで実装されているかを確認します。

| 要求 (REQ) | 詳細要件 (SPEC) | 実装機能 (FUNC) | 実装状況 | ソース箇所 |
| :--- | :--- | :--- | :--- | :--- |
| **REQ-001** | SPEC-001-01 | FUNC-001-01-01 | ✅ | `src/entities/BoardGame.ts:28` |
| **REQ-001** | SPEC-001-01 | FUNC-001-01-02 | ✅ | `src/repositories/BoardGameRepository.ts:7`<br>`src/services/BoardGameService.ts:10` |
| **REQ-001** | SPEC-001-01 | FUNC-001-01-03 | ✅ | `src/cli/MainCli.ts:65` |
| **REQ-001** | SPEC-001-02 | - | ❌ | - |
| **REQ-001** | SPEC-001-03 | - | ❌ | - |
| **REQ-002** | SPEC-002-01 | FUNC-002-01-01 | ✅ | `src/repositories/BoardGameRepository.ts:8`<br>`src/services/BoardGameService.ts:17` |
| **REQ-002** | SPEC-002-01 | FUNC-002-01-02 | ✅ | `src/cli/MainCli.ts:97` |
| **REQ-002** | SPEC-002-02 | - | ❌ | - |
| **REQ-003** | SPEC-003-01 | FUNC-003-01-01 | ✅ | `src/services/BoardGameService.ts:22` |
| **REQ-003** | SPEC-003-01 | FUNC-003-01-02 | ✅ | `src/cli/MainCli.ts:118` |
| **REQ-003** | SPEC-003-02 | - | ❌ | - |
| **REQ-004** | SPEC-004-01 | FUNC-004-01-01 | ✅ | `src/entities/PlayRecord.ts:28`<br>`src/services/BoardGameService.ts:31` |
| **REQ-004** | SPEC-004-01 | FUNC-004-01-02 | ✅ | `src/entities/PlayRecord.ts:35` |
| **REQ-004** | SPEC-004-02 | - | ❌ | - |
| **REQ-005** | SPEC-005-01 | FUNC-005-01-01 | ✅ | `src/entities/LendingRecord.ts:26`<br>`src/services/BoardGameService.ts:46` |
| **REQ-005** | SPEC-005-01 | FUNC-005-01-02 | ✅ | `src/services/BoardGameService.ts:54` |
| **REQ-005** | SPEC-005-02 | - | ❌ | - |
| **REQ-006** | SPEC-006-01 | FUNC-006-01-01 | ✅ | `src/storage/JsonStorage.ts:19` |
| **REQ-006** | SPEC-006-01 | FUNC-006-01-02 | ✅ | `src/storage/JsonStorage.ts:27` |
| **REQ-006** | SPEC-006-02 | - | ❌ | - |

## 2. 物理トレーサビリティ (コンポーネント → ユニット → 機能)
システム構成要素（物理パス）に対して、どの機能が配置されているかを確認します。

| コンポーネント (COMP) | ユニット (UNIT) | 機能 (FUNC) | 実装状況 | 物理パス |
| :--- | :--- | :--- | :--- | :--- |
| **COMP-DOMAIN** | UNIT-BG-ENTITY | - | ✅ | src/entities/BoardGame.ts |
| **COMP-DOMAIN** | UNIT-PR-ENTITY | - | ✅ | src/entities/PlayRecord.ts |
| **COMP-DOMAIN** | UNIT-LR-ENTITY | - | ✅ | src/entities/LendingRecord.ts |
| **COMP-DOMAIN** | UNIT-SVC | - | ✅ | src/services/BoardGameService.ts |
| **COMP-INFRA** | UNIT-REPO | - | ✅ | src/repositories/BoardGameRepository.ts |
| **COMP-INFRA** | UNIT-STORAGE | - | ✅ | src/storage/JsonStorage.ts |
| **COMP-UI** | UNIT-CLI | - | ✅ | src/cli/MainCli.ts |
