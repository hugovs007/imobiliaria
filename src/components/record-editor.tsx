"use client";

import { useState } from "react";
import { Button } from "@/components/ui";

interface FieldConfig {
  name: string;
  label: string;
  value: any;
  type?: string;
  step?: string;
  required?: boolean;
  kind?: "input" | "select" | "textarea";
  options?: { value: string; label: string }[];
}

interface RecordEditorProps {
  entity: string;
  id: string;
  fields: FieldConfig[];
}

export function RecordEditor({ entity, id, fields }: RecordEditorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const formData = new FormData(e.currentTarget);
      const data: Record<string, any> = {};

      formData.forEach((val, key) => {
        data[key] = val;
      });

      const res = await fetch(`/api/records/update`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ entity, id, data }),
      });

      const json = await res.json();
      if (!res.ok || json.error) {
        throw new Error(json.error || "Erro ao salvar alterações.");
      }

      setIsOpen(false);
      window.location.reload();
    } catch (err: any) {
      setError(err?.message || "Erro desconhecido ao atualizar.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="text-xs font-medium underline cursor-pointer"
        style={{ color: "var(--color-teal)" }}
      >
        Editar
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-lg bg-white p-6 shadow-2xl">
            <div className="mb-4 flex items-center justify-between border-b pb-3">
              <h2 className="text-lg font-semibold text-gray-900">Editar Informações</h2>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="text-gray-500 hover:text-gray-700 text-xl font-bold cursor-pointer"
              >
                &times;
              </button>
            </div>

            {error && (
              <div className="mb-4 rounded bg-red-50 p-3 text-sm text-red-700 border border-red-200">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {fields.map((field) => {
                const kind = field.kind || "input";
                return (
                  <div key={field.name} className="flex flex-col gap-1 text-sm">
                    <label className="font-medium text-gray-700">{field.label}</label>
                    {kind === "select" ? (
                      <select
                        name={field.name}
                        defaultValue={field.value ?? ""}
                        required={field.required}
                        className="rounded border border-gray-300 px-3 py-2 bg-white"
                      >
                        {field.options?.map((opt) => (
                          <option key={opt.value} value={opt.value}>
                            {opt.label}
                          </option>
                        ))}
                      </select>
                    ) : kind === "textarea" ? (
                      <textarea
                        name={field.name}
                        defaultValue={field.value ?? ""}
                        required={field.required}
                        className="rounded border border-gray-300 px-3 py-2"
                        rows={3}
                      />
                    ) : (
                      <input
                        name={field.name}
                        type={field.type || "text"}
                        step={field.step}
                        defaultValue={field.value ?? ""}
                        required={field.required}
                        className="rounded border border-gray-300 px-3 py-2"
                      />
                    )}
                  </div>
                );
              })}

              <div className="sm:col-span-2 flex justify-end gap-2 pt-4 border-t mt-2">
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="rounded border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 cursor-pointer"
                >
                  Cancelar
                </button>
                <Button type="submit" disabled={loading}>
                  {loading ? "Salvando..." : "Salvar alterações"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}