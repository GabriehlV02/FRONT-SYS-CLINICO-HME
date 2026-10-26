import { useMemo, useState } from 'react';
import Icon from '../../radius/componentes/Icono';
import { apiFetch } from '../../radius/api';
import { CronogramaQuirofanoView } from './CronogramaQuirofanoView';
import { ProgramarCirugiaView } from './ProgramarCirugiaView';
import { HistorialQuirofanoView } from './HistorialQuirofanoView';
import { ConsentimientosQuirofano } from './ConsentimientosQuirofano';
import { CirugiasAdminView } from './CirugiasAdminView';
import { guardarCirugia, leerCronograma } from './cronogramaQuirofano';
import './CuentaQuirofanoView.css';
import './CuentaQuirofanoWide.css';

type Paciente = {
  ci: string; nombre: string; nacimiento: string; telefono: string;
  nombres?: string; apellidoPaterno?: string; apellidoMaterno?: string;
  complemento?: string; expedidoEn?: string; nit?: string; razonSocial?: string;
  genero?: string; pais?: string; departamento?: string; ciudad?: string;
  zona?: string; direccion?: string;
};
type PacienteApi = {
  nombres?: string; apellido_paterno?: string; apellido_materno?: string;
  ci?: string; complemento_ci?: string; expedido_en?: string;
  nit?: string; razon_social?: string; fecha_nacimiento?: string;
  telefono?: string; genero?: string; pais?: string; departamento?: string;
  ciudad?: string; zona_barrio?: string; direccion_domicilio?: string;
};
const dato = (valor?: string) => valor?.trim() || 'No registrado';
const calcularEdad = (fecha: string) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha)) return null;
  const nacimiento = new Date(`${fecha}T00:00:00`);
  const hoy = new Date();
  if (Number.isNaN(nacimiento.getTime()) || nacimiento > hoy) return null;
  let edad = hoy.getFullYear() - nacimiento.getFullYear();
  if (hoy.getMonth() < nacimiento.getMonth() || (hoy.getMonth() === nacimiento.getMonth() && hoy.getDate() < nacimiento.getDate())) edad--;
  return edad;
};
const pacientes: Paciente[] = [
  { ci: '6102837', nombre: 'Ana Rodríguez Vargas', nacimiento: '22 de mayo de 1998', telefono: '76543210' },
  { ci: '4839201', nombre: 'Carlos Mendoza Flores', nacimiento: '14 de agosto de 1985', telefono: '71234567' },
  { ci: '7281044', nombre: 'María Elena Quispe', nacimiento: '3 de febrero de 1976', telefono: '70123456' },
];

