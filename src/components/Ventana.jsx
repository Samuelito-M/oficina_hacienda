import { useEffect, useRef } from 'react';

export default function Ventana({ abierta, onCerrar, ancha, children, etiqueta }) {
  const ref = useRef(null);
  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (abierta && !d.open) d.showModal();
    if (!abierta && d.open) d.close();
  }, [abierta]);
  return (
    <dialog
      ref={ref}
      className={`h-dlg${ancha ? ' ancha' : ''}`}
      aria-label={etiqueta}
      onClose={onCerrar}
      onClick={(e) => {
        if (e.target === ref.current) onCerrar();
      }}
    >
      {abierta && <div className="h-dlg-in">{children}</div>}
    </dialog>
  );
}
