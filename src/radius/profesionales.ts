import { useEffect, useState } from 'react';
import { apiFetch } from './api';

export type Profesional = {id:string;nombres:string;apellidos:string;nombre:string;tipo:'Médico/a'|'Enfermero/a'|'Otro profesional';especialidades:string[];rol:string;matricula:string|null;telefono:string|null;usuario_id:string|null;activo:boolean};
export const etiquetaProfesional = (p:Profesional) => `${p.nombre} · ${p.matricula || p.id.slice(0,8)}`;

export function useProfesionales() {
  const [profesionales,setProfesionales]=useState<Profesional[]>([]);
  const [errorProfesionales,setError]=useState('');
  useEffect(()=>{
    let controller:AbortController|undefined;
    const cargar=()=>{controller?.abort();controller=new AbortController();const signal=controller.signal;
      void apiFetch('/api/v1/profesionales',{signal,headers:{Accept:'application/json'}}).then(async r=>{
        if(!r.ok)throw new Error('No se pudo consultar el catálogo de profesionales.');
        const d=await r.json();if(!signal.aborted){setProfesionales(d.data);setError('');}
      }).catch(e=>{if(!signal.aborted){setProfesionales([]);setError((e as Error).message);}});
    };
    cargar();window.addEventListener('focus',cargar);
    return()=>{controller?.abort();window.removeEventListener('focus',cargar);};
  },[]);
  const medicos=profesionales.filter(p=>p.tipo==='Médico/a');
  const enfermeria=profesionales.filter(p=>p.tipo==='Enfermero/a');
  const resolver=(valor:string)=>profesionales.find(p=>p.id===valor || etiquetaProfesional(p)===valor);
  return {profesionales,medicos,enfermeria,errorProfesionales,resolver};
}
