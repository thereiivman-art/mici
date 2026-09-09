import type { ReactNode } from "react";
import { CloseIcon } from "./Icons";

export function Sheet({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
}) {
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-sheet" onClick={(e) => e.stopPropagation()}>
        <div className="topbar">
          <h2 style={{ fontSize: "1.1rem" }}>{title}</h2>
          <button className="icon-btn" onClick={onClose} aria-label="Fermer">
            <CloseIcon />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
