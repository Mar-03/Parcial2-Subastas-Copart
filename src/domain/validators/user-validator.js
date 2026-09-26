import { validationError } from '../errors/domain-error';
import { cleanText, isValidEmail, toNumber } from './common-validator';

export const MIN_PASSWORD_LENGTH = 6;

/**
 * Valida y normaliza el payload de registro.
 * @returns {{ firstName:string, lastName:string, email:string, phone:string, password:string }}
 */
export function validateRegistration(payload = {}) {
  const errors = {};

  const firstName = cleanText(payload.firstName ?? payload.nombre ?? payload.first_name);
  const lastName = cleanText(payload.lastName ?? payload.apellido ?? payload.last_name);
  const email = cleanText(payload.email ?? payload.correo).toLowerCase();
  const phone = cleanText(payload.phone ?? payload.telefono);
  const password = typeof payload.password === 'string' ? payload.password : '';

  if (firstName.length < 2) errors.firstName = 'El nombre es obligatorio (minimo 2 caracteres).';
  if (firstName.length > 80) errors.firstName = 'El nombre no puede superar 80 caracteres.';
  if (lastName.length < 2) errors.lastName = 'El apellido es obligatorio (minimo 2 caracteres).';
  if (lastName.length > 80) errors.lastName = 'El apellido no puede superar 80 caracteres.';
  if (!isValidEmail(email)) errors.email = 'El correo electronico no tiene un formato valido.';
  if (phone.length < 6) errors.phone = 'El telefono es obligatorio.';
  if (phone.length > 30) errors.phone = 'El telefono no puede superar 30 caracteres.';
  if (password.length < MIN_PASSWORD_LENGTH) {
    errors.password = `La contrasena debe tener al menos ${MIN_PASSWORD_LENGTH} caracteres.`;
  }
  if (password.length > 72) errors.password = 'La contrasena no puede superar 72 caracteres.';

  if (Object.keys(errors).length > 0) {
    throw validationError('Revisa los datos del formulario de registro.', errors);
  }

  return { firstName, lastName, email, phone, password };
}

/** Valida y normaliza el payload de login. */
export function validateLogin(payload = {}) {
  const errors = {};
  const email = cleanText(payload.email ?? payload.correo).toLowerCase();
  const password = typeof payload.password === 'string' ? payload.password : '';

  if (!email) errors.email = 'El correo electronico es obligatorio.';
  if (!password) errors.password = 'La contrasena es obligatoria.';

  if (Object.keys(errors).length > 0) {
    throw validationError('Revisa los datos de inicio de sesion.', errors);
  }

  return { email, password };
}

/** Valida un identificador numerico (id de vehiculo, de usuario, etc.). */
export function validateNumericId(value, fieldName = 'id') {
  const number = toNumber(value);
  if (!Number.isFinite(number) || !Number.isInteger(number) || number <= 0) {
    throw validationError(`El valor de ${fieldName} no es valido.`, {
      [fieldName]: 'Debe ser un numero entero positivo.',
    });
  }
  return number;
}
