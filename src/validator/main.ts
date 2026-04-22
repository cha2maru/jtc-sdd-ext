import fs from 'fs';
import path from 'path';
import { MarkdownParser } from './parser.js';
import { ProjectValidator } from './validator.js';
import { SCHEMAS } from './schemas.js';
import { TestExporter } from './exporter.js';
import { SourceScanner } from './source-scanner.js';
import { DependencyExtractor } from './dependency-extractor.js';

async function main() {
  const args = process.argv.slice(2);
  const projectDir = args.find(a => !a.startsWith('--'));
  const exportPath = args.includes('--export') ? args[args.indexOf('--export') + 1] : null;
  const sourceDirArg = args.includes('--source') ? args[args.indexOf('--source') + 1] : null;
  const tracePath = args.includes('--trace') ? args[args.indexOf('--trace') + 1] : null;
  const queryType = args.includes('--query') ? args[args.indexOf('--query') + 1] : null;
  const queryId = args.includes('--id') ? args[args.indexOf('--id') + 1] : null;

  if (!projectDir) {
    console.error('Usage: node main.js <project_directory> [--export <csv_path>] [--source <source_directory>] [--trace <report_base_name>] [--query <impact|tree> --id <ID>]');
    process.exit(1);
  }

  const parser = new MarkdownParser();
  const validator = new ProjectValidator();

  const resolvedProjectDir = path.resolve(process.cwd(), projectDir);

  // 1. スキャニング対象のディレクトリを定義
  const scanDirs = [
    resolvedProjectDir,
    path.join(resolvedProjectDir, 'specs'),
    path.join(resolvedProjectDir, 'tests/integration'),
    path.join(resolvedProjectDir, 'tests/acceptance'),
  ];

  const allFiles: { path: string; name: string }[] = [];
  for (const dir of scanDirs) {
    if (fs.existsSync(dir)) {
      const files = fs.readdirSync(dir)
        .filter(f => f.endsWith('.md'))
        .filter(f => !f.includes('traceability-report') && !f.includes('exported'))
        .map(f => ({ path: path.join(dir, f), name: f }));
      console.log(`DEBUG: Scanning directory: ${dir}, found ${files.length} md files.`);
      allFiles.push(...files);
    }
  }
  
  const parsePromises = allFiles.map(async (file) => {
    const content = fs.readFileSync(file.path, 'utf-8');
    const baseName = path.basename(file.path);
    let schemaName = baseName;

    if (!SCHEMAS[baseName as keyof typeof SCHEMAS]) {
      if (baseName.startsWith('SPEC-')) {
        schemaName = 'SPEC-XXX.md';
      } else if (baseName.startsWith('TEST-')) {
        schemaName = 'TEST-XXX.md';
      } else if (baseName.startsWith('ACC-')) {
        schemaName = 'ACC-XXX.md';
      } else if (baseName.startsWith('REQ-')) {
        schemaName = 'REQ-XXX.md';
      } else {
        const h1Match = content.match(/^# (?:結合試験書|総合試験書|詳細仕様書): \[(TEST|ACC|SPEC)-\d{3,4}\].*$/m);
        if (h1Match && h1Match[1]) {
          schemaName = `${h1Match[1]}-XXX.md`;
        }
      }
    }

    if (!SCHEMAS[schemaName as keyof typeof SCHEMAS]) {
      console.log(`DEBUG: No schema found for ${baseName} (guessed: ${schemaName})`);
      return null;
    }

    const result = await parser.parse(content, file.path, schemaName);
    console.log(`DEBUG: Parsed ${baseName} using ${schemaName}, found ${result.ids.length} IDs.`);
    return result;
  });

  const results = (await Promise.all(parsePromises)).filter((r): r is NonNullable<typeof r> => r !== null);

  // ソースコードスキャン
  let sourceIds: any[] = [];
  let effectiveSourceDir = sourceDirArg;
  
  if (!effectiveSourceDir) {
    const autoSrc = path.join(resolvedProjectDir, 'src');
    if (fs.existsSync(autoSrc)) {
      effectiveSourceDir = autoSrc;
    }
  }

  if (effectiveSourceDir && fs.existsSync(effectiveSourceDir)) {
    const scanner = new SourceScanner();
    const resolvedSourceDir = path.resolve(process.cwd(), effectiveSourceDir);
    sourceIds = await scanner.scan(resolvedSourceDir);
  }

  const issues = validator.validate(results, projectDir, sourceIds);

  // クエリ処理
  if (queryType) {
    if (queryType === 'impact' && queryId) {
      const impact = validator.getImpact(queryId);
      console.log(JSON.stringify({ id: queryId, impact }, null, 2));
      process.exit(0);
    } else if (queryType === 'tree' && queryId) {
      const tree = validator.getTree(queryId);
      console.log(JSON.stringify(tree, null, 2));
      process.exit(0);
    } else if (queryType === 'summary') {
      const summary = validator.getSummary();
      const missingTests = validator.getMissingTests();
      
      console.log('\n--- 📊 プロジェクト進捗サマリー ---');
      console.log(`REQ:  ${summary.stats.REQ.detailed}/${summary.stats.REQ.total} (詳細化済み)`);
      console.log(`SPEC: ${summary.stats.SPEC.functional}/${summary.stats.SPEC.total} (機能定義済み)`);
      console.log(`FUNC: ${summary.stats.FUNC.implemented}/${summary.stats.FUNC.total} (実装済み)`);
      console.log(`UNIT: ${summary.stats.UNIT.implemented}/${summary.stats.UNIT.total} (定義済み)`);
      console.log(`TEST: ${summary.stats.TEST.implemented}/${summary.stats.TEST.total} (実装済み)`);
      console.log(`ACC:  ${summary.stats.ACC.implemented}/${summary.stats.ACC.total} (実装済み)`);
      console.log('---');
      console.log(`実装網羅率: ${(summary.coverage.implementation * 100).toFixed(1)}%`);
      console.log(`試験網羅率: ${(summary.coverage.test * 100).toFixed(1)}%`);
      console.log(`テスト未定義数: 🟡 ${missingTests.length} 件`);
      console.log(`検出された不整合: 🔴 ${summary.issues.errors} / 🟡 ${summary.issues.warnings}`);
      process.exit(0);
    } else if (queryType === 'list-missing-tests') {
      const missing = validator.getMissingTests();
      console.log(JSON.stringify(missing, null, 2));
      process.exit(0);
    } else {
      console.error(`Invalid query or missing ID: type=${queryType}, id=${queryId}`);
      process.exit(1);
    }
  }

  // トレーサビリティレポート
  const effectiveTracePath = tracePath || path.join(resolvedProjectDir, 'traceability-report');
  const extractor = new DependencyExtractor();
  const map = extractor.extractMap(results, sourceIds, projectDir, issues);
  extractor.saveAsJson(map, `${effectiveTracePath}.json`);
  extractor.saveAsMarkdown(map, `${effectiveTracePath}.md`);

  // CSVエクスポート
  if (exportPath) {
    const exporter = new TestExporter();
    exporter.exportToCsv(results, exportPath);
  }

  if (issues.length === 0) {
    console.log('✅ バリデーション成功: 不整合は見つかりませんでした。');
  } else {
    console.log(`❌ ${issues.length} 件の不整合が見つかりました:\n`);
    issues.sort((a, b) => a.severity === 'error' ? -1 : 1).forEach(issue => {
      const prefix = issue.severity === 'error' ? '🔴' : '🟡';
      const idPart = issue.id ? ` [${issue.id}]` : '';
      const linePart = issue.line ? ` (L${issue.line})` : '';
      console.log(`${prefix} ${issue.file}${linePart}${idPart}: ${issue.message}`);
    });

    if (issues.some(i => i.severity === 'error')) {
      process.exit(1);
    }
  }
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
