import { RegisterForm } from '@/components/auth-forms';

export const metadata = {
  title: 'Crear cuenta | Subastas Copart',
  description: 'Registrate para publicar vehiculos y ofertar en las subastas.',
};

/** Pagina de registro de usuarios. */
export default function RegisterPage() {
  return <RegisterForm />;
}
