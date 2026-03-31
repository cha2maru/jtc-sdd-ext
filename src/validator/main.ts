import fs from 'fs';
import path from 'path';
import { MarkdownParser } from './parser.js';
import { ProjectValidator } from './validator.js';
import { SCHEMAS } from './schemas.js';
import { TestExporter } from './exporter.js';

async function main() {
  const args = process.argv.slice(2);
  console.log(`DEBUG: args=${args}`);
  const projectDir = args.find(a => !a.startsWith('--'));
  const exportPath = args.includes('--export') ? args[args.indexOf('--export') + 1] : null;

  if (!projectDir) {
    console.error('Usage: node main.js <project_directory> [--export <csv_path>]');
    process.exit(1);
  }

  const parser = new MarkdownParser();
  const validator = new ProjectValidator();

  const resolvedProjectDir = path.resolve(process.cwd(), projectDir);
  console.log(`DEBUG: resolvedProjectDir=${resolvedProjectDir}`);

  // 1. スキャニング対象のディレクトリを定義
  const scanDirs = [
    resolvedProjectDir,
    path.join(resolvedProjectDir, 'tests/integration'),
    path.join(resolvedProjectDir, 'tests/acceptance'),
  ];

  const allFiles: { path: string; name: string }[] = [];
  for (const dir of scanDirs) {
    if (fs.existsSync(dir)) {
      const files = fs.readdirSync(dir)
        .filter(f => f.endsWith('.md'))
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
    let schemaName = file.name;
    const baseName = path.basename(file.path);
    console.log(`DEBUG: Scanning file=${baseName}, path=${file.path}`);

    if (!SCHEMAS[baseName as keyof typeof SCHEMAS]) {
      // ファイル名でマッチしない場合、H1タイトルから推測
      const h1Match = content.match(/^# (?:結合試験書|総合試験書): \[(TEST|ACC)-\d{3,4}\].*$/m);
      if (h1Match && h1Match[1]) {
        schemaName = h1Match[1] === 'TEST' ? 'TEST-XXX.md' : 'ACC-XXX.md';
      }
    }

    if (!SCHEMAS[schemaName as keyof typeof SCHEMAS]) {
      return null;
    }

    const result = await parser.parse(content, schemaName);
    result.file = file.path; // 表示用にフルパスをセット
    return result;
  });

  const results = (await Promise.all(parsePromises)).filter((r): r is NonNullable<typeof r> => r !== null);

  const issues = validator.validate(results, projectDir);

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
