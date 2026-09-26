import './globals.css';
import Footer from '@/components/footer';
import Navbar from '@/components/navbar';
import { AuthProvider } from '@/lib/auth-provider';

export const metadata = {
  title: 'Subastas Copart | Subastas de vehiculos en tiempo real',
  description:
    'Plataforma de subastas de vehiculos en tiempo real: publica vehiculos, recibe ofertas en vivo y cierra subastas automaticamente.',
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
};

/**
 * Layout raiz. Todas las paginas se renderizan bajo demanda porque consultan
 * la API (y por lo tanto Firebase) desde el navegador: asi `next build`
 * nunca necesita conectarse a la base de datos.
 */
export const dynamic = 'force-dynamic';

export default function RootLayout({ children }) {
  return (
    <html lang="es">
      <body>
        <AuthProvider>
          <Navbar />
          <main>{children}</main>
          <Footer />
        </AuthProvider>
      </body>
    </html>
  );
}
