import { Suspense } from "react";
import { RedefinirSenhaForm } from "./RedefinirSenhaForm";

export default function RedefinirSenhaPage() {
  return (
    <Suspense fallback={<div className="flex min-h-screen items-center justify-center px-4">Carregando...</div>}>
      <RedefinirSenhaForm />
    </Suspense>
  );
}