// Opciones provisionales hasta conectar la fuente de cubículos definitiva.
export const cubiculosEmergencias = [
  { id: '1', nombre: 'Cubículo 1' },
  { id: '2', nombre: 'Cubículo 2' },
  { id: '3', nombre: 'Cubículo 3' },
  { id: '4', nombre: 'Cubículo 4' },
  { id: '5', nombre: 'Cubículo 5' },
  { id: '6', nombre: 'Cubículo 6' },
  { id: '7', nombre: 'Cubículo 7' },
  { id: '8', nombre: 'Cubículo 8' },
];

export const nombreCubiculo = (id: string) =>
  cubiculosEmergencias.find(c => c.id === id)?.nombre || `Cubículo ${id}`;
