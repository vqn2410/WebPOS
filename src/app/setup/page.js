"use client"
import { useState } from 'react';
import { getAuth, createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { app, db } from '@/lib/firebase/config';
import { useRouter } from 'next/navigation';

export default function SetupAdmin() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [status, setStatus] = useState('');
  const [errorLocal, setErrorLocal] = useState('');
  const router = useRouter();

  const handleSetup = async (e) => {
    e.preventDefault();
    setStatus('Creando...');
    setErrorLocal('');
    try {
      const auth = getAuth(app);
      const cred = await createUserWithEmailAndPassword(auth, email, password);
      
      const newAdminRef = doc(db, 'users', cred.user.uid);
      await setDoc(newAdminRef, {
        uid: cred.user.uid,
        email: cred.user.email,
        rol: 'admin',
        activo: true,
        createdAt: new Date().toISOString()
      });
      
      setStatus('¡Listo! Administrador maestro registrado con éxito. Redirigiendo...');
      setTimeout(() => router.push('/'), 2000);
    } catch (err) {
      setStatus('');
      setErrorLocal('Ha ocurrido un error: ' + err.message);
    }
  };

  return (
    <div style={{height:'100vh', display:'flex', justifyContent:'center', alignItems:'center', padding:'1rem', background: 'var(--background)'}}>
      <div className="glass-panel" style={{maxWidth:'400px', width:'100%', padding:'2.5rem', textAlign:'center'}}>
        <h2 style={{color:'var(--primary)', marginBottom:'0.5rem', fontWeight:'700'}}>🚀 Modo Instalación</h2>
        <p style={{marginBottom:'2rem', fontSize:'0.9rem', color:'#64748b'}}>
           Crea y autoriza tu primera cuenta de administrador para acceder a toda la plataforma.
        </p>
        
        {status && <div className="error-box" style={{background:'#dbeafe', color:'#1e40af', borderColor:'#93c5fd'}}>{status}</div>}
        {errorLocal && <div className="error-box">{errorLocal}</div>}

        <form onSubmit={handleSetup}>
          <div className="form-group" style={{textAlign:'left', margin:'1rem 0'}}>
             <label style={{display:'block', marginBottom:'5px', color:'#334155', fontWeight:'600'}}>Email Inicial</label>
             <input type="email" className="input-base" value={email} onChange={e=>setEmail(e.target.value)} required/>
          </div>
          <div className="form-group" style={{textAlign:'left', marginBottom:'1.5rem'}}>
             <label style={{display:'block', marginBottom:'5px', color:'#334155', fontWeight:'600'}}>Clave (+6 Caracteres)</label>
             <input type="password" className="input-base" minLength={6} value={password} onChange={e=>setPassword(e.target.value)} required/>
          </div>
          <button type="submit" className="btn-primary" style={{width:'100%'}}>Configurar y Entrar</button>
        </form>
      </div>
    </div>
  )
}
