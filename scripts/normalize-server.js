const fs = require('fs');
const file = 'server.js';
let s = fs.readFileSync(file, 'utf8');

// 1) Remove ALL existing path requires, then reinsert ONE after express require
s = s.replace(/^\s*const\s+path\s*=\s*require\(['"]path['"]\);\s*$/gm, '');
s = s.replace(/(const\s+express\s*=\s*require\(['"]express['"]\);\s*)/, `$1\nconst path = require('path');\n`);

// 2) Ensure ONLY ONE express.static for ./public (remove all, then insert after app = express())
s = s.replace(/^\s*app\.use\(\s*express\.static\([\s\S]*?\)\);\s*$/gm, '');
s = s.replace(/(const\s+app\s*=\s*express\(\);\s*)/, `$1\napp.use(express.static(path.join(__dirname, 'public'), { extensions: ['html'] }));\n`);

// 3) Ensure ONLY ONE assets route mount
s = s.replace(/^\s*app\.use\(\s*['"]\/api['"]\s*,\s*require\(['"]\.\/routes\/assets['"]\)\s*\);\s*$/gm, '');
if (s.includes('app.listen(')) {
  s = s.replace(/app\.listen\([\s\S]*?\);\s*$/, (m) => `app.use('/api', require('./routes/assets'));\n${m}`);
} else {
  // if no listen found yet, just append (safe)
  s += `\napp.use('/api', require('./routes/assets'));\n`;
}

fs.writeFileSync(file, s);
console.log('✅ server.js normalized');
