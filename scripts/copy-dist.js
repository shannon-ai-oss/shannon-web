import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
const sourceDir = path.join(rootDir, 'dist');
const targetDir = path.join(rootDir, 'functions-node', 'dist');

if (!fs.existsSync(sourceDir)) {
  console.error(`[copy-dist] Source build output not found at ${sourceDir}. Run the build scripts first.`);
  process.exit(1);
}

const copy = (src, dest) => {
  if (fs.existsSync(src)) {
    fs.cpSync(src, dest, { recursive: true });
    console.info(`[copy-dist] Copied ${src} -> ${dest}`);
  } else {
    console.warn(`[copy-dist] Skipped missing path ${src}`);
  }
};

fs.rmSync(targetDir, { recursive: true, force: true });
fs.mkdirSync(targetDir, { recursive: true });

copy(path.join(sourceDir, 'client'), path.join(targetDir, 'client'));
copy(path.join(sourceDir, 'server'), path.join(targetDir, 'server'));

console.info('[copy-dist] Done');
