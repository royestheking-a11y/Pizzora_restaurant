import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface PDFExportOptions {
  title: string;
  columns: string[];
  data: string[][];
  filename: string;
}

export const generatePremiumPDF = ({ title, columns, data, filename }: PDFExportOptions) => {
  const doc = new jsPDF();
  
  const dhakaStr = new Date().toLocaleString('en-US', { timeZone: 'Asia/Dhaka', dateStyle: 'medium', timeStyle: 'short' });

  // Add Header (Pizzora Red Theme)
  doc.setFillColor(249, 0, 43); // #F9002B
  doc.rect(0, 0, 210, 30, 'F');
  
  // Title
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(22);
  doc.setFont('helvetica', 'bold');
  doc.text('PIZZORA', 14, 18);
  
  doc.setFontSize(12);
  doc.setFont('helvetica', 'normal');
  doc.text(title, 14, 25);
  
  // Generation Date
  doc.setTextColor(100, 100, 100);
  doc.setFontSize(9);
  doc.text(`Generated on: ${dhakaStr} (Bangladesh Time)`, 14, 38);
  
  // Build Table
  autoTable(doc, {
    startY: 42,
    head: [columns],
    body: data,
    theme: 'striped',
    headStyles: {
      fillColor: [249, 0, 43], // #F9002B
      textColor: 255,
      fontStyle: 'bold',
    },
    alternateRowStyles: {
      fillColor: [250, 250, 250],
    },
    styles: {
      font: 'helvetica',
      fontSize: 9,
      cellPadding: 4,
    }
  });

  doc.save(`${filename}_${Date.now()}.pdf`);
};
