const { jsPDF } = require("jspdf");

const doc = new jsPDF();
doc.text("Hello", 50, 50, { angle: 90 });
doc.save("test.pdf");
