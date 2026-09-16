export type PacienteDemo={id:string;nombres:string;primerApellido:string;segundoApellido:string;tipoDocumento:string;numeroDocumento:string;fechaNacimiento:string;sexo:string;telefono:string;direccion:string;creadoEn:string};
export type EstudioDemo={id:string;pacienteId:string;paciente:string;titulo:string;categoria:string;descripcion:string;nombreArchivo:string;mime:string;archivoUrl?:string;creadaEn:string};
export type InformeDemo={pacienteId:string;nombreArchivo:string;mime:string;creadoEn:string};

const PACIENTES='pulso_local_pacientes_v1',ESTUDIOS='pulso_local_estudios_v1',SELECCION='radiuus_estudio_seleccionado',INFORMES='pulso_local_informes_v1';
export const pacientesIniciales:PacienteDemo[]=[];
export const estudiosIniciales:EstudioDemo[]=[];

function leer<T>(clave:string,inicial:T):T{try{const valor=localStorage.getItem(clave);if(valor)return JSON.parse(valor) as T;localStorage.setItem(clave,JSON.stringify(inicial));}catch{}return inicial}
export const obtenerPacientes=()=>leer(PACIENTES,pacientesIniciales);
export const guardarPacientes=(datos:PacienteDemo[])=>{localStorage.setItem(PACIENTES,JSON.stringify(datos));window.dispatchEvent(new Event('radiuus:datos-demo'))};
export const obtenerEstudios=()=>leer(ESTUDIOS,estudiosIniciales);
export const guardarEstudios=(datos:EstudioDemo[])=>{localStorage.setItem(ESTUDIOS,JSON.stringify(datos));window.dispatchEvent(new Event('radiuus:datos-demo'))};
export const seleccionarEstudio=(id:string)=>{localStorage.setItem(SELECCION,id);window.dispatchEvent(new CustomEvent('radiuus:navegar',{detail:'visor'}))};
export const obtenerEstudioSeleccionado=()=>{const id=localStorage.getItem(SELECCION);return obtenerEstudios().find(e=>e.id===id)||null};

const abrirDb=()=>new Promise<IDBDatabase>((resolve,reject)=>{const solicitud=indexedDB.open('pulso-local',1);solicitud.onupgradeneeded=()=>solicitud.result.createObjectStore('archivos');solicitud.onsuccess=()=>resolve(solicitud.result);solicitud.onerror=()=>reject(solicitud.error)});
export async function guardarArchivoEstudio(id:string,archivo:File){const db=await abrirDb();await new Promise<void>((resolve,reject)=>{const tx=db.transaction('archivos','readwrite');tx.objectStore('archivos').put(archivo,id);tx.oncomplete=()=>resolve();tx.onerror=()=>reject(tx.error)});db.close()}
export const obtenerInformes=()=>leer<Record<string,InformeDemo>>(INFORMES,{});
export async function guardarInformePaciente(pacienteId:string,archivo:File){const db=await abrirDb();await new Promise<void>((resolve,reject)=>{const tx=db.transaction('archivos','readwrite');tx.objectStore('archivos').put(archivo,`informe:${pacienteId}`);tx.oncomplete=()=>resolve();tx.onerror=()=>reject(tx.error)});db.close();const informes=obtenerInformes(),informe:InformeDemo={pacienteId,nombreArchivo:archivo.name,mime:archivo.type,creadoEn:new Date().toISOString()};informes[pacienteId]=informe;localStorage.setItem(INFORMES,JSON.stringify(informes));return informe}
export async function obtenerArchivoInforme(pacienteId:string){const db=await abrirDb();const archivo=await new Promise<File|undefined>((resolve,reject)=>{const tx=db.transaction('archivos','readonly'),solicitud=tx.objectStore('archivos').get(`informe:${pacienteId}`);solicitud.onsuccess=()=>resolve(solicitud.result);solicitud.onerror=()=>reject(solicitud.error)});db.close();if(!archivo)throw new Error('El archivo del informe ya no está disponible.');return archivo}
export async function obtenerArchivoEstudio(estudio:EstudioDemo){if(estudio.archivoUrl){const respuesta=await fetch(estudio.archivoUrl);if(!respuesta.ok)throw new Error('No se encontró el archivo de demostración.');return new File([await respuesta.blob()],estudio.nombreArchivo,{type:estudio.mime})}const db=await abrirDb();const archivo=await new Promise<File|undefined>((resolve,reject)=>{const tx=db.transaction('archivos','readonly'),solicitud=tx.objectStore('archivos').get(estudio.id);solicitud.onsuccess=()=>resolve(solicitud.result);solicitud.onerror=()=>reject(solicitud.error)});db.close();if(!archivo)throw new Error('El archivo local ya no está disponible. Vuelve a cargarlo.');return archivo}
