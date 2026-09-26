'use client';

import { DAMAGE_LEVELS } from '@/domain/entities/damage-level';

/**
 * Panel de filtros multi-area del catalogo.
 *
 * Todos los filtros se combinan entre si y se aplican SIN recargar la pagina
 * (el componente padre `VehicleCatalog` vuelve a consultar la API).
 */
export default function VehicleFilters({ facets = {}, value = {}, onChange, onClear, resultCount = null }) {
  const years = facets.years || [];
  const brands = facets.brands || [];
  const models = facets.models || [];
  const fuels = facets.fuels || [];
  const damageLevels = facets.damageLevels || [];

  const select = (key) => (event) => {
    onChange({ ...value, [key]: event.target.value, page: 1 });
  };

  const modelOptions = value.brand ? models : models;

  return (
    <aside className="filters-panel">
      <h3>
        Filtros
        <button
          type="button"
          className="btn btn-secondary btn-sm"
          onClick={onClear}
          title="Quitar todos los filtros activos"
        >
          Limpiar filtros
        </button>
      </h3>
      <p className="filters-hint">
        Combina varios filtros a la vez. El inventario se actualiza sin recargar la pagina.
      </p>

      <div className="filter-group">
        <label htmlFor="filter-year">año</label>
        <select id="filter-year" className="filter-select" value={value.year || ''} onChange={select('year')}>
          <option value="">Todos los años</option>
          {years.map((year) => (
            <option key={year} value={year}>
              {year}
            </option>
          ))}
        </select>
      </div>

      <div className="filter-group">
        <label htmlFor="filter-brand">Marca</label>
        <select id="filter-brand" className="filter-select" value={value.brand || ''} onChange={select('brand')}>
          <option value="">Todas las marcas</option>
          {brands.map((brand) => (
            <option key={brand} value={brand}>
              {brand}
            </option>
          ))}
        </select>
      </div>

      <div className="filter-group">
        <label htmlFor="filter-model">Modelo</label>
        <select id="filter-model" className="filter-select" value={value.model || ''} onChange={select('model')}>
          <option value="">Todos los modelos</option>
          {modelOptions.map((model) => (
            <option key={model} value={model}>
              {model}
            </option>
          ))}
        </select>
      </div>

      <div className="filter-group">
        <label htmlFor="filter-fuel">Combustible</label>
        <select id="filter-fuel" className="filter-select" value={value.fuel || ''} onChange={select('fuel')}>
          <option value="">Todos los combustibles</option>
          {fuels.map((fuel) => (
            <option key={fuel} value={fuel}>
              {fuel}
            </option>
          ))}
        </select>
      </div>

      <div className="filter-group">
        <label htmlFor="filter-damage">Nivel de daño</label>
        <select
          id="filter-damage"
          className="filter-select"
          value={value.damageLevel || ''}
          onChange={select('damageLevel')}
        >
          <option value="">Todos los niveles</option>
          {Object.values(DAMAGE_LEVELS).map((level) => (
            <option key={level.value} value={level.value}>
              {level.value} - {level.shortLabel}
            </option>
          ))}
        </select>
      </div>

      {resultCount !== null ? (
        <p className="form-hint" style={{ marginTop: 12, marginBottom: 0 }}>
          {resultCount === 1 ? '1 Vehículo encontrado' : `${resultCount} vehículos encontrados`}
        </p>
      ) : null}
    </aside>
  );
}
