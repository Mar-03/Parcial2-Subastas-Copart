'use client';

import { useEffect, useState } from 'react';
import { handleImageError, safeImageSrc } from '@/lib/image';

/**
 * Carrusel de la galeria del vehiculo.
 * Muestra todas las imagenes (minimo 5 al publicar) con botones anterior/siguiente.
 */
export default function VehicleGallery({ images = [], alt = 'Vehiculo en subasta' }) {
  const list = images.length > 0 ? images : [''];
  const [index, setIndex] = useState(0);

  useEffect(() => {
    setIndex(0);
  }, [images]);

  const goTo = (next) => {
    if (next < 0) {
      setIndex(list.length - 1);
      return;
    }
    if (next >= list.length) {
      setIndex(0);
      return;
    }
    setIndex(next);
  };

  return (
    <div className="gallery">
      <div className="gallery-main">
        <img
          src={safeImageSrc(list[index], index)}
          alt={`${alt} - imagen ${index + 1} de ${list.length}`}
          onError={handleImageError}
        />
        {list.length > 1 ? (
          <>
            <button
              type="button"
              className="gallery-nav prev"
              onClick={() => goTo(index - 1)}
              aria-label="Imagen anterior"
            >
              ‹
            </button>
            <button
              type="button"
              className="gallery-nav next"
              onClick={() => goTo(index + 1)}
              aria-label="Imagen siguiente"
            >
              ›
            </button>
          </>
        ) : null}
        <span className="gallery-counter">
          {index + 1} / {list.length}
        </span>
      </div>

      {list.length > 1 ? (
        <div className="gallery-thumbs">
          {list.map((image, position) => (
            <button
              key={`${position}-${image}`}
              type="button"
              className={`gallery-thumb${position === index ? ' active' : ''}`}
              onClick={() => setIndex(position)}
              aria-label={`Ver imagen ${position + 1}`}
            >
              <img
                src={safeImageSrc(image, position)}
                alt=""
                loading="lazy"
                onError={handleImageError}
              />
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
