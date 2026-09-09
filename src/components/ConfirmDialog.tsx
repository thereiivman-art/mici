export function ConfirmDialog({
  title,
  message,
  confirmLabel = "Supprimer",
  onConfirm,
  onCancel,
}: {
  title: string;
  message: string;
  confirmLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <div className="modal-backdrop" onClick={onCancel}>
      <div className="modal-sheet" onClick={(e) => e.stopPropagation()}>
        <h2 style={{ fontSize: "1.1rem" }}>{title}</h2>
        <p className="muted">{message}</p>
        <div className="row" style={{ marginTop: 16 }}>
          <button className="btn btn-secondary" onClick={onCancel}>
            Annuler
          </button>
          <button className="btn btn-danger" onClick={onConfirm}>
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
