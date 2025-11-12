const fs = require('fs');
const file = 'server.js';
let s = fs.readFileSync(file, 'utf8');

// 1) Split lines for robust surgery
let lines = s.split(/\r?\n/);

// 2) Remove ANY line that is exactly a path require (single line)
lines = lines.filter(l => !/^\s*const\s+path\s*=\s*require\(['"]path['"]\);\s*$/.test(l));

// 3) If someone inlined "express + path" on one line, split it to only express
lines = lines.flatMap(l => {
  // e.g. const express = require('express');const path = require("path");
  const m = l.match(/^\s*const\s+express\s*=\s*require\(['"]express['"]\);\s*const\s+path\s*=\s*require\(['"]path['"]\);\s*$/);
  if (m) return ["const express = require('express');"]; // drop the inline path
  return [l];
});

// 4) Join back temporarily
s = lines.join('\n');

// 5) Ensure ONE path require right after the express require
if (!/const\s+path\s*=\s*require\(['"]path['"]\);/.test(s)) {
  s = s.replace(
    /(const\s+express\s*=\s*require\(['"]express['"]\);\s*)/,
    "$1\nconst path = require('path');\n"
  );
}

// 6) (Optional) ensure single express.static and single assets mount
// Remove duplicates:
s = s.replace(/^\s*app\.use\(\s*express\.static\([\s\S]*?\)\);\s*$/gm, '');
s = s.replace(/^\s*app\.use\(\s*['"]\/api['"]\s*,\s*require\(['"]\.\/routes\/assets['"]\)\s*\);\s*$/gm, '');

// Reinsert one express.static right after app = express()
s = s.replace(
  /(const\s+app\s*=\s*express\(\);\s*)/,
  "$1\napp.use(express.static(path.join(__dirname, 'public'), { extensions: ['html'] }));\n"
);

// Reinsert one assets mount before app.listen(...)
if (/app\.listen\(/.test(s)) {
  s = s.replace(/app\.listen\([\s\S]*?\);\s*$/, (m) => "app.use('/api', require('./routes/assets'));\n" + m);
} else {
  s += "\napp.use('/api', require('./routes/assets'));\n";
}

fs.writeFileSync(file, s);
console.log('✅ Fixed duplicate path require and normalized server.js');
