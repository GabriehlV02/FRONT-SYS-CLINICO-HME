import Icon from '../../radius/componentes/Icono';

export function RegistroUsoTriajeView() {
  return <section className="modulo-vacio" aria-labelledby="registro-uso-titulo">
    <span><Icon name="audit" size={28} /></span>
    <p>TRIAJE Y SIGNOS VITALES</p>
    <h2 id="registro-uso-titulo">Registro de uso</h2>
    <small>En esta vista se mostrarán los registros de uso generados durante la atención de triaje.</small>
  </section>;
}
