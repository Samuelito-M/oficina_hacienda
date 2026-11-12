import { useId, useRef, useState } from 'react';

const ICONO = { pdf: 'PDF', docx: 'DOC', xlsx: 'XLS' };
const CLASE = { pdf: 'pdf', docx: 'doc', xlsx: 'xls' };
const ACCEPT = {
  pdf: '.pdf,application/pdf',
  docx: '.docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  xlsx: '.xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  horario: '.pdf,.xlsx,application/pdf,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
};

export default function Subir({ etiqueta, tipo, estado, onArchivo, ayuda }) {
  const id = useId();
  const input = useRef(null);
  const [encima, setEncima] = useState(false);
  const e = estado || { estado: 'vacio' };
  const clase = ['file', 'drop', e.estado === 'listo' ? 'ok' : '', e.estado === 'error' ? 'err' : '', encima ? 'over' : ''].join(' ');
  const elegir = (files) => {
    const f = files && files[0];
    if (f) onArchivo(f);
  };
  return (
    <label
      className={clase}
      htmlFor={id}
      onDragOver={(ev) => {
        ev.preventDefault();
        setEncima(true);
      }}
      onDragLeave={() => setEncima(false)}
      onDrop={(ev) => {
        ev.preventDefault();
        setEncima(false);
        elegir(ev.dataTransfer.files);
      }}
    >
      {(() => {
        const ext = e.ext || (tipo === 'horario' ? 'pdf' : tipo);
        return <div className={`ic ${e.estado === 'vacio' ? 'none' : CLASE[ext] || 'pdf'}`}>{tipo === 'horario' && e.estado === 'vacio' ? 'PDF' : ICONO[ext] || 'PDF'}</div>;
      })()}
      <div className="meta">
        <div className="lbl">{etiqueta}</div>
        <div className="nm">{e.nombre || 'Elige o arrastra el archivo'}</div>
        {e.estado === 'vacio' && <div className="st load">{ayuda}</div>}
        {e.estado === 'cargando' && (
          <div className="st load">
            <span className="spin" aria-hidden="true" /> Leyendo…
          </div>
        )}
        {e.estado === 'listo' && <div className="st">{e.detalle}</div>}
        {e.estado === 'error' && <div className="st err">{e.error}</div>}
      </div>
      <span className="btn-link">{e.estado === 'vacio' ? 'Elegir' : 'Cambiar'}</span>
      <input
        ref={input}
        id={id}
        type="file"
        accept={ACCEPT[tipo]}
        onChange={(ev) => {
          elegir(ev.target.files);
          ev.target.value = '';
        }}
      />
    </label>
  );
}
