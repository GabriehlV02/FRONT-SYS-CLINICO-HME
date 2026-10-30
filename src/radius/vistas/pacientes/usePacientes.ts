import { useEffect, useState } from 'react';
import { listarFichasPacientes } from './pacientesApi';
import type { PacienteRegistrado } from './ModalRegistroPaciente';

export function usePacientes(habilitado = true) {
  const [pacientes, setPacientes] = useState<PacienteRegistrado[]>([]);
  const [errorPacientes, setError] = useState('');
  const [cargandoPacientes, setCargando] = useState(true);
  useEffect(() => {
    if (!habilitado) { setPacientes([]); setCargando(false); return; }
    let vigente = true;
    let controller: AbortController | undefined;
    const cargar = () => {
      controller?.abort();
      controller = new AbortController();
      const signal = controller.signal;
      setCargando(true);
      void listarFichasPacientes(signal).then(datos => {
        if (vigente && !signal.aborted) { setPacientes(datos); setError(''); }
      }).catch(causa => {
        if (vigente && !signal.aborted) { setPacientes([]); setError(causa instanceof Error ? causa.message : 'No se pudieron consultar los pacientes.'); }
      }).finally(() => { if (vigente && !signal.aborted) setCargando(false); });
    };
    cargar();
    window.addEventListener('pacientes:actualizados', cargar);
    window.addEventListener('focus', cargar);
    return () => { vigente = false; controller?.abort(); window.removeEventListener('pacientes:actualizados', cargar); window.removeEventListener('focus', cargar); };
  }, [habilitado]);
  return { pacientes, errorPacientes, cargandoPacientes };
}
