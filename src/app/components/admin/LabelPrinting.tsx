import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { Printer, Tag } from 'lucide-react';

export function LabelPrinting() {
  const { state } = useApp();
  const [selectedItem, setSelectedItem] = useState(state.menuItems[0]?.id || '');
  const [printQuantity, setPrintQuantity] = useState(1);

  const selectedMenu = state.menuItems.find(m => m.id === selectedItem);

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6 animate-fade-in print-hidden">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold" style={{ fontFamily: 'var(--font-heading)', color: '#111' }}>Label & Barcode Printing</h2>
          <p className="text-gray-500 text-sm mt-1">Print inventory and product labels with barcodes.</p>
        </div>
      </div>

      <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col md:flex-row gap-8">
        {/* Controls */}
        <div className="flex-1 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Select Product</label>
            <select
              value={selectedItem}
              onChange={e => setSelectedItem(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl border-2 border-gray-100 outline-none focus:border-red-500 transition-colors bg-white"
            >
              {state.menuItems.map(item => (
                <option key={item.id} value={item.id}>{item.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Quantity to Print</label>
            <input
              type="number"
              min="1"
              value={printQuantity}
              onChange={e => setPrintQuantity(parseInt(e.target.value) || 1)}
              className="w-full px-4 py-2.5 rounded-xl border-2 border-gray-100 outline-none focus:border-red-500 transition-colors"
            />
          </div>
          <button
            onClick={handlePrint}
            className="flex items-center justify-center gap-2 w-full py-3 rounded-xl font-bold text-white transition-all shadow-lg hover:-translate-y-0.5"
            style={{ background: `linear-gradient(135deg, #111, #333)` }}
          >
            <Printer size={18} /> Print Labels
          </button>
          
          <div className="bg-blue-50 text-blue-800 p-4 rounded-xl text-sm border border-blue-100">
            <strong>Tip:</strong> In the print dialog, ensure "Background graphics" is enabled and headers/footers are disabled for the best result.
          </div>
        </div>

        {/* Live Preview */}
        <div className="flex-1 flex flex-col items-center justify-center bg-gray-50 p-6 rounded-2xl border-2 border-dashed border-gray-200">
          <p className="text-gray-400 text-sm font-semibold uppercase tracking-widest mb-4">Live Preview</p>
          {selectedMenu && (
            <div className="bg-white p-4 border-2 border-gray-900 rounded-lg w-[250px] shadow-sm flex flex-col items-center text-center">
              <h3 className="font-bold text-lg uppercase tracking-tight leading-tight">{selectedMenu.name}</h3>
              <p className="text-xs text-gray-500 font-medium mb-2">{selectedMenu.category}</p>
              
              {/* Mock Barcode visual using CSS borders */}
              <div className="flex h-12 w-full justify-center items-end gap-[1px] mb-1">
                {[...Array(40)].map((_, i) => (
                  <div key={i} className="bg-black" style={{ width: Math.random() > 0.5 ? '2px' : '3px', height: Math.random() > 0.3 ? '100%' : '80%' }} />
                ))}
              </div>
              <p className="text-[10px] tracking-widest font-mono text-gray-600">{selectedMenu.id.toUpperCase()}-{Date.now().toString().slice(-4)}</p>
              
              <div className="mt-2 pt-2 border-t-2 border-dashed border-gray-200 w-full flex justify-between items-center">
                <span className="text-xs font-bold text-gray-400">PIZZORA</span>
                <span className="text-sm font-black">৳ {selectedMenu.price}</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ─── PRINT ONLY SECTION ────────────────────────────────────────────── */}
      <div className="hidden print-block">
        <div className="print-container">
          {Array.from({ length: printQuantity }).map((_, idx) => (
            <div key={idx} className="print-label">
              <h3 className="print-title">{selectedMenu?.name}</h3>
              <p className="print-cat">{selectedMenu?.category}</p>
              <div className="print-barcode">
                {/* Simplified visual mock for print */}
                {[...Array(30)].map((_, i) => (
                  <div key={i} style={{ backgroundColor: '#000', width: i % 3 === 0 ? '3px' : '2px', height: '100%' }} />
                ))}
              </div>
              <p className="print-id">{selectedMenu?.id.toUpperCase()}-{Date.now().toString().slice(-4)}</p>
              <div className="print-footer">
                <span>PIZZORA</span>
                <span style={{ fontSize: '14px' }}>৳ {selectedMenu?.price}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
      
      {/* Dynamic print styles injected */}
      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          .print-hidden {
            display: none !important;
          }
          .print-block, .print-block * {
            visibility: visible;
          }
          .print-block {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
          }
          .print-container {
            display: flex;
            flex-wrap: wrap;
            gap: 10px;
          }
          .print-label {
            width: 2.25in;
            height: 1.25in;
            border: 1px solid #000;
            padding: 8px;
            box-sizing: border-box;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: space-between;
            page-break-inside: avoid;
            font-family: sans-serif;
          }
          .print-title { font-size: 12px; font-weight: bold; text-transform: uppercase; margin: 0; text-align: center; line-height: 1.1; }
          .print-cat { font-size: 9px; color: #555; margin: 2px 0 0 0; }
          .print-barcode { display: flex; height: 35px; width: 100%; justify-content: center; gap: 1px; margin-top: 4px; }
          .print-id { font-size: 9px; font-family: monospace; letter-spacing: 2px; margin: 2px 0 0 0; }
          .print-footer { display: flex; justify-content: space-between; width: 100%; border-top: 1px dashed #ccc; padding-top: 4px; margin-top: 4px; font-size: 10px; font-weight: bold; }
        }
      `}</style>
    </div>
  );
}
