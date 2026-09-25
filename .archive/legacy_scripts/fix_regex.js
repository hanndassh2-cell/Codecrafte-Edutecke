const raw = "<ul>\n<li>item 1</li>\n<li>item 2</li>\n</ul>";
let clean = raw;
const liCount = (clean.match(/<li/gi) || []).length;
if (liCount === 1) {
    clean = clean.replace(/^<(?:ol|ul)>\s*<li>([\s\S]*?)<\/li>\s*<\/(?:ol|ul)>$/i, "<p>$1</p>");
}
console.log(clean);
