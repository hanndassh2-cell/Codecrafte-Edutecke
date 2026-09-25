export const executeCopyWithNative = async (editor: any) => {
  // Try to use native selection to get the real DOM
  const selection = window.getSelection();
  if (selection && selection.rangeCount > 0) {
    const range = selection.getRangeAt(0);
    const div = document.createElement("div");
    div.appendChild(range.cloneContents());
    console.log(div.innerHTML);
  }
}
