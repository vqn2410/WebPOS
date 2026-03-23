"use client"
import { useState, useEffect } from 'react';
import { collection, query, orderBy, getDocs, limit, where } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { Printer, Filter, CreditCard, Banknote, ShieldCheck } from 'lucide-react';
import './sales.css';

export default function SalesArea() {
  const [sales, setSales] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState('ALL'); 

  const fetchSales = async () => {
    setLoading(true);
    try {
      let q = query(collection(db, 'sales'), orderBy('fecha', 'desc'), limit(150));
      
      // Filtros Nativos de Firestore combinados
      if (filterType === 'FISCAL') {
        q = query(collection(db, 'sales'), where('tipoComprobante', '!=', 'TICKET_INTERNO'), orderBy('tipoComprobante'), limit(150));
      } else if (filterType === 'INTERNAL') {
        q = query(collection(db, 'sales'), where('tipoComprobante', '==', 'TICKET_INTERNO'), orderBy('fecha', 'desc'), limit(150));
      }

      const qs = await getDocs(q);
      const res = [];
      qs.forEach(doc => res.push(doc.data()));
      
      // Auto-ordenamos por fecha en javascript si Firebase cruzó los orderBy para la consulta "not-equal" (Limitaciones estándar de NoSQL)
      res.sort((a,b) => new Date(b.fecha) - new Date(a.fecha));
      
      setSales(res);
    } catch (e) {
      console.error(e);
      alert("Para usar filtros combinados debes generar el índice en Firebase console, este mensaje sale si no existía el index previo.");
    }
    setLoading(false);
  }

  useEffect(() => { fetchSales(); }, [filterType]);

  const printThermalTicket = (sale) => {
    const win = window.open('', '_blank', 'width=450,height=600');
    // Maquetación CSS ultraligera diseñada específicamente para bobinas de papel térmico (Impresoras TM-T20 o mini Bluetooth de 58mm/80mm)
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
             
             @media print {
               @page { margin: 0; }
               body { padding: 5mm 0; }
             }
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
           <p>--------------------------------</p>
           <p class="center" style="font-size:0.7rem; color:#444"><i>(Para visualizar los items, revise el Panel en la Nube del ERP)</i></p>
           
           <div class="total-line"><span class="bold">TOTAL:</span> <span class="bold">$${sale.total.toFixed(2)}</span></div>
           
           ${sale.cae ? `
             <div class="fiscal-box">
                <p class="bold">>>> ${sale.tipoComprobante} <<<</p>
                <p>CAE: ${sale.cae}</p>
             </div>
           ` : '<p class="center" style="font-size:0.75rem; margin-top:20px;">DOCUMENTO NO VÁLIDO COMO FACTURA</p>'}
           
           <br/>
           <p class="center bold">¡GRACIAS POR SU COMPRA!</p>
        </body>
      </html>
    `);
    win.document.close();
  }

  return (
    <div className="animate-fade-in">
      <header className="page-header" style={{display: 'flex', flexWrap: 'wrap', justifyContent:'space-between', marginBottom: '2rem'}}>
        <div>
          <h1 style={{fontSize: '2rem', color: 'var(--primary)', fontWeight: 'bold'}}>Panel de Facturación</h1>
          <p style={{color: '#64748b'}}>Libro de IVA virtual y visualizador de recibos emitidos por Cajeros.</p>
        </div>
      </header>

       <div className="glass-panel" style={{padding: '1.5rem', marginBottom: '2rem', display: 'flex', gap: '1rem', alignItems:'center'}}>
         <Filter size={20} color="#64748b"/>
         <span style={{fontWeight:'600', color:'var(--foreground)'}}>Buscar:</span>
         <select className="input-base" style={{maxWidth: '280px', padding:'0.6rem'}} value={filterType} onChange={e=>setFilterType(e.target.value)}>
           <option value="ALL">Todo el Historial</option>
           <option value="FISCAL">Facturas Fiscales AFIP</option>
           <option value="INTERNAL">Venta Interna (Tickets X)</option>
         </select>
       </div>

      <div className="glass-panel table-container">
        {loading ? <p style={{padding: '3rem', textAlign: 'center'}}>Obteniendo transacciones comerciales de Firestore...</p> : (
          <table className="users-table sales-table">
            <thead>
              <tr>
                <th>Operación</th>
                <th>Fecha Emisión</th>
                <th>Vía de Cobro</th>
                <th>Formato Ticket</th>
                <th>Atributo CAE</th>
                <th>Total Facturado</th>
                <th style={{textAlign:'center'}}>Re-Impresión</th>
              </tr>
            </thead>
            <tbody>
              {sales.map(s => (
                <tr key={s.id}>
                  <td><span style={{fontFamily:'monospace', color:'#64748b'}}>{s.id.substring(0,8)}</span></td>
                  <td>{new Date(s.fecha).toLocaleDateString()} a las {new Date(s.fecha).toLocaleTimeString().substring(0,5)}</td>
                  <td>
                     <span style={{display:'flex', alignItems:'center', gap:'5px', fontWeight:500}}>
                        {s.metodoPago === 'EFECTIVO' ? <Banknote size={16} color="var(--success)"/> : <CreditCard size={16} color="var(--primary)"/>}
                        {s.metodoPago}
                     </span>
                  </td>
                  <td>
                    <span className={`badge ${s.cae ? 'badge-admin' : 'badge-cajero'}`}>
                      {s.cae ? 'ARCA/FISCAL' : 'USO INTERNO'}
                    </span>
                  </td>
                  <td>
                     {s.cae ? <strong style={{color:'var(--success)', display:'flex', gap:'5px'}}><ShieldCheck size={16}/> {s.cae}</strong> : <span style={{color:'#cbd5e1', fontSize:'0.8rem'}}>NO APLICA</span>}
                  </td>
                  <td style={{fontWeight:'800', fontSize:'1.1rem'}}>${s.total.toFixed(2)}</td>
                  <td style={{textAlign:'center'}}>
                    <button className="btn-action" style={{margin:'0 auto'}} onClick={() => printThermalTicket(s)} title="Ver y Mandar a Impresora Térmica">
                      <Printer size={18}/>
                    </button>
                  </td>
                </tr>
              ))}
              {sales.length === 0 && (
                <tr><td colSpan="7" style={{textAlign: 'center', padding: '3rem', color:'#64748b'}}>Sin operaciones cobradas encontradas hoy.</td></tr>
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
