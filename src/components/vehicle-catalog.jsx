'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import Alert from '@/components/alert';
import VehicleCard from '@/components/vehicle-card';
import VehicleFilters from '@/components/vehicle-filters';
import { apiFetch, toQueryString } from '@/lib/api-client';
import { useAuth } from '@/lib/auth-provider';

const SORTS = [
  { value: 'nuevos', label: 'Mas recientes' },
  { value: 'cierre_proximo', label: 'Cierre proximo' },
  { value: 'oferta_mayor', label: 'Mayor oferta' },
  { value: 'precio_menor', label: 'Menor monto base' },
  { value: 'precio_mayor', label: 'Mayor monto base' },
];

const EMPTY_FILTERS = {
  year: '',
  brand: '',
  model: '',
  fuel: '',
  damageLevel: '',
  search: '',
  sort: 'nuevos',
  page: 1,
  pageSize: 12,
};

/**
 * Catalogo de vehículos con filtros combinables aplicados SIN recargar la pagina.
 * Los datos se piden a GET /api/vehicles en cada cambio de filtro.
 */
export default function VehicleCatalog({ showFilters = true, heading, subheading }) {
  const { isAuthenticated } = useAuth();
  const [filters, setFilters] = useState(EMPTY_FILTERS);
  const [data, setData] = useState({ vehicles: [], total: 0, page: 1, totalPages: 1, facets: {} });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const requestId = useRef(0);

  const query = useMemo(
    () =>
      toQueryString({
        year: filters.year,
        brand: filters.brand,
        model: filters.model,
        fuel: filters.fuel,
        damageLevel: filters.damageLevel,
        search: filters.search,
        sort: filters.sort,
        page: filters.page,
        pageSize: filters.pageSize,
      }),
    [filters],
  );

  const load = useCallback(async () => {
    const currentRequest = requestId.current + 1;
    requestId.current = currentRequest;
    setLoading(true);
    try {
      const response = await apiFetch(`/api/vehicles${query}`);
      if (requestId.current !== currentRequest) return;
      setData({
        vehicles: response.vehicles || [],
        total: response.total || 0,
        page: response.page || 1,
        totalPages: response.totalPages || 1,
        facets: response.facets || {},
      });
      setError(null);
    } catch (err) {
      if (requestId.current !== currentRequest) return;
      setError(err.message || 'No se pudo cargar el inventario.');
    } finally {
      if (requestId.current === currentRequest) setLoading(false);
    }
  }, [query]);

  useEffect(() => {
    load();
  }, [load]);

  // Refresco periodico de respaldo (por si Socket.IO no esta disponible).
  useEffect(() => {
    const timer = setInterval(load, 20000);
    return () => clearInterval(timer);
  }, [load]);

  const updateFilters = (next) => setFilters(next);

  const clearFilters = () => setFilters(EMPTY_FILTERS);

  const activeChips = useMemo(() => {
    const chips = [];
    if (filters.year) chips.push({ key: 'year', label: `año: ${filters.year}` });
    if (filters.brand) chips.push({ key: 'brand', label: `Marca: ${filters.brand}` });
    if (filters.model) chips.push({ key: 'model', label: `Modelo: ${filters.model}` });
    if (filters.fuel) chips.push({ key: 'fuel', label: `Combustible: ${filters.fuel}` });
    if (filters.damageLevel) {
      chips.push({ key: 'damageLevel', label: `daño: ${filters.damageLevel}` });
    }
    if (filters.search) chips.push({ key: 'search', label: `Busqueda: ${filters.search}` });
    return chips;
  }, [filters]);

  const removeChip = (key) => setFilters({ ...filters, [key]: '', page: 1 });

  return (
    <section className="section">
      <div className="container">
        {heading ? (
          <div className="section-head">
            <div>
              <h2>{heading}</h2>
              {subheading ? <p>{subheading}</p> : null}
            </div>
          </div>
        ) : null}

        {activeChips.length > 0 ? (
          <div className="filter-active-list">
            {activeChips.map((chip) => (
              <span key={chip.key} className="chip">
                {chip.label}
                <button type="button" onClick={() => removeChip(chip.key)} aria-label={`Quitar ${chip.label}`}>
                  ✕
                </button>
              </span>
            ))}
            <button type="button" className="chip" onClick={clearFilters} style={{ cursor: 'pointer' }}>
              Limpiar todo
            </button>
          </div>
        ) : null}

        <div className={showFilters ? 'catalog-layout' : ''}>
          {showFilters ? (
            <VehicleFilters
              facets={data.facets}
              value={filters}
              onChange={updateFilters}
              onClear={clearFilters}
              resultCount={loading ? null : data.total}
            />
          ) : null}

          <div>
            <div className="catalog-toolbar">
              <span className="catalog-count">
                {loading ? 'Cargando inventario...' : `${data.total} Vehículo(s) encontrado(s)`}
              </span>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                <input
                  type="search"
                  className="search-input"
                  placeholder="Buscar marca, modelo o motor..."
                  value={filters.search}
                  onChange={(event) => setFilters({ ...filters, search: event.target.value, page: 1 })}
                  aria-label="Buscar en el inventario"
                />
                <select
                  className="filter-select"
                  style={{ width: 'auto' }}
                  value={filters.sort}
                  onChange={(event) => setFilters({ ...filters, sort: event.target.value, page: 1 })}
                  aria-label="Ordenar resultados"
                >
                  {SORTS.map((sort) => (
                    <option key={sort.value} value={sort.value}>
                      {sort.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {error ? <Alert type="error" message={error} /> : null}

            {loading ? (
              <div className="vehicle-grid">
                {Array.from({ length: 6 }).map((_, index) => (
                  <div key={index} className="skeleton skeleton-card" />
                ))}
              </div>
            ) : data.vehicles.length === 0 ? (
              <div className="card card-pad empty-state">
                <h3>No hay vehículos que coincidan con los filtros</h3>
                <p>
                  Ajusta los criterios de busqueda o quita algun filtro para ver mas resultados del
                  inventario disponible.
                </p>
                <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
                  <button type="button" className="btn btn-secondary" onClick={clearFilters}>
                    Limpiar filtros
                  </button>
                  {isAuthenticated ? (
                    <Link href="/publicar" className="btn btn-primary">
                      Publicar Vehículo
                    </Link>
                  ) : null}
                </div>
              </div>
            ) : (
              <div className="vehicle-grid">
                {data.vehicles.map((vehicle) => (
                  <VehicleCard key={vehicle.id} vehicle={vehicle} />
                ))}
              </div>
            )}

            {data.totalPages > 1 ? (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 12,
                  marginTop: 26,
                  flexWrap: 'wrap',
                }}
              >
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  disabled={data.page <= 1 || loading}
                  onClick={() => setFilters({ ...filters, page: data.page - 1 })}
                >
                  Anterior
                </button>
                <span className="catalog-count">
                  Pagina {data.page} de {data.totalPages}
                </span>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  disabled={data.page >= data.totalPages || loading}
                  onClick={() => setFilters({ ...filters, page: data.page + 1 })}
                >
                  Siguiente
                </button>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </section>
  );
}
