"use client"
import { useState, useEffect } from 'react';
import { collection, getDocs, orderBy, query } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import Barcode from 'react-barcode';
import { Printer, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import './labels.css';

export default function LabelsGenerator() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchA = async () => {
      try {
        const q = query(collection(db, 'products'), orderBy('nombre', 'asc'));
        const qs = await getDocs(q);
        const res = [];
        qs.forEach(doc => res.push(doc.data()));
        setProducts(res);
      } catch (e) {
        console.error("Error al obtener catálogo:", e);
      }
      setLoading(false);
    }
    fetchA();
  }, []);

  if (loading) return <div style={{padding: '3rem', textAlign: 'center'}}>Conectando base de datos para generar hojas...</div>;

  return (
    <div className="print-layout animate-fade-in">
      <div className="no-print">
        <h2 style={{color: '#fff', marginBottom: '1rem'}}>Generador de Etiquetas Masivas</h2>
        <p style={{color: '#64748b', marginBottom: '2rem'}}>
          Las etiquetas se han adaptado para impresión en gris/negro puro. Configura "Ajustar al área de impresión" en tu navegador y quita encabezados y pies de página antes de mandar el PDF.
        </p>
        
        <div style={{display: 'flex', gap: '1rem', justifyContent: 'center'}}>
          <Link href="/admin/products" className="btn-danger" style={{textDecoration: 'none'}}>
            <ArrowLeft size={18} style={{verticalAlign: 'middle', marginRight:'5px'}} /> Volver a Inventario
          </Link>
          <button className="btn-primary" onClick={() => window.print()}>
            <Printer size={18} /> IMPRIMIR {products.length} ETIQUETAS
          </button>
        </div>
      </div>
      
      <div id="hoja-etiquetas" className="labels-grid">
        {products.map(p => (
           <div className="label-card" key={p.codigoBarras}>
             <p className="label-name" title={p.nombre}>{p.nombre}</p>
             <p className="label-price">${p.precio.toFixed(2)}</p>
             <div className="barcode-wrapper">
               <Barcode 
                 value={p.codigoBarras || "0000000000"} 
                 width={1.6} 
                 height={45} 
                 fontSize={14} 
                 margin={0} 
                 background="transparent" 
                 lineColor="#000000"
               />
             </div>
           </div>
        ))}
      </div>
    </div>
  )
}
