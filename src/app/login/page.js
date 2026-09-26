import { LoginForm } from '@/components/auth-forms';

export const metadata = {
  title: 'Iniciar sesion | Subastas Copart',
  description: 'Inicia sesion para ofertar y publicar vehiculos en subasta.',
};

/** Pagina de inicio de sesion. */
export default function LoginPage() {
  return <LoginForm />;
}
