"use client";

export function PrintContractButton() {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      style={{
        backgroundColor: "#0f766e",
        color: "white",
        border: "none",
        borderRadius: "6px",
        padding: "12px 24px",
        fontSize: "14px",
        fontWeight: 600,
        cursor: "pointer",
        boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)",
        transition: "opacity 0.2s",
      }}
      onMouseOver={(e) => { e.currentTarget.style.opacity = "0.9"; }}
      onMouseOut={(e) => { e.currentTarget.style.opacity = "1"; }}
    >
      Imprimir Contrato
    </button>
  );
}