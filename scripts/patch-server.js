const fs = require('fs');
const p = 'server.js';
let s = fs.readFileSync(p, 'utf8');

if (!s.includes("const path = require('path');")) {
  s = s.replace(/(const\s+express\s*=\s*require\(['"]express['"]\);?)/,
    "$1\nconst path = require('path');");
}

if (!s.includes('express.static(')) {
  s = s.replace(/const\s+app\s*=\s*express\(\);/,
    "const app = express();\napp.use(express.static(path.join(__dirname, 'public'), { extensions: ['html'] }));");
}

if (!s.includes("require('./routes/assets')")) {
  if (s.includes('app.listen(')) {
    s = s.replace(/app\.listen\([\s\S]*?\);/,
      "app.use('/api', require('./routes/assets'));\n$&");
  } else {
    s += "\napp.use('/api', require('./routes/assets'));\n";
  }
}

fs.writeFileSync(p, s);
console.log('server.js patched');
