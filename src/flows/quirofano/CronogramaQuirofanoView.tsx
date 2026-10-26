import { useMemo, useState } from 'react';
import Icon from '../../radius/componentes/Icono';
import type { CirugiaProgramada } from './cronogramaQuirofano';
import './CronogramaQuirofanoView.css';

type FiltroSala = 'todos' | 'quirofano-1' | 'quirofano-2';

const fechaLocal = () => {
  const hoy = new Date();
  return `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, '0')}-${String(hoy.getDate()).padStart(2, '0')}`;
};

const fechaDesdeTexto = (fecha: string) => {
  const [anio, mes, dia] = fecha.split('-').map(Number);
  return new Date(anio, mes - 1, dia);
};

const claveFecha = (fecha: Date) =>
  `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, '0')}-${String(fecha.getDate()).padStart(2, '0')}`;

const nombreSala = (quirofano: string) => {
  const coincidencia = quirofano.match(/quirófano\s*\d+/i);
  return coincidencia?.[0] ?? quirofano;
};

export function CronogramaQuirofanoView({ cirugias, fechaInicial }: {
  cirugias: CirugiaProgramada[];
  fechaInicial: string;
}) {
  const inicio = fechaDesdeTexto(fechaInicial || fechaLocal());
  const [mesVisible, setMesVisible] = useState(() => new Date(inicio.getFullYear(), inicio.getMonth(), 1));
  const [sala, setSala] = useState<FiltroSala>('todos');
  const [diaSeleccionado, setDiaSeleccionado] = useState<string | null>(null);

  const cirugiasFiltradas = useMemo(() => cirugias.filter(cirugia => {
    if (sala === 'todos') return true;
    const numero = sala === 'quirofano-1' ? '1' : '2';
    return new RegExp(`quirófano\\s*${numero}(?:\\D|$)`, 'i').test(cirugia.quirofano);
  }), [cirugias, sala]);

  const cirugiasPorFecha = useMemo(() => {
    const resultado = new Map<string, CirugiaProgramada[]>();
    cirugiasFiltradas.forEach(cirugia => {
      const lista = resultado.get(cirugia.fecha) ?? [];
      lista.push(cirugia);
      lista.sort((a, b) => a.hora.localeCompare(b.hora));
      resultado.set(cirugia.fecha, lista);
    });
    return resultado;
  }, [cirugiasFiltradas]);

  const dias = useMemo(() => {
    const primerDia = new Date(mesVisible.getFullYear(), mesVisible.getMonth(), 1);
    const ultimoDia = new Date(mesVisible.getFullYear(), mesVisible.getMonth() + 1, 0);
    const espaciosIniciales = (primerDia.getDay() + 6) % 7;
    const totalCeldas = Math.ceil((espaciosIniciales + ultimoDia.getDate()) / 7) * 7;
    return Array.from({ length: totalCeldas }, (_, indice) => {
      const numero = indice - espaciosIniciales + 1;
      return numero >= 1 && numero <= ultimoDia.getDate()
        ? new Date(mesVisible.getFullYear(), mesVisible.getMonth(), numero)
        : null;
    });
  }, [mesVisible]);

  const cambiarMes = (desplazamiento: number) =>
    setMesVisible(actual => new Date(actual.getFullYear(), actual.getMonth() + desplazamiento, 1));

  const irAHoy = () => {
    const hoy = new Date();
    setMesVisible(new Date(hoy.getFullYear(), hoy.getMonth(), 1));
  };

  const tituloMes = new Intl.DateTimeFormat('es-BO', { month: 'long', year: 'numeric' }).format(mesVisible);
  const hoy = fechaLocal();
  const cirugiasDelMes = cirugiasFiltradas.filter(cirugia => {
    const fecha = fechaDesdeTexto(cirugia.fecha);
    return fecha.getFullYear() === mesVisible.getFullYear() && fecha.getMonth() === mesVisible.getMonth();
  }).length;
  const seleccionadas = diaSeleccionado ? cirugiasPorFecha.get(diaSeleccionado) ?? [] : [];

  return <section className="cronograma-q" aria-labelledby="cronograma-q-titulo">
    <header className="cronograma-q-cabecera">
      <div><p>QUIRÓFANO · PROGRAMACIÓN</p><h2 id="cronograma-q-titulo">Cronograma de uso de quirófanos</h2><small>Vista mensual de las cirugías programadas por fecha, hora y sala.</small></div>
    </header>
    <div className="cronograma-q-barra">
      <div className="cronograma-q-filtros" role="group" aria-label="Filtrar por quirófano">
        <span>Quirófano</span>
        {([['todos', 'Todos'], ['quirofano-1', 'Quirófano 1'], ['quirofano-2', 'Quirófano 2']] as const).map(([valor, etiqueta]) =>
          <button key={valor} type="button" className={sala === valor ? 'activo' : ''} onClick={() => setSala(valor)}>{etiqueta}</button>)}
      </div>
      <div className="cronograma-q-navegacion">
        <button type="button" aria-label="Mes anterior" onClick={() => cambiarMes(-1)}>‹</button>
        <button type="button" className="cronograma-q-hoy" onClick={irAHoy}>Hoy</button>
        <button type="button" aria-label="Mes siguiente" onClick={() => cambiarMes(1)}>›</button>
      </div>
    </div>
    <div className="cronograma-q-mes"><div><h3>{tituloMes}</h3><span>{cirugiasDelMes} {cirugiasDelMes === 1 ? 'cirugía programada' : 'cirugías programadas'}</span></div></div>
    <div className="cronograma-q-contenido">
    <div className="cronograma-q-calendario">
      <div className="cronograma-q-semana">{['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'].map(dia => <div key={dia}>{dia}</div>)}</div>
      <div className="cronograma-q-dias">
        {dias.map((dia, indice) => {
          if (!dia) return <div className="cronograma-q-dia cronograma-q-dia-vacio" key={`vacio-${indice}`} />;
          const clave = claveFecha(dia);
          const eventos = cirugiasPorFecha.get(clave) ?? [];
          return <button type="button" className={`cronograma-q-dia${clave === hoy ? ' es-hoy' : ''}${clave === diaSeleccionado ? ' seleccionado' : ''}`} key={clave} onClick={() => setDiaSeleccionado(clave)} aria-label={`${dia.getDate()} de ${tituloMes}: ${eventos.length} ${eventos.length === 1 ? 'cirugía' : 'cirugías'}`}>
            <span className="cronograma-q-numero"><time dateTime={clave}>{dia.getDate()}</time>{eventos.length > 0 && <span>{eventos.length}</span>}</span>
          </button>;
        })}
      </div>
    </div>
    {diaSeleccionado && <aside className="cronograma-q-detalle" aria-live="polite"><header><div><span>Cirugías del día</span><h3>{fechaDesdeTexto(diaSeleccionado).toLocaleDateString('es-BO', { weekday: 'long', day: 'numeric', month: 'long' })}</h3></div><button type="button" onClick={() => setDiaSeleccionado(null)} aria-label="Cerrar detalle">×</button></header>{seleccionadas.length ? <ol>{seleccionadas.map(cirugia => <li key={cirugia.id}><time>{cirugia.hora}</time><div><strong>{nombreSala(cirugia.quirofano)}</strong><span>{cirugia.tipo}</span><small>{cirugia.paciente}</small></div></li>)}</ol> : <p>No hay cirugías programadas para este día.</p>}</aside>}
    </div>
    {cirugiasDelMes === 0 && <div className="cronograma-q-sin-eventos"><Icon name="calendar" size={20}/><span>No hay cirugías programadas en este mes para el filtro seleccionado.</span></div>}
  </section>;
}
