export function stripTableFormatting(doc: Document) {
  const tableElements = doc.querySelectorAll("table, tr, td, th, tbody, thead, tfoot");
  tableElements.forEach((el) => {
    el.removeAttribute("width");
    el.removeAttribute("height");
    el.removeAttribute("border");
    el.removeAttribute("cellspacing");
    el.removeAttribute("cellpadding");
    el.removeAttribute("valign");
    el.removeAttribute("align");
    el.removeAttribute("colspan");
    el.removeAttribute("rowspan");
    el.removeAttribute("bgcolor");

    const styleAttr = el.getAttribute("style");
    if (styleAttr) {
      const props = styleAttr.split(";");
      const preserved: string[] = [];
      props.forEach((prop) => {
        const parts = prop.split(":");
        if (parts.length >= 2) {
          const key = parts[0].trim().toLowerCase();
          const val = parts.slice(1).join(":").trim();

          // Exclude styles that the user explicitly wants to ignore
          if (
            key.includes("border") ||
            key.includes("width") ||
            key.includes("height") ||
            key.includes("color") ||
            key.includes("background") ||
            key.includes("margin") ||
            key.includes("padding") ||
            key.includes("align") ||
            key === "vertical-align" ||
            key === "text-align"
          ) {
            return;
          }
          preserved.push(`${key}: ${val}`);
        }
      });
      if (preserved.length > 0) {
        el.setAttribute("style", preserved.join("; "));
      } else {
        el.removeAttribute("style");
      }
    }
  });
}
