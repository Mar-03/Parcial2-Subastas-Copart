'use client';

import { useMemo, useState } from 'react';
import Alert from '@/components/alert';
import { DAMAGE_LEVELS } from '@/domain/entities/damage-level';
import {
  DRIVETRAINS,
  ENGINES,
  FUEL_TYPES,
  ITEM_TYPES,
  TRANSMISSIONS,
} from '@/domain/entities/auction-status';
import { toDateTimeLocalValue } from '@/lib/format';

const MIN_IMAGES = 5;
const MAX_IMAGES = 10;
/** Ancho maximo (px) y calidad JPEG de las fotos subidas desde la computadora. */
const MAX_IMAGE_WIDTH = 800;
const JPEG_QUALITY = 0.65;

/** Lee un File como Data URL. */
function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(new Error(`No se pudo leer ${file.name}.`));
    reader.readAsDataURL(file);
  });
}

/**
 * Redimensiona y comprime una imagen en el navegador y devuelve un Data URL
 * JPEG. Evita payloads enormes en Realtime Database sin usar Firebase Storage.
 */
function compressImage(file) {
  return readFileAsDataUrl(file).then(
    (original) =>
      new Promise((resolve) => {
        const img = new Image();
        img.onload = () => {
          try {
            const scale = Math.min(1, MAX_IMAGE_WIDTH / (img.width || MAX_IMAGE_WIDTH));
            const width = Math.max(1, Math.round((img.width || MAX_IMAGE_WIDTH) * scale));
            const height = Math.max(1, Math.round((img.height || MAX_IMAGE_WIDTH) * scale));

            const canvas = document.createElement('canvas');
            canvas.width = width;
            canvas.height = height;

            const ctx = canvas.getContext('2d');
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(0, 0, width, height);
            ctx.drawImage(img, 0, 0, width, height);

            resolve(canvas.toDataURL('image/jpeg', JPEG_QUALITY));
          } catch {
            resolve(original);
          }
        };
        img.onerror = () => resolve(original);
        img.src = original;
      }),
  );
}

/** URLs de ejemplo para agregar rapido a la galeria (no se almacenan archivos). */
const SAMPLE_IMAGES = [
  'https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&w=1200&q=70',
  'https://images.unsplash.com/photo-1494976388531-d1058494cdd8?auto=format&fit=crop&w=1200&q=70',
  'https://images.unsplash.com/photo-1553440569-bcc63803a83d?auto=format&fit=crop&w=1200&q=70',
  'https://images.unsplash.com/photo-1583121274602-3e2820c69888?auto=format&fit=crop&w=1200&q=70',
  'https://images.unsplash.com/photo-1552519507-da3b142c6e3d?auto=format&fit=crop&w=1200&q=70',
  'https://images.unsplash.com/photo-1568605117036-5fe5e7bab0b7?auto=format&fit=crop&w=1200&q=70',
];

/** Calcula fecha/hora local en formato datetime-local dentro de N horas. */
function defaultStart() {
  const date = new Date(Date.now() - 60 * 60 * 1000);
  return toDateTimeLocalValue(date);
}

function defaultEnd() {
  const date = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  return toDateTimeLocalValue(date);
}

function buildInitialState(vehicle) {
  if (vehicle) {
    return {
      year: vehicle.year ? String(vehicle.year) : '',
      itemType: vehicle.itemType || ITEM_TYPES[0],
      brand: vehicle.brand || '',
      model: vehicle.model || '',
      engine: vehicle.engine || ENGINES[0],
      transmission: vehicle.transmission || TRANSMISSIONS[0],
      fuel: vehicle.fuel || FUEL_TYPES[0],
      drivetrain: vehicle.drivetrain || DRIVETRAINS[0],
      cylinders: vehicle.cylinders ? String(vehicle.cylinders) : '4',
      damageLevel: vehicle.damageLevel || 'AMARILLO',
      basePrice: vehicle.basePrice ? String(vehicle.basePrice) : '',
      startTime: toDateTimeLocalValue(vehicle.startTime) || defaultStart(),
      endTime: toDateTimeLocalValue(vehicle.endTime) || defaultEnd(),
      imagesText: (vehicle.images || []).join('\n'),
    };
  }
  return {
    year: String(new Date().getFullYear() - 3),
    itemType: ITEM_TYPES[0],
    brand: '',
    model: '',
    engine: ENGINES[0],
    transmission: TRANSMISSIONS[0],
    fuel: FUEL_TYPES[0],
    drivetrain: DRIVETRAINS[0],
    cylinders: '4',
    damageLevel: 'AMARILLO',
    basePrice: '',
    startTime: defaultStart(),
    endTime: defaultEnd(),
    imagesText: '',
  };
}

