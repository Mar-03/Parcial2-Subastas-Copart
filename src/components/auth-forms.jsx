'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import Alert from '@/components/alert';
import { useAuth } from '@/lib/auth-provider';

/**
 * Formulario de inicio de sesion (POST /api/auth/login).
 */
export function LoginForm() {
  const { login } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [fieldErrors, setFieldErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError(null);
    setFieldErrors({});
    setSubmitting(true);

    try {
      await login(email.trim(), password);
      router.push('/inventario');
    } catch (err) {
      setError(err.message || 'No se pudo iniciar sesion.');
      if (err.errors) setFieldErrors(err.errors);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="auth-layout">
      <div className="auth-card">
        <h1>Iniciar sesion</h1>
        <p className="auth-subtitle">
          Accede para ofertar en las subastas y publicar tus propios vehiculos.
        </p>

        {error ? <Alert type="error" message={error} errors={fieldErrors} /> : null}

        <form onSubmit={handleSubmit} className="form-grid">
          <div className="form-group full">
            <label className="form-label" htmlFor="email">
              Correo electronico <span className="required">*</span>
            </label>
            <input
              id="email"
              className={`form-input${fieldErrors.email ? ' has-error' : ''}`}
              type="email"
              autoComplete="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="tucorreo@ejemplo.com"
              required
            />
            {fieldErrors.email ? <span className="form-error">{fieldErrors.email}</span> : null}
          </div>

          <div className="form-group full">
            <label className="form-label" htmlFor="password">
              Contrasena <span className="required">*</span>
            </label>
            <input
              id="password"
              className={`form-input${fieldErrors.password ? ' has-error' : ''}`}
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Tu contrasena"
              required
            />
            {fieldErrors.password ? <span className="form-error">{fieldErrors.password}</span> : null}
          </div>

          <div className="form-group full">
            <button type="submit" className="btn btn-primary btn-block btn-lg" disabled={submitting}>
              {submitting ? 'Verificando...' : 'Iniciar sesion'}
            </button>
          </div>
        </form>

        <div className="auth-footer">
          Todavia no tienes cuenta? <Link href="/register">Registrate aqui</Link>
        </div>
      </div>
    </div>
  );
}

/**
 * Formulario de registro (POST /api/auth/register).
 */
export function RegisterForm() {
  const { register } = useAuth();
  const router = useRouter();
  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
  });
  const [error, setError] = useState(null);
  const [fieldErrors, setFieldErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  const set = (key) => (event) => setForm((current) => ({ ...current, [key]: event.target.value }));

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError(null);
    setFieldErrors({});

    if (form.password !== form.confirmPassword) {
      setFieldErrors({ confirmPassword: 'Las contrasenas no coinciden.' });
      return;
    }

    setSubmitting(true);
    try {
      await register({
        firstName: form.firstName,
        lastName: form.lastName,
        email: form.email,
        phone: form.phone,
        password: form.password,
      });
      router.push('/inventario');
    } catch (err) {
      setError(err.message || 'No se pudo crear la cuenta.');
      if (err.errors) setFieldErrors(err.errors);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="auth-layout">
      <div className="auth-card">
        <h1>Crear cuenta</h1>
        <p className="auth-subtitle">
          Registrate para publicar vehiculos, ofertar en subastas y seguir tus publicaciones.
        </p>

        {error ? <Alert type="error" message={error} errors={fieldErrors} /> : null}

        <form onSubmit={handleSubmit} className="form-grid">
          <div className="form-group">
            <label className="form-label" htmlFor="firstName">
              Nombre <span className="required">*</span>
            </label>
            <input
              id="firstName"
              className={`form-input${fieldErrors.firstName ? ' has-error' : ''}`}
              value={form.firstName}
              onChange={set('firstName')}
              autoComplete="given-name"
              required
            />
            {fieldErrors.firstName ? <span className="form-error">{fieldErrors.firstName}</span> : null}
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="lastName">
              Apellido <span className="required">*</span>
            </label>
            <input
              id="lastName"
              className={`form-input${fieldErrors.lastName ? ' has-error' : ''}`}
              value={form.lastName}
              onChange={set('lastName')}
              autoComplete="family-name"
              required
            />
            {fieldErrors.lastName ? <span className="form-error">{fieldErrors.lastName}</span> : null}
          </div>

          <div className="form-group full">
            <label className="form-label" htmlFor="email">
              Correo electronico <span className="required">*</span>
            </label>
            <input
              id="email"
              className={`form-input${fieldErrors.email ? ' has-error' : ''}`}
              type="email"
              value={form.email}
              onChange={set('email')}
              autoComplete="email"
              placeholder="nombre@correo.com"
              required
            />
            {fieldErrors.email ? <span className="form-error">{fieldErrors.email}</span> : null}
          </div>

          <div className="form-group full">
            <label className="form-label" htmlFor="phone">
              Telefono <span className="required">*</span>
            </label>
            <input
              id="phone"
              className={`form-input${fieldErrors.phone ? ' has-error' : ''}`}
              type="tel"
              value={form.phone}
              onChange={set('phone')}
              autoComplete="tel"
              placeholder="+502 5555 5555"
              required
            />
            {fieldErrors.phone ? <span className="form-error">{fieldErrors.phone}</span> : null}
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="password">
              Contrasena <span className="required">*</span>
            </label>
            <input
              id="password"
              className={`form-input${fieldErrors.password ? ' has-error' : ''}`}
              type="password"
              value={form.password}
              onChange={set('password')}
              autoComplete="new-password"
              minLength={6}
              required
            />
            {fieldErrors.password ? <span className="form-error">{fieldErrors.password}</span> : null}
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="confirmPassword">
              Confirmar contrasena <span className="required">*</span>
            </label>
            <input
              id="confirmPassword"
              className={`form-input${fieldErrors.confirmPassword ? ' has-error' : ''}`}
              type="password"
              value={form.confirmPassword}
              onChange={set('confirmPassword')}
              autoComplete="new-password"
              minLength={6}
              required
            />
            {fieldErrors.confirmPassword ? (
              <span className="form-error">{fieldErrors.confirmPassword}</span>
            ) : null}
          </div>

          <div className="form-group full">
            <button type="submit" className="btn btn-primary btn-block btn-lg" disabled={submitting}>
              {submitting ? 'Creando cuenta...' : 'Crear cuenta'}
            </button>
          </div>
        </form>

        <div className="auth-footer">
          Ya tienes cuenta? <Link href="/login">Inicia sesion</Link>
        </div>
      </div>
    </div>
  );
}
