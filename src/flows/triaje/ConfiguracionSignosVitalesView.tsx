import { useMemo, useRef, useState, type FormEvent } from 'react';
import Icon from '../../radius/componentes/Icono';
import { obtenerRangos, type RangoReferencia } from './rangosReferencia';
import { SelectorUnidad } from './SelectorUnidad';
import './ConfiguracionSignosVitalesView.css';

export type SignoVitalConfig = { id: string; nombre: string; unidad: string; abreviatura: string; tipo: 'Número entero' | 'Número decimal' | 'Texto'; rangoReferencia?: RangoReferencia };

export const signosVitalesIniciales: SignoVitalConfig[] = [
  ['temperatura', 'Temperatura', 'Grados Celsius', '°C', 'Número decimal'], ['glicemia', 'Glicemia capilar', 'Miligramos por decilitro', 'mg/dL', 'Número entero'], ['frecuenciaCardiaca', 'Frecuencia cardíaca', 'Pulsaciones por minuto', 'P/min', 'Número entero'], ['frecuenciaRespiratoria', 'Frecuencia respiratoria', 'Respiraciones por minuto', 'Res/min', 'Número entero'], ['presionSistolica', 'Presión sistólica', 'Milímetros de mercurio', 'mmHg', 'Número entero'], ['presionDiastolica', 'Presión diastólica', 'Milímetros de mercurio', 'mmHg', 'Número entero'], ['saturacionAmbiente', 'Saturación ambiente', 'Porcentaje', '%', 'Número entero'], ['oxigeno', 'Oxígeno', 'Litros', 'L', 'Número decimal'], ['saturacionOxigeno', 'Saturación con oxígeno', 'Porcentaje', '%', 'Número entero'], ['perimetroCintura', 'Perímetro de cintura', 'Centímetros', 'cm', 'Número decimal'], ['perimetroCadera', 'Perímetro de cadera', 'Centímetros', 'cm', 'Número decimal'], ['peso', 'Peso', 'Kilogramos', 'kg', 'Número decimal'], ['estatura', 'Estatura', 'Centímetros', 'cm', 'Número decimal'], ['imc', 'IMC', 'Índice de masa corporal', 'kg/m²', 'Número decimal'],
].map(([id, nombre, unidad, abreviatura, tipo]) => ({ id, nombre, unidad, abreviatura, tipo: tipo as SignoVitalConfig['tipo'] }));

