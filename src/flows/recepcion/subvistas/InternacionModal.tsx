import { useProfesionales, etiquetaProfesional } from '../../../radius/profesionales';
import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import Icon from '../../../radius/componentes/Icono';
import { crearPreinternacion, type RegistroInternacion } from '../../internacion/registroInternaciones';
import './InternacionModal.css';
import { BuscadorPacienteInternacion, nombrePaciente } from './BuscadorPacienteInternacion';
import { sincronizarPaciente } from '../../../radius/pacientesCompartidos';
import type { PacienteDemo } from '../../../radius/datos/almacenDemo';

type Datos = Record<'nombre'|'ci'|'nacimiento'|'sexo'|'estadoCivil'|'ocupacion'|'direccion'|'telefono'|'responsableNombre'|'responsableCi'|'responsableNacimiento'|'responsableDireccion'|'responsableTelefono', string>;
const pasos = [
  ['Paciente', 'Datos del paciente', 'Completa su identificación y los datos para contactarlo.'],
  ['Responsable', 'Responsable de la cuenta', 'Registra a la persona responsable. Puedes continuar si aún no tienes estos datos.'],
  ['Ingreso', 'Datos de la internación', 'Completa la orden médica y las condiciones de ingreso.'],
  ['Revisión', 'Revisa antes de registrar', 'Confirma los datos. Puedes volver para corregirlos antes de registrar.'],
];
const fechaHoy = () => { const f = new Date(); return `${f.getFullYear()}-${String(f.getMonth()+1).padStart(2,'0')}-${String(f.getDate()).padStart(2,'0')}`; };
const inicial = (p?: {nombre:string;ci:string}|null):Datos => ({nombre:p?.nombre??'',ci:p?.ci??'',nacimiento:'',sexo:'',estadoCivil:'',ocupacion:'',direccion:'',telefono:'',responsableNombre:'',responsableCi:'',responsableNacimiento:'',responsableDireccion:'',responsableTelefono:''});

