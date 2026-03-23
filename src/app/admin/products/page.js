"use client"
import { useState, useEffect } from 'react';
import { collection, getDocs, doc, setDoc, deleteDoc, writeBatch } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { PackagePlus, UploadCloud, Printer, Edit, Trash2 } from 'lucide-react';
import Link from 'next/link';
import './products.css';

export default function ProductsManagement() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // UI States
  const [filter, setFilter] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [uploading, setUploading] = useState(false);
  
  // Form Data
  const [formData, setFormData] = useState({
    id: '', nombre: '', codigoBarras: '', tipo: 'unitario', 
    precio: 0, stock: 0, stockMinimo: 0, categoria: ''
  });

  const fetchProducts = async () => {
    setLoading(true);
    try {
      const qs = await getDocs(collection(db, 'products'));
      const res = [];
      qs.forEach(doc => res.push({ id: doc.id, ...doc.data() }));
      setProducts(res);
    } catch (e) { console.error(e); }
    setLoading(false);
  }

  useEffect(() => { fetchProducts(); }, []);

  const openNew = () => {
    setIsEditing(false);
    setFormData({ id: '', nombre: '', codigoBarras: '', tipo: 'unitario', precio: '', stock: '', stockMinimo: '', categoria: '' });
    setModalOpen(true);
  }

  const openEdit = (prod) => {
    setIsEditing(true);
    setFormData({ ...prod });
    setModalOpen(true);
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      // El ID local puede ser el código de barras por convención, o autogenerado por firebase.
      // Aquí forzaremos que el ID del documento sea igual al código de barras para facilitar ventas y CSV.
      const docId = formData.codigoBarras.trim() || Date.now().toString();
      const productRef = doc(db, 'products', docId);

      await setDoc(productRef, {
        nombre: formData.nombre,
        codigoBarras: formData.codigoBarras,
        tipo: formData.tipo,
        precio: parseFloat(formData.precio),
        stock: parseFloat(formData.stock),
        stockMinimo: parseFloat(formData.stockMinimo),
        categoria: formData.categoria
      }, { merge: true });

      setModalOpen(false);
      fetchProducts();
    } catch (error) {
      alert("Error al guardar: " + error.message);
    }
  }

  const handleDelete = async (id, nombre) => {
    if(!window.confirm(`¿Seguro que deseas eliminar definitivamente "${nombre}"? Esta acción borrará la estadística futura.`)) return;
    try {
      await deleteDoc(doc(db, 'products', id));
      fetchProducts();
    } catch (e) {
      alert("Error al eliminar");
    }
  }

  /* Carga Masiva (CSV Native Parser) */
  const handleCSVUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    // Reseteamos el input para permitir recargas del mismo archivo
    e.target.value = null;
    
    if(!window.confirm("¿Importar este CSV? Los productos existentes con el mismo 'código de barras' se sobreescribirán. Solo se permiten archivos .csv o .txt.")) return;
    
    setUploading(true);
    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const text = event.target.result;
        // Separamos protegiendo retornos de carro en Windows/Linux
        const lines = text.split(/\r?\n/).filter(l => l.trim() !== '');
        
        if (lines.length < 2) throw new Error('El archivo no contiene filas de datos.');

        const batch = writeBatch(db);
        let count = 0;
        
        // Iteramos descartando la cabecera (índice 0)
        // Estructura obligatoria: nombre,codigoBarras,tipo,precio,stock,stockMinimo,categoria
        for (let i = 1; i < lines.length; i++) {
          const row = lines[i].split(',');
          if (row.length >= 7) {
            const codigoBarras = row[1].trim();
            if (!codigoBarras) continue; // Salta líneas huérfanas
            
            const prodRef = doc(db, 'products', codigoBarras);
            batch.set(prodRef, {
              nombre: row[0].trim(),
              codigoBarras: codigoBarras,
              tipo: row[2].trim().toLowerCase() === 'granel' ? 'granel' : 'unitario',
              precio: parseFloat(row[3]) || 0,
              stock: parseFloat(row[4]) || 0,
              stockMinimo: parseFloat(row[5]) || 0,
              categoria: row[6].trim() || ''
            }, { merge: true });
            
            count++;
          }
        }
        
        await batch.commit();
        alert(`Extracción Finalizada: ${count} productos procesados (insertados/actualizados) exitosamente.`);
        fetchProducts();
      } catch (err) {
        alert("Error procesando CSV: \n" + err.message + "\n\nAsegúrate que tenga las 7 columnas exactas en orden.");
      }
      setUploading(false);
    };
    reader.readAsText(file);
  };

  const filteredProducts = products.filter(p => 
    p.nombre.toLowerCase().includes(filter.toLowerCase()) || 
    p.codigoBarras.includes(filter)
  );

  return (
    <div className="animate-fade-in">
      <header className="page-header" style={{marginBottom: '2rem'}}>
        <h1 style={{fontSize: '2rem', color: 'var(--primary)', fontWeight: 'bold'}}>Inventario</h1>
        <p style={{color: '#64748b'}}>Gestión de catálogo, etiquetas y control de stock.</p>
      </header>

      <div className="products-toolbar glass-panel" style={{padding: '1.5rem'}}>
        <div className="filters-box">
          <input 
            type="text" 
            className="input-base" 
            placeholder="Buscar por nombre o código de barras..." 
            value={filter} 
            onChange={e => setFilter(e.target.value)} 
          />
        </div>
        
        <div className="actions-box">
          {/* Carga CSV */}
          <label className="btn-upload-label">
            <UploadCloud size={18} />
            {uploading ? 'Procesando...' : 'Subir CSV'}
            <input type="file" accept=".csv" onChange={handleCSVUpload} disabled={uploading}/>
          </label>
          
          {/* Etiquetas */}
          <Link href="/admin/products/labels" className="btn-upload-label" style={{textDecoration: 'none'}}>
            <Printer size={18} /> Etiquetas (Print)
          </Link>
          
          {/* Nuevo Item */}
          <button className="btn-primary" onClick={openNew}>
            <PackagePlus size={18} /> Nuevo
          </button>
        </div>
      </div>

      <div className="glass-panel table-container">
        {loading ? <p style={{padding: '2rem', textAlign: 'center'}}>Cargando productos...</p> : (
          <table className="users-table">
            <thead>
              <tr>
                <th>Código Barras</th>
                <th>Nombre</th>
                <th>Categoría</th>
                <th>Tipo</th>
                <th>Precio</th>
                <th>Stock Disp.</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filteredProducts.map(p => {
                const isCritico = p.stock <= p.stockMinimo;
                return (
                  <tr key={p.id}>
                    <td><span style={{fontFamily:'monospace', color: '#64748b'}}>{p.codigoBarras}</span></td>
                    <td><strong>{p.nombre}</strong></td>
                    <td><span className="badge badge-admin">{p.categoria || 'S/C'}</span></td>
                    <td>{p.tipo.toUpperCase()}</td>
                    <td className="precio-cell">${p.precio.toFixed(2)}</td>
                    <td className={isCritico ? 'stock-bajo' : ''}>
                      {p.stock} <span style={{fontSize:'0.75rem', opacity: 0.5}}>(Mín: {p.stockMinimo})</span>
                    </td>
                    <td>
                      <div style={{display: 'flex', gap: '0.5rem'}}>
                        <button className="btn-action" onClick={() => openEdit(p)} title="Editar"><Edit size={16}/></button>
                        <button className="btn-action btn-danger-text" onClick={() => handleDelete(p.id, p.nombre)} title="Eliminar"><Trash2 size={16}/></button>
                      </div>
                    </td>
                  </tr>
                )
              })}
              {filteredProducts.length === 0 && (
                <tr><td colSpan="7" style={{textAlign: 'center', padding: '2rem'}}>Sin existencias encontradas en esta búsqueda.</td></tr>
              )}
            </tbody>
          </table>
        )}
      </div>

      {modalOpen && (
        <div className="modal-backdrop">
          <div className="modal-container glass-panel animate-fade-in" style={{maxWidth: '600px'}}>
            <h2>{isEditing ? 'Editar Producto' : 'Crear Producto'}</h2>
            <hr style={{borderColor: 'rgba(255,255,255,0.05)', margin: '1rem 0'}}/>
            
            <form onSubmit={handleSubmit} className="grid-form">
              <div className="form-group col-span-2">
                <label>Nombre del Producto</label>
                <input type="text" className="input-base" value={formData.nombre} onChange={e=>setFormData({...formData, nombre: e.target.value})} required/>
              </div>
              
              <div className="form-group">
                <label>Código de Barras (EAN-13/SKU)</label>
                <input type="text" className="input-base" value={formData.codigoBarras} onChange={e=>setFormData({...formData, codigoBarras: e.target.value})} required disabled={isEditing}/>
              </div>

              <div className="form-group">
                <label>Categoría</label>
                <input type="text" className="input-base" value={formData.categoria} onChange={e=>setFormData({...formData, categoria: e.target.value})} />
              </div>

              <div className="form-group">
                <label>Tipo de Venta</label>
                <select className="input-base" value={formData.tipo} onChange={e=>setFormData({...formData, tipo: e.target.value})}>
                  <option value="unitario">Unitario (Unidades enteras)</option>
                  <option value="granel">A Granel (Peso/Fraccionario)</option>
                </select>
              </div>

              <div className="form-group">
                <label>Precio de Venta ($)</label>
                <input type="number" step="0.01" className="input-base" value={formData.precio} onChange={e=>setFormData({...formData, precio: e.target.value})} required/>
              </div>

              <div className="form-group">
                <label>Stock Actual</label>
                <input type="number" step={formData.tipo === 'granel' ? "0.01" : "1"} className="input-base" value={formData.stock} onChange={e=>setFormData({...formData, stock: e.target.value})} required/>
              </div>

              <div className="form-group">
                <label>Stock Mínimo (Alerta)</label>
                <input type="number" step={formData.tipo === 'granel' ? "0.01" : "1"} className="input-base" value={formData.stockMinimo} onChange={e=>setFormData({...formData, stockMinimo: e.target.value})} required/>
              </div>

              <div className="col-span-2" style={{display: 'flex', gap: '1rem', marginTop: '1.5rem'}}>
                <button type="button" className="btn-danger w-full" onClick={() => setModalOpen(false)}>Cancelar</button>
                <button type="submit" className="btn-primary w-full">Guardar Item</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
