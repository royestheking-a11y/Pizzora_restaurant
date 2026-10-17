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

export interface DailyBazarSlipOptions {
  date: string;
  items: Array<{
    sl: number;
    name: string;
    category: string;
    qty: string;
    unitPrice: string;
    totalCost: string;
    currentStock: string;
    supplier: string;
    note?: string;
  }>;
  totalExpense: number;
  totalItems: number;
  totalUnits: number;
}

export const generateDailyBazarSlipPDF = ({ date, items, totalExpense, totalItems, totalUnits }: DailyBazarSlipOptions) => {
  const doc = new jsPDF();
  const dhakaStr = new Date().toLocaleString('en-US', { timeZone: 'Asia/Dhaka', dateStyle: 'medium', timeStyle: 'short' });

  // Header Background Bar (Pizzora Brand Red)
  doc.setFillColor(249, 0, 43); // #F9002B
  doc.rect(0, 0, 210, 32, 'F');

  // Title & Subtitle
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(22);
  doc.setFont('helvetica', 'bold');
  doc.text('PIZZORA RESTAURANT', 14, 15);

  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text('DAILY BAZAR & KITCHEN PROCUREMENT VOUCHER', 14, 23);

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text(`Bazar Date: ${date}  |  Voucher #: BZ-${date.replace(/-/g, '')}`, 14, 29);

  // Summary Metrics Box
  doc.setFillColor(248, 250, 252); // light slate
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(14, 36, 182, 18, 3, 3, 'FD');

  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(100, 116, 139);
  doc.text('TOTAL BAZAR EXPENSE', 20, 43);
  doc.text('TOTAL ITEMS BOUGHT', 85, 43);
  doc.text('TOTAL UNITS', 145, 43);

  doc.setFontSize(13);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(185, 28, 28); // red
  doc.text(`BDT ${Math.round(totalExpense).toLocaleString()}`, 20, 50);

  doc.setTextColor(30, 41, 59);
  doc.text(`${totalItems} Products`, 85, 50);
  doc.text(`${totalUnits} Units`, 145, 50);

  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(148, 163, 184);
  doc.text(`Printed on: ${dhakaStr} (BST)`, 14, 59);

  // Table Body Data
  const tableData = items.map(item => [
    String(item.sl),
    item.name,
    item.category,
    item.qty,
    item.unitPrice,
    item.totalCost,
    item.currentStock,
    item.supplier || 'Local Market'
  ]);

  autoTable(doc, {
    startY: 62,
    head: [['#', 'Item / Raw Material', 'Category', 'Purchased Qty', 'Unit Rate', 'Total Cost', 'Store Stock', 'Market / Vendor']],
    body: tableData,
    foot: [['', 'GRAND TOTAL BAZAR', '', '', '', `BDT ${Math.round(totalExpense).toLocaleString()}`, '', '']],
    theme: 'grid',
    headStyles: {
      fillColor: [249, 0, 43],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 8.5,
      halign: 'left',
      cellPadding: 3.5,
    },
    footStyles: {
      fillColor: [241, 245, 249],
      textColor: [15, 23, 42],
      fontStyle: 'bold',
      fontSize: 9,
      cellPadding: 3.5,
    },
    alternateRowStyles: {
      fillColor: [253, 253, 254],
    },
    styles: {
      font: 'helvetica',
      fontSize: 8,
      cellPadding: 3,
      textColor: [30, 41, 59],
      lineColor: [226, 232, 240],
      lineWidth: 0.1,
    },
    columnStyles: {
      0: { cellWidth: 10, halign: 'center' },
      1: { cellWidth: 42, fontStyle: 'bold' },
      2: { cellWidth: 30 },
      3: { cellWidth: 22, halign: 'center', fontStyle: 'bold' },
      4: { cellWidth: 18, halign: 'right' },
      5: { cellWidth: 22, halign: 'right', fontStyle: 'bold', textColor: [185, 28, 28] },
      6: { cellWidth: 20, halign: 'center' },
      7: { cellWidth: 18 }
    }
  });

  // Signatures Section at bottom
  const finalY = (doc as any).lastAutoTable?.finalY || 180;
  const sigY = Math.min(finalY + 28, 265);

  doc.setDrawColor(203, 213, 225);
  doc.setLineWidth(0.5);

  // Line 1
  doc.line(20, sigY, 65, sigY);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(71, 85, 105);
  doc.text('Prepared By (Bazar Buyer)', 20, sigY + 5);

  // Line 2
  doc.line(85, sigY, 130, sigY);
  doc.text('Verified By (Kitchen / Chef)', 85, sigY + 5);

  // Line 3
  doc.line(150, sigY, 195, sigY);
  doc.text('Approved By (Manager / Owner)', 150, sigY + 5);

  // Footer stamp
  doc.setFontSize(7);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(148, 163, 184);
  doc.text('Pizzora Restaurant ERP | Daily Kitchen Procurement & Inventory Audit System', 14, 288);

  doc.save(`Pizzora_Daily_Bazar_${date.replace(/-/g, '')}.pdf`);
};
