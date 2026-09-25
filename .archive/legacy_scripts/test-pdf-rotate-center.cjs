const { jsPDF } = require("jspdf");

const doc = new jsPDF();
doc.text("Hello", 50, 50, { angle: 90, align: "center", baseline: "middle" });
doc.text("Hello2", 100, 50, { angle: -90, align: "center", baseline: "middle" });
doc.save("test-center.pdf");