type Formulario = Omit<SignoVitalConfig, 'id'>;
const unidadesSignosVitales = [
  'Grados Celsius', 'Grados Fahrenheit', 'Kelvin',
  'Pulsaciones por minuto', 'Latidos por minuto', 'Respiraciones por minuto',
  'Milímetros de mercurio', 'Centímetros de agua', 'Milímetros de agua', 'Kilopascales',
  'Porcentaje',
  'Kilogramos', 'Gramos', 'Libras', 'Onzas',
  'Metros', 'Centímetros', 'Milímetros', 'Pulgadas', 'Pies',
  'Índice de masa corporal', 'Metros cuadrados',
  'Litros', 'Mililitros', 'Litros por minuto', 'Mililitros por minuto',
  'Mililitros por hora', 'Mililitros por kilogramo por hora', 'Mililitros por kilogramo',
  'Miligramos por decilitro', 'Miligramos por litro', 'Gramos por decilitro',
  'Milimoles por litro',
  'Segundos', 'Milisegundos', 'Minutos',
  'Puntos', 'Escala numérica', 'Sin unidad',
];
const vacio: Formulario = { nombre: '', unidad: '', abreviatura: '', tipo: 'Número decimal' };
const abreviaturasUnidades: Record<string, string> = {
  'Grados Celsius': '°C', 'Grados Fahrenheit': '°F', Kelvin: 'K',
  'Pulsaciones por minuto': 'P/min', 'Latidos por minuto': 'lpm', 'Respiraciones por minuto': 'Res/min',
  'Milímetros de mercurio': 'mmHg', 'Centímetros de agua': 'cmH₂O', 'Milímetros de agua': 'mmH₂O', Kilopascales: 'kPa',
  Porcentaje: '%', Kilogramos: 'kg', Gramos: 'g', Libras: 'lb', Onzas: 'oz',
  Metros: 'm', Centímetros: 'cm', Milímetros: 'mm', Pulgadas: 'in', Pies: 'ft',
  'Índice de masa corporal': 'kg/m²', 'Metros cuadrados': 'm²',
  Litros: 'L', Mililitros: 'mL', 'Litros por minuto': 'L/min', 'Mililitros por minuto': 'mL/min',
  'Mililitros por hora': 'mL/h', 'Mililitros por kilogramo por hora': 'mL/kg/h', 'Mililitros por kilogramo': 'mL/kg',
  'Miligramos por decilitro': 'mg/dL', 'Miligramos por litro': 'mg/L', 'Gramos por decilitro': 'g/dL',
  'Milimoles por litro': 'mmol/L', Segundos: 's', Milisegundos: 'ms', Minutos: 'min',
  Puntos: 'pts', 'Escala numérica': 'pts', 'Sin unidad': 's/u',
};
export function ConfiguracionSignosVitalesView({ signos, onChange }: { signos: SignoVitalConfig[]; onChange: (signos: SignoVitalConfig[]) => void }) {
  const [nombreRango, setNombreRango] = useState('');
  const [seleccionRango, setSeleccionRango] = useState('personalizado');
  const [detalleRango, setDetalleRango] = useState<Pick<RangoReferencia, 'fuente' | 'contexto'>>({});
  const [conRango, setConRango] = useState(false);
  const [minimo, setMinimo] = useState('');
  const [maximo, setMaximo] = useState('');
  const [error, setError] = useState('');
  const abreviaturas = { ...abreviaturasUnidades, ...Object.fromEntries(signos.filter((s) => s.unidad.trim() && s.abreviatura.trim()).map((s) => [s.unidad.trim(), s.abreviatura.trim()])) };
  const unidades = Array.from(new Set([...unidadesSignosVitales, ...signosVitalesIniciales.map((s) => s.unidad), ...signos.map((s) => s.unidad)].map((unidad) => unidad.trim()).filter(Boolean))).sort((a, b) => a.localeCompare(b, 'es'));
  const modal = useRef<HTMLDialogElement>(null);
  const [formulario, setFormulario] = useState<Formulario>(vacio); const [editando, setEditando] = useState<string | null>(null); const [busqueda, setBusqueda] = useState('');
  const sugerencias = obtenerRangos(formulario.unidad, signos);
  const limpiarRango = () => { setConRango(false); setMinimo(''); setMaximo(''); setNombreRango(''); setSeleccionRango('personalizado'); setDetalleRango({}); };
  const cambiarUnidad = (unidad: string) => { if (unidad !== formulario.unidad) limpiarRango(); setFormulario((actual) => ({ ...actual, unidad, abreviatura: abreviaturas[unidad] || actual.abreviatura })); };
  const elegirRango = (id: string) => {
    setError(''); setSeleccionRango(id); setConRango(id !== 'ninguno');
    const rango = sugerencias.find((r) => r.id === id);
    setNombreRango(rango?.nombre || ''); setMinimo(rango ? String(rango.minimo) : ''); setMaximo(rango ? String(rango.maximo) : ''); setDetalleRango(rango ? { fuente: rango.fuente, contexto: rango.contexto } : {});
    if (rango && (!Number.isInteger(rango.minimo) || !Number.isInteger(rango.maximo))) actualizar('tipo', 'N?mero decimal');
  };
  const personalizarRango = () => { setSeleccionRango('personalizado'); setDetalleRango({}); };
  const visibles = useMemo(() => signos.filter((s) => `${s.nombre} ${s.unidad} ${s.abreviatura} ${s.tipo}`.toLocaleLowerCase().includes(busqueda.toLocaleLowerCase())), [busqueda, signos]);
  const actualizar = (campo: keyof Formulario, valor: string) => setFormulario((actual) => ({ ...actual, [campo]: valor }));
  const cancelar = () => { limpiarRango(); setError(''); setConRango(false); setMinimo(''); setMaximo(''); setFormulario(vacio); setEditando(null); modal.current?.close(); };
  const guardar = (evento: FormEvent) => {
    evento.preventDefault();
    const datos: Formulario = { ...formulario, nombre: formulario.nombre.trim(), unidad: formulario.unidad.trim(), abreviatura: formulario.abreviatura.trim(), rangoReferencia: undefined };
    if (!datos.nombre || !datos.unidad || !datos.abreviatura) { setError('Completa nombre, abreviatura y unidad de medida.'); return; }
    if (signos.some((s) => s.id !== editando && s.nombre.trim().toLocaleLowerCase() === datos.nombre.toLocaleLowerCase())) { setError('Ya existe un signo vital con ese nombre. Usa otro nombre.'); return; }
    if (conRango && datos.tipo !== 'Texto') {
      const min = Number(minimo), max = Number(maximo);
      if (!minimo.trim() || !maximo.trim() || !Number.isFinite(min) || !Number.isFinite(max) || min >= max) { setError('El límite mínimo debe ser menor que el máximo.'); return; }
      if (datos.tipo === 'Número entero' && (!Number.isInteger(min) || !Number.isInteger(max))) { setError('Para este tipo de dato, los límites deben ser números enteros.'); return; }
      if (!nombreRango.trim()) { setError('Introduce un nombre para el rango de referencia.'); return; }
      datos.rangoReferencia = { minimo: min, maximo: max, nombre: nombreRango.trim(), ...detalleRango };
    }
    if (editando) onChange(signos.map((s) => s.id === editando ? { ...s, ...datos } : s));
    else onChange([...signos, { ...datos, id: `signo-${crypto.randomUUID()}` }]);
    cancelar();
  };
  const editar = (s: SignoVitalConfig) => {
    setNombreRango(s.rangoReferencia?.nombre || s.nombre); setSeleccionRango('personalizado'); setDetalleRango({ fuente: s.rangoReferencia?.fuente, contexto: s.rangoReferencia?.contexto });
    setError(''); setEditando(s.id); setFormulario({ nombre: s.nombre, unidad: s.unidad, abreviatura: s.abreviatura, tipo: s.tipo });
    setConRango(Boolean(s.rangoReferencia)); setMinimo(s.rangoReferencia ? String(s.rangoReferencia.minimo) : ''); setMaximo(s.rangoReferencia ? String(s.rangoReferencia.maximo) : '');
    modal.current?.showModal();
  };
  return <section className="config-signos" aria-label="Configuración de signos vitales"><header className="config-signos-cabecera"><div><p>CONFIGURACIÓN DE TRIAJE</p><h2>Signos vitales</h2><small>Define los campos disponibles al registrar la valoración del paciente.</small></div><span>{signos.length} campos activos</span></header><div className="config-signos-distribucion"><dialog ref={modal} className="config-signos-modal" aria-labelledby="config-signos-titulo" aria-describedby="config-signos-descripcion" onCancel={cancelar}>
          <form className="config-signos-formulario" onSubmit={guardar}>
            <header><div><strong id="config-signos-titulo">{editando ? 'Editar signo vital' : 'Nuevo signo vital'}</strong><small id="config-signos-descripcion">Define cómo se registrará este dato en triaje.</small></div><button className="config-signos-cerrar" type="button" aria-label="Cerrar formulario" onClick={cancelar}>×</button></header>
            <p className="config-signos-ayuda">Los campos con * son obligatorios.</p>
            <label>Nombre del signo vital *<input autoFocus maxLength={80} value={formulario.nombre} onChange={(e) => actualizar('nombre', e.target.value)} placeholder="Ej. Temperatura corporal" required /></label>
            <label>Abreviatura *<input maxLength={20} value={formulario.abreviatura} onChange={(e) => actualizar('abreviatura', e.target.value)} placeholder="Ej. °C" aria-describedby="config-signos-abreviatura" required /><small id="config-signos-abreviatura">Texto corto que aparecerá junto al valor registrado.</small></label>
            <SelectorUnidad valor={formulario.unidad} unidades={unidades} abreviaturas={abreviaturas} onChange={cambiarUnidad}
              onSelect={cambiarUnidad} />
            <label>Tipo de dato *<select value={formulario.tipo} onChange={(e) => { actualizar('tipo', e.target.value); setError(''); if (e.target.value === 'Texto') limpiarRango(); }}><option value="Número decimal">Numérico decimal (ej. 36.5)</option><option value="Número entero">Numérico entero (ej. 80)</option><option value="Texto">Texto libre</option></select></label>
            <label>Rangos de referencia <select value={conRango ? seleccionRango : 'ninguno'} disabled={formulario.tipo === 'Texto'} onChange={(e) => elegirRango(e.target.value)}><option value="ninguno">Sin rango de referencia</option>{sugerencias.length > 0 && <optgroup label="Rangos disponibles para esta unidad">{sugerencias.map((r) => <option key={r.id} value={r.id}>{r.nombre}: {r.minimo} ? {r.maximo} {formulario.abreviatura}</option>)}</optgroup>}<option value="personalizado">Crear rango personalizado</option></select><small>{formulario.tipo === 'Texto' ? 'Los rangos solo est?n disponibles para datos num?ricos.' : sugerencias.length ? 'Elige la medici?n y el contexto adecuados. Puedes modificar los l?mites y guardar el rango con otro nombre.' : 'No hay una referencia general disponible para esta unidad. El peso, la talla, los vol?menes y otras medidas requieren un contexto espec?fico; puedes crear tu propio rango.'}</small></label>
            {conRango && formulario.tipo !== 'Texto' && <label>Nombre del rango *<input maxLength={100} value={nombreRango} onChange={(e) => { setNombreRango(e.target.value); personalizarRango(); }} placeholder="Ej. Temperatura corporal ? protocolo institucional" required /><small>Se guardar? con el signo vital y podr?s reutilizarlo en otros campos con la misma unidad.</small></label>}
            {conRango && detalleRango.contexto && <p className="config-signos-ayuda">{detalleRango.contexto} {detalleRango.fuente && <a href={detalleRango.fuente} target="_blank" rel="noreferrer">Consultar referencia</a>}</p>}
            {conRango && formulario.tipo !== 'Texto' && <div className="config-signos-dos-campos"><label>Límite mínimo *<input type="number" step={formulario.tipo === 'Número entero' ? '1' : 'any'} value={minimo} onChange={(e) => { setMinimo(e.target.value); personalizarRango(); }} required /></label><label>Límite máximo *<input type="number" step={formulario.tipo === 'Número entero' ? '1' : 'any'} value={maximo} onChange={(e) => { setMaximo(e.target.value); personalizarRango(); }} required /></label></div>}
            <div className="config-signos-preview"><small>VISTA PREVIA DEL CAMPO</small><strong>{formulario.nombre.trim() || 'Nombre del signo vital'}</strong><span>{formulario.tipo === 'Texto' ? 'Texto de ejemplo' : formulario.tipo === 'Número entero' ? '80' : '36.5'} <b>{formulario.abreviatura || 'unidad'}</b></span>{conRango && minimo && maximo && <small>{nombreRango || 'Referencia'}: {minimo} – {maximo} {formulario.abreviatura}</small>}</div>
            {error && <p className="config-signos-error" role="alert">{error}</p>}
            <footer><button className="config-signos-cancelar" type="button" onClick={cancelar}>Cancelar</button><button className="config-signos-guardar" type="submit"><Icon name="check" size={16} />{editando ? 'Guardar cambios' : 'Guardar signo vital'}</button></footer>
          </form>
        </dialog><section className="config-signos-lista"><header><div className="config-signos-herramientas"><label><Icon name="search" size={16} /><input value={busqueda} onChange={(e) => setBusqueda(e.target.value)} placeholder="Buscar signo vital" aria-label="Buscar signo vital" /></label><button className="config-signos-guardar" type="button" onClick={() => { limpiarRango(); setFormulario(vacio); setEditando(null); setError(''); setConRango(false); setMinimo(''); setMaximo(''); modal.current?.showModal(); }}><Icon name="plus" size={16} />Crear nuevo signo vital</button></div></header><div className="config-signos-tabla"><div className="config-signos-encabezado"><span>Nombre</span><span>Unidad de medición</span><span>Abreviatura</span><span>Tipo de dato</span><span>Acciones</span></div>{visibles.map((s) => <article key={s.id}><strong>{s.nombre}</strong><span>{s.unidad}</span><b>{s.abreviatura}</b><em>{s.tipo}</em><div><button type="button" onClick={() => editar(s)} aria-label={`Editar ${s.nombre}`}><Icon name="edit" size={15} /></button><button type="button" onClick={() => { if (editando === s.id) cancelar(); onChange(signos.filter((actual) => actual.id !== s.id)); }} aria-label={`Eliminar ${s.nombre}`}><Icon name="trash" size={15} /></button></div></article>)}{!visibles.length && <p>No hay signos vitales que coincidan con la búsqueda.</p>}</div></section></div></section>;
}
