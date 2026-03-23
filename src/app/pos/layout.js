"use client"
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function POSLayout({ children }) {
  const { user, userData, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading) {
      if (!user || !userData) {
        router.push('/');
      } 
      // El POS está abierto tanto a Cajeros como a Administradores (El admin tiene poder total).
    }
  }, [user, userData, loading, router]);

  if (loading || !user) {
    return (
      <div style={{height:'100vh', display:'flex', justifyContent:'center', alignItems:'center'}}>
        <p>Iniciando Caja...</p>
      </div>
    );
  }

  return <>{children}</>;
}
