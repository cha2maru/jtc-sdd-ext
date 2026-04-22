import fs from 'fs';
import path from 'path';
import { MarkdownParser } from './parser.js';

async function main() {
  const args = process.argv.slice(2);
  const projectDir = args[0];
  const protoFile = args[1] || 'REQ-PROTO.md';

  if (!projectDir) {
    console.error('Usage: node promote-prototype.js <project_directory> [proto_file_name]');
    process.exit(1);
  }

  const resolvedProjectDir = path.resolve(process.cwd(), projectDir);
  const protoFilePath = path.join(resolvedProjectDir, protoFile);

  if (!fs.existsSync(protoFilePath)) {
    console.error(`Prototype file not found: ${protoFilePath}`);
    process.exit(1);
  }

  const parser = new MarkdownParser();
  const content = fs.readFileSync(protoFilePath, 'utf-8');
  const result = await parser.parse(content, protoFilePath, 'REQ-XXX.md');

  const specsDir = path.join(resolvedProjectDir, 'specs');
  if (!fs.existsSync(specsDir)) {
    fs.mkdirSync(specsDir, { recursive: true });
  }

  // SPECごとに分割して保存するロジック (簡易実装)
  // 本来は AST を使ってセクションを切り出すべきだが、ここでは ID 抽出結果をベースにする
  for (const item of result.ids) {
    if (item.id.startsWith('SPEC-') && item.isDefinition) {
      const specFileName = `${item.id}.md`;
      const specPath = path.join(specsDir, specFileName);
      
      if (!fs.existsSync(specPath)) {
        const template = `# [${item.id}] 要件詳細\n\n## 1. 概要\nプロトタイプから自動生成されました。\n\n## 2. 詳細仕様\n(REQ-PROTO.md を参照してください)\n`;
        fs.writeFileSync(specPath, template, 'utf-8');
        console.log(`✅ Generated: ${specFileName}`);
      }
    }
  }

  console.log('\n🚀 Promotion completed. Please manually distribute SPEC/FUNC/DATA details from REQ-PROTO.md to generated spec files.');
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
