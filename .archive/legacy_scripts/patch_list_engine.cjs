const fs = require('fs');
const file = 'src/utils/listEngine.ts';
let code = fs.readFileSync(file, 'utf8');

const targetStr = `      const styleId = matchedBullet ? matchedBullet.id : "disc";`;
const replacementStr = `      const styleId = matchedBullet ? matchedBullet.id : existingStyle;`;

if (code.includes(targetStr)) {
    code = code.replace(targetStr, replacementStr);
    fs.writeFileSync(file, code);
    console.log('Patched listEngine.ts');
} else {
    console.log('Target string not found in listEngine.ts');
}
