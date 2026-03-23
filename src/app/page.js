"use client"
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '@/lib/firebase/config';
import { useAuth } from '@/context/AuthContext';
import './login.css';

export default function Login() {
  const { user, userData, loading } = useAuth();
  const router = useRouter();
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorLocal, setErrorLocal] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Redirección inteligente
  useEffect(() => {
    if (!loading && user && userData) {
      if (userData.rol === 'admin') {
        router.push('/admin'); // Panel General Admin
      } else {
        router.push('/pos'); // Punto Venta Cajeros
      }
    }
  }, [user, userData, loading, router]);

  const handleLogin = async (e) => {
    e.preventDefault();
    setErrorLocal('');
    setIsSubmitting(true);
    try {
      await signInWithEmailAndPassword(auth, email, password);
      // Tras el login, AuthContext actualiza el estado y el useEffect nos redirige.
    } catch (error) {
      setErrorLocal('Correo o contraseña incorrectos.');
      setIsSubmitting(false);
    }
  };

  // Prevenir parpadeo o vista de login si ya hay un usuario cargando
  if (loading || (user && userData)) return null;

  return (
    <div className="login-wrapper">
      <div className="login-container glass-panel animate-fade-in">
        <h1>POS + ERP</h1>
        <p>Inicia sesión para continuar</p>
        
        {errorLocal && (
          <div className="error-box animate-fade-in">
            <span>⚠️</span> {errorLocal}
          </div>
        )}
        
        <form onSubmit={handleLogin}>
          <div className="form-group">
            <label>Correo Electrónico</label>
            <input 
              type="email" 
              className="input-base" 
              placeholder="admin@pos.com"
              value={email} 
              onChange={e => setEmail(e.target.value)} 
              required 
            />
          </div>
          <div className="form-group">
            <label>Contraseña</label>
            <input 
              type="password" 
              className="input-base" 
              placeholder="••••••••"
              value={password} 
              onChange={e => setPassword(e.target.value)} 
              required 
            />
          </div>
          <button type="submit" className="btn-primary w-full mt-2" disabled={isSubmitting}>
            {isSubmitting ? 'Iniciando sesión...' : 'Entrar'}
          </button>
        </form>
      </div>
    </div>
  );
}
