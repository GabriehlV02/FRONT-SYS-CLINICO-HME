import { useRef, useState, type FormEvent } from 'react';
import Icon from '../../radius/componentes/Icono';

const sistemas = [
  ['general', 'Estado general', 'Aspecto general y estado de conciencia'],
  ['cabeza', 'Cabeza y cuello', 'Cabeza, cara, ojos, oídos, nariz, boca y cuello'],
  ['respiratorio', 'Sistema respiratorio', 'Vías respiratorias, tórax y pulmones'],
  ['cardiovascular', 'Sistema cardiovascular', 'Corazón, circulación y pulsos periféricos'],
  ['digestivo', 'Sistema digestivo', 'Abdomen y aparato digestivo'],
  ['genitourinario', 'Sistema genitourinario', 'Región renal, vías urinarias y genitales'],
  ['neurologico', 'Sistema neurológico', 'Orientación, sensibilidad y función motora'],
  ['musculoesqueletico', 'Sistema musculoesquelético', 'Columna, extremidades, músculos y articulaciones'],
  ['piel', 'Piel y tejidos blandos', 'Piel, mucosas y tejido subcutáneo'],
] as const;
export function RevisionConsulta({ pacienteId }: { pacienteId: string }) {
  const [registros, setRegistros] = useState<Record<string, string>>({});
  const [seleccionado, setSeleccionado] = useState<(typeof sistemas)[number] | null>(null);
  const [observacion, setObservacion] = useState('');
  const modal = useRef<HTMLDialogElement>(null);
  const abrir = (sistema: (typeof sistemas)[number]) => {
    setSeleccionado(sistema);
    setObservacion(registros[sistema[0]] === 'Negativo' ? '' : registros[sistema[0]] || '');
    modal.current?.showModal();
  };
  const guardar = (evento: FormEvent) => {
    evento.preventDefault();
    if (!seleccionado) return;
    setRegistros(actual => ({ ...actual, [seleccionado[0]]: observacion.trim() || 'Negativo' }));
    modal.current?.close();
  };
  return <details className="consulta-seguimiento-panel consulta-revision-sistemas">
    <summary><span>Revisión por sistema · Examen físico</span><Icon name="chevronRight" size={18} /></summary>
    <div className="consulta-revision-contenido"><small>Selecciona un sistema para registrar su observación.</small>
      <div className="revision-compacta" aria-label="Revisión por sistema">{sistemas.map(sistema => {
        const [id, nombre] = sistema;
        const valor = registros[id];
        return <button type="button" className="revision-sistema-fila" key={`${pacienteId}-${id}`} onClick={() => abrir(sistema)}>
          <strong>{nombre}</strong><span className={valor && valor !== 'Negativo' ? 'revision-sistema-observacion' : 'revision-sistema-negativo'}>{valor || 'Negativo'}{!valor && <small> · Sin confirmar</small>}</span><Icon name="edit" size={15} />
        </button>;
      })}</div>
      <dialog className="revision-sistema-modal" ref={modal} aria-labelledby="revision-modal-titulo" onClose={() => setSeleccionado(null)}>
        <form onSubmit={guardar}><header><div><strong id="revision-modal-titulo">{seleccionado?.[1]}</strong><small>{seleccionado?.[2]}</small></div><button type="button" aria-label="Cerrar" onClick={() => modal.current?.close()}>×</button></header>
          <label htmlFor="revision-modal-observacion">Observaciones</label><textarea id="revision-modal-observacion" value={observacion} onChange={evento => setObservacion(evento.target.value)} maxLength={1000} placeholder="Describe los hallazgos observados…" rows={4} />
          <small>Si guardas sin observaciones, se registrará como negativo.</small><footer><button type="button" onClick={() => modal.current?.close()}>Cancelar</button><button type="submit">Guardar</button></footer>
        </form>
      </dialog>
    </div>
  </details>;
}
