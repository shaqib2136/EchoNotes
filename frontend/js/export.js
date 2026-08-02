// Export utilities

export function exportToTXT(note) {
  if (!note) return;
  const struct = note.structured_notes || {};
  
  let content = `${note.title || struct.title || 'Untitled Lecture'}\n`;
  content += `Date: ${new Date(note.created_at).toLocaleDateString()}\n\n`;
  
  const hasSummary = !!struct.summary;
  const hasSections = struct.sections && struct.sections.length > 0;
  const hasGlossary = struct.glossary && struct.glossary.length > 0;

  if (!hasSummary && !hasSections && !hasGlossary && note.raw_transcript) {
    content += `RAW TRANSCRIPT\n`;
    content += `------------------------\n`;
    content += `${note.raw_transcript}\n`;
  } else {
    if (hasSummary) {
      content += `SUMMARY\n`;
      content += `${struct.summary}\n\n`;
    }
    
    if (hasSections) {
      struct.sections.forEach(sec => {
        content += `\n${sec.heading.toUpperCase()}\n`;
        content += `------------------------\n`;
        if (sec.bullets) {
          sec.bullets.forEach(b => {
            content += `* ${b}\n`;
          });
        }
      });
    }
    
    if (hasGlossary) {
      content += `\n\nKEY TERMS\n`;
      content += `------------------------\n`;
      struct.glossary.forEach(g => {
        content += `${g.term}: ${g.definition}\n`;
      });
    }
  }
  
  const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${(note.title || 'lecture-notes').replace(/\s+/g, '-').toLowerCase()}.txt`;
  a.click();
  URL.revokeObjectURL(url);
}

export function exportToPDF(note) {
  if (!window.jspdf) {
    alert("PDF library not loaded yet.");
    return;
  }
  if (!note) return;
  
  const struct = note.structured_notes || {};
  const doc = new window.jspdf.jsPDF();
  
  let y = 20;
  const margin = 20;
  const pageWidth = doc.internal.pageSize.getWidth();
  const maxW = pageWidth - margin * 2;
  
  // Helper to add text and manage page breaks
  function addText(text, size, isBold = false) {
    doc.setFontSize(size);
    doc.setFont("helvetica", isBold ? "bold" : "normal");
    
    const lines = doc.splitTextToSize(text, maxW);
    
    for (let i = 0; i < lines.length; i++) {
      if (y > 280) {
        doc.addPage();
        y = 20;
      }
      doc.text(lines[i], margin, y);
      y += (size * 0.4); // approx line height
    }
    y += 5; // paragraph spacing
  }

  // Title
  addText(note.title || struct.title || 'Untitled Lecture', 22, true);
  y += 5;
  
  const hasSummary = !!struct.summary;
  const hasSections = struct.sections && struct.sections.length > 0;
  const hasGlossary = struct.glossary && struct.glossary.length > 0;

  if (!hasSummary && !hasSections && !hasGlossary && note.raw_transcript) {
    addText("Raw Transcript", 16, true);
    addText(note.raw_transcript, 12, false);
  } else {
    if (hasSummary) {
      addText("Summary", 16, true);
      addText(struct.summary, 12, false);
      y += 5;
    }
    
    if (hasSections) {
      struct.sections.forEach(sec => {
        y += 5;
        addText(sec.heading, 16, true);
        if (sec.bullets) {
          sec.bullets.forEach(b => {
            addText(`• ${b}`, 12, false);
          });
        }
      });
    }
    
    if (hasGlossary) {
      y += 10;
      addText("Key Terms", 16, true);
      struct.glossary.forEach(g => {
        addText(`${g.term}:`, 12, true);
        y -= 5; // pull definition closer to term
        addText(`  ${g.definition}`, 12, false);
      });
    }
  }
  
  doc.save(`${(note.title || 'lecture-notes').replace(/\s+/g, '-').toLowerCase()}.pdf`);
}

export async function exportToDOCX(note) {
  if (!window.docx) {
    alert("DOCX library not loaded yet.");
    return;
  }
  
  const { Document, Packer, Paragraph, TextRun, HeadingLevel } = window.docx;
  
  if (!note) return;
  const struct = note.structured_notes || {};
  
  const children = [];
  
  // Title
  children.push(new Paragraph({
    text: note.title || struct.title || 'Untitled Lecture',
    heading: HeadingLevel.TITLE,
    spacing: { after: 400 }
  }));
  
  // Date
  children.push(new Paragraph({
    text: `Date: ${new Date(note.created_at).toLocaleDateString()}`,
    spacing: { after: 400 }
  }));
  
  const hasSummary = !!struct.summary;
  const hasSections = struct.sections && struct.sections.length > 0;
  const hasGlossary = struct.glossary && struct.glossary.length > 0;

  if (!hasSummary && !hasSections && !hasGlossary && note.raw_transcript) {
    children.push(new Paragraph({
      text: "Raw Transcript",
      heading: HeadingLevel.HEADING_1,
      spacing: { before: 400, after: 200 }
    }));
    children.push(new Paragraph({
      text: note.raw_transcript,
      spacing: { after: 400 }
    }));
  } else {
    if (hasSummary) {
      children.push(new Paragraph({
        text: "Summary",
        heading: HeadingLevel.HEADING_1,
        spacing: { before: 400, after: 200 }
      }));
      children.push(new Paragraph({
        text: struct.summary,
        spacing: { after: 400 }
      }));
    }
    
    if (hasSections) {
      struct.sections.forEach(sec => {
        children.push(new Paragraph({
          text: sec.heading,
          heading: HeadingLevel.HEADING_2,
          spacing: { before: 400, after: 200 }
        }));
        
        if (sec.bullets) {
          sec.bullets.forEach(b => {
            children.push(new Paragraph({
              text: b,
              bullet: { level: 0 }
            }));
          });
        }
      });
    }
    
    if (hasGlossary) {
      children.push(new Paragraph({
        text: "Key Terms",
        heading: HeadingLevel.HEADING_1,
        spacing: { before: 600, after: 200 }
      }));
      
      struct.glossary.forEach(g => {
        children.push(new Paragraph({
          children: [
            new TextRun({ text: `${g.term}: `, bold: true }),
            new TextRun({ text: g.definition })
          ],
          spacing: { after: 200 }
        }));
      });
    }
  }
  
  const doc = new Document({
    sections: [{
      properties: {},
      children: children
    }]
  });
  
  try {
    const blob = await Packer.toBlob(doc);
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${(note.title || 'lecture-notes').replace(/\s+/g, '-').toLowerCase()}.docx`;
    a.click();
    URL.revokeObjectURL(url);
  } catch (e) {
    console.error("DOCX generation error", e);
    alert("Failed to generate DOCX file.");
  }
}
