import { MedicoInternacionView } from "./MedicoInternacionView";
import "./MedicoTerapiaIntensivaView.css";

export function MedicoTerapiaIntensivaView() {
  return (
    <section className="uci-medico-vista" aria-label="Pacientes de terapia intensiva">
      <MedicoInternacionView subvista="internados" area="uci" />
    </section>
  );
}