/**
 * Formulario completo de publicacion / edicion de un Vehículo.
 * La validacion definitiva la hace el backend (POST / PUT /api/vehicles).
 */
export default function VehicleForm({ initialVehicle = null, onSubmit, submitLabel = 'Publicar Vehículo' }) {
  const [form, setForm] = useState(() => buildInitialState(initialVehicle));
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  // Fotografias elegidas desde la computadora, ya comprimidas a Data URL.
  const [localImages, setLocalImages] = useState([]);
  const [processingImages, setProcessingImages] = useState(false);

  const imageList = useMemo(
    () =>
      form.imagesText
        .split(/[\n,]/)
        .map((item) => item.trim())
        .filter(Boolean),
    [form.imagesText],
  );

  // Imagenes locales primero, luego las URLs escritas a mano.
  const allImages = useMemo(() => [...localImages, ...imageList], [localImages, imageList]);

  const set = (key) => (event) => {
    setForm((current) => ({ ...current, [key]: event.target.value }));
  };

  /** Seleccion de fotografias desde la computadora. */
  const handleFilesSelected = async (event) => {
    const files = Array.from(event.target.files || []).filter(
      (file) => file.type && file.type.startsWith('image/'),
    );
    // Permite volver a elegir el mismo archivo.
    event.target.value = '';
    if (files.length === 0) return;

    setProcessingImages(true);
    setErrors((current) => ({ ...current, images: undefined }));
    try {
      const processed = await Promise.all(files.slice(0, MAX_IMAGES).map(compressImage));
      setLocalImages((current) =>
        [...current, ...processed].filter(Boolean).slice(0, MAX_IMAGES),
      );
    } catch (err) {
      setErrors((current) => ({
        ...current,
        images: err.message || 'No se pudieron procesar las imagenes seleccionadas.',
      }));
    } finally {
      setProcessingImages(false);
    }
  };

  const removeLocalImage = (index) => {
    setLocalImages((current) => current.filter((_, position) => position !== index));
  };

  const addSampleImage = () => {
    const next = SAMPLE_IMAGES.find((url) => !imageList.includes(url));
    if (!next) return;
    setForm((current) => ({
      ...current,
      imagesText: [...imageList, next].join('\n'),
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setErrors({});
    setServerError(null);

    // Regla de la rubrica: minimo 5 imagenes antes de permitir publicar.
    if (allImages.length < MIN_IMAGES) {
      setErrors({
        images: `Debes seleccionar al menos ${MIN_IMAGES} imagenes del Vehículo.`,
      });
      setServerError(
        `Necesitas al menos ${MIN_IMAGES} imagenes. Has agregado ${allImages.length}.`,
      );
      return;
    }

    setSubmitting(true);

    try {
      await onSubmit({
        year: form.year,
        itemType: form.itemType,
        brand: form.brand,
        model: form.model,
        engine: form.engine,
        transmission: form.transmission,
        fuel: form.fuel,
        drivetrain: form.drivetrain,
        cylinders: form.cylinders,
        damageLevel: form.damageLevel,
        basePrice: form.basePrice,
        startTime: form.startTime,
        endTime: form.endTime,
        images: allImages.slice(0, MAX_IMAGES),
      });
    } catch (err) {
      if (err.errors && typeof err.errors === 'object') {
        setErrors(err.errors);
      }
      setServerError(err.message || 'No se pudo guardar el Vehículo.');
    } finally {
      setSubmitting(false);
    }
  };

  const fieldError = (key) => (errors[key] ? <span className="form-error">{errors[key]}</span> : null);

  return (
    <form onSubmit={handleSubmit}>
      {serverError ? (
        <Alert type="error" message={serverError} errors={errors} />
      ) : null}

      <div className="form-grid">
        <div className="form-section-title">Datos generales</div>

        <div className="form-group">
          <label className="form-label" htmlFor="year">
            año <span className="required">*</span>
          </label>
          <input
            id="year"
            className={`form-input${errors.year ? ' has-error' : ''}`}
            type="number"
            min="1900"
            max={new Date().getFullYear() + 2}
            value={form.year}
            onChange={set('year')}
            required
          />
          {fieldError('year')}
        </div>

        <div className="form-group">
          <label className="form-label" htmlFor="itemType">
            Tipo de articulo <span className="required">*</span>
          </label>
          <select id="itemType" className="form-select" value={form.itemType} onChange={set('itemType')}>
            {ITEM_TYPES.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
          {fieldError('itemType')}
        </div>

        <div className="form-group">
          <label className="form-label" htmlFor="brand">
            Marca <span className="required">*</span>
          </label>
          <input
            id="brand"
            className={`form-input${errors.brand ? ' has-error' : ''}`}
            value={form.brand}
            onChange={set('brand')}
            placeholder="Toyota, Ford, BMW..."
            required
          />
          {fieldError('brand')}
        </div>

        <div className="form-group">
          <label className="form-label" htmlFor="model">
            Modelo <span className="required">*</span>
          </label>
          <input
            id="model"
            className={`form-input${errors.model ? ' has-error' : ''}`}
            value={form.model}
            onChange={set('model')}
            placeholder="Corolla, Mustang, RAV4..."
            required
          />
          {fieldError('model')}
        </div>

        <div className="form-group">
          <label className="form-label" htmlFor="engine">
            Motor <span className="required">*</span>
          </label>
          <select id="engine" className="form-select" value={form.engine} onChange={set('engine')}>
            {ENGINES.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
          {fieldError('engine')}
        </div>

        <div className="form-group">
          <label className="form-label" htmlFor="transmission">
            Transmision <span className="required">*</span>
          </label>
          <select
            id="transmission"
            className="form-select"
            value={form.transmission}
            onChange={set('transmission')}
          >
            {TRANSMISSIONS.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
          {fieldError('transmission')}
        </div>

        <div className="form-group">
          <label className="form-label" htmlFor="fuel">
            Combustible <span className="required">*</span>
          </label>
          <select id="fuel" className="form-select" value={form.fuel} onChange={set('fuel')}>
            {FUEL_TYPES.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
          {fieldError('fuel')}
        </div>

        <div className="form-group">
          <label className="form-label" htmlFor="drivetrain">
            Tren de manejo <span className="required">*</span>
          </label>
          <select id="drivetrain" className="form-select" value={form.drivetrain} onChange={set('drivetrain')}>
            {DRIVETRAINS.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
          {fieldError('drivetrain')}
        </div>

        <div className="form-group">
          <label className="form-label" htmlFor="cylinders">
            Numero de cilindros <span className="required">*</span>
          </label>
          <input
            id="cylinders"
            className={`form-input${errors.cylinders ? ' has-error' : ''}`}
            type="number"
            min="1"
            max="24"
            value={form.cylinders}
            onChange={set('cylinders')}
            required
          />
          {fieldError('cylinders')}
        </div>

        <div className="form-group full">
          <label className="form-label">
            Nivel de daño <span className="required">*</span>
          </label>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            {Object.values(DAMAGE_LEVELS).map((level) => (
              <label
                key={level.value}
                className="card"
                style={{
                  padding: '12px 14px',
                  display: 'flex',
                  gap: 10,
                  alignItems: 'flex-start',
                  cursor: 'pointer',
                  flex: '1 1 180px',
                  borderColor: form.damageLevel === level.value ? 'var(--color-primary)' : undefined,
                  borderWidth: form.damageLevel === level.value ? 2 : 1,
                }}
              >
                <input
                  type="radio"
                  name="damageLevel"
                  value={level.value}
                  checked={form.damageLevel === level.value}
                  onChange={set('damageLevel')}
                  style={{ marginTop: 3 }}
                />
                <span>
                  <span className={`badge ${level.cssClass}`} style={{ marginBottom: 5 }}>
                    {level.value}
                  </span>
                  <strong style={{ display: 'block', fontSize: '0.87rem' }}>{level.label}</strong>
                  <span className="form-hint">{level.description}</span>
                </span>
              </label>
            ))}
          </div>
          {fieldError('damageLevel')}
        </div>

        <div className="form-section-title">Subasta</div>

        <div className="form-group">
          <label className="form-label" htmlFor="basePrice">
            Monto base (quetzales Q) <span className="required">*</span>
          </label>
          <input
            id="basePrice"
            className={`form-input${errors.basePrice ? ' has-error' : ''}`}
            type="number"
            step="0.01"
            min="1"
            value={form.basePrice}
            onChange={set('basePrice')}
            placeholder="25000.00"
            required
          />
          {fieldError('basePrice')}
        </div>

        <div className="form-group">
          <label className="form-label" htmlFor="startTime">
            Fecha y hora de inicio <span className="required">*</span>
          </label>
          <input
            id="startTime"
            className={`form-input${errors.startTime ? ' has-error' : ''}`}
            type="datetime-local"
            value={form.startTime}
            onChange={set('startTime')}
            required
          />
          {fieldError('startTime')}
        </div>

        <div className="form-group">
          <label className="form-label" htmlFor="endTime">
            Fecha y hora de cierre <span className="required">*</span>
          </label>
          <input
            id="endTime"
            className={`form-input${errors.endTime ? ' has-error' : ''}`}
            type="datetime-local"
            value={form.endTime}
            onChange={set('endTime')}
            required
          />
          {fieldError('endTime')}
        </div>

        <div className="form-section-title">
          Galeria de imagenes (minimo {MIN_IMAGES}) <span className="required">*</span>
        </div>

        <div className="form-group full">
          <label className="form-label" htmlFor="vehicleImages">
            Seleccionar fotografias desde mi computadora
          </label>
          <input
            id="vehicleImages"
            className="form-input"
            type="file"
            accept="image/*"
            multiple
            onChange={handleFilesSelected}
            disabled={processingImages || submitting}
          />
          <span className="form-hint">
            {processingImages
              ? 'Procesando imagenes...'
              : `Puedes elegir varias a la vez. Se redimensionan a ${MAX_IMAGE_WIDTH}px y se compriman antes de guardarse (no se usa Firebase Storage). Maximo ${MAX_IMAGES} imagenes.`}
          </span>

          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              gap: 10,
              flexWrap: 'wrap',
              marginTop: 8,
            }}
          >
            <span
              className={`image-counter ${
                localImages.length >= MIN_IMAGES ? 'ok' : allImages.length >= MIN_IMAGES ? 'ok' : 'fail'
              }`}
            >
              {localImages.length} imagenes seleccionadas
            </span>
            {localImages.length > 0 ? (
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => setLocalImages([])}
                disabled={processingImages || submitting}
              >
                Quitar seleccionadas
              </button>
            ) : null}
          </div>

          {localImages.length > 0 ? (
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(110px, 1fr))',
                gap: 8,
                marginTop: 10,
              }}
            >
              {localImages.map((dataUrl, index) => (
                <div
                  key={`${index}-${dataUrl.slice(-16)}`}
                  style={{ position: 'relative', borderRadius: 8, overflow: 'hidden', border: '1px solid var(--color-border)' }}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={dataUrl}
                    alt={`Fotografia ${index + 1}`}
                    style={{ width: '100%', height: 80, objectFit: 'cover', display: 'block' }}
                  />
                  <button
                    type="button"
                    onClick={() => removeLocalImage(index)}
                    aria-label={`Quitar fotografia ${index + 1}`}
                    style={{
                      position: 'absolute',
                      top: 4,
                      right: 4,
                      border: 'none',
                      borderRadius: '50%',
                      width: 22,
                      height: 22,
                      cursor: 'pointer',
                      background: 'rgba(0,0,0,0.65)',
                      color: '#fff',
                      fontSize: '0.8rem',
                      lineHeight: 1,
                    }}
                  >
                    x
                  </button>
                </div>
              ))}
            </div>
          ) : null}
        </div>

        <div className="form-group full">
          <label className="form-label" htmlFor="imagesText">
            URLs de imagenes (una por linea, opcional)
          </label>
          <textarea
            id="imagesText"
            className={`form-textarea${errors.images ? ' has-error' : ''}`}
            rows={5}
            value={form.imagesText}
            onChange={set('imagesText')}
            placeholder={'https://mi-sitio.com/Vehículo/1.jpg\nhttps://mi-sitio.com/Vehículo/2.jpg'}
          />
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              gap: 10,
              flexWrap: 'wrap',
            }}
          >
            <span
              className={`image-counter ${allImages.length >= MIN_IMAGES ? 'ok' : 'fail'}`}
            >
              {allImages.length} imagen(es) en total - minimo requerido: {MIN_IMAGES}
            </span>
            <button type="button" className="btn btn-secondary btn-sm" onClick={addSampleImage}>
              Agregar URL de ejemplo
            </button>
          </div>
          <span className="form-hint">
            Las fotografias de tu computadora se guardan junto con las URLs. Puedes combinarlas.
          </span>
          {fieldError('images')}
        </div>
      </div>

      <div style={{ display: 'flex', gap: 12, marginTop: 24, flexWrap: 'wrap' }}>
        <button type="submit" className="btn btn-primary btn-lg" disabled={submitting || processingImages}>
          {submitting ? 'Guardando...' : submitLabel}
        </button>
        <button
          type="button"
          className="btn btn-secondary"
          onClick={() => {
            setForm(buildInitialState(initialVehicle));
            setLocalImages([]);
          }}
          disabled={submitting || processingImages}
        >
          Limpiar formulario
        </button>
      </div>
    </form>
  );
}
