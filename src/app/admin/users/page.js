"use client"
import { useState, useEffect } from 'react';
import { collection, getDocs, query, orderBy } from 'firebase/firestore';
import { db, auth } from '@/lib/firebase/config';
import { UserPlus, Edit, Power, PowerOff } from 'lucide-react';
import './users.css';

export default function UsersManagement() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // UI States
  const [filter, setFilter] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [apiError, setApiError] = useState('');
  
  // Form Data
  const [formData, setFormData] = useState({ uid: '', email: '', password: '', rol: 'cajero', activo: true });

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const q = query(collection(db, 'users'), orderBy('createdAt', 'desc'));
      const qs = await getDocs(q);
      const res = [];
      qs.forEach(doc => res.push(doc.data()));
      setUsers(res);
    } catch (e) { console.error(e); }
    setLoading(false);
  }

  useEffect(() => { fetchUsers(); }, []);

  const openNew = () => {
    setIsEditing(false);
    setApiError('');
    setFormData({ uid: '', email: '', password: '', rol: 'cajero', activo: true });
    setModalOpen(true);
  }

  const openEdit = (userSelected) => {
    setIsEditing(true);
    setApiError('');
    setFormData({ uid: userSelected.uid, email: userSelected.email, password: '', rol: userSelected.rol, activo: userSelected.activo });
    setModalOpen(true);
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    setApiError('');
    
    try {
      const token = await auth.currentUser.getIdToken();
      let res;
      if (isEditing) {
        // Edit mode (PUT)
        const updatePayload = { targetUid: formData.uid, rol: formData.rol, activo: formData.activo };
        if (formData.password) updatePayload.newPassword = formData.password; // opcional reseteo
        
        res = await fetch('/api/users', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
          body: JSON.stringify(updatePayload)
        });
      } else {
        // Create mode (POST)
        res = await fetch('/api/users', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
          body: JSON.stringify({ email: formData.email, password: formData.password, rol: formData.rol })
        });
      }

      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Error en petición');
      
      setModalOpen(false);
      fetchUsers();
    } catch (error) {
      setApiError(error.message);
    }
  }

  const toggleStatus = async (usuario) => {
    if(!window.confirm(`¿Seguro que deseas ${usuario.activo ? 'DESACTIVAR' : 'ACTIVAR'} esta cuenta?`)) return;
    try {
      const token = await auth.currentUser.getIdToken();
      const res = await fetch('/api/users', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ targetUid: usuario.uid, activo: !usuario.activo })  
      });
      if(res.ok) fetchUsers();
    } catch (e) {
      alert("Error al cambiar estado");
    }
  }

  const filteredUsers = users.filter(u => u.email.toLowerCase().includes(filter.toLowerCase()));

  return (
    <div className="animate-fade-in">
      <header className="page-header" style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem'}}>
        <div>
          <h1 style={{fontSize: '2rem', color: 'var(--primary)', fontWeight: 'bold'}}>Usuarios y Roles</h1>
          <p style={{color: '#64748b'}}>Administración de permisos de acceso al personal.</p>
        </div>
        <button className="btn-primary" onClick={openNew}>
          <UserPlus size={18} /> Nuevo Usuario
        </button>
      </header>

      <div className="glass-panel" style={{padding: '1.5rem', marginBottom: '2rem', display: 'flex'}}>
        <input 
          type="text" 
          className="input-base" 
          placeholder="Filtrar por email..." 
          value={filter} 
          onChange={e => setFilter(e.target.value)} 
          style={{maxWidth: '300px'}}
        />
      </div>

      <div className="glass-panel table-container">
        {loading ? <p style={{padding: '2rem', textAlign: 'center'}}>Cargando lista...</p> : (
          <table className="users-table">
            <thead>
              <tr>
                <th>Email</th>
                <th>Rol</th>
                <th>Estado</th>
                <th>Fecha Creación</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.map(u => (
                <tr key={u.uid} className={!u.activo ? 'inactive-row' : ''}>
                  <td><strong>{u.email}</strong></td>
                  <td><span className={`badge badge-${u.rol}`}>{u.rol.toUpperCase()}</span></td>
                  <td>
                    {u.activo 
                      ? <span style={{color: 'var(--success)', display: 'flex', alignItems: 'center', gap: '5px'}}><Power size={14}/> Activo</span> 
                      : <span style={{color: 'var(--danger)', display: 'flex', alignItems: 'center', gap: '5px'}}><PowerOff size={14}/> Inactivo</span>
                    }
                  </td>
                  <td>{new Date(u.createdAt).toLocaleDateString()}</td>
                  <td>
                    <div style={{display: 'flex', gap: '0.5rem'}}>
                      <button className="btn-action" onClick={() => openEdit(u)} title="Editar Rol / Clave"><Edit size={16}/></button>
                      <button className={`btn-action ${u.activo ? 'btn-danger-text' : 'btn-success-text'}`} onClick={() => toggleStatus(u)} title={u.activo ? 'Desactivar' : 'Reactivar'}>
                        {u.activo ? <PowerOff size={16}/> : <Power size={16}/>}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filteredUsers.length === 0 && (
                <tr><td colSpan="5" style={{textAlign: 'center', padding: '2rem'}}>Ningún usuario encontrado.</td></tr>
              )}
            </tbody>
          </table>
        )}
      </div>

      {modalOpen && (
        <div className="modal-backdrop">
          <div className="modal-container glass-panel animate-fade-in">
            <h2>{isEditing ? 'Editar Usuario' : 'Crear Usuario'}</h2>
            <p style={{color: '#64748b', fontSize: '0.9rem', marginBottom:'1.5rem'}}>
              {isEditing ? 'Ajusta los permisos o asigna una nueva contraseña.' : 'Crea un nuevo empleado dándole email y permisos.'}
            </p>
            
            {apiError && <div className="error-box">{apiError}</div>}
            
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label>Email</label>
                <input type="email" className="input-base" value={formData.email} onChange={e=>setFormData({...formData, email: e.target.value})} disabled={isEditing} required/>
              </div>
              
              <div className="form-group">
                <label>{isEditing ? 'Nueva Contraseña (Opcional)' : 'Contraseña'}</label>
                <input type="password" className="input-base" minLength={6} value={formData.password} onChange={e=>setFormData({...formData, password: e.target.value})} required={!isEditing} placeholder={isEditing ? 'Dejar en blanco para mantener actual' : 'Mínimo 6 caracteres'}/>
              </div>

              <div className="form-group">
                <label>Rol en el Sistema</label>
                <select className="input-base" value={formData.rol} onChange={e=>setFormData({...formData, rol: e.target.value})}>
                  <option value="cajero">Cajero (Ventas y Stock Básico)</option>
                  <option value="admin">Administrador (Control Total)</option>
                </select>
              </div>

              <div style={{display: 'flex', gap: '1rem', marginTop: '2rem'}}>
                <button type="button" className="btn-danger w-full" onClick={() => setModalOpen(false)}>Cancelar</button>
                <button type="submit" className="btn-primary w-full">Guardar Usuario</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
