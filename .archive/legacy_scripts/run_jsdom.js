const { execSync } = require('child_process');
console.log(execSync('npx tsx test_jsdom.ts').toString());
