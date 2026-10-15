import { cp, mkdir, writeFile, rm } from 'node:fs/promises';
import { resolve, relative } from 'node:path';
import { readCatalog, projectRoot } from './validate.mjs';

const prompts = await readCatalog();
const output = resolve(projectRoot, 'dist');
if (relative(projectRoot, output) !== 'dist') throw new Error('Build output must be the project dist directory.');
await rm(output, { recursive: true, force: true });
await mkdir(output, { recursive: true });
for (const file of ['index.html', 'styles.css', 'app.js', 'src', 'data', 'assets', 'licenses']) {
  await cp(resolve(projectRoot, file), resolve(output, file), { recursive: true });
}
await writeFile(resolve(output, '.nojekyll'), '');
console.log(`Built ${prompts.length} prompts into dist/. All site assets are local and use relative paths.`);
