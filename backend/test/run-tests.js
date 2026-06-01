const path = require('path');
const fs = require('fs');
const { run } = require('node:test');
const { spec } = require('node:test/reporters');

const testDir = __dirname;
const files = fs.readdirSync(testDir)
  .filter(f => f.endsWith('.test.js'))
  .map(f => path.join(testDir, f));

if (files.length === 0) {
  console.log('No test files found.');
  process.exit(0);
}

console.log('Found ' + files.length + ' test file(s):');
files.forEach(f => console.log('  - ' + path.basename(f)));
console.log('');

run({ files, timeout: 30000 })
  .compose(spec())
  .pipe(process.stdout);
