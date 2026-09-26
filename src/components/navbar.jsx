'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useState } from 'react';
import { useAuth } from '@/lib/auth-provider';

const LINKS = [
  { href: '/', label: 'Inicio' },
  { href: '/inventario', label: 'Inventario' },
  { href: '/publicar', label: 'Publicar vehiculo', authOnly: true },
  { href: '/mis-publicaciones', label: 'Mis publicaciones', authOnly: true },
];

/**
 * Barra de navegacion superior (responsive).
 */
export default function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, isAuthenticated, logout, loading } = useAuth();
  const [open, setOpen] = useState(false);

  const visibleLinks = LINKS.filter((link) => !link.authOnly || isAuthenticated);

  const isActive = (href) =>
    href === '/' ? pathname === '/' : pathname === href || pathname.startsWith(`${href}/`);

  const handleLogout = () => {
    logout();
    setOpen(false);
    router.push('/');
  };

  return (
    <nav className="navbar">
      <div className="container navbar-inner">
        <Link href="/" className="navbar-brand" onClick={() => setOpen(false)}>
          <span className="brand-mark">SC</span>
          <span className="brand-text">
            Subastas Copart
            <small>Subastas de vehiculos</small>
          </span>
        </Link>

        <button
          type="button"
          className="nav-toggle"
          aria-label="Mostrar u ocultar menu"
          aria-expanded={open}
          onClick={() => setOpen((value) => !value)}
        >
          {open ? '✕' : '☰'}
        </button>

        <div className={`nav-links${open ? ' open' : ''}`}>
          {visibleLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={`nav-link${isActive(link.href) ? ' active' : ''}`}
              onClick={() => setOpen(false)}
            >
              {link.label}
            </Link>
          ))}

          {loading ? null : isAuthenticated ? (
            <div className="nav-user">
              <span className="nav-user-name" title={user?.email || ''}>
                {user?.fullName || user?.email}
              </span>
              <button type="button" className="btn btn-secondary btn-sm" onClick={handleLogout}>
                Cerrar sesion
              </button>
            </div>
          ) : (
            <div className="nav-user">
              <Link href="/login" className="btn btn-secondary btn-sm" onClick={() => setOpen(false)}>
                Login
              </Link>
              <Link href="/register" className="btn btn-primary btn-sm" onClick={() => setOpen(false)}>
                Registro
              </Link>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}
