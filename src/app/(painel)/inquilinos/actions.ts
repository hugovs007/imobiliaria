'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function buscarInquilinos() {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('inquilinos')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Erro ao buscar inquilinos:', error.message)
    return []
  }

  return data || []
}

export async function criarInquilino(formData: FormData): Promise<{ error: string | null }> {
  try {
    const supabase = await createClient()

    const payload = {
      nome: formData.get('nome') as string,
      cpf_cnpj: (formData.get('cpf_cnpj') as string) || null,
      telefone: (formData.get('telefone') as string) || null,
      email: (formData.get('email') as string) || null,
      observacoes: (formData.get('observacoes') as string) || null,
    }

    const { error } = await supabase.from('inquilinos').insert([payload])

    if (error) {
      console.error('Erro ao cadastrar inquilino:', error.message)
      return { error: error.message }
    }

    revalidatePath('/inquilinos')
    return { error: null }
  } catch (err) {
    console.error('Erro na action criarInquilino:', err)
    return { error: err instanceof Error ? err.message : 'Erro ao cadastrar inquilino.' }
  }
}