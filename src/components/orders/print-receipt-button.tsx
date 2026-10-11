"use client";

export function PrintReceiptButton() {
  return (
    <button className="secondary-button" onClick={() => window.print()} type="button">
      Imprimer le reçu
    </button>
  );
}
