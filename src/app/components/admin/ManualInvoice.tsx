import React, { useState } from 'react';
import { Printer, Mail, MapPin, Phone as PhoneIcon } from 'lucide-react';

interface InvoiceItem {
  quantity: string;
  itemNumber: string;
  description: string;
  unitPrice: string;
  total: string;
}

export function ManualInvoice() {
  const [clientName, setClientName] = useState('');
  const [clientAddress, setClientAddress] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [notes, setNotes] = useState('');
  
  const [items, setItems] = useState<InvoiceItem[]>(
    Array(10).fill({ quantity: '', itemNumber: '', description: '', unitPrice: '', total: '' })
  );

  const [taxPercent, setTaxPercent] = useState('');

  const computedSubtotal = items.reduce((sum, item) => sum + (parseFloat(item.total) || 0), 0);
  const computedTaxAmount = computedSubtotal * ((parseFloat(taxPercent) || 0) / 100);
  const computedTotal = computedSubtotal + computedTaxAmount;

  const updateItem = (index: number, field: keyof InvoiceItem, value: string) => {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], [field]: value };
    
    // Auto calculate total if quantity and price are present
    if (field === 'quantity' || field === 'unitPrice') {
      const q = parseFloat(newItems[index].quantity || '0');
      const p = parseFloat(newItems[index].unitPrice || '0');
      if (!isNaN(q) && !isNaN(p) && q > 0 && p > 0) {
        newItems[index].total = (q * p).toFixed(2);
      }
    }
    
    setItems(newItems);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="flex flex-col h-full bg-[#F3F4F6]">
      <style>
        {`
          @media print {
            @page {
              size: A4 portrait;
              margin: 0;
            }
            html, body {
              width: 100%;
              height: 100%;
              margin: 0;
              padding: 0;
              overflow: hidden;
            }
            body * {
              visibility: hidden;
            }
            .print-hidden {
              display: none !important;
            }
            .print-hidden-container {
              overflow: visible !important;
              padding: 0 !important;
            }
            #printable-invoice, #printable-invoice * {
              visibility: visible;
            }
            #printable-invoice {
              position: absolute;
              left: 0;
              top: 0;
              width: 100% !important;
              height: 100% !important;
              max-height: 100% !important;
              margin: 0;
              padding: 0;
              overflow: hidden !important;
              page-break-after: avoid;
              page-break-before: avoid;
              background-color: white !important;
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
            }
            /* Hide inputs and textareas in print, show just their values by making them look like normal text */
            input, textarea {
              border: none !important;
              background: transparent !important;
              outline: none !important;
              resize: none !important;
              box-shadow: none !important;
              padding: 0 !important;
              margin: 0 !important;
              color: black !important;
              font-family: inherit;
            }
            input::placeholder, textarea::placeholder {
              color: transparent !important;
            }
          }
        `}
      </style>

      {/* Editor Controls (Hidden in Print) */}
      <div className="p-6 bg-white border-b print-hidden flex justify-between items-center shadow-sm">
        <div>
          <h2 className="text-2xl font-black text-gray-900" style={{ fontFamily: 'var(--font-heading)' }}>Manual Invoice / Pad</h2>
          <p className="text-sm text-gray-500 mt-1">Fill out the fields below and click Print. Backgrounds will automatically be printed.</p>
        </div>
        <button
          onClick={handlePrint}
          className="flex items-center gap-2 px-6 py-3 bg-[#F9002B] text-white rounded-xl font-bold hover:bg-[#C8001F] transition-colors shadow-lg hover:shadow-xl"
        >
          <Printer size={20} />
          Print Invoice
        </button>
      </div>

      {/* Invoice Canvas */}
      <div className="flex-1 overflow-auto p-4 md:p-8 flex justify-center print-hidden-container">
        {/* A4 Size Paper Container */}
        <div
          id="printable-invoice"
          className="bg-white relative overflow-hidden shadow-2xl flex flex-col"
          style={{
            width: '210mm',
            height: '297mm',
            maxHeight: '297mm',
            backgroundColor: '#ffffff',
            position: 'relative'
          }}
        >
          {/* WATERMARK */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-0 opacity-[0.03] overflow-hidden">
            <img src="/pizzoralogo.png" alt="Pizzora Watermark" className="w-[120%] max-w-none h-auto object-contain rotate-[-15deg]" />
          </div>

          <div className="relative z-10 flex flex-col flex-1 h-full">
            {/* HEADER */}
            <div className="flex h-16 mb-8">
              {/* Red Bar */}
              <div className="bg-[#E31837] flex-1 flex items-end pb-3 pl-12">
                <h1 className="text-white text-[32px] font-normal tracking-wide">invoice</h1>
              </div>
              {/* Logo Area */}
              <div className="w-[35%] bg-white flex flex-col items-center justify-center pt-4 pr-6">
                <img src="/pizzoralogo.png" alt="Pizzora" className="w-[85%] h-auto" />
              </div>
            </div>

            {/* BILL TO */}
            <div className="px-12 mb-6">
              <h2 className="text-[#E31837] text-[28px] font-medium mb-4">Bill to</h2>
              
              <div className="flex justify-between items-start gap-8 px-8">
                <div className="flex-1 text-center">
                  <h3 className="text-gray-800 text-[17px] mb-2 font-medium">Client Name</h3>
                  <input 
                    type="text"
                    value={clientName}
                    onChange={(e) => setClientName(e.target.value)}
                    className="w-full text-center border-b border-gray-300 focus:border-[#E31837] focus:outline-none py-1 text-gray-700 bg-transparent"
                    placeholder="Enter name"
                  />
                </div>
                <div className="flex-1 text-center">
                  <h3 className="text-gray-800 text-[17px] mb-2 font-medium">Client Address</h3>
                  <input 
                    type="text"
                    value={clientAddress}
                    onChange={(e) => setClientAddress(e.target.value)}
                    className="w-full text-center border-b border-gray-300 focus:border-[#E31837] focus:outline-none py-1 text-gray-700 bg-transparent"
                    placeholder="Enter address"
                  />
                </div>
                <div className="flex-1 text-center">
                  <h3 className="text-gray-800 text-[17px] mb-2 font-medium">Phone Number</h3>
                  <input 
                    type="text"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    className="w-full text-center border-b border-gray-300 focus:border-[#E31837] focus:outline-none py-1 text-gray-700 bg-transparent"
                    placeholder="Enter phone"
                  />
                </div>
              </div>
            </div>

            {/* TABLE */}
            <div className="px-12 flex-1 mb-4">
              {/* Table Header */}
              <div className="grid grid-cols-[15%_20%_35%_15%_15%] bg-[#E31837] text-white font-medium py-[6px] text-[15px]">
                <div className="pl-4 border-r border-white/20">Quantity</div>
                <div className="pl-4 border-r border-white/20">Item #</div>
                <div className="pl-4 border-r border-white/20">Description</div>
                <div className="pl-4 border-r border-white/20">Unit Price</div>
                <div className="pl-4">Total</div>
              </div>

              {/* Table Rows */}
              <div className="border-x border-b border-gray-400">
                {items.map((item, index) => (
                  <div key={index} className="grid grid-cols-[15%_20%_35%_15%_15%] border-b border-gray-400 h-10 text-[15px] text-gray-700 items-center">
                    <input type="text" className="w-full pl-4 bg-transparent outline-none h-full border-r border-gray-400" value={item.quantity} onChange={(e) => updateItem(index, 'quantity', e.target.value)} />
                    <input type="text" className="w-full pl-4 bg-transparent outline-none h-full border-r border-gray-400" value={item.itemNumber} onChange={(e) => updateItem(index, 'itemNumber', e.target.value)} />
                    <input type="text" className="w-full pl-4 bg-transparent outline-none h-full border-r border-gray-400" value={item.description} onChange={(e) => updateItem(index, 'description', e.target.value)} />
                    <input type="text" className="w-full pl-4 bg-transparent outline-none h-full border-r border-gray-400" value={item.unitPrice} onChange={(e) => updateItem(index, 'unitPrice', e.target.value)} />
                    <input type="text" className="w-full pl-4 bg-transparent outline-none h-full" value={item.total} onChange={(e) => updateItem(index, 'total', e.target.value)} />
                  </div>
                ))}
              </div>

              {/* Table Footer */}
              <div className="flex h-[96px]">
                {/* Notes */}
                <div className="w-[70%] pr-4 pt-2 flex flex-col">
                  <span className="text-[#E31837] text-[15px] mb-1 font-medium">Notes:</span>
                  <textarea 
                    className="w-full flex-1 bg-transparent border-b border-transparent focus:border-gray-300 outline-none text-[15px] text-gray-700 resize-none"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                  />
                </div>
                {/* Totals */}
                <div className="w-[30%] flex flex-col h-full border-r border-b border-l border-gray-400">
                  <div className="grid grid-cols-[55%_45%] flex-1 border-b border-gray-400 items-center">
                    <div className="text-left pl-4 text-[15px] text-gray-700 border-r border-gray-400 h-full flex items-center">Subtotal</div>
                    <div className="w-full pl-4 text-[15px] h-full flex items-center">{computedSubtotal > 0 ? computedSubtotal.toFixed(2) : ''}</div>
                  </div>
                  <div className="grid grid-cols-[55%_45%] flex-1 border-b border-gray-400 items-center">
                    <div className="text-left pl-4 pr-2 text-[14px] text-gray-700 border-r border-gray-400 h-full flex items-center justify-between whitespace-nowrap">
                      <span>Sales Tax</span>
                      <div className="flex items-center bg-white border border-gray-300 rounded px-1 ml-1 h-6">
                        <input type="text" className="w-5 bg-transparent outline-none text-center text-gray-700 font-medium text-[13px]" placeholder="0" value={taxPercent} onChange={(e) => setTaxPercent(e.target.value)} />
                        <span className="text-gray-400 text-[12px]">%</span>
                      </div>
                    </div>
                    <div className="w-full pl-4 text-[15px] h-full flex items-center">{computedTaxAmount > 0 ? computedTaxAmount.toFixed(2) : ''}</div>
                  </div>
                  <div className="grid grid-cols-[55%_45%] flex-1 bg-[#E31837] items-center">
                    <div className="text-left pl-4 text-[15px] font-medium text-white h-full flex items-center">TOTAL</div>
                    <div className="w-full pl-4 text-[15px] text-white font-medium h-full flex items-center">{computedTotal > 0 ? computedTotal.toFixed(2) : ''}</div>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Push footer to bottom */}
            <div className="flex-1" />

            {/* SIGNATURES */}
            <div className="px-12 flex justify-between gap-12 mb-4 mt-2">
              <div className="flex-1 flex flex-col items-start">
                <div className="border-b-[1.5px] border-black h-8 mb-2 w-full"></div>
                <span className="text-[#E31837] text-[14px] font-medium tracking-wide">Signature</span>
              </div>
              <div className="flex-1 flex flex-col items-start">
                <div className="border-b-[1.5px] border-black h-8 mb-2 w-full"></div>
                <span className="text-[#E31837] text-[14px] font-medium tracking-wide">Printed Name</span>
              </div>
              <div className="flex-1 flex flex-col items-start">
                <div className="border-b-[1.5px] border-black h-8 mb-2 w-full"></div>
                <span className="text-[#E31837] text-[14px] font-medium tracking-wide">Date</span>
              </div>
              <div className="flex-1 flex flex-col items-start">
                <div className="border-b-[1.5px] border-black h-8 mb-2 w-full"></div>
                <span className="text-[#E31837] text-[14px] font-medium tracking-wide">Payment method</span>
              </div>
            </div>

            {/* FOOTER GRAPHICS */}
            <div className="h-[120px] shrink-0 w-full relative overflow-hidden bg-white mt-4 border-t border-gray-100">
              
              {/* Left Black Background */}
              <div 
                className="absolute top-[10px] left-0 h-[100px] bg-[#1A1A1A] z-0"
                style={{ width: 'calc(50% + 28px)', clipPath: 'polygon(0 0, 100% 0, calc(100% - 56px) 100%, 0 100%)' }}
              />
              
              {/* Red Top Bar Extension (Thin) */}
              <div className="absolute top-[10px] left-0 h-[12px] bg-[#E31837] z-0" style={{ width: 'calc(50% - 75px)' }} />
              
              {/* Red Bottom Bar Extension (Thin) */}
              <div className="absolute top-[98px] right-0 h-[12px] bg-[#E31837] z-0" style={{ width: 'calc(50% - 75px)' }} />

              {/* Flawless Geometric Z Logo Graphic (Thin horizontal bars, thick diagonal) */}
              <div className="absolute left-1/2 top-[10px] -translate-x-1/2 h-[100px] w-[240px] z-10 pointer-events-none">
                <svg viewBox="-40 0 240 100" className="w-full h-full" preserveAspectRatio="none">
                  {/* Main Solid Z */}
                  <polygon points="0,0 122,0 72.7,88 160,88 160,100 38,100 87.3,12 0,12" fill="#E31837" />

                  {/* Left Crust (Slim bracket) */}
                  <path d="M 0,0 C -15,30 -10,80 38,100 C 5,80 -5,30 0,12 Z" fill="#E31837" />
                  
                  {/* Right Crust (Slim bracket) */}
                  <path d="M 160,100 C 175,70 170,20 122,0 C 155,20 165,70 160,88 Z" fill="#E31837" />

                  {/* Left Slice Dots */}
                  <circle cx="25" cy="35" r="5" fill="#E31837" />
                  <circle cx="55" cy="35" r="5" fill="#E31837" />
                  <circle cx="40" cy="60" r="5" fill="#E31837" />

                  {/* Right Slice Dots */}
                  <circle cx="135" cy="65" r="5" fill="#E31837" />
                  <circle cx="105" cy="65" r="5" fill="#E31837" />
                  <circle cx="120" cy="40" r="5" fill="#E31837" />
                </svg>
              </div>

              {/* Text overlays (Perfectly Centered in Black Box) */}
              <div className="absolute left-0 w-[calc(50%-120px)] h-[100px] top-[10px] flex items-center justify-center z-20">
                <span className="text-[#E31837] text-[18px] font-medium tracking-wide">www.pizzora.bd</span>
              </div>

              {/* Right Contact Info (Perfectly centered in the white space between the thin red bars) */}
              <div className="absolute left-[calc(50%+140px)] top-[22px] h-[76px] flex flex-col justify-center z-20 space-y-1.5">
                <div className="flex items-center gap-3">
                  <div className="w-[16px] h-[16px] bg-[#E31837] flex items-center justify-center rounded-[3px]">
                    <PhoneIcon size={10} className="text-white" fill="white" />
                  </div>
                  <span className="text-gray-900 text-[14.5px] font-medium tracking-tight">01620026649</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-[16px] h-[16px] bg-[#E31837] flex items-center justify-center rounded-[3px]">
                    <Mail size={10} className="text-white" strokeWidth={2.5} />
                  </div>
                  <span className="text-gray-900 text-[14.5px] font-medium tracking-tight">pizzora1@gmail.com</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-[16px] h-[16px] bg-[#E31837] flex items-center justify-center rounded-[3px]">
                    <MapPin size={10} className="text-white" strokeWidth={2.5} />
                  </div>
                  <span className="text-gray-900 text-[14.5px] font-medium tracking-tight">SubidBazar, Sylhet,Bangladesh</span>
                </div>
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}