export function CuentaQuirofanoView() {
  const [vista, setVista] = useState<'cuenta' | 'programar' | 'cronograma' | 'historial' | 'cirugias-admin'>('programar');
  const [cirugias, setCirugias] = useState(leerCronograma);
  const [fechaCronograma, setFechaCronograma] = useState('');
  const [errorCuenta, setErrorCuenta] = useState('');
  const [modo, setModo] = useState<'buscar' | 'nuevo'>('buscar');
  const [consulta, setConsulta] = useState('');
  const [paciente, setPaciente] = useState<Paciente | null>(null);
  const [nuevo, setNuevo] = useState({ nombres: '', apellidoPaterno: '', apellidoMaterno: '', ci: '', complemento: '', expedidoEn: '', nit: '', razonSocial: '', nacimiento: '', telefono: '', genero: '', pais: '', departamento: '', ciudad: '', zona: '', direccion: '' });
  const [acompanante, setAcompanante] = useState({ nombres: '', apellidoPaterno: '', apellidoMaterno: '', ci: '', nacimiento: '', vinculo: '', telefono: '' });
  const [cirugia, setCirugia] = useState({ medico: '', tipo: '', quirofano: '', fecha: '', hora: '' });
  const [cuenta, setCuenta] = useState('');
  const coincidencias = useMemo(() => pacientes.filter(p => `${p.nombre} ${p.ci}`.toLowerCase().includes(consulta.toLowerCase())), [consulta]);
  const seleccionarPaciente = async (item: Paciente) => {
    setPaciente(item);
    try {
      const respuesta = await apiFetch(`/api/v1/pacientes/buscar?ci=${encodeURIComponent(item.ci)}`);
      if (!respuesta.ok) return;
      const { data } = await respuesta.json() as { data: PacienteApi | null };
      if (!data) return;
      const nombre = [data.nombres, data.apellido_paterno, data.apellido_materno].filter(Boolean).join(' ');
      setPaciente(actual => actual?.ci === item.ci ? {
        ...item, nombre: nombre || item.nombre, nombres: data.nombres,
        apellidoPaterno: data.apellido_paterno, apellidoMaterno: data.apellido_materno,
        complemento: data.complemento_ci, expedidoEn: data.expedido_en,
        nit: data.nit, razonSocial: data.razon_social,
        nacimiento: data.fecha_nacimiento?.slice(0, 10) || item.nacimiento,
        telefono: data.telefono || item.telefono, genero: data.genero,
        pais: data.pais, departamento: data.departamento, ciudad: data.ciudad,
        zona: data.zona_barrio, direccion: data.direccion_domicilio,
      } : actual);
    } catch { /* Los datos básicos seleccionados siguen disponibles si la API no responde. */ }
  };
  const nombreNuevo = [nuevo.nombres, nuevo.apellidoPaterno, nuevo.apellidoMaterno].filter(Boolean).join(' ').trim();
  const datosPaciente = modo === 'buscar' ? paciente : nuevo.nombres.trim() && nuevo.apellidoPaterno.trim() && nuevo.ci.trim() && nuevo.nacimiento ? { ...nuevo, nombre: nombreNuevo } : null;
  const edadAcompanante = calcularEdad(acompanante.nacimiento);
  const acompananteCompleto = Boolean(acompanante.nombres.trim() && acompanante.apellidoPaterno.trim() && acompanante.apellidoMaterno.trim() && acompanante.ci.trim() && edadAcompanante !== null && acompanante.vinculo && acompanante.telefono.trim());
  const nuevaCuenta = () => {
    setModo('buscar'); setConsulta(''); setPaciente(null);
    setNuevo({ nombres: '', apellidoPaterno: '', apellidoMaterno: '', ci: '', complemento: '', expedidoEn: '', nit: '', razonSocial: '', nacimiento: '', telefono: '', genero: '', pais: '', departamento: '', ciudad: '', zona: '', direccion: '' });
    setAcompanante({ nombres: '', apellidoPaterno: '', apellidoMaterno: '', ci: '', nacimiento: '', vinculo: '', telefono: '' });
    setCirugia({ medico: '', tipo: '', quirofano: '', fecha: '', hora: '' });
    setCuenta(''); setErrorCuenta(''); setVista('cronograma');
  };
  const abrirCuenta = () => {
    if (!datosPaciente || !acompananteCompleto || !cirugia.medico || !cirugia.tipo || !cirugia.quirofano || !cirugia.fecha || !cirugia.hora) return;
    const codigo = `CQ-${cirugia.fecha.replaceAll('-', '')}-${datosPaciente.ci.slice(-4)}-${Date.now().toString(36).slice(-4).toUpperCase()}`;
    try {
      setCirugias(guardarCirugia({ id: crypto.randomUUID(), cuenta: codigo, paciente: datosPaciente.nombre, ci: datosPaciente.ci, medico: cirugia.medico, tipo: cirugia.tipo, quirofano: cirugia.quirofano, fecha: cirugia.fecha, hora: cirugia.hora }));
      setCuenta(codigo); setFechaCronograma(cirugia.fecha); setErrorCuenta(''); setVista('cronograma');
    } catch (error) { setErrorCuenta(error instanceof Error ? error.message : 'No se pudo programar la cirugía.'); }
  };
  const listo = Boolean(datosPaciente && acompananteCompleto && cirugia.medico && cirugia.tipo && cirugia.quirofano && cirugia.fecha && cirugia.hora);

  return <section className="cuenta-q" aria-label="Cuenta quirófano">
    <nav className="cuenta-q-subvistas" aria-label="Quirófano"><button type="button" className={vista === 'programar' ? 'activo' : ''} onClick={() => { setCirugias(leerCronograma()); setVista('programar'); }}><Icon name="calendar" size={16}/> Programar cirugía</button><button type="button" className={vista === 'cronograma' ? 'activo' : ''} onClick={() => { setCirugias(leerCronograma()); setVista('cronograma'); }}><Icon name="calendar" size={16}/> Cronograma de quirófanos</button><button type="button" className={vista === 'historial' ? 'activo' : ''} onClick={() => { setCirugias(leerCronograma()); setVista('historial'); }}><Icon name="fileText" size={16}/> Historial de quirófano</button><button type="button" className={vista === 'cirugias-admin' ? 'activo' : ''} onClick={() => setVista('cirugias-admin')}><Icon name="fileText" size={16}/> Cirugías admin</button></nav>
    {vista === 'programar' && <ProgramarCirugiaView cirugias={cirugias}/>}
    {vista === 'historial' && <HistorialQuirofanoView cirugias={cirugias}/>}
    {vista === 'cirugias-admin' && <CirugiasAdminView/>}
    {vista === 'cronograma' && <>{cuenta && <div className="cuenta-q-programada" role="status"><Icon name="check" size={17}/> Cuenta {cuenta} aperturada y cirugía añadida al cronograma.</div>}<CronogramaQuirofanoView key={fechaCronograma} cirugias={cirugias} fechaInicial={fechaCronograma}/></>}
    {vista === 'cuenta' && <>
    <header className="cuenta-q-cabecera"><div><p>QUIRÓFANO · APERTURA DE CUENTA</p><h2 id="cuenta-q-titulo">Programar cirugía</h2><small>Verifica al paciente y su acompañante antes de registrar la cuenta quirúrgica.</small></div><span><Icon name="cash" size={18}/> Nueva cuenta</span></header>
    {cuenta && <section className="cuenta-q-exito" role="status"><Icon name="check" size={20}/><div><strong>Cuenta {cuenta} aperturada</strong><small>{datosPaciente?.nombre} · {cirugia.tipo} · {cirugia.fecha} a las {cirugia.hora} · {cirugia.quirofano}</small></div><button type="button" onClick={nuevaCuenta}>Registrar otra</button></section>}
    {!cuenta && <div className="cuenta-q-layout">
      <section className="cuenta-q-paso"><header><b>1</b><div><h3>Paciente que será operado</h3><small>Busca un paciente registrado o crea uno nuevo.</small></div></header><div className="cuenta-q-tabs"><button className={modo === 'buscar' ? 'activo' : ''} type="button" onClick={() => setModo('buscar')}>Buscar existente</button><button className={modo === 'nuevo' ? 'activo' : ''} type="button" onClick={() => setModo('nuevo')}>Registrar paciente</button></div>
        {modo === 'buscar' ? <><label className="cuenta-q-buscar"><Icon name="search" size={16}/><input value={consulta} onChange={e => { setConsulta(e.target.value); setPaciente(null); }} placeholder="Nombre o CI del paciente"/></label><div className="cuenta-q-coincidencias">{consulta ? coincidencias.map(item => <button type="button" key={item.ci} className={paciente?.ci === item.ci ? 'seleccionado' : ''} onClick={() => void seleccionarPaciente(item)}><Icon name="patient" size={18}/><span><strong>{item.nombre}</strong><small>CI {item.ci} · Tel. {item.telefono}</small></span><Icon name="chevronRight" size={16}/></button>) : <p>Escribe el nombre o número de documento para buscar.</p>}{consulta && !coincidencias.length && <p>No se encontraron coincidencias. Registra un paciente nuevo.</p>}</div></> : <div className="cuenta-q-ficha-paciente cuenta-q-ficha-nuevo" aria-label="Datos del nuevo paciente"><h4>Datos del paciente</h4><div className="cuenta-q-campos">
          <label>Nombres<input value={nuevo.nombres} onChange={e => setNuevo({ ...nuevo, nombres: e.target.value })} placeholder="Nombres"/></label><label>Apellido paterno<input value={nuevo.apellidoPaterno} onChange={e => setNuevo({ ...nuevo, apellidoPaterno: e.target.value })} placeholder="Apellido paterno"/></label><label>Apellido materno<input value={nuevo.apellidoMaterno} onChange={e => setNuevo({ ...nuevo, apellidoMaterno: e.target.value })} placeholder="Apellido materno"/></label>
          <label>CI<input value={nuevo.ci} onChange={e => setNuevo({ ...nuevo, ci: e.target.value })} placeholder="Número de CI"/></label><label>Complemento<input value={nuevo.complemento} onChange={e => setNuevo({ ...nuevo, complemento: e.target.value })} placeholder="Complemento"/></label><label>Expedido en<select value={nuevo.expedidoEn} onChange={e => setNuevo({ ...nuevo, expedidoEn: e.target.value })}><option value="">Seleccionar</option><option>CBBA</option><option>LPZ</option><option>OR</option><option>POT</option><option>TJA</option><option>CHU</option><option>SCZ</option><option>BEN</option><option>PND</option><option>EXTRANJERO</option></select></label>
          <label>NIT<input value={nuevo.nit} onChange={e => setNuevo({ ...nuevo, nit: e.target.value })} placeholder="NIT"/></label><label>Razón social<input value={nuevo.razonSocial} onChange={e => setNuevo({ ...nuevo, razonSocial: e.target.value })} placeholder="Razón social"/></label><label>Fecha de nacimiento<input type="date" value={nuevo.nacimiento} onChange={e => setNuevo({ ...nuevo, nacimiento: e.target.value })}/></label>
          <label>Teléfono<input value={nuevo.telefono} onChange={e => setNuevo({ ...nuevo, telefono: e.target.value })} placeholder="Número de contacto"/></label><label>Género<select value={nuevo.genero} onChange={e => setNuevo({ ...nuevo, genero: e.target.value })}><option value="">Seleccionar</option><option>Femenino</option><option>Masculino</option><option>Otro</option></select></label>
        </div><h4>Domicilio</h4><div className="cuenta-q-campos"><label>País<input value={nuevo.pais} onChange={e => setNuevo({ ...nuevo, pais: e.target.value })} placeholder="País"/></label><label>Departamento<input value={nuevo.departamento} onChange={e => setNuevo({ ...nuevo, departamento: e.target.value })} placeholder="Departamento"/></label><label>Ciudad<input value={nuevo.ciudad} onChange={e => setNuevo({ ...nuevo, ciudad: e.target.value })} placeholder="Ciudad"/></label><label>Zona / barrio<input value={nuevo.zona} onChange={e => setNuevo({ ...nuevo, zona: e.target.value })} placeholder="Zona o barrio"/></label><label>Dirección domicilio<input value={nuevo.direccion} onChange={e => setNuevo({ ...nuevo, direccion: e.target.value })} placeholder="Dirección"/></label></div></div>}
        {modo === 'buscar' && paciente && <div className="cuenta-q-ficha-paciente" aria-label="Datos del paciente seleccionado"><h4>Datos del paciente seleccionado</h4><div className="cuenta-q-campos">
          <label>Nombres<input value={dato(paciente.nombres || paciente.nombre.split(' ')[0])} readOnly/></label><label>Apellido paterno<input value={dato(paciente.apellidoPaterno || paciente.nombre.split(' ')[1])} readOnly/></label><label>Apellido materno<input value={dato(paciente.apellidoMaterno || paciente.nombre.split(' ').slice(2).join(' '))} readOnly/></label>
          <label>CI<input value={paciente.ci} readOnly/></label><label>Complemento<input value={dato(paciente.complemento)} readOnly/></label><label>Expedido en<input value={dato(paciente.expedidoEn)} readOnly/></label>
          <label>NIT<input value={dato(paciente.nit)} readOnly/></label><label>Razón social<input value={dato(paciente.razonSocial)} readOnly/></label><label>Fecha de nacimiento<input value={dato(paciente.nacimiento)} readOnly/></label>
          <label>Teléfono<input value={dato(paciente.telefono)} readOnly/></label><label>Género<input value={dato(paciente.genero)} readOnly/></label>
        </div><h4>Domicilio</h4><div className="cuenta-q-campos"><label>País<input value={dato(paciente.pais)} readOnly/></label><label>Departamento<input value={dato(paciente.departamento)} readOnly/></label><label>Ciudad<input value={dato(paciente.ciudad)} readOnly/></label><label>Zona / barrio<input value={dato(paciente.zona)} readOnly/></label><label>Dirección domicilio<input value={dato(paciente.direccion)} readOnly/></label></div></div>}
        {datosPaciente && <div className="cuenta-q-verificado"><Icon name="check" size={16}/><span>{modo === 'buscar' ? 'Paciente seleccionado:' : 'Datos del nuevo paciente completos:'} <strong>{datosPaciente.nombre}</strong> · CI {datosPaciente.ci}</span></div>}
      </section>
      <section className="cuenta-q-paso cuenta-q-acompanante"><header><b>2</b><div><h3>Familiar o acompañante responsable</h3><small>Completa su identificación y vínculo con el paciente.</small></div></header><div className="cuenta-q-campos"><label>Nombres *<input required value={acompanante.nombres} onChange={e => setAcompanante({ ...acompanante, nombres: e.target.value })} placeholder="Nombres"/></label><label>Apellido paterno *<input required value={acompanante.apellidoPaterno} onChange={e => setAcompanante({ ...acompanante, apellidoPaterno: e.target.value })} placeholder="Apellido paterno"/></label><label>Apellido materno *<input required value={acompanante.apellidoMaterno} onChange={e => setAcompanante({ ...acompanante, apellidoMaterno: e.target.value })} placeholder="Apellido materno"/></label><label>CI *<input required value={acompanante.ci} onChange={e => setAcompanante({ ...acompanante, ci: e.target.value })} placeholder="Número de CI"/></label><label>Fecha de nacimiento *<input required type="date" max={new Date().toISOString().slice(0, 10)} value={acompanante.nacimiento} onChange={e => setAcompanante({ ...acompanante, nacimiento: e.target.value })}/></label><label>Edad *<input readOnly value={edadAcompanante === null ? '' : `${edadAcompanante} años`} placeholder="Se calcula con la fecha"/></label><label>Vínculo con el paciente *<select required value={acompanante.vinculo} onChange={e => setAcompanante({ ...acompanante, vinculo: e.target.value })}><option value="">Seleccionar vínculo</option><option>Padre / madre</option><option>Esposo(a) / pareja</option><option>Hijo(a)</option><option>Hermano(a)</option><option>Otro familiar</option><option>Tutor(a) legal</option><option>Cuidador(a)</option><option>Amigo(a) / acompañante</option></select></label><label>Teléfono de contacto *<input required type="tel" value={acompanante.telefono} onChange={e => setAcompanante({ ...acompanante, telefono: e.target.value })} placeholder="Número de contacto"/></label></div></section>
      <section className="cuenta-q-paso cuenta-q-programacion"><header><b>3</b><div><h3>Programación quirúrgica</h3><small>Define el equipo, procedimiento, sala y horario.</small></div></header><div className="cuenta-q-campos"><label>Médico cirujano<select value={cirugia.medico} onChange={e => setCirugia({ ...cirugia, medico: e.target.value })}><option value="">Seleccionar médico</option><option>Dr. Ever Luizaga · Cirugía general</option><option>Dra. María Salazar · Ginecología</option><option>Dr. Pablo Rojas · Traumatología</option></select></label><label>Tipo de cirugía<select value={cirugia.tipo} onChange={e => setCirugia({ ...cirugia, tipo: e.target.value })}><option value="">Seleccionar procedimiento</option><option>Cirugía general</option><option>Cirugía laparoscópica</option><option>Cirugía traumatológica</option><option>Cirugía ginecológica</option></select></label><label>Quirófano<select value={cirugia.quirofano} onChange={e => setCirugia({ ...cirugia, quirofano: e.target.value })}><option value="">Seleccionar sala</option><option>Quirófano 1 · General</option><option>Quirófano 2 · Especialidades</option><option>Quirófano 3 · Ambulatorio</option></select></label><label>Fecha de cirugía<input type="date" value={cirugia.fecha} onChange={e => setCirugia({ ...cirugia, fecha: e.target.value })}/></label><label>Hora programada<input type="time" value={cirugia.hora} onChange={e => setCirugia({ ...cirugia, hora: e.target.value })}/></label></div></section>
      <ConsentimientosQuirofano paciente={datosPaciente ? { nombre: datosPaciente.nombre, ci: datosPaciente.ci, nacimiento: datosPaciente.nacimiento, telefono: datosPaciente.telefono } : null} acompanante={acompanante} cirugia={cirugia} acompananteCompleto={acompananteCompleto}/>
    </div>}
    {!cuenta && <footer className="cuenta-q-acciones"><div>{errorCuenta && <p className="cuenta-q-error" role="alert">{errorCuenta}</p>}<small>{listo ? 'Todos los datos requeridos están completos.' : 'Completa los datos del paciente, acompañante y programación para aperturar la cuenta.'}</small></div><button type="button" disabled={!listo} onClick={abrirCuenta}><Icon name="cash" size={17}/> Aperturar cuenta quirófano</button></footer>}
    </>}
  </section>;
}
