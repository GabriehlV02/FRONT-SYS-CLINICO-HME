// Opciones provisionales hasta conectar la fuente de cubículos definitiva.
export const cubiculosEmergencias = [
  { id: '1', nombre: 'Cubículo 1' },
  { id: '2', nombre: 'Cubículo 2' },
  { id: '3', nombre: 'Cubículo 3' },
  { id: 'CRITICO', nombre: 'Cubículo Paciente Crítico' },
];

export const nombreCubiculo = (id: string) =>
  cubiculosEmergencias.find(c => c.id === id)?.nombre || `Cubículo ${id}`;
