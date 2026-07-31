// Function to prepare a plain text version of the notes
function generatePlainText() {
  if (!currentNoteData || !currentNoteData.structured_notes) return "";
  
  let text = `${currentNoteData.title}\n`;
  text += `Recorded on: ${new Date(currentNoteData.created_at).toLocaleString()}\n\n`;
  
  const struct = currentNoteData.structured_notes;
  
  if (struct.sections) {
    struct.sections.forEach(sec => {
      text += `\n--- ${sec.heading} ---\n`;
      sec.bullets.forEach(b => {
        text += `• ${b}\n`;
      });
    });
  }
  
  if (struct.glossary && struct.glossary.length > 0) {
    text += `\n\n--- GLOSSARY ---\n`;
    struct.glossary.forEach(g => {
      text += `${g.term}: ${g.definition}\n`;
    });
  }
  
  return text;
}

// 1. Export TXT
function exportTXT() {
  if (!currentNoteData) return;
  const text = generatePlainText();
  const blob = new Blob([text], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  
  const a = document.createElement('a');
  a.href = url;
  a.download = `${currentNoteData.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.txt`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// 2. Export PDF via jsPDF
function exportPDF() {
  if (!currentNoteData || !window.jspdf) return;
  
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();
  
  const textLines = doc.splitTextToSize(generatePlainText(), 180);
  
  let y = 20;
  textLines.forEach(line => {
    if (y > 280) {
      doc.addPage();
      y = 20;
    }
    doc.text(line, 15, y);
    y += 7;
  });
  
  doc.save(`${currentNoteData.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.pdf`);
}

// 3. Export DOCX via docx browser package
async function exportDOCX() {
  if (!currentNoteData || !window.docx) return;
  
  const struct = currentNoteData.structured_notes;
  const children = [];
  
  // Title
  children.push(new docx.Paragraph({
    text: currentNoteData.title,
    heading: docx.HeadingLevel.HEADING_1,
    spacing: { after: 300 }
  }));
  
  // Sections
  if (struct.sections) {
    struct.sections.forEach(sec => {
      children.push(new docx.Paragraph({
        text: sec.heading,
        heading: docx.HeadingLevel.HEADING_2,
        spacing: { before: 300, after: 150 }
      }));
      sec.bullets.forEach(b => {
        children.push(new docx.Paragraph({
          text: b,
          bullet: { level: 0 }
        }));
      });
    });
  }
  
  // Glossary
  if (struct.glossary && struct.glossary.length > 0) {
    children.push(new docx.Paragraph({
      text: "Glossary",
      heading: docx.HeadingLevel.HEADING_2,
      spacing: { before: 400, after: 150 }
    }));
    struct.glossary.forEach(g => {
      children.push(new docx.Paragraph({
        children: [
          new docx.TextRun({ text: `${g.term}: `, bold: true }),
          new docx.TextRun({ text: g.definition })
        ]
      }));
    });
  }
  
  const doc = new docx.Document({
    sections: [{
      properties: {},
      children: children
    }]
  });
  
  const blob = await docx.Packer.toBlob(doc);
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${currentNoteData.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.docx`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}