'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function criarIptu(formData: FormData): Promise<{ error: string | null }> {
  try {
    const supabase = await createClient()

    const imovelRaw = formData.get('imovel_id') as string
    const imovel_id = imovelRaw && imovelRaw.trim() !== '' ? imovelRaw : null

    if (!imovel_id) {
      return { error: 'Imóvel é obrigatório' }
    }

    const ano = parseInt(formData.get('ano') as string)
    const parcela = parseInt(formData.get('parcela') as string) || 1
    const total_parcelas = parseInt(formData.get('total_parcelas') as string) || 1
    const valor_total = parseFloat(formData.get('valor_total') as string) || 0
    const valor_parcela = parseFloat(formData.get('valor_parcela') as string) || 0
    const data_vencimento = formData.get('data_vencimento') as string
    const data_pagamento = formData.get('data_pagamento') as string
    const valor_pago = parseFloat(formData.get('valor_pago') as string) || 0
    const desconto = parseFloat(formData.get('desconto') as string) || 0
    const multa_juros = parseFloat(formData.get('multa_juros') as string) || 0
    const status = formData.get('status') as string || 'pendente'
    const forma_pagamento = formData.get('forma_pagamento') as string || null
    const comprovante_url = formData.get('comprovante_url') as string || null
    const observacoes = formData.get('observacoes') as string || null

    if (!ano || ano < 2000 || ano > 2100) {
      return { error: 'Ano inválido' }
    }

    if (total_parcelas < 1) {
      return { error: 'Total de parcelas deve ser maior que zero' }
    }

    if (valor_total <= 0) {
      return { error: 'Valor total deve ser maior que zero' }
    }

    if (!data_vencimento) {
      return { error: 'Data de vencimento é obrigatória' }
    }

    const payload = {
      imovel_id,
      ano,
      parcela,
      total_parcelas,
      valor_total,
      valor_parcela,
      data_vencimento,
      data_pagamento: data_pagamento || null,
      valor_pago,
      desconto,
      multa_juros,
      status,
      forma_pagamento,
      comprovante_url,
      observacoes: formData.get('observacoes') as string || null,
    }

    const { data: iptu, error } = await supabase.from('iptu').insert([payload]).select().single()

    if (error) {
      console.error('Erro ao cadastrar IPTU:', error.message)
      return { error: error.message }
    }

    revalidatePath('/iptu')
    return { error: null }
  } catch (err) {
    console.error('Erro na action criarIptu:', err)
    return { error: err instanceof Error ? err.message : 'Erro ao cadastrar IPTU.' }
  }
}

export async function atualizarIptu(formData: FormData): Promise<{ error: string | null }> {
  try {
    const supabase = await createClient()

    const id = formData.get('id') as string
    if (!id) {
      return { error: 'ID do IPTU é obrigatório' }
    }

    const data_pagamento = formData.get('data_pagamento') as string
    const valor_pago = parseFloat(formData.get('valor_pago') as string) || 0
    const desconto = parseFloat(formData.get('desconto') as string) || 0
    const multa_juros = parseFloat(formData.get('multa_juros') as string) || 0
    const status = formData.get('status') as string || 'pendente'
    const forma_pagamento = formData.get('forma_pagamento') as string || null
    const comprovante_url = formData.get('comprovante_url') as string || null
    const observacoes = formData.get('observacoes') as string || null

    const payload: any = {
      updated_at: new Date().toISOString(),
    }

    if (data_pagamento) payload.data_pagamento = data_pagamento
    if (valor_pago > 0) payload.valor_pago = valor_pago
    if (desconto > 0) payload.desconto = desconto
    if (multa_juros > 0) payload.multa_juros = multa_juros
    if (status) payload.status = status
    if (forma_pagamento) payload.forma_pagamento = forma_pagamento
    if (comprovante_url) payload.comprovante_url = comprovante_url
    if (observacoes) payload.observacoes = formData.get('observacoes') as string || null

    // Se status for pago e não tiver data_pagamento, usar hoje
    if (status === 'pago' && !formData.get('data_pagamento')) {
      const hoje = new Date().toISOString().split('T')[0]
      payload.data_pagamento = hoje
    }

    const { error } = await supabase.from('iptu').update(payload).eq('id', id)

    if (error) {
      console.error('Erro ao atualizar IPTU:', error.message)
      return { error: error.message }
    }

    revalidatePath('/iptu')
    return { error: null }
  } catch (err) {
    console.error('Erro na action atualizarIptu:', err)
    return { error: err instanceof Error ? err.message : 'Erro ao atualizar IPTU.' }
  }
}

export async function excluirIptu(formData: FormData): Promise<{ error: string | null }> {
  try {
    const supabase = await createClient()

    const id = formData.get('id') as string
    if (!id) {
      return { error: 'ID do IPTU é obrigatório' }
    }

    const { error } = await supabase.from('iptu').delete().eq('id', id)

    if (error) {
      console.error('Erro ao excluir IPTU:', error.message)
      return { error: error.message }
    }

    revalidatePath('/iptu')
    return { error: null }
  } catch (err) {
    console.error('Erro na action excluirIptu:', err)
    return { error: err instanceof Error ? err.message : 'Erro ao excluir IPTU.' }
  }
}

export async function gerarIptuAnual(formData: FormData): Promise<{ error: string | null }> {
  try {
    const supabase = await createClient()

    const imovel_id = formData.get('imovel_id') as string
    const ano = parseInt(formData.get('ano') as string)
    const total_parcelas = parseInt(formData.get('total_parcelas') as string) || 1
    const valor_total = parseFloat(formData.get('valor_total') as string) || 0
    const data_primeiro_vencimento = formData.get('data_primeiro_vencimento') as string

    if (!imovel_id) {
      return { error: 'Imóvel é obrigatório' }
    }

    if (!ano || ano < 2000 || ano > 2100) {
      return { error: 'Ano inválido' }
    }

    if (total_parcelas < 1) {
      return { error: 'Total de parcelas deve ser maior que zero' }
    }

    if (valor_total <= 0) {
      return { error: 'Valor total deve ser maior que zero' }
    }

    if (!data_primeiro_vencimento) {
      return { error: 'Data do primeiro vencimento é obrigatória' }
    }

    const { error } = await supabase.rpc('gerar_iptu_anual', {
      p_imovel_id: imovel_id,
      p_ano: ano,
      p_total_parcelas: total_parcelas,
      p_valor_total: valor_total,
      p_data_primeiro_vencimento: data_primeiro_vencimento,
    })

    if (error) {
      console.error('Erro ao gerar IPTU anual:', error.message)
      return { error: error.message }
    }

    revalidatePath('/iptu')
    return { error: null }
  } catch (err) {
    console.error('Erro na action gerarIptuAnual:', err)
    return { error: err instanceof Error ? err.message : 'Erro ao gerar IPTU anual.' }
  }
}