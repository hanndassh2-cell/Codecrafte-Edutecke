export function oklchToRgbInside(inside: string): string {
  try {
    // inside looks like "0.623 0.214 259.815" or "62.3% 0.214 259.815 / 0.5"
    const cleanInside = inside.replace(/\/\s*/, ' ').trim();
    const parts = cleanInside.split(/\s+/);
    if (parts.length >= 3) {
      let p1 = parts[0];
      let p2 = parts[1];
      let p3 = parts[2];
      let p4 = parts[3];

      let L = parseFloat(p1);
      if (p1.endsWith('%')) L /= 100;

      let C = parseFloat(p2);
      if (p2.endsWith('%')) C /= 100;

      let H = parseFloat(p3);

      let A = 1;
      if (p4 !== undefined && p4 !== '') {
        A = parseFloat(p4);
        if (p4.endsWith('%')) A /= 100;
      }

      if (!isNaN(L) && !isNaN(C) && !isNaN(H)) {
        const hRad = (H * Math.PI) / 180;
        const a = C * Math.cos(hRad);
        const b = C * Math.sin(hRad);

        const l_ = L + 0.3963377774 * a + 0.2158037573 * b;
        const m_ = L - 0.1055613458 * a - 0.0638541728 * b;
        const s_ = L - 0.0894841775 * a - 0.1291986454 * b;

        const l = l_ * l_ * l_;
        const m = m_ * m_ * m_;
        const s = s_ * s_ * s_;

        const rLin = +4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s;
        const gLin = -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s;
        const bLin = -0.0041960863 * l - 0.7034186147 * m + 1.7076147010 * s;

        const transfer = (c: number) => {
          if (c <= 0.0031308) return 12.92 * c;
          return 1.055 * Math.pow(Math.max(0, c), 1 / 2.4) - 0.055;
        };

        const R = Math.min(255, Math.max(0, Math.round(transfer(rLin) * 255)));
        const G = Math.min(255, Math.max(0, Math.round(transfer(gLin) * 255)));
        const B = Math.min(255, Math.max(0, Math.round(transfer(bLin) * 255)));

        if (!isNaN(A) && A < 1) {
          return `rgba(${R}, ${G}, ${B}, ${A.toFixed(2)})`;
        }
        return `rgb(${R}, ${G}, ${B})`;
      }
    }
  } catch {
    // ignore
  }
  return 'rgb(30, 41, 59)';
}

function replaceCSSFunction(str: string, fnName: string, replacementFn: (inside: string) => string): string {
  let lower = str.toLowerCase();
  let searchIdx = 0;
  while ((searchIdx = lower.indexOf(fnName + '(', searchIdx)) !== -1) {
    let start = searchIdx;
    let parenCount = 1;
    let i = start + fnName.length + 1;
    while (i < str.length && parenCount > 0) {
      if (str[i] === '(') parenCount++;
      else if (str[i] === ')') parenCount--;
      i++;
    }
    if (parenCount === 0) {
      const inside = str.slice(start + fnName.length + 1, i - 1);
      const replaced = replacementFn(inside);
      str = str.slice(0, start) + replaced + str.slice(i);
      lower = str.toLowerCase();
      searchIdx = start + replaced.length;
    } else {
      break;
    }
  }
  return str;
}

export function sanitizeCssString(cssStr: string): string {
  if (!cssStr) return cssStr;
  let result = cssStr;

  const fnNames = ['oklch', 'oklab', 'color-mix', 'light-dark', 'color', 'lab', 'lch', 'hwb'];
  for (const fnName of fnNames) {
    if (result.toLowerCase().includes(fnName + '(')) {
      if (fnName === 'oklch' || fnName === 'oklab') {
        result = replaceCSSFunction(result, fnName, oklchToRgbInside);
      } else if (fnName === 'light-dark') {
        result = replaceCSSFunction(result, fnName, (inside) => {
          const parts = inside.split(',');
          return parts[0] ? parts[0].trim() : 'rgb(255, 255, 255)';
        });
      } else if (fnName === 'color-mix') {
        result = replaceCSSFunction(result, fnName, () => 'rgb(226, 232, 240)');
      } else {
        result = replaceCSSFunction(result, fnName, () => 'rgb(15, 23, 42)');
      }
    }
  }

  // Safety fallback regexes for any missed or malformed functions
  result = result.replace(/oklch\([^)]*\)/gi, 'rgb(30, 41, 59)');
  result = result.replace(/oklab\([^)]*\)/gi, 'rgb(30, 41, 59)');
  result = result.replace(/color-mix\([^)]*\)/gi, 'rgb(226, 232, 240)');
  result = result.replace(/light-dark\([^)]*\)/gi, 'rgb(255, 255, 255)');
  result = result.replace(/color\([^)]*\)/gi, 'rgb(15, 23, 42)');

  return result;
}

export function sanitizeClonedDocument(clonedDoc: Document): void {
  try {
    // 1. Process all existing <style> elements in clonedDoc
    const styleElements = clonedDoc.querySelectorAll('style');
    styleElements.forEach((styleTag) => {
      if (styleTag.textContent) {
        styleTag.textContent = sanitizeCssString(styleTag.textContent);
      }
    });

    // 2. Read document.styleSheets from the main document to inline sanitized CSS rules
    let combinedCss = "";
    try {
      Array.from(document.styleSheets).forEach((sheet) => {
        try {
          const rules = sheet.cssRules || sheet.rules;
          if (rules) {
            Array.from(rules).forEach((rule) => {
              combinedCss += rule.cssText + "\n";
            });
          }
        } catch {
          // Cross-origin CSS access warning (if any)
        }
      });
    } catch (e) {
      console.warn("Could not read document.styleSheets:", e);
    }

    if (combinedCss) {
      const sanitizedCombined = sanitizeCssString(combinedCss);
      const newStyle = clonedDoc.createElement('style');
      newStyle.id = "inlined-sanitized-styles";
      newStyle.textContent = sanitizedCombined;
      clonedDoc.head.appendChild(newStyle);

      // Remove <link rel="stylesheet"> tags so html2canvas doesn't re-fetch raw un-sanitized CSS files
      const linkElements = clonedDoc.querySelectorAll('link[rel="stylesheet"]');
      linkElements.forEach((link) => link.remove());
    }

    // 3. Process inline styles on all elements
    const allElements = clonedDoc.querySelectorAll('*');
    allElements.forEach((el) => {
      const htmlEl = el as HTMLElement;
      if (htmlEl.style) {
        if (htmlEl.style.cssText) {
          htmlEl.style.cssText = sanitizeCssString(htmlEl.style.cssText);
        }
        // Force letterSpacing to normal to prevent html2canvas character segmentation for Arabic text
        htmlEl.style.letterSpacing = 'normal';
      }
    });

    // 4. Inject global override rule for letter-spacing and Arabic font rendering
    const rtlStyle = clonedDoc.createElement('style');
    rtlStyle.textContent = `
      * {
        letter-spacing: normal !important;
        word-spacing: normal !important;
      }
      body, .a4-print-sheet, .print-preview-modal-root {
        direction: rtl !important;
        font-family: 'Cairo', 'Tajawal', 'IBM Plex Sans Arabic', -apple-system, sans-serif !important;
      }
    `;
    clonedDoc.head.appendChild(rtlStyle);
  } catch (err) {
    console.warn("sanitizeClonedDocument error:", err);
  }
}
