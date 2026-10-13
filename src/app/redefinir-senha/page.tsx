import { Suspense } from "react";
import { RedefinirSenhaForm } from "./RedefinirSenhaForm";

export default function RedefinirSenhaPage() {
  return (
    <Suspense fallback={<div className="flex min-h-screen items-center justify-center px-4">Carregando...</div>}>
      <RedefinirSenhaForm />
    </Suspense>
  );
}
        </form>

        <p className="mt-6 text-center text-sm" style={{ color: "var(--color-ink-soft)" }}>
          <a
            href="/login"
            className="underline hover:no-underline"
            style={{ color: "var(--color-teal)" }}
          >
            Voltar para o login
          </a>
        </p>
      </div>
    </div>
  );
}