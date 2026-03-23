import { AuthProvider } from '@/context/AuthContext';
import './globals.css';

export const metadata = {
  title: 'POS + ERP System',
  description: 'Sistema de gestión comercial optimizado para locales móviles y desktop.',
};

export default function RootLayout({ children }) {
  return (
    <html lang="es">
      <body>
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
