'use client';

/**
 * Respaldo visual para imagenes externas que no cargan.
 * Evita mostrar imagenes rotas en la interfaz.
 */
export const IMAGE_FALLBACK = 'https://picsum.photos/seed/subasta/1200/800';

export function handleImageError(event) {
  const img = event.currentTarget;
  if (img.dataset.fallbackApplied === 'true') return;
  img.dataset.fallbackApplied = 'true';
  img.src = IMAGE_FALLBACK;
}

/** Construye un src seguro (evita cargas rotas de URLs vacias). */
export function safeImageSrc(url, index = 0) {
  if (typeof url === 'string' && url.trim()) return url;
  return `https://picsum.photos/seed/subasta${index}/1200/800`;
}
