import React from "react";
import { Cycle } from "../../../generated/shared";

interface Props {
  cycle: Cycle | null;
  onClose: () => void;
}

// Simple deterministic QR grid generator for visual printable stickers
function generateQrMatrix(text: string): boolean[][] {
  const size = 21;
  const matrix: boolean[][] = Array.from({ length: size }, () => Array(size).fill(false));

  function setFinder(r: number, c: number) {
    for (let i = 0; i < 7; i++) {
      for (let j = 0; j < 7; j++) {
        if (i === 0 || i === 6 || j === 0 || j === 6 || (i >= 2 && i <= 4 && j >= 2 && j <= 4)) {
          matrix[r + i][c + j] = true;
        }
      }
    }
  }

  setFinder(0, 0);
  setFinder(0, size - 7);
  setFinder(size - 7, 0);

  let hash = 0;
  for (let i = 0; i < text.length; i++) {
    hash = (hash << 5) - hash + text.charCodeAt(i);
    hash |= 0;
  }

  for (let i = 0; i < size; i++) {
    for (let j = 0; j < size; j++) {
      if (
        (i < 8 && j < 8) ||
        (i < 8 && j >= size - 8) ||
        (i >= size - 8 && j < 8)
      ) {
        continue;
      }
      const bit = ((hash ^ (i * 31 + j * 17)) & 1) === 1;
      matrix[i][j] = bit;
    }
  }

  return matrix;
}

export const QrStickerModal: React.FC<Props> = ({ cycle, onClose }) => {
  if (!cycle) return null;

  const matrix = generateQrMatrix(cycle.qrCode);

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-card print-card" onClick={(e) => e.stopPropagation()}>
        <div className="sticker-content">
          <div className="sticker-header">
            <span className="brand">BYCME</span>
            <span className="badge">{cycle.publicCycleId}</span>
          </div>

          <div className="qr-container">
            <svg viewBox="0 0 21 21" width="160" height="160" className="qr-svg">
              {matrix.map((row, r) =>
                row.map((cell, c) =>
                  cell ? (
                    <rect key={`${r}-${c}`} x={c} y={r} width={1} height={1} fill="#111827" />
                  ) : null
                )
              )}
            </svg>
          </div>

          <div className="sticker-footer">
            <div className="code-text">{cycle.qrCode}</div>
            <div className="sub-text">{cycle.makeModel}</div>
            <div className="scan-hint">Scan with Bycme app to unlock</div>
          </div>
        </div>

        <div className="modal-actions no-print">
          <button className="btn-primary" onClick={handlePrint}>Print Sticker</button>
          <button className="btn-secondary" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
};
