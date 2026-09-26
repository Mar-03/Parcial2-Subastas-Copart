'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-provider';
import { useEffect } from 'react';

/**
 * Bloquea el contenido para usuarios anonimos y redirige a /login.
 * El usuario anonimo SI puede ver el catalogo y el detalle de las subastas.
 */
export default function ProtectedRoute({ children, title = 'Zona exclusiva' }) {
  const { isAuthenticated, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      router.replace('/login');
    }
  }, [loading, isAuthenticated, router]);

  if (loading) {
    return (
      <div className="container section">
        <div className="skeleton" style={{ height: 280 }} />
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="container section">
        <div className="card card-pad empty-state">
          <h3>{title}</h3>
          <p>Debes iniciar sesion para acceder a esta seccion.</p>
          <Link href="/login" className="btn btn-primary">
            Iniciar sesion
          </Link>
        </div>
      </div>
    );
  }

  return children;
}
