import { useEffect, useState } from 'react';
import Icon from '../../componentes/Icono';
import { apiFetch } from '../../api';
import './VistaRolesPermisos.css';

type Perfil='medico'|'consultorio'|'internacion'|'quirofano'|'imagenologia'|'anestesiologo';
type Rol={id:string;nombre:string;descripcion:string;permisos:string[];tipoInicio?:string;perfilAtencion?:Perfil};
const perfiles: {id:Perfil;nombre:string}[]=[{id:'medico',nombre:'Médico'},{id:'consultorio',nombre:'Consultorio'},{id:'internacion',nombre:'Internación'},{id:'quirofano',nombre:'Quirófano'},{id:'imagenologia',nombre:'Imagenología'},{id:'anestesiologo',nombre:'Anestesiólogo'}];
export default function VistaRolesPermisos(){
 const [roles,setRoles]=useState<Rol[]>([]),[cargando,setCargando]=useState(true);
 useEffect(()=>{apiFetch('/api/roles').then(r=>r.ok?r.json():[]).then(setRoles).catch(()=>setRoles([])).finally(()=>setCargando(false))},[]);
 const actualizarPerfil=async(rol:Rol,perfil:Perfil|undefined)=>{const respuesta=await apiFetch(`/api/roles/${rol.id}`,{method:'PUT',body:JSON.stringify({...rol,perfilAtencion:perfil})});if(respuesta.ok){const actualizado=await respuesta.json();setRoles(actuales=>actuales.map(item=>item.id===actualizado.id?actualizado:item))}};
 return <div className="roles-vista"><div className="roles-cabecera"><div><p>ROLES DEL SISTEMA</p><h3>Roles y permisos</h3><small>Define accesos y el área profesional de cada rol.</small></div><button><Icon name="plus" size={17}/>Nuevo rol</button></div><div className="roles-lista">{cargando?<div className="rol-vacio">Cargando roles…</div>:roles.length?roles.map(rol=><article className="rol-tarjeta" key={rol.id}><span className="rol-icono"><Icon name="asset" size={21}/></span><div><h4>{rol.nombre}</h4><p>{rol.descripcion||'Sin descripción registrada.'}</p><small>{rol.permisos.length} permisos · Inicio: {(rol.tipoInicio||'general').replace(/_/g,' ')}</small><label className="rol-perfil">Área profesional<select value={rol.perfilAtencion||''} onChange={event=>void actualizarPerfil(rol,(event.target.value||undefined) as Perfil|undefined)}><option value="">Sin área asignada</option>{perfiles.map(perfil=><option key={perfil.id} value={perfil.id}>{perfil.nombre}</option>)}</select></label></div><button title="Editar rol"><Icon name="edit" size={17}/></button></article>):<div className="rol-vacio"><span><Icon name="asset" size={25}/></span><strong>No hay roles registrados</strong><small>Crea el primer rol para organizar los accesos.</small></div>}</div></div>;
}
