'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function criarOcorrencia(formData: FormData): Promise<{ error: string | null }> {
  try {
    const supabase = await createClient()

    const contratoRaw = formData.get('contrato_id') as string
    const contrato_id = contratoRaw && contratoRaw.trim() !== '' ? contratoRaw : null
    const imovelRaw = formData.get('imovel_id') as string
    const imovel_id = imovelRaw && imovelRaw.trim() !== '' ? imovelRaw : null

    const payload = {
      contrato_id,
      imovel_id,
      tipo: (formData.get('tipo') as string) || 'outro',
      gravidade: (formData.get('gravidade') as string) || 'media',
      status: (formData.get('status') as string) || 'aberta',
      descricao: formData.get('descricao') as string,
      data_ocorrencia: (formData.get('data_ocorrencia') as string) || null,
    }

    if (!payload.descricao || payload.descricao.trim() === '') {
      return { error: 'A descrição da ocorrência é obrigatória.' }
    }

    const { error } = await supabase.from('ocorrencias').insert([payload])

    if (error) {
      console.error('Erro ao registrar ocorrência:', error.message)
      return { error: error.message }
    }

    revalidatePath('/ocorrencias')
    return { error: null }
  } catch (err) {
    console.error('Erro na action criarOcorrencia:', err)
    return { error: err instanceof Error ? err.message : 'Erro ao registrar ocorrência.' }
  }
}

export async function atualizarStatusOcorrencia(formData: FormData): Promise<void> {
  try {
    const supabase = await createClient()

    const id = formData.get('id') as string
    const status = formData.get('status') as string

    if (!id || !status) {
      console.error('Dados incompletos para atualizar a ocorrência.')
      return
    }

    const payload: Record<string, unknown> = { status }

    if (status === 'resolvida') {
      payload.resolvida_em = new Date().toISOString().slice(0, 10)
    }

    const { error } = await supabase.from('ocorrencias').update(payload).eq('id', id)

    if (error) {
      console.error('Erro ao atualizar ocorrência:', error.message)
      return
    }

    revalidatePath('/ocorrencias')
  } catch (err) {
    console.error('Erro na action atualizarStatusOcorrencia:', err)
  }
}

export async function excluirOcorrencia(formData: FormData): Promise<void> {
  try {
    const supabase = await createClient()

    const id = formData.get('id') as string

    if (!id) {
      console.error('ID da ocorrência não informado.')
      return
    }

    const { error } = await supabase.from('ocorrencias').delete().eq('id', id)

    if (error) {
      console.error('Erro ao excluir ocorrência:', error.message)
      return
    }

    revalidatePath('/ocorrencias')
  } catch (err) {
    console.error('Erro na action excluirOcorrencia:', err)
  }
}
