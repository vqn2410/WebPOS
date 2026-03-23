"use client"
import { useState, useEffect, useRef, Suspense } from 'react';
import { collection, getDocs, doc, setDoc } from 'firebase/firestore';
import { db, auth } from '@/lib/firebase/config';
import { Search, Scan, Trash2, X, Plus, Minus, CreditCard, Banknote, LogOut, FileText, CheckSquare, Square, Scale, PackagePlus, LayoutDashboard, Printer } from 'lucide-react';
import { invoiceService } from '@/lib/services/invoiceService';
import { useSearchParams, useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import './pos.css';

function POSContent() {
  const [productsCatalog, setProductsCatalog] = useState([]);
  const [cart, setCart] = useState([]); 
  const [search, setSearch] = useState('');
  
  const [isScanning, setIsScanning] = useState(false);
  const scannerRef = useRef(null);
  const searchInputRef = useRef(null);
  const lastEnterTime = useRef(0);

  const [discount, setDiscount] = useState(0);
  const [paymentMode, setPaymentMode] = useState(false); 
  const [isProcessing, setIsProcessing] = useState(false);

  // --- MODALES EXTRA ---
  const [granelModal, setGranelModal] = useState({ open: false, product: null });
  const [weightInput, setWeightInput] = useState(''); 
  
  const [newProdModal, setNewProdModal] = useState({ open: false, tempCode: '' });
  const [newProdForm, setNewProdForm] = useState({ nombre: '', tipo: 'unitario', precio: '', stock: '' });
  const [finishedSale, setFinishedSale] = useState(null);

  const [cashModal, setCashModal] = useState(false);
  const [cashGiven, setCashGiven] = useState('');

  const params = useSearchParams();
  const { userData } = useAuth();
  const router = useRouter();

  useEffect(() => {
    const mpStatus = params?.get('mp');
    if (mpStatus === 'success') alert("✅ Pago con Mercado Pago aprobado y registrado.");
    if (mpStatus === 'failure') alert("❌ El pago con Mercado Pago fue rechazado.");

    const fetchA = async () => {
      const qs = await getDocs(collection(db, 'products'));
      const res = [];
      qs.forEach(doc => res.push({ id: doc.id, ...doc.data() }));
      setProductsCatalog(res);
    }
    fetchA();
  }, [params]);

  const addToCartExact = (product, passedQty = 1) => {
    const index = cart.findIndex(c => c.product.id === product.id);
    if (index >= 0) {
      const newCart = [...cart];
      newCart[index].qty += passedQty;
      newCart[index].totalRow = parseFloat((newCart[index].qty * product.precio).toFixed(2));
      setCart(newCart);
    } else {
      const item = { product, qty: passedQty, totalRow: parseFloat((passedQty * product.precio).toFixed(2)) };
      setCart(prev => [item, ...prev]);
    }
  };

  const handleInterceptProduct = (barcodeRaw) => {
    const barcode = barcodeRaw.trim();
    if (!barcode) return;
    
    const found = productsCatalog.find(p => 
      p.codigoBarras === barcode || 
      p.nombre.toLowerCase().includes(barcode.toLowerCase())
    );
    
    if (found) {
      if (found.tipo === 'granel') {
        setWeightInput('');
        setGranelModal({ open: true, product: found });
      } else {
        addToCartExact(found, 1);
      }
      setSearch('');
    } else {
      setNewProdForm({ nombre: '', tipo: 'unitario', precio: '', stock: '' });
      setNewProdModal({ open: true, tempCode: barcode });
      setSearch('');
    }
  }

  const removeFromCart = (productId) => setCart(cart.filter(c => c.product.id !== productId));

  const updateQty = (productId, delta) => {
    const index = cart.findIndex(c => c.product.id === productId);
    if (index < 0) return;
    const item = cart[index];
    
    let nQ = item.qty + delta;
    if (nQ <= 0) { removeFromCart(productId); return; }
    if (item.product.tipo === 'granel') nQ = item.qty + (delta * 0.1); 

    const newCart = [...cart];
    newCart[index].qty = parseFloat(nQ.toFixed(3));
    newCart[index].totalRow = parseFloat((newCart[index].qty * item.product.precio).toFixed(2));
    setCart(newCart);
  };

  const confirmGranel = (e) => {
    e.preventDefault();
    const kgQty = parseFloat(weightInput);
    if(isNaN(kgQty) || kgQty <= 0) return;
    
    addToCartExact(granelModal.product, kgQty);
    setGranelModal({ open: false, product: null });
  }

  const confirmNewProd = async (e) => {
    e.preventDefault();
    try {
      const docId = newProdModal.tempCode || Date.now().toString();
      const productRef = doc(db, 'products', docId);
      
      const pToSave = {
        nombre: newProdForm.nombre,
        codigoBarras: newProdModal.tempCode,
        tipo: newProdForm.tipo,
        precio: parseFloat(newProdForm.precio) || 0,
        stock: newProdForm.tipo === 'granel' ? null : (newProdForm.stock !== '' ? parseFloat(newProdForm.stock) : null),
        stockMinimo: 0,
        categoria: 'Generada en POS'
      };

      await setDoc(productRef, pToSave);
      const injectedProduct = { id: docId, ...pToSave };
      
      setProductsCatalog(prev => [...prev, injectedProduct]);
      setNewProdModal({ open: false, tempCode: '' });
      
      if (pToSave.tipo === 'granel') {
         setWeightInput('');
         setGranelModal({ open: true, product: injectedProduct });
      } else {
         addToCartExact(injectedProduct, 1);
         setTimeout(() => searchInputRef.current?.focus(), 150);
      }

    } catch (error) {
      alert("Error registrando alt: " + error.message);
    }
  }

  const toggleScanner = async () => {
    const Quagga = (await import('quagga')).default;
    if (isScanning) { Quagga.stop(); setIsScanning(false); } 
    else {
      setIsScanning(true);
      setTimeout(() => {
         Quagga.init({
          inputStream: { name: "Live", type: "LiveStream", target: scannerRef.current, constraints: { facingMode: "environment" } },
          decoder: { readers: ["ean_reader", "code_128_reader"] }
        }, (err) => {
          if (err) { alert("Error cámara: " + err); setIsScanning(false); return; }
          Quagga.start();
        });

        Quagga.onDetected((res) => {
          const barcode = res.codeResult.code;
          handleInterceptProduct(barcode);
          Quagga.stop();
          setIsScanning(false);
        });
      }, 100);
    }
  };

  const handleManualSearch = (e) => {
    if (e.key === 'Enter') {
       if (search.trim() === '') {
          if (cart.length > 0) setPaymentMode(true);
       } else {
          handleInterceptProduct(search);
       }
    }
  };

  const subtotal = cart.reduce((acc, c) => acc + c.totalRow, 0);
  const totalF = subtotal - discount;

  // --- PAGOS Y VUELTOS ESPACIO ---
  const initPayment = (method) => {
    if (method === 'EFECTIVO') {
       setCashGiven('');
       setCashModal(true);
       setTimeout(() => document.getElementById('cashInput')?.focus(), 100);
    } else {
       finalizePayment(method, 0, 0);
    }
  }

  const finalizePayment = async (method, providedCash = 0, calculatedChange = 0) => {
    if(isProcessing) return;
    setIsProcessing(true);
    try {
      const isFiscal = (method === 'TARJETA' || method === 'MERCADO_PAGO');
      let res;
      if (isFiscal) res = await invoiceService.generateAFIPInvoice(cart, totalF, method, discount);
      else res = await invoiceService.generateInternalTicket(cart, totalF, method, discount);
      
      if (method === 'MERCADO_PAGO') {
        const mpReq = await fetch('/api/mercadopago', {
            method: 'POST', body: JSON.stringify({ items: cart, saleId: res.saleId })
        });
        const data = await mpReq.json();
        window.location.href = data.init_point;
        return;
      }
      
      const finalSaleData = {
        id: res.saleId,
        fecha: new Date().toISOString(),
        metodoPago: method,
        estadoPago: 'COBRADO',
        total: totalF,
        cashGiven: providedCash,
        change: calculatedChange,
        cae: res.cae || null,
        tipoComprobante: isFiscal ? 'FACTURA AFIP' : 'TICKET INTERNO'
      };
      setFinishedSale(finalSaleData);
      setCart([]); setDiscount(0); setPaymentMode(false); setCashModal(false);
    } catch (e) {
      alert("Error en el pago: " + e.message);
    }
    setIsProcessing(false);
  }

  const confirmCashPayment = (e) => {
     if (e) e.preventDefault();
     let given = parseFloat(cashGiven);
     if (isNaN(given) || given < totalF) given = totalF; 
     const change = given - totalF;
     finalizePayment('EFECTIVO', given, change);
  }

  const printThermalTicket = (sale) => {
    const win = window.open('', '_blank', 'width=450,height=600');
    win.document.write(`
      <html>
        <head>
          <title>Comprobante ${sale.id}</title>
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <style>
             body { font-family: 'Courier New', monospace; max-width: 80mm; margin: 0 auto; padding: 5mm; color: #000; background: #fff;}
             h2 { text-align: center; margin: 0; font-size: 1.2rem;}
             p { font-size: 0.85rem; margin: 4px 0; }
             .center { text-align: center; }
             .bold { font-weight: 900;}
             .total-line { border-top: 1px dashed #000; border-bottom: 1px dashed #000; padding: 10px 0; font-size: 1.2em; display:flex; justify-content: space-between; margin-top: 15px;}
             .fiscal-box { font-size: 0.75rem; text-align: center; margin-top: 25px; border-top: 2px solid #000; padding-top: 10px;}
             @media print { @page { margin: 0; } body { padding: 5mm 0; } }
          </style>
        </head>
        <body onload="window.print(); window.setTimeout(window.close, 500);">
           <h2>🏪 MI COMERCIO TPV</h2>
           <p class="center">C.U.I.T. Nro: 30-00000000-0</p>
           <p class="center">IVA RESPONSABLE INSCRIPTO</p>
           <p>--------------------------------</p>
           <p>FECHA : ${new Date(sale.fecha).toLocaleString('es-AR')}</p>
           <p>TICKET  : ${sale.id.toUpperCase().substring(0,8)}</p>
           <p>PAGO  : ${sale.metodoPago} (${sale.estadoPago})</p>
           ${sale.metodoPago === 'EFECTIVO' ? `<p>RECIBIDO: $${sale.cashGiven?.toFixed(2)}</p><p>CAMBIO: $${sale.change?.toFixed(2)}</p>` : ''}
           <p>--------------------------------</p>
           <p class="center" style="font-size:0.7rem; color:#444"><i>(Detalle de items en Nube ERP)</i></p>
           <div class="total-line"><span class="bold">TOTAL:</span> <span class="bold">$${sale.total.toFixed(2)}</span></div>
           ${sale.cae ? `
             <div class="fiscal-box">
                <p class="bold">>>> ${sale.tipoComprobante} <<<</p>
                <p>CAE: ${sale.cae}</p>
             </div>
           ` : '<p class="center" style="font-size:0.75rem; margin-top:20px;">DOCUMENTO NO FISCAL</p>'}
           <br/><p class="center bold">¡GRACIAS POR SU COMPRA!</p>
        </body>
      </html>
    `);
    win.document.close();
  }

  // Atajos globales de Teclado
  useEffect(() => {
    const handleGlobalKey = (e) => {
      // Pantalla de Ticket Generado
      if (finishedSale) {
        if (e.key === 'Enter') {
           e.preventDefault();
           printThermalTicket(finishedSale);
        } else if (e.key === 'Escape') {
           e.preventDefault();
           setFinishedSale(null);
           setTimeout(() => searchInputRef.current?.focus(), 150);
        }
        return;
      }

      // Excepciones a Atajos Base Modales
      if (granelModal.open || newProdModal.open) return;
      if (cashModal) {
         if (e.key === 'Escape') setCashModal(false);
         return; 
      }

      // Pantalla de Dinero -> Shortcuts Inteligentes
      if (paymentMode && !isProcessing) {
        const key = e.key.toLowerCase();
        if (key === 'e' || key === 'enter') { e.preventDefault(); initPayment('EFECTIVO'); return; }
        if (key === 't') { e.preventDefault(); initPayment('TARJETA'); return; }
        if (key === 'm') { e.preventDefault(); initPayment('MERCADO_PAGO'); return; }
        if (key === 'i') { e.preventDefault(); initPayment('TRANSFERENCIA'); return; }
        return;
      }

      // Pantalla Principal -> Double-Tap manda a cobrar
      if (e.key === 'Enter' && !paymentMode && cart.length > 0) {
        const now = Date.now();
        if (now - lastEnterTime.current < 450) {
          e.preventDefault();
          setPaymentMode(true); 
        }
        lastEnterTime.current = now;
      }
    };
    window.addEventListener('keydown', handleGlobalKey);
    return () => window.removeEventListener('keydown', handleGlobalKey);
  });

  if (paymentMode) {
    return (
      <div className="pos-wrapper animate-fade-in" style={{padding: '1.5rem', background: 'var(--background)', display: 'flex', flexDirection: 'column', alignItems: 'center'}}>
        <div className="glass-panel" style={{width:'100%', maxWidth:'650px', padding:'2.5rem', margin:'0 auto', marginTop:'4rem', borderTop:'5px solid var(--primary)', borderRadius:'var(--radius)'}}>
          <div style={{display:'flex', justifyContent:'space-between', marginBottom:'3rem', alignItems:'center'}}>
            <div>
              <span style={{color: '#64748b', fontSize:'1rem', fontWeight:'bold', textTransform:'uppercase', letterSpacing:'1px'}}>Total Ticket Neto</span>
              <h1 style={{color: 'var(--success)', fontSize:'3.5rem', lineHeight:'1', display:'block'}}>${totalF.toFixed(2)}</h1>
            </div>
            <button className="btn-action" style={{background:'var(--input)', padding:'0.8rem', borderRadius:'50px'}} onClick={()=>setPaymentMode(false)}><X size={28} color="var(--danger)"/></button>
          </div>
          
          {cashModal ? (
             <div className="animate-fade-in" style={{textAlign:'center'}}>
               <div style={{background:'#e2e8f0', color:'var(--primary)', width:'60px', height:'60px', borderRadius:'50%', display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 1.5rem'}}><Banknote size={28}/></div>
               <h2 style={{color: 'var(--foreground)', marginBottom: '0.25rem', fontSize:'1.6rem'}}>Buscando Cambio en Caja</h2>
               <p style={{color:'#64748b', marginBottom:'2rem', fontSize:'1.1rem'}}>Anota la suma billete a billete que puso el cliente en mano.</p>
               
               <form onSubmit={confirmCashPayment}>
                  <div style={{background:'var(--input)', border:'2px solid var(--primary)', borderRadius:'var(--radius)', display:'flex', alignItems:'center', padding:'1rem', marginBottom:'2.5rem'}}>
                    <span style={{fontSize:'1.8rem', color:'#64748b', fontWeight:'700', paddingLeft:'15px'}}>$</span>
                    <input id="cashInput" type="number" step="0.01" style={{flex:1, border:'none', background:'transparent', fontSize:'2.5rem', outline:'none', textAlign:'center', color: 'var(--foreground)', fontWeight:'bold'}} value={cashGiven} onChange={e => setCashGiven(e.target.value)} placeholder="Pago Justo / Tipear"/>
                  </div>
                  <div style={{display:'flex', gap:'1rem', flexWrap:'wrap', justifyContent:'center'}}>
                     <button type="button" className="btn-danger" style={{flex:'1 1 120px', padding:'1.1rem', fontSize:'1.1rem'}} onClick={()=>setCashModal(false)}>Atrás [ESC]</button>
                     <button type="submit" className="btn-primary" style={{flex:'1 1 120px', padding:'1.1rem', fontSize:'1.1rem'}}>Confirmar [ENTER]</button>
                  </div>
               </form>
             </div>
          ) : (
             <div className="animate-fade-in" style={{display:'flex', flexDirection:'column', gap:'1.2rem'}}>
               <button className="btn-primary btn-large" style={{background: 'var(--success)', padding:'1.5rem', fontSize:'1.1rem', justifyContent:'flex-start', border:'1px solid rgba(0,0,0,0.1)'}} onClick={() => initPayment('EFECTIVO')} disabled={isProcessing}>
                 <Banknote size={26} style={{marginRight:'10px'}}/> Efectivo Físico Transaccional [E]
               </button>
               <button className="btn-primary btn-large" style={{background: '#8b5cf6', padding:'1.5rem', fontSize:'1.1rem', justifyContent:'flex-start', border:'1px solid rgba(0,0,0,0.1)'}} onClick={() => initPayment('TRANSFERENCIA')} disabled={isProcessing}>
                 <Banknote size={26} style={{marginRight:'10px'}}/> Liquidación CBU/CVU Digital [I]
               </button>
               
               <div style={{display:'flex', alignItems:'center', margin:'0.5rem 0'}}>
                   <div style={{flex:1, height:'1px', background:'var(--border)'}}></div>
                   <span style={{padding:'0 1rem', color:'#94a3b8', fontSize:'0.85rem', fontWeight:'600'}}>VÁLIDO ARCA</span>
                   <div style={{flex:1, height:'1px', background:'var(--border)'}}></div>
               </div>

               <button className="btn-primary btn-large" style={{background:'#1e3a8a', padding:'1.5rem', fontSize:'1.1rem', justifyContent:'flex-start', border:'1px solid rgba(0,0,0,0.1)'}} onClick={() => initPayment('TARJETA')} disabled={isProcessing}>
                 <CreditCard size={26} style={{marginRight:'10px'}}/> Tarjeta Posnet Integrada [T]
               </button>
               <button className="btn-primary btn-large" style={{background:'#0ea5e9', padding:'1.5rem', fontSize:'1.1rem', justifyContent:'flex-start', border:'1px solid rgba(0,0,0,0.1)'}} onClick={() => initPayment('MERCADO_PAGO')} disabled={isProcessing}>
                 <Scan size={26} style={{marginRight:'10px'}}/> QR Dinámico (Mercado Libre) [M]
               </button>
             </div>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="pos-wrapper animate-fade-in">
      <header className="pos-header">
        <h2 style={{color: 'var(--primary)', fontWeight:'800', display:'flex', alignItems:'center', gap:'10px'}}>
           <FileText size={20}/> TPV
        </h2>
        <div style={{display:'flex', gap:'0.5rem', alignItems:'center'}}>
          {userData?.rol === 'admin' && (
             <button className="btn-primary" style={{padding:'0.5rem'}} onClick={() => router.push('/admin')} title="Panel Admin">
                 <LayoutDashboard size={20}/>
             </button>
          )}
          <div style={{background:'var(--input)', display:'flex', alignItems:'center', padding:'0.5rem', borderRadius:'var(--radius)', border:'1px solid var(--border)'}}>
            <Search size={18} style={{color:'#94a3b8', marginRight:'5px'}}/>
            <input type="text" autoFocus ref={searchInputRef} placeholder="Código/Nombre" value={search} onChange={e=>setSearch(e.target.value)} onKeyDown={handleManualSearch}
              style={{background:'transparent', border:'none', outline:'none', color:'var(--foreground)', width:'150px'}}
            />
          </div>
          <button className={`btn-primary ${isScanning ? 'btn-danger' : ''}`} style={{padding:'0.5rem'}} onClick={toggleScanner}>
             {isScanning ? <X size={20}/> : <Scan size={20}/>}
          </button>
          <button className="btn-danger" style={{padding:'0.5rem'}} onClick={() => auth.signOut()} title="Cerrar Sesión">
            <LogOut size={20}/>
          </button>
        </div>
      </header>

      {isScanning && (
        <div style={{padding:'1rem', background:'var(--card)'}}>
          <div id="interactive" className="viewport" ref={scannerRef}></div>
        </div>
      )}

      <div className="pos-cart text-lg">
        {cart.length === 0 && (
          <div style={{textAlign:'center', margin:'auto', color:'#94a3b8'}}>
            <Scan size={48} style={{opacity:0.5, margin:'0 auto 1rem'}}/>
            <h3>Caja Vacía</h3>
          </div>
        )}
        {cart.map((c, i) => (
          <div className="cart-item" key={`${c.product.id}-${i}`}>
            <div className="item-info">
              <h4>{c.product.nombre}</h4>
              <p>${c.product.precio.toFixed(2)} x {c.product.tipo}</p>
            </div>
            <div className="item-actions">
              <button className="qty-btn" onClick={()=>updateQty(c.product.id, -1)}><Minus size={18}/></button>
              <span style={{fontSize:'1.2rem', fontWeight:'bold', minWidth:'50px', textAlign:'center', color: 'var(--foreground)'}}>
                {c.product.tipo==='granel' ? c.qty.toFixed(3) + 'kg' : c.qty}
              </span>
              <button className="qty-btn" onClick={()=>updateQty(c.product.id, 1)}><Plus size={18}/></button>
              
              <div style={{fontSize:'1.25rem', fontWeight:'900', color:'var(--primary)', marginLeft:'1rem', width:'80px', textAlign:'right'}}>
                ${c.totalRow.toFixed(2)}
              </div>
              <button className="btn-danger" onClick={()=>removeFromCart(c.product.id)} style={{border:'none', marginLeft:'1rem', padding:'10px', background:'#fee2e2'}}>
                <Trash2 size={16} />
              </button>
            </div>
          </div>
        ))}
      </div>

      <footer className="pos-footer">
        <div className="subtotals-box"><span>Subtotal Neto</span><span>${subtotal.toFixed(2)}</span></div>
        <div className="subtotals-box">
          <span>Bonificación</span>
          <span style={{color:'var(--danger)', cursor:'pointer'}} onClick={() => setDiscount(parseFloat(prompt('Monto a descontar ($):', '0')) || 0)}>
            - ${discount.toFixed(2)}
          </span>
        </div>
        <div className="total-box" style={{marginTop:'0.5rem', borderTop: '2px dashed var(--border)', paddingTop:'1rem'}}>
           <span style={{color:'var(--foreground)'}}>TOTAL</span>
           <span>${totalF.toFixed(2)}</span>
        </div>
        
        <div className="keyboard-actions">
          <button className="btn-danger btn-large" style={{color:'#64748b', border:'1px solid var(--border)', background:'var(--input)'}} onClick={()=>{setCart([]); setDiscount(0)}}>
            Descartar
          </button>
          <button className="btn-primary btn-large" onClick={()=>setPaymentMode(true)} disabled={cart.length === 0}>
            CERRAR VENTA 🛒
          </button>
        </div>
      </footer>

      {granelModal.open && (
        <div className="modal-backdrop">
           <div className="modal-container glass-panel animate-fade-in" style={{textAlign:'center'}}>
             <Scale size={48} color="var(--primary)" style={{margin:'0 auto 1rem'}}/>
             <h2 style={{color: 'var(--foreground)', marginBottom: '0.5rem'}}>Producto al Peso</h2>
             <p style={{color:'#64748b', marginBottom:'1.5rem'}}>Ingresa el peso exacto de <strong>{granelModal.product?.nombre}</strong> <i>(${granelModal.product?.precio}/Kg)</i></p>
             
             <form onSubmit={confirmGranel}>
                <div style={{background:'var(--input)', border:'2px solid var(--primary)', borderRadius:'var(--radius)', display:'flex', alignItems:'center', padding:'1rem', marginBottom:'1rem'}}>
                  <input type="number" step="0.001" autoFocus style={{flex:1, border:'none', background:'transparent', fontSize:'2rem', outline:'none', textAlign:'center', color: 'var(--foreground)', fontWeight:'bold'}} value={weightInput} onChange={e => setWeightInput(e.target.value)} required placeholder="0.000"/>
                  <span style={{fontSize:'1.5rem', color:'#64748b', fontWeight:'700', paddingRight:'1rem'}}>kg</span>
                </div>
                {weightInput > 0 && (
                   <p style={{color:'var(--success)', fontWeight:'900', fontSize:'1.5rem', marginBottom:'1.5rem'}}>
                      Importe: ${(weightInput * (granelModal.product?.precio || 0)).toFixed(2)}
                   </p>
                )}
                <div style={{display:'flex', gap:'1rem', flexWrap:'wrap', justifyContent:'center'}}>
                   <button type="button" className="btn-danger" style={{flex: '1 1 120px'}} onClick={()=>{
                      setGranelModal({open:false, product:null});
                      setTimeout(() => searchInputRef.current?.focus(), 150);
                   }}>Cancelar</button>
                   <button type="submit" className="btn-primary" style={{flex: '1 1 120px'}}>Añadir al Ticket</button>
                </div>
             </form>
           </div>
        </div>
      )}

      {newProdModal.open && (
        <div className="modal-backdrop">
           <div className="modal-container glass-panel animate-fade-in">
             <PackagePlus size={40} color="var(--success)" style={{margin:'0 auto 0.5rem'}}/>
             <h2 style={{color: 'var(--foreground)', textAlign:'center', marginBottom: '0.25rem'}}>Alta Rápida</h2>
             <p style={{color:'#64748b', textAlign:'center', marginBottom:'1.5rem', fontSize:'0.9rem'}}>El ítem escaneado no está registrado.</p>
             
             <form onSubmit={confirmNewProd}>
                <div className="form-group">
                  <label>Nombre Identificatorio</label>
                  <input type="text" autoFocus className="input-base" required value={newProdForm.nombre} onChange={e=>setNewProdForm({...newProdForm, nombre:e.target.value})}/>
                </div>
                <div className="form-group" style={{display:'flex', gap:'1rem'}}>
                   <div style={{flex:1}}>
                     <label>Precio Final ($)</label>
                     <input type="number" step="0.01" className="input-base" required value={newProdForm.precio} onChange={e=>setNewProdForm({...newProdForm, precio:e.target.value})}/>
                   </div>
                   {newProdForm.tipo === 'unitario' && (
                     <div style={{flex:1}}>
                       <label>Stock Inicial (Opcional)</label>
                       <input type="number" step="1" className="input-base" value={newProdForm.stock} onChange={e=>setNewProdForm({...newProdForm, stock:e.target.value})} placeholder="Sin límite"/>
                     </div>
                   )}
                </div>
                <div className="form-group" style={{marginTop:'1.5rem'}}>
                  <label>Modalidad de Venta</label>
                  <select className="input-base" value={newProdForm.tipo} onChange={e=>setNewProdForm({...newProdForm, tipo:e.target.value, stock: e.target.value === 'granel' ? '' : newProdForm.stock})}>
                     <option value="unitario">Empaquetado (Unidades enteras)</option>
                     <option value="granel">Por Peso Libre (Sin manejo de stock)</option>
                  </select>
                </div>
                
                <div style={{display:'flex', gap:'1rem', marginTop:'1.5rem'}}>
                   <button type="button" className="btn-danger" style={{width:'100%'}} onClick={()=>{
                      setNewProdModal({open:false, tempCode:''});
                      setTimeout(() => searchInputRef.current?.focus(), 150);
                   }}>Cancelar</button>
                   <button type="submit" className="btn-primary" style={{background:'var(--success)', width:'100%'}}>Guardar & Cobrar</button>
                </div>
             </form>
           </div>
        </div>
      )}

      {finishedSale && (
        <div className="modal-backdrop">
           <div className="modal-container glass-panel animate-fade-in" style={{textAlign:'center', background:'#f8fafc', border:'1px solid var(--primary)'}}>
             <div style={{background:'var(--success)', color:'#fff', width:'60px', height:'60px', borderRadius:'50%', display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 1rem'}}>
                <CheckSquare size={32}/>
             </div>
             <h2 style={{color: 'var(--foreground)', marginBottom: '0.25rem', fontSize:'1.8rem'}}>¡Venta Cobrada!</h2>
             <p style={{color:'#64748b', marginBottom:'1.5rem', fontSize:'1rem'}}>Total registrado: <strong>${finishedSale.total.toFixed(2)}</strong></p>
             
             {finishedSale.metodoPago === 'EFECTIVO' && (
                <div style={{display:'flex', justifyContent:'space-around', background:'#fff', padding:'1rem', borderRadius:'var(--radius)', marginBottom:'1.5rem', border:'1px solid var(--border)'}}>
                   <div><p style={{fontSize:'0.8rem', color:'#64748b', margin:0}}>Recibió</p><p style={{fontSize:'1.3rem', fontWeight:'bold', color:'var(--foreground)', margin:0}}>${finishedSale.cashGiven?.toFixed(2)}</p></div>
                   <div><p style={{fontSize:'0.8rem', color:'#64748b', margin:0}}>Vuelto (Cambio)</p><p style={{fontSize:'1.3rem', fontWeight:'bold', color:'var(--primary)', margin:0}}>${finishedSale.change?.toFixed(2)}</p></div>
                </div>
             )}

             <div style={{background:'#e2e8f0', padding:'1rem', borderRadius:'var(--radius)', color:'#334155', fontFamily:'monospace', marginBottom:'2rem'}}>
               <p style={{margin:0}}>TICKET N° {finishedSale.id.substring(0,8).toUpperCase()}</p>
               {finishedSale.cae && <p style={{margin:'0.25rem 0 0 0', color:'var(--success)'}}>AFIP CAE O.K.</p>}
             </div>

             <div style={{display:'flex', gap:'1rem', flexDirection:'column'}}>
                <button className="btn-primary" style={{width:'100%', fontSize:'1.2rem', padding:'1rem'}} onClick={() => printThermalTicket(finishedSale)}>
                  <Printer size={20} style={{marginRight:'10px'}}/> IMPRIMIR TICKET [ENTER]
                </button>
                <button className="btn-danger" style={{width:'100%', background:'transparent', color:'#64748b', border:'none', boxShadow:'none'}} onClick={() => {
                   setFinishedSale(null);
                   setTimeout(() => searchInputRef.current?.focus(), 150);
                }}>
                  Volver a la Caja [ESC]
                </button>
             </div>
           </div>
        </div>
      )}
    </div>
  )
}

export default function POSTerminal() {
  return (
    <Suspense fallback={<div style={{height:'100vh', display:'flex', alignItems:'center', justifyContent:'center'}}>Terminal...</div>}>
      <POSContent />
    </Suspense>
  )
}
