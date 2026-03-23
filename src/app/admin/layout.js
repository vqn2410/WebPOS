"use client"
import { useAuth } from '@/context/AuthContext';
import { useRouter, usePathname } from 'next/navigation';
import { useEffect } from 'react';
import { auth } from '@/lib/firebase/config';
import { LogOut, Users, Settings, Package, LayoutDashboard, Receipt, MonitorPlay } from 'lucide-react';
import Link from 'next/link';
import './admin.css';

export default function AdminLayout({ children }) {
  const { user, userData, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!loading) {
      if (!user || !userData) {
        router.push('/');
      } else if (userData.rol !== 'admin') {
        router.push('/pos');
      }
    }
  }, [user, userData, loading, router]);

  if (loading || !user || userData?.rol !== 'admin') {
    return (
      <div className="admin-wrapper" style={{justifyContent: 'center', alignItems: 'center'}}>
        <p>Verificando identidad de la sesión...</p>
      </div>
    );
  }

  return (
    <div className="admin-wrapper animate-fade-in">
      <aside className="sidebar glass-panel">
        <div>
          <h2>Panel Admin</h2>
          <p style={{fontSize: '0.8rem', color: '#64748b'}}>POS + ERP • Nv. Dios</p>
        </div>
        
        <nav>
          <Link href="/admin" className={`nav-item ${pathname === '/admin' ? 'active' : ''}`}>
            <LayoutDashboard size={18} /> Tablero General
          </Link>
          <Link href="/admin/users" className={`nav-item ${pathname?.includes('/admin/users') ? 'active' : ''}`}>
            <Users size={18} /> Staff y Roles
          </Link>
          <Link href="/admin/products" className={`nav-item ${pathname?.includes('/admin/products') ? 'active' : ''}`}>
            <Package size={18} /> Catálogo
          </Link>
          <Link href="/admin/sales" className={`nav-item ${pathname?.includes('/admin/sales') ? 'active' : ''}`}>
            <Receipt size={18} /> Facturación
          </Link>
          <Link href="/admin/settings" className={`nav-item ${pathname?.includes('/admin/settings') ? 'active' : ''}`}>
            <Settings size={18} /> Configuración
          </Link>
          <Link href="/pos" className="nav-item" style={{marginTop: '1rem', background: 'var(--primary)', color: 'var(--primary-foreground)'}}>
            <MonitorPlay size={18} /> ABRIR CAJA TPV
          </Link>
        </nav>

        <button onClick={() => auth.signOut()} className="btn-danger">
          <LogOut size={16} style={{display: 'inline-block', marginRight: '5px', verticalAlign: 'middle'}}/> 
          Salir del ERP
        </button>
      </aside>
      
      <main className="main-content">
        {children}
      </main>
    </div>
  );
}
