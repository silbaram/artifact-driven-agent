import { readFileSync, writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const cliPath = join(__dirname, '..', 'dist', 'bin', 'cli.js');
const shebang = '#!/usr/bin/env node\n';

try {
  const content = readFileSync(cliPath, 'utf-8');
  if (!content.startsWith('#!')) {
    writeFileSync(cliPath, shebang + content);
    console.log('Shebang added to dist/bin/cli.js');
  } else {
    console.log('Shebang already exists');
  }
} catch (error) {
  console.error('Error adding shebang:', error.message);
  process.exit(1);
}
