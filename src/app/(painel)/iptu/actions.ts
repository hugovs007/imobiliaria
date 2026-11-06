'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { uploadParaS3, removerDoS3, removerMultiplosDoS3 } from '@/lib/aws/s3'

async function uploadComprovante(iptuId: string, arquivo: File): Promise<string | null> {
  if (!arquivo || arquivo.size === 0) return null

  const resultado = await uploadParaS3('iptu', iptuId, arquivo)
  return resultado.url // Retorna URL presigned (1 hora)
}

async function removerComprovanteAnterior(iptuId: string) {
  // Busca arquivos anteriores vinculados a este IPTU na tabela arquivos (para limpar metadados)
  const supabase = await createClient()
  const { data: arquivosAnteriores } = await supabase
    .from('arquivos')
    .select('path_ou_url')
    .eq('entidade_tipo', 'iptu')
    .eq('entidade_id', iptuId)

  if (arquivosAnteriores && arquivosAnteriores.length > 0) {
    const paths = arquivosAnteriores.map((a: any) => a.path_ou_url)
    // Remove do AWS S3
    await removerMultiplosDoS3(paths)
    // Remove da tabela arquivos (metadados)
    await supabase.from('arquivos').delete().eq('entidade_tipo', 'iptu').eq('entidade_id', iptuId)
  }
}

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
    const comprovante_file = formData.get('comprovante_file') as File | null

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

        // Verifica se já existe parcela para este imóvel/ano/parcela
        const { data: existente } = await supabase
          .from('iptu')
          .select('id')
          .eq('imovel_id', imovel_id)
          .eq('ano', ano)
          .eq('parcela', parcela)
          .maybeSingle()

        if (existente) {
          return { error: `Já existe uma parcela ${parcela} do IPTU ${ano} para este imóvel.` }
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

    // Upload do comprovante se houver arquivo
    if (comprovante_file && comprovante_file.size > 0) {
      try {
            const url = await uploadComprovante(iptu.id, comprovante_file)
            if (url) {
              // Atualiza o IPTU com a URL do comprovante
              await supabase.from('iptu').update({ comprovante_url: url }).eq('id', iptu.id)
        }
      } catch (uploadError) {
        console.error('Erro ao fazer upload do comprovante:', uploadError)
            // Retorna erro para o usuário ver
            return { error: `IPTU criado, mas falha no upload do comprovante: ${uploadError instanceof Error ? uploadError.message : 'Erro desconhecido'}` }
          }
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

    // Busca o registro atual para verificar mudanças de chave única
    const { data: iptuAtual } = await supabase
      .from('iptu')
      .select('imovel_id, ano, parcela')
      .eq('id', id)
      .single()

    if (!iptuAtual) {
      return { error: 'IPTU não encontrado' }
    }

    const novoImovelId = formData.get('imovel_id') as string || iptuAtual.imovel_id
    const novoAno = parseInt(formData.get('ano') as string) || iptuAtual.ano
    const novaParcela = parseInt(formData.get('parcela') as string) || iptuAtual.parcela

    // Se mudou imovel_id, ano ou parcela, verifica duplicata
    if (novoImovelId !== iptuAtual.imovel_id || novoAno !== iptuAtual.ano || novaParcela !== iptuAtual.parcela) {
      const { data: duplicata } = await supabase
        .from('iptu')
        .select('id')
        .eq('imovel_id', novoImovelId)
        .eq('ano', novoAno)
        .eq('parcela', novaParcela)
        .neq('id', id)
        .maybeSingle()

      if (duplicata) {
        return { error: `Já existe uma parcela ${novaParcela} do IPTU ${novoAno} para este imóvel.` }
      }
    }

    const data_pagamento = formData.get('data_pagamento') as string
    const valor_pago = parseFloat(formData.get('valor_pago') as string) || 0
    const desconto = parseFloat(formData.get('desconto') as string) || 0
    const multa_juros = parseFloat(formData.get('multa_juros') as string) || 0
    const status = formData.get('status') as string || 'pendente'
    const forma_pagamento = formData.get('forma_pagamento') as string || null
    const comprovante_url = formData.get('comprovante_url') as string || null
    const observacoes = formData.get('observacoes') as string || null
    const comprovante_file = formData.get('comprovante_file') as File | null
    const remover_comprovante = formData.get('remover_comprovante') === 'true'

    const payload: any = {
      updated_at: new Date().toISOString(),
    }

    // Permite atualizar campos de chave única se não houver duplicata
    if (novoImovelId !== iptuAtual.imovel_id) payload.imovel_id = novoImovelId
    if (novoAno !== iptuAtual.ano) payload.ano = novoAno
    if (novaParcela !== iptuAtual.parcela) payload.parcela = novaParcela

    if (data_pagamento) payload.data_pagamento = data_pagamento
    if (valor_pago > 0) payload.valor_pago = valor_pago
    if (desconto > 0) payload.desconto = desconto
    if (multa_juros > 0) payload.multa_juros = multa_juros
    if (status) payload.status = status
    if (forma_pagamento) payload.forma_pagamento = forma_pagamento
    if (observacoes) payload.observacoes = formData.get('observacoes') as string || null

    // Se status for pago e não tiver data_pagamento, usar hoje
    if (status === 'pago' && !formData.get('data_pagamento')) {
      const hoje = new Date().toISOString().split('T')[0]
      payload.data_pagamento = hoje
    }

    // Handle comprovante
    if (remover_comprovante) {
      // Remove comprovante anterior
          await removerComprovanteAnterior(id)
      payload.comprovante_url = null
    } else if (comprovante_file && comprovante_file.size > 0) {
      // Upload novo comprovante
      try {
        // Remove anterior primeiro
            await removerComprovanteAnterior(id)
            const url = await uploadComprovante(id, comprovante_file)
            if (url) {
              payload.comprovante_url = url
        }
      } catch (uploadError) {
        console.error('Erro ao fazer upload do comprovante:', uploadError)
        return { error: uploadError instanceof Error ? uploadError.message : 'Erro ao fazer upload do comprovante.' }
      }
    } else if (comprovante_url) {
      // Apenas atualiza URL se fornecida (compatibilidade com URL manual)
      payload.comprovante_url = comprovante_url
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