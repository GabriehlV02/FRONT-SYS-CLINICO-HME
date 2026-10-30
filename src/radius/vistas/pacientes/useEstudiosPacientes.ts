import { useEffect, useState } from 'react';
import { apiFetch } from '../../api';

export type EstudioPaciente = { id: string; paciente_id: string; nombres: string; apellido_paterno: string; apellido_materno: string; ci: string; tipo: string; nombre: string; estado: string; indicaciones?: string; solicitado_en: string };

export function useEstudiosPacientes() {
  const [estudios, setEstudios] = useState<EstudioPaciente[]>([]);
  const [errorEstudios, setError] = useState('');
  useEffect(() => {
    let controller: AbortController | undefined;
    const cargar = () => {
      controller?.abort(); controller = new AbortController(); const signal = controller.signal;
      void apiFetch('/api/v1/estudios/agenda', {signal, headers:{Accept:'application/json'}}).then(async respuesta => {
        if (!respuesta.ok) throw new Error('No se pudieron consultar los estudios solicitados.');
        const datos = await respuesta.json();
        if (!signal.aborted) { setEstudios(datos.data); setError(''); }
      }).catch(causa => { if (!signal.aborted) setError((causa as Error).message); });
    };
    cargar(); window.addEventListener('focus', cargar); window.addEventListener('pacientes:actualizados', cargar);
    return () => {controller?.abort();window.removeEventListener('focus',cargar);window.removeEventListener('pacientes:actualizados',cargar);};
  }, []);
  return {estudios, errorEstudios};
}
