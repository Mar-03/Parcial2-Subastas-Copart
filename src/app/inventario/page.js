import VehicleCatalog from '@/components/vehicle-catalog';

export const metadata = {
  title: 'Inventario de subastas | Subastas Copart',
  description: 'Explora el inventario de vehiculos en subasta y filtra por anio, marca, modelo, combustible y dano.',
};

/**
 * Pagina de INVENTARIO: mismo catalogo con filtros multi-area.
 * Visible para usuarios anonimos y autenticados.
 */
export default function InventoryPage() {
  return (
    <VehicleCatalog
      showFilters
      heading="Inventario de subastas"
      subheading="Explora todos los vehiculos disponibles. Combina los filtros de anio, marca, modelo, combustible y nivel de dano."
    />
  );
}
