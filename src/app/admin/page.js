"use client"
import { useState, useEffect } from 'react';
import { collection, query, getDocs, where } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { TrendingUp, PackageMinus, Receipt, BarChart3 } from 'lucide-react';

export default function AdminDashboard() {
  const [ventasDia, setVentasDia] = useState(0);
  const [totalDia, setTotalDia] = useState(0);
  const [stockBajo, setStockBajo] = useState(0);
  const [chartData, setChartData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchBI = async () => {
      try {
        const start = new Date();
        start.setHours(0,0,0,0);
        
        const weekStart = new Date();
        weekStart.setDate(weekStart.getDate() - 6);
        weekStart.setHours(0,0,0,0);

        const qSales = query(collection(db, 'sales'), where('fecha', '>=', weekStart.toISOString()));
        const sSnap = await getDocs(qSales);
        
        let nVentas = 0;
        let cTotal = 0;
        
        // Estructurar contenedores de balance por día
        const dayBuckets = {};
        for(let i=0; i<7; i++) {
           const d = new Date(weekStart);
           d.setDate(d.getDate() + i);
           dayBuckets[d.toISOString().split('T')[0]] = 0;
        }

        sSnap.forEach(d => {
          const sale = d.data();
          const saleDate = new Date(sale.fecha);
          const saleDay = sale.fecha.split('T')[0];
          
          if (dayBuckets[saleDay] !== undefined) {
             dayBuckets[saleDay] += sale.total;
          }
          
          if (saleDate >= start) {
             nVentas++;
             cTotal += sale.total;
          }
        });

        const arr = Object.keys(dayBuckets).sort().map(dateStr => ({
           date: dateStr.substring(8, 10) + '/' + dateStr.substring(5,7),
           total: dayBuckets[dateStr]
        }));
        
        setChartData(arr);
        setVentasDia(nVentas);
        setTotalDia(cTotal);

        // Reporte Logístico Crítico
        const pSnap = await getDocs(collection(db, 'products'));
        let nStockBajo = 0;
        pSnap.forEach(d => {
          const prod = d.data();
          // Jamás alertará por stocks de Granel que no están bajo control central
          if (prod.tipo !== 'granel' && prod.stock !== null && prod.stock <= prod.stockMinimo) {
             nStockBajo++;
          }
        });
        setStockBajo(nStockBajo);

      } catch (error) {
        console.error("Error intercediendo Data Warehouse:", error);
      }
      setLoading(false);
    };

    fetchBI();
  }, []);

  const maxSales = Math.max(...chartData.map(d=>d.total), 1); 

  return (
    <div className="animate-fade-in" style={{maxWidth:'1200px'}}>
      <header style={{ marginBottom: '2.5rem', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
        <div>
           <h1 style={{ fontSize: '2.2rem', color: 'var(--primary)', fontWeight: 800, letterSpacing:'-0.5px' }}>Tablero Directivo</h1>
           <p style={{ color: '#64748b' }}>Reportes instantáneos de Caja y Alertas Logísticas.</p>
        </div>
      </header>
      
      {loading ? <p style={{color:'#64748b'}}>Calculando Data Warehouse desde la Nube...</p> : (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem' }}>
            
            <div className="glass-panel" style={{ padding: '2rem' }}>
              <div style={{display:'flex', justifyContent:'space-between', alignItems:'center'}}>
                <h3 style={{ fontSize: '1.1rem', marginBottom: '0.5rem', color: '#475569', fontWeight:'600' }}>Cierre Acumulado de Hoy</h3>
                <TrendingUp color="var(--success)"/>
              </div>
              <p style={{ fontSize: '3rem', fontWeight: '900', color: 'var(--success)', marginTop:'5px' }}>${totalDia.toFixed(2)}</p>
              <span style={{ fontSize: '0.85rem', color: '#94a3b8' }}>Ingresos netos integrando todos los medios.</span>
            </div>
            
            <div className="glass-panel" style={{ padding: '2rem' }}>
              <div style={{display:'flex', justifyContent:'space-between', alignItems:'center'}}>
                <h3 style={{ fontSize: '1.1rem', marginBottom: '0.5rem', color: '#475569', fontWeight:'600' }}>Circulación de Clientes</h3>
                <Receipt color="var(--primary)"/>
              </div>
              <p style={{ fontSize: '3rem', fontWeight: '900', color:'var(--foreground)', marginTop:'5px' }}>{ventasDia}</p>
              <span style={{ fontSize: '0.85rem', color: '#94a3b8' }}>Trama de boletas y transacciones desde las 00:00hs.</span>
            </div>
            
            <div className="glass-panel" style={{ padding: '2rem', border: stockBajo > 0 ? '2px solid rgba(239, 68, 68, 0.3)' : '1px solid var(--border)' }}>
              <div style={{display:'flex', justifyContent:'space-between', alignItems:'center'}}>
                 <h3 style={{ fontSize: '1.1rem', marginBottom: '0.5rem', color: '#475569', fontWeight:'600' }}>Alerta Logística</h3>
                 <PackageMinus color={stockBajo > 0 ? "var(--danger)" : "#94a3b8"}/>
              </div>
              <p style={{ fontSize: '3rem', fontWeight: '900', color: stockBajo > 0 ? 'var(--danger)' : '#64748b', marginTop:'5px' }}>{stockBajo}</p>
              <span style={{ fontSize: '0.85rem', color: '#94a3b8' }}>Productos tangibles por debajo del límite de quiebre.</span>
            </div>
            
          </div>
          
          <div className="glass-panel" style={{marginTop:'2rem', padding:'2.5rem', overflow:'hidden'}}>
            <h2 style={{ fontSize: '1.3rem', color: 'var(--foreground)', fontWeight: 700, marginBottom:'2.5rem', display:'flex', alignItems:'center', gap:'10px' }}>
              <BarChart3 size={24} color="var(--primary)"/> Evolución de Venta Semanal
            </h2>
            <div style={{display:'flex', alignItems:'flex-end', height:'250px', gap:'1.5rem', borderBottom:'1px solid var(--border)', paddingBottom:'1rem', overflowX:'auto'}}>
               {chartData.map((d, i) => {
                  const heightPercent = (d.total / maxSales) * 100;
                  return (
                     <div key={i} style={{flex:1, minWidth:'45px', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'flex-end', height:'100%'}}>
                        <span style={{fontSize:'0.75rem', fontWeight:'800', color:'var(--primary)', marginBottom:'5px'}}>${d.total > 0 ? parseInt(d.total) : ''}</span>
                        <div style={{
                           width:'100%', 
                           height: heightPercent === 0 ? '4px' : `${heightPercent}%`, 
                           background: d.total > 0 ? 'var(--primary)' : 'var(--input)', 
                           borderRadius:'4px 4px 0 0',
                           transition: 'height 0.8s cubic-bezier(0.175, 0.885, 0.32, 1.275)' /* Efecto gráfico orgánico rebote */
                        }}></div>
                     </div>
                  )
               })}
            </div>
            <div style={{display:'flex', gap:'1.5rem', marginTop:'0.8rem', overflowX:'auto'}}>
               {chartData.map((d, i) => (
                  <div key={`lbl-${i}`} style={{flex:1, minWidth:'45px', textAlign:'center', color:'#64748b', fontSize:'0.8rem', fontWeight:'600'}}>
                     {d.date}
                  </div>
               ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
