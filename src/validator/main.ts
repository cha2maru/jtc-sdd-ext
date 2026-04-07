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
  console.log(`DEBUG: args=${args}`);
  const projectDir = args.find(a => !a.startsWith('--'));
  const exportPath = args.includes('--export') ? args[args.indexOf('--export') + 1] : null;
  const sourceDirArg = args.includes('--source') ? args[args.indexOf('--source') + 1] : null;
  const tracePath = args.includes('--trace') ? args[args.indexOf('--trace') + 1] : null;

  if (!projectDir) {
    console.error('Usage: node main.js <project_directory> [--export <csv_path>] [--source <source_directory>] [--trace <report_base_name>]');
    process.exit(1);
  }

  const parser = new MarkdownParser();
  const validator = new ProjectValidator();

  const resolvedProjectDir = path.resolve(process.cwd(), projectDir);
  console.log(`DEBUG: resolvedProjectDir=${resolvedProjectDir}`);

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
        // 生成されたファイルを除外
        .filter(f => !f.includes('traceability-report') && !f.includes('exported'))
        .map(f => ({ path: path.join(dir, f), name: f }));
      console.log(`DEBUG: Found ${files.length} files in ${dir}`);
      allFiles.push(...files);
    } else {
      console.log(`DEBUG: Directory not found: ${dir}`);
    }
  }
  
  const parsePromises = allFiles.map(async (file) => {
    const content = fs.readFileSync(file.path, 'utf-8');
    
    // スキーマの動的決定
    const baseName = path.basename(file.path);
    let schemaName = baseName;
    console.log(`DEBUG: Scanning file=${baseName}, path=${file.path}`);

    if (!SCHEMAS[baseName as keyof typeof SCHEMAS]) {
      // ファイル名パターンでマッチさせる
      if (baseName.startsWith('SPEC-')) {
        schemaName = 'SPEC-XXX.md';
      } else if (baseName.startsWith('TEST-')) {
        schemaName = 'TEST-XXX.md';
      } else if (baseName.startsWith('ACC-')) {
        schemaName = 'ACC-XXX.md';
      } else if (baseName.startsWith('REQ-')) {
        schemaName = 'REQ-XXX.md';
      } else {
        // ファイル名でマッチしない場合、H1タイトルから推測
        const h1Match = content.match(/^# (?:結合試験書|総合試験書|詳細仕様書): \[(TEST|ACC|SPEC)-\d{3,4}\].*$/m);
        if (h1Match && h1Match[1]) {
          schemaName = `${h1Match[1]}-XXX.md`;
        }
      }
    }

    if (!SCHEMAS[schemaName as keyof typeof SCHEMAS]) {
      return null;
    }

    const result = await parser.parse(content, file.path, schemaName);
    return result;
  });

  const results = (await Promise.all(parsePromises)).filter((r): r is NonNullable<typeof r> => r !== null);

  // ソースコードスキャン
  let sourceIds: any[] = [];
  let effectiveSourceDir = sourceDirArg;
  
  // --source が指定されていない場合、プロジェクト内の src を自動探索
  if (!effectiveSourceDir) {
    const autoSrc = path.join(resolvedProjectDir, 'src');
    if (fs.existsSync(autoSrc)) {
      effectiveSourceDir = autoSrc;
    }
  }

  if (effectiveSourceDir && fs.existsSync(effectiveSourceDir)) {
    const scanner = new SourceScanner();
    const resolvedSourceDir = path.resolve(process.cwd(), effectiveSourceDir);
    console.log(`🔍 ソースコードをスキャン中: ${resolvedSourceDir}`);
    sourceIds = await scanner.scan(resolvedSourceDir);
    console.log(`✅ ソースコードから ${sourceIds.length} 個のIDを抽出しました。`);
  } else {
    console.log('⚠️  ソースコードディレクトリが指定されていないか、見つかりません。未実装としてレポートを生成します。');
  }

  const issues = validator.validate(results, projectDir, sourceIds);

  // トレーサビリティレポート (常に生成)
  const effectiveTracePath = tracePath || path.join(resolvedProjectDir, 'traceability-report');
  const extractor = new DependencyExtractor();
  const map = extractor.extractMap(results, sourceIds, projectDir, issues);
  extractor.saveAsJson(map, `${effectiveTracePath}.json`);
  extractor.saveAsMarkdown(map, `${effectiveTracePath}.md`);
  console.log(`📜 トレーサビリティレポートを作成しました: ${effectiveTracePath}.md, ${effectiveTracePath}.json`);

  // CSVエクスポート
  if (exportPath) {
    const exporter = new TestExporter();
    exporter.exportToCsv(results, exportPath);
    console.log(`📊 テスト一覧をエクスポートしました: ${exportPath}`);
  }

  if (issues.length === 0) {
    console.log('✅ バリデーション成功: 不整合は見つかりませんでした。');
  } else {
    console.log(`❌ ${issues.length} 件の不整合が見つかりました:\n`);
    
    // エラーと警告を分けて表示
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
