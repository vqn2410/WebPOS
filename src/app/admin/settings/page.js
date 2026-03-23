"use client"
import { useState, useEffect } from 'react';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { Save, Store, ShieldCheck } from 'lucide-react';

export default function SettingsArea() {
  const [config, setConfig] = useState({
    nombreComercial: '',
    cuit: '',
    direccion: '',
    puntoVenta: '0001',
    condicionIva: 'Responsable Inscripto',
    afipCert: ''
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');

  useEffect(() => {
    const fetchConfig = async () => {
      try {
        const docRef = doc(db, 'config', 'general');
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setConfig(docSnap.data());
        }
      } catch (err) { console.error(err); }
      setLoading(false);
    }
    fetchConfig();
  }, []);

  const saveConfig = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await setDoc(doc(db, 'config', 'general'), config);
      setMsg('¡Configuración de la empresa guardada exitosamente en la Nube!');
      setTimeout(() => setMsg(''), 4000);
    } catch (e) {
      alert("Error verificando reglas de seguridad (Admin): " + e.message);
    }
    setSaving(false);
  }

  if (loading) return <p style={{padding:'2rem', color:'#64748b'}}>Extrayendo parámetros globales de la empresa...</p>;

  return (
    <div className="animate-fade-in" style={{maxWidth:'850px'}}>
      <header style={{marginBottom: '2rem'}}>
        <h1 style={{fontSize: '2rem', color: 'var(--primary)', fontWeight: 'bold'}}>Configuración del ERP</h1>
        <p style={{color: '#64748b'}}>Datos fiscales y legales del comercio que regularán todo el ecosistema de Tickets.</p>
      </header>

      {msg && <div className="error-box" style={{background:'#d1fae5', color:'#065f46', borderColor:'#a7f3d0', fontSize:'1rem', fontWeight:'600'}}>{msg}</div>}

      <form onSubmit={saveConfig}>
        <div className="glass-panel" style={{padding:'2.5rem', marginBottom:'2rem'}}>
          <h2 style={{display:'flex', alignItems:'center', gap:'10px', fontSize:'1.3rem', marginBottom:'1.5rem', color:'var(--foreground)'}}>
            <Store size={22} color="var(--primary)"/> Datos Comerciales Estructurales
          </h2>
          <div className="grid-form">
            <div className="form-group">
              <label style={{color: '#475569', fontWeight: 'bold', marginBottom: '8px', display:'block'}}>Razón Social / Nombre Fantasía</label>
              <input type="text" className="input-base" required value={config.nombreComercial} onChange={e=>setConfig({...config, nombreComercial: e.target.value})} placeholder="Ej: Supermercado El Trébol S.R.L"/>
            </div>
            <div className="form-group">
              <label style={{color: '#475569', fontWeight: 'bold', marginBottom: '8px', display:'block'}}>C.U.I.T. de la Entidad</label>
              <input type="text" className="input-base" required value={config.cuit} onChange={e=>setConfig({...config, cuit: e.target.value})} placeholder="30-00000000-0"/>
            </div>
            <div className="form-group col-span-2">
              <label style={{color: '#475569', fontWeight: 'bold', marginBottom: '8px', display:'block'}}>Domicilio Comercial Físico</label>
              <input type="text" className="input-base" value={config.direccion} onChange={e=>setConfig({...config, direccion: e.target.value})} placeholder="Avenida Principal 123, B° Centro"/>
            </div>
          </div>
        </div>

        <div className="glass-panel" style={{padding:'2.5rem', marginBottom:'3rem'}}>
          <h2 style={{display:'flex', alignItems:'center', gap:'10px', fontSize:'1.3rem', marginBottom:'1.5rem', color:'var(--foreground)'}}>
            <ShieldCheck size={22} color="var(--success)"/> Terminal Fiscal (AFIP / ARCA)
          </h2>
          <div className="grid-form">
            <div className="form-group">
              <label style={{color: '#475569', fontWeight: 'bold', marginBottom: '8px', display:'block'}}>Nº Punto de Venta Habilitado</label>
              <input type="text" className="input-base" required value={config.puntoVenta} onChange={e=>setConfig({...config, puntoVenta: e.target.value})} placeholder="0001"/>
            </div>
            <div className="form-group">
              <label style={{color: '#475569', fontWeight: 'bold', marginBottom: '8px', display:'block'}}>Categoría Tributaria (IVA)</label>
              <select className="input-base" value={config.condicionIva} onChange={e=>setConfig({...config, condicionIva: e.target.value})}>
                 <option value="Responsable Inscripto">Responsable Inscripto</option>
                 <option value="Monotributo">Régimen Simplificado (Monotributo)</option>
                 <option value="Exento">IVA Exento</option>
              </select>
            </div>
            <div className="form-group col-span-2" style={{marginTop:'1rem'}}>
              <label style={{color: '#475569', fontWeight: 'bold', marginBottom: '8px', display:'block'}}>Certificado / Token de Producción WebService</label>
              <textarea className="input-base" rows="3" value={config.afipCert} onChange={e=>setConfig({...config, afipCert: e.target.value})} placeholder="Pegue la llave Base64 de la AFIP para facturación remota asíncrona..." style={{fontFamily:'monospace', fontSize:'0.85rem'}}></textarea>
              <p style={{fontSize:'0.8rem', color:'#94a3b8', marginTop:'8px'}}>Si aún opera con facturación manual diferida, deje este campo criptográfico en blanco.</p>
            </div>
          </div>
        </div>

        <div style={{display:'flex', justifyContent:'flex-end'}}>
           <button type="submit" className="btn-primary" disabled={saving} style={{fontSize:'1.15rem', padding:'1rem 2.5rem'}}>
             <Save size={22} style={{marginRight:'8px'}}/> {saving ? 'Despachando...' : 'Guardar y Sincronizar Cambios'}
           </button>
        </div>
      </form>
    </div>
  )
}