// Stable component identity preserves input focus while typing.
function Campo({id,etiqueta,datos,actualizar,requerido=false,tipo='text',doble=false,onCambiar}:{id:keyof Datos;etiqueta:string;datos:Datos;actualizar:(id:keyof Datos,v:string)=>void;requerido?:boolean;tipo?:string;doble?:boolean;onCambiar?:(valor:string)=>void}) {
  return <label className={doble?'doble':''}>{etiqueta}{requerido?' *':''}<input name={id} type={tipo} required={requerido} pattern={requerido?'.*\\S.*':undefined} max={tipo==='date'?fechaHoy():undefined} value={datos[id]} onChange={e=>(onCambiar || ((valor:string)=>actualizar(id,valor)))(e.target.value)}/></label>;
}
export function InternacionModal({onCerrar,pacienteInicial,onRegistrada}:{onCerrar:()=>void;pacienteInicial?:{nombre:string;ci:string}|null;onRegistrada?:(r:RegistroInternacion)=>void}) {
  const {medicos,resolver,errorProfesionales}=useProfesionales();
  const ventana=useRef<HTMLDialogElement>(null), formulario=useRef<HTMLFormElement>(null), titulo=useRef<HTMLHeadingElement>(null), guardando=useRef(false);
  const [paso,setPaso]=useState(0), [datos,setDatos]=useState<Datos>(()=>inicial(pacienteInicial)), [error,setError]=useState('');
  const hidratado = useRef(false);
  const [pacienteSeleccionado, setPacienteSeleccionado] = useState(false);
  const seleccionarPaciente = (p: PacienteDemo) => {
    hidratado.current = true; setPacienteSeleccionado(true);
    setDatos(actual => ({...inicial(), ...Object.fromEntries(Object.entries(actual).filter(([k]) => k.startsWith('responsable'))), nombre:nombrePaciente(p), ci:p.numeroDocumento || '', nacimiento:p.fechaNacimiento?.slice(0,10) || '', sexo:({femenino:'Femenino',masculino:'Masculino',otro:'Otro'} as Record<string,string>)[p.sexo?.toLowerCase()] || '', telefono:p.telefono || '', direccion:p.direccion || ''}));
  };
  const cambiarNombre = (nombre: string) => { hidratado.current = true; if(pacienteSeleccionado) { setDatos(actual => ({...actual,nombre,ci:'',nacimiento:'',sexo:'',estadoCivil:'',ocupacion:'',telefono:'',direccion:''})); setPacienteSeleccionado(false); } else actualizar('nombre',nombre); };
  const cambiarCi = (ci: string) => {
    hidratado.current = true;
    if (pacienteSeleccionado && ci !== datos.ci) {
      setDatos(actual => ({...actual,nombre:'',ci,nacimiento:'',sexo:'',estadoCivil:'',ocupacion:'',telefono:'',direccion:''}));
      setPacienteSeleccionado(false);
      return;
    }
    actualizar('ci', ci);
  };
  const [ingreso,setIngreso]=useState({medico:'',diagnostico:'',fecha:fechaHoy(),hora:new Date().toLocaleTimeString('en-GB',{hour:'2-digit',minute:'2-digit'}),origen:'Emergencia',servicio:'Medicina interna',observaciones:''});
  const actualizar=(id:keyof Datos,v:string)=>setDatos(x=>({...x,[id]:v}));
  const campo=(id:keyof Datos,etiqueta:string,requerido=false,tipo='text',doble=false,onCambiar?: (valor:string)=>void)=><Campo id={id} etiqueta={etiqueta} requerido={requerido} tipo={tipo} doble={doble} datos={datos} actualizar={actualizar} onCambiar={onCambiar}/>;
  useEffect(()=>{const dialogo=ventana.current, foco=document.activeElement as HTMLElement|null, previo=document.body.style.overflow;document.body.style.overflow='hidden';dialogo?.showModal();return()=>{document.body.style.overflow=previo;if(foco?.isConnected)foco.focus();};},[]);
  useEffect(()=>{titulo.current?.focus();formulario.current?.scrollTo(0,0);},[paso]);
  const avanzar=()=>{if(!formulario.current?.reportValidity())return;if(paso===2&&!ingreso.diagnostico.trim()){setError('Escribe el diagnóstico de ingreso.');return;}setError('');setPaso(x=>Math.min(x+1,3));};
  const registrar=async()=>{
    if(guardando.current)return;
    if(![datos.nombre,datos.ci,datos.direccion,datos.telefono].every(v=>v.trim())){setPaso(0);return;}
    if(!ingreso.medico.trim()||!ingreso.diagnostico.trim()||!ingreso.fecha||!ingreso.hora){setPaso(2);return;}
    if(!resolver(ingreso.medico)){setError('Selecciona un médico activo del catálogo.');setPaso(2);return;}
    guardando.current=true;
    let registro:RegistroInternacion;
    try{const ficha=await sincronizarPaciente({documento:datos.ci});registro=crearPreinternacion({profesionalId:resolver(ingreso.medico)?.id,pacienteId:ficha.data!.id,paciente:datos.nombre.trim(),ci:datos.ci.trim(),medico:ingreso.medico.trim(),motivo:ingreso.diagnostico.trim(),datosPaciente:datos,fechaIngreso:ingreso.fecha,horaIngreso:ingreso.hora,origen:ingreso.origen,servicio:ingreso.servicio,observaciones:ingreso.observaciones.trim()});}
    catch(error){guardando.current=false;setError((error as Error).message || 'No se pudo guardar. Verifica el almacenamiento del navegador e intenta nuevamente.');return;}
    onRegistrada?.(registro);ventana.current?.close();
  };
  const resumen=(nombre:string,n:number,filas:[string,string][])=><section className="internacion-resumen-bloque"><header><h4>{nombre}</h4><button type="button" onClick={()=>{setError('');setPaso(n);}}>Editar</button></header><dl>{filas.map(([k,v])=><div key={k}><dt>{k}</dt><dd>{v||'Sin registrar'}</dd></div>)}</dl></section>;
  return createPortal(<dialog ref={ventana} className="recepcion-internacion-modal internacion-asistente" aria-labelledby="internacion-titulo" onClose={onCerrar}>
    <header className="recepcion-internacion-encabezado"><div><p>Admisión hospitalaria</p><h2 id="internacion-titulo">Nueva internación</h2><small>Quedará en preinternación hasta que Enfermería asigne sala y cama.</small></div><button className="recepcion-internacion-cerrar" type="button" aria-label="Cerrar" onClick={()=>ventana.current?.close()}><Icon name="close" size={22}/></button></header>
    <nav className="internacion-progreso" aria-label="Pasos de la internación"><ol>{pasos.map(([nombre],i)=><li key={nombre} className={i===paso?'actual':i<paso?'completado':''} aria-current={i===paso?'step':undefined}><span>{i<paso?'✓':i+1}</span><strong>{nombre}</strong></li>)}</ol><div className="internacion-progreso-barra" aria-hidden="true"><i style={{width:`${(paso+1)/pasos.length*100}%`}}/></div></nav>
    <form ref={formulario} id="internacion-formulario" className="recepcion-internacion-contenido" onSubmit={e=>{e.preventDefault();if(paso===3)registrar();else avanzar();}}>
      <section className="internacion-paso" aria-labelledby="internacion-paso-titulo"><header className="internacion-paso-encabezado"><span>Paso {paso+1} de {pasos.length}</span><h3 id="internacion-paso-titulo" ref={titulo} tabIndex={-1}>{pasos[paso][1]}</h3><p>{pasos[paso][2]}</p></header>
      {paso===0&&<><div className="internacion-seccion-nota"><span>{pacienteSeleccionado?'Paciente seleccionado · Datos cargados':'Busca un paciente o registra sus datos'}</span><small>* Campos obligatorios</small></div><div className="internacion-campos"><BuscadorPacienteInternacion valor={datos.nombre} ci={datos.ci} ciInicial={hidratado.current?undefined:pacienteInicial?.ci} onCambiar={cambiarNombre} onSeleccionar={seleccionarPaciente}/>{campo('ci','CI / documento',true,'text',false,cambiarCi)}{campo('nacimiento','Fecha de nacimiento',false,'date')}<label>Sexo<select value={datos.sexo} onChange={e=>actualizar('sexo',e.target.value)}><option value="">Seleccionar</option><option>Femenino</option><option>Masculino</option><option>Otro</option></select></label>{campo('estadoCivil','Estado civil')}{campo('ocupacion','Ocupación')}{campo('telefono','Teléfono',true,'tel')}{campo('direccion','Dirección',true,'text',true)}</div></>}
      {paso===1&&<div className="internacion-campos">{campo('responsableNombre','Nombre completo',false,'text',true)}{campo('responsableCi','CI / documento')}{campo('responsableNacimiento','Fecha de nacimiento',false,'date')}{campo('responsableTelefono','Teléfono',false,'tel')}{campo('responsableDireccion','Dirección',false,'text',true)}</div>}
      {paso===2&&<div className="internacion-campos"><label className="doble">Médico que ordena la internación *<select required value={ingreso.medico} onChange={e=>setIngreso(x=>({...x,medico:e.target.value}))}><option value="">Seleccionar médico</option>{medicos.map(p=><option key={p.id}>{etiquetaProfesional(p)}</option>)}</select></label><label>Origen<select value={ingreso.origen} onChange={e=>setIngreso(x=>({...x,origen:e.target.value}))}><option>Emergencia</option><option>Consulta externa</option><option>Referencia</option></select></label><label>Servicio de internación<select value={ingreso.servicio} onChange={e=>setIngreso(x=>({...x,servicio:e.target.value}))}><option>Medicina interna</option><option>Terapia intensiva</option><option>Cirugía</option><option>Pediatría</option><option>Ginecología y obstetricia</option></select></label><label>Fecha de ingreso *<input required type="date" value={ingreso.fecha} onChange={e=>setIngreso(x=>({...x,fecha:e.target.value}))}/></label><label>Hora de ingreso *<input required type="time" value={ingreso.hora} onChange={e=>setIngreso(x=>({...x,hora:e.target.value}))}/></label><label className="doble">Diagnóstico de ingreso *<textarea required value={ingreso.diagnostico} onChange={e=>setIngreso(x=>({...x,diagnostico:e.target.value}))} placeholder="Diagnóstico presuntivo o confirmado"/></label><label className="doble">Observaciones<textarea value={ingreso.observaciones} onChange={e=>setIngreso(x=>({...x,observaciones:e.target.value}))} placeholder="Información adicional del ingreso (opcional)"/></label></div>}
      {paso===3&&<div className="internacion-resumen">{resumen('Paciente',0,[['Nombre y apellidos',datos.nombre],['CI / documento',datos.ci],['Nacimiento',datos.nacimiento],['Sexo',datos.sexo],['Estado civil',datos.estadoCivil],['Ocupación',datos.ocupacion],['Teléfono',datos.telefono],['Dirección',datos.direccion]])}{resumen('Responsable de la cuenta',1,[['Nombre',datos.responsableNombre],['CI / documento',datos.responsableCi],['Nacimiento',datos.responsableNacimiento],['Teléfono',datos.responsableTelefono],['Dirección',datos.responsableDireccion]])}{resumen('Ingreso',2,[['Médico',ingreso.medico],['Origen',ingreso.origen],['Servicio',ingreso.servicio],['Fecha y hora',`${ingreso.fecha} · ${ingreso.hora}`],['Diagnóstico',ingreso.diagnostico],['Observaciones',ingreso.observaciones]])}<p className="internacion-aviso">Se creará una preinternación pendiente de asignación de sala y cama.</p></div>}
      {(error || errorProfesionales)&&<p className="internacion-error" role="alert">{error || errorProfesionales}</p>}</section>
    </form>
    <footer className="recepcion-internacion-pie"><button type="button" className="internacion-cancelar" onClick={()=>ventana.current?.close()}>Cancelar</button><div>{paso>0&&<button type="button" onClick={()=>{setError('');setPaso(x=>x-1);}}>Anterior</button>}<button type="submit" form="internacion-formulario" className="internacion-siguiente">{paso===3?'Registrar preinternación':'Siguiente →'}</button></div></footer>
  </dialog>,document.body);
}
