// Strategy Pattern - Rent Adjustment (Reajuste) Calculation
// Each index type (IGP-M, IPCA, Outro) has its own calculation strategy

// ============================================
// 1. DOMAIN TYPES
// ============================================

export interface ReajusteInput {
  valorAtual: number;           // Current rent value
  indice: 'IGP-M' | 'IPCA' | 'Outro';  // Index type from contract
  taxaIndice: number;           // Accumulated 12-month variation (e.g., 0.0456 = 4.56%)
  dataReajuste: Date;           // Adjustment date
  periodicidadeMeses: number;   // Adjustment periodicity (usually 12)
  dataInicioContrato: Date;     // Contract start date
  valorMinimo?: number;         // Optional minimum value (floor)
  valorMaximo?: number;         // Optional maximum value (ceiling)
  arredondarPara?: number;      // Optional rounding (e.g., 5 = round to nearest 5)
}

export interface ReajusteResult {
  valorAnterior: number;
  valorNovo: number;
  taxaAplicada: number;         // The rate actually applied
  indice: 'IGP-M' | 'IPCA' | 'Outro';
  detalhes: string;             // Human-readable explanation
  avisos?: string[];            // Warnings (e.g., "Valor arredondado para múltiplo de 5")
}

// ============================================
// 2. STRATEGY INTERFACE
// ============================================

export interface ReajusteStrategy {
  /**
   * Calculate the new rent value based on the index variation
   */
  calcular(input: ReajusteInput): ReajusteResult;

  /**
   * Get the strategy identifier
   */
  getIndice(): 'IGP-M' | 'IPCA' | 'Outro';

  /**
   * Get human-readable name
   */
  getNome(): string;

  /**
   * Validate if the input is valid for this strategy
   */
  validar(input: ReajusteInput): { valido: boolean; erros: string[] };
}

// ============================================
// 3. BASE STRATEGY (Shared logic)
// ============================================

abstract class BaseReajusteStrategy implements ReajusteStrategy {
  abstract getIndice(): 'IGP-M' | 'IPCA' | 'Outro';
  abstract getNome(): string;

  calcular(input: ReajusteInput): ReajusteResult {
    const validacao = this.validar(input);
    if (!validacao.valido) {
      throw new Error(`Validação falhou para ${this.getNome()}: ${validacao.erros.join(', ')}`);
    }

    // Core calculation: valor_novo = valor_atual * (1 + taxa_indice)
    const taxaAplicada = this.calcularTaxaAplicada(input);
    let valorNovo = input.valorAtual * (1 + taxaAplicada);

    const avisos: string[] = [];

    // Apply minimum/maximum constraints
    if (input.valorMinimo !== undefined && valorNovo < input.valorMinimo) {
      valorNovo = input.valorMinimo;
      avisos.push(`Valor ajustado para o mínimo permitido: R$ ${valorNovo.toFixed(2)}`);
    }
    if (input.valorMaximo !== undefined && valorNovo > input.valorMaximo) {
      valorNovo = input.valorMaximo;
      avisos.push(`Valor ajustado para o máximo permitido: R$ ${valorNovo.toFixed(2)}`);
    }

    // Apply rounding if specified (e.g., round to nearest 5 reais)
    if (input.arredondarPara && input.arredondarPara > 0) {
      const antes = valorNovo;
      valorNovo = Math.round(valorNovo / input.arredondarPara) * input.arredondarPara;
      if (antes !== valorNovo) {
        avisos.push(`Valor arredondado para múltiplo de ${input.arredondarPara}: R$ ${antes.toFixed(2)} → R$ ${valorNovo.toFixed(2)}`);
      }
    }

    return {
      valorAnterior: input.valorAtual,
      valorNovo: Number(valorNovo.toFixed(2)),
      taxaAplicada: Number(taxaAplicada.toFixed(6)),
      indice: this.getIndice(),
      detalhes: this.gerarDetalhes(input, taxaAplicada, valorNovo),
      avisos: avisos.length > 0 ? avisos : undefined,
    };
  }

  /**
   * Each strategy can override how the rate is applied
   * Default: direct application of the 12-month accumulated rate
   */
  protected calcularTaxaAplicada(input: ReajusteInput): number {
    return input.taxaIndice;
  }

  /**
   * Generate human-readable explanation
   */
  protected gerarDetalhes(input: ReajusteInput, taxaAplicada: number, valorNovo: number): string {
    const percentual = (taxaAplicada * 100).toFixed(2);
    return (
      `Reajuste pelo ${this.getNome()} (${input.indice}). ` +
      `Taxa acumulada 12 meses: ${percentual}%. ` +
      `Cálculo: R$ ${input.valorAtual.toFixed(2)} × (1 + ${taxaAplicada.toFixed(6)}) = R$ ${valorNovo.toFixed(2)}. ` +
      `Data do reajuste: ${input.dataReajuste.toLocaleDateString('pt-BR')}.`
    );
  }

  validar(input: ReajusteInput): { valido: boolean; erros: string[] } {
    const erros: string[] = [];

    if (input.valorAtual <= 0) {
      erros.push('Valor atual do aluguel deve ser maior que zero');
    }
    if (input.taxaIndice < -1) {
      erros.push('Taxa do índice não pode ser menor que -100%');
    }
    if (input.periodicidadeMeses <= 0) {
      erros.push('Periodicidade deve ser maior que zero');
    }
    if (input.dataReajuste < input.dataInicioContrato) {
      erros.push('Data do reajuste não pode ser anterior ao início do contrato');
    }

    return { valido: erros.length === 0, erros };
  }
}

// ============================================
// 4. CONCRETE STRATEGIES
// ============================================

/**
 * IGP-M Strategy - General Market Price Index
 * Most common for residential rentals in Brazil
 * Applies the full accumulated 12-month variation
 */
export class IgpmReajusteStrategy extends BaseReajusteStrategy {
  getIndice(): 'IGP-M' { return 'IGP-M'; }
  getNome(): string { return 'IGP-M (Índice Geral de Preços - Mercado)'; }

  protected calcularTaxaAplicada(input: ReajusteInput): number {
    // IGP-M applies the full accumulated rate
    // Can add specific IGP-M rules here if needed (e.g., caps, floors)
    return input.taxaIndice;
  }

  protected gerarDetalhes(input: ReajusteInput, taxaAplicada: number, valorNovo: number): string {
    const percentual = (taxaAplicada * 100).toFixed(2);
    return (
      `Reajuste pelo ${this.getNome()}. ` +
      `Variação acumulada 12 meses (FGV/IBRE): ${percentual}%. ` +
      `Fórmula: Valor Atual × (1 + Taxa) = R$ ${input.valorAtual.toFixed(2)} × ${(1 + taxaAplicada).toFixed(6)} = R$ ${valorNovo.toFixed(2)}. ` +
      `Referência: ${input.dataReajuste.toLocaleDateString('pt-BR')}.`
    );
  }
}

/**
 * IPCA Strategy - Broad Consumer Price Index
 * Official inflation index, often used as alternative
 * Applies the full accumulated 12-month variation
 */
export class IpcaReajusteStrategy extends BaseReajusteStrategy {
  getIndice(): 'IPCA' { return 'IPCA'; }
  getNome(): string { return 'IPCA (Índice Nacional de Preços ao Consumidor Amplo)'; }

  protected calcularTaxaAplicada(input: ReajusteInput): number {
    // IPCA applies the full accumulated rate
    return input.taxaIndice;
  }

  protected gerarDetalhes(input: ReajusteInput, taxaAplicada: number, valorNovo: number): string {
    const percentual = (taxaAplicada * 100).toFixed(2);
    return (
      `Reajuste pelo ${this.getNome()}. ` +
      `Variação acumulada 12 meses (IBGE): ${percentual}%. ` +
      `Fórmula: Valor Atual × (1 + Taxa) = R$ ${input.valorAtual.toFixed(2)} × ${(1 + taxaAplicada).toFixed(6)} = R$ ${valorNovo.toFixed(2)}. ` +
      `Referência: ${input.dataReajuste.toLocaleDateString('pt-BR')}.`
    );
  }
}

/**
 * Custom/Other Index Strategy
 * For contracts that specify a custom index or fixed percentage
 * Allows for more flexible calculation rules
 */
export class OutroReajusteStrategy extends BaseReajusteStrategy {
  getIndice(): 'Outro' { return 'Outro'; }
  getNome(): string { return 'Índice Personalizado / Outro'; }

  protected calcularTaxaAplicada(input: ReajusteInput): number {
    // For "Outro", the taxaIndice might be a fixed percentage agreed in contract
    // or a different index variation. We apply it directly.
    return input.taxaIndice;
  }

  protected gerarDetalhes(input: ReajusteInput, taxaAplicada: number, valorNovo: number): string {
    const percentual = (taxaAplicada * 100).toFixed(2);
    return (
      `Reajuste por ${this.getNome()}. ` +
      `Taxa acordada/calculada: ${percentual}%. ` +
      `Fórmula: Valor Atual × (1 + Taxa) = R$ ${input.valorAtual.toFixed(2)} × ${(1 + taxaAplicada).toFixed(6)} = R$ ${valorNovo.toFixed(2)}. ` +
      `Referência: ${input.dataReajuste.toLocaleDateString('pt-BR')}.`
    );
  }

  validar(input: ReajusteInput): { valido: boolean; erros: string[] } {
    const base = super.validar(input);
    // Additional validation for custom indices
    if (input.taxaIndice > 1) { // > 100%
      base.erros.push('Taxa para índice personalizado parece alta (>100%), verifique se está em decimal (ex: 0.05 para 5%)');
    }
    return base;
  }
}

// ============================================
// 5. STRATEGY FACTORY / REGISTRY
// ============================================

export class ReajusteStrategyFactory {
  private static strategies: Map<'IGP-M' | 'IPCA' | 'Outro', ReajusteStrategy> = new Map<
    'IGP-M' | 'IPCA' | 'Outro',
    ReajusteStrategy
  >([
    ['IGP-M', new IgpmReajusteStrategy()],
    ['IPCA', new IpcaReajusteStrategy()],
    ['Outro', new OutroReajusteStrategy()],
  ]);

  static getStrategy(indice: 'IGP-M' | 'IPCA' | 'Outro'): ReajusteStrategy {
    const strategy = this.strategies.get(indice);
    if (!strategy) {
      throw new Error(`Estratégia de reajuste não encontrada para índice: ${indice}`);
    }
    return strategy;
  }

  static registerStrategy(indice: 'IGP-M' | 'IPCA' | 'Outro', strategy: ReajusteStrategy): void {
    this.strategies.set(indice, strategy);
  }

  static getAvailableIndices(): string[] {
    return Array.from(this.strategies.keys());
  }
}

// ============================================
// 6. MAIN SERVICE (Context)
// ============================================

export interface CalcularReajusteParams {
  contratoId: string;
  valorAtual: number;
  indice: 'IGP-M' | 'IPCA' | 'Outro';
  taxaIndice: number;           // e.g., 0.0456 for 4.56%
  dataReajuste: Date;
  periodicidadeMeses: number;
  dataInicioContrato: Date;
  valorMinimo?: number;
  valorMaximo?: number;
  arredondarPara?: number;      // e.g., 5 to round to nearest 5 reais
}

export class ReajusteService {
  /**
   * Calculate rent adjustment using the appropriate strategy
   */
  static calcular(params: CalcularReajusteParams): ReajusteResult {
    const strategy = ReajusteStrategyFactory.getStrategy(params.indice);

    const input: ReajusteInput = {
      valorAtual: params.valorAtual,
      indice: params.indice,
      taxaIndice: params.taxaIndice,
      dataReajuste: params.dataReajuste,
      periodicidadeMeses: params.periodicidadeMeses,
      dataInicioContrato: params.dataInicioContrato,
      valorMinimo: params.valorMinimo,
      valorMaximo: params.valorMaximo,
      arredondarPara: params.arredondarPara,
    };

    return strategy.calcular(input);
  }

  /**
   * Calculate and return all available strategies for comparison
   */
  static calcularTodasOpcoes(params: Omit<CalcularReajusteParams, 'indice'>): ReajusteResult[] {
    const resultados: ReajusteResult[] = [];

    for (const indice of ReajusteStrategyFactory.getAvailableIndices()) {
      try {
        const strategy = ReajusteStrategyFactory.getStrategy(indice as 'IGP-M' | 'IPCA' | 'Outro');
        const input: ReajusteInput = {
          valorAtual: params.valorAtual,
          indice: indice as 'IGP-M' | 'IPCA' | 'Outro',
          taxaIndice: params.taxaIndice,
          dataReajuste: params.dataReajuste,
          periodicidadeMeses: params.periodicidadeMeses,
          dataInicioContrato: params.dataInicioContrato,
          valorMinimo: params.valorMinimo,
          valorMaximo: params.valorMaximo,
          arredondarPara: params.arredondarPara,
        };
        resultados.push(strategy.calcular(input));
      } catch (error) {
        resultados.push({
          valorAnterior: params.valorAtual,
          valorNovo: params.valorAtual,
          taxaAplicada: 0,
          indice: indice as 'IGP-M' | 'IPCA' | 'Outro',
          detalhes: `Erro: ${error instanceof Error ? error.message : 'Erro desconhecido'}`,
        });
      }
    }

    return resultados;
  }
}

// ============================================
// 7. USAGE EXAMPLES
// ============================================

/*
// Example 1: Calculate reajuste for a specific contract
const resultado = ReajusteService.calcular({
  contratoId: 'uuid-do-contrato',
  valorAtual: 1500.00,
  indice: 'IGP-M',
  taxaIndice: 0.0456, // 4.56% accumulated 12 months
  dataReajuste: new Date('2025-01-01'),
  periodicidadeMeses: 12,
  dataInicioContrato: new Date('2024-01-01'),
  arredondarPara: 5, // Round to nearest 5 reais (common practice)
});

console.log(resultado);
// {
//   valorAnterior: 1500,
//   valorNovo: 1570,  // 1500 * 1.0456 = 1568.4 → rounded to 1570
//   taxaAplicada: 0.0456,
//   indice: 'IGP-M',
//   detalhes: 'Reajuste pelo IGP-M...',
//   avisos: ['Valor arredondado para múltiplo de 5: R$ 1568.40 → R$ 1570.00']
// }

// Example 2: Compare all indices for decision making
const opcoes = ReajusteService.calcularTodasOpcoes({
  valorAtual: 1500.00,
  taxaIndice: 0.0456,
  dataReajuste: new Date('2025-01-01'),
  periodicidadeMeses: 12,
  dataInicioContrato: new Date('2024-01-01'),
  arredondarPara: 5,
});

console.table(opcoes);
// Compare IGP-M vs IPCA vs Outro side by side

// Example 3: Add a new custom strategy (Open/Closed Principle)
// Without modifying existing code!
class IndiceContratoFixoStrategy extends BaseReajusteStrategy {
  getIndice(): 'Outro' { return 'Outro'; }
  getNome(): string { return 'Percentual Fixo Contratual (3% a.a.)'; }
  
  protected calcularTaxaAplicada(input: ReajusteInput): number {
    return 0.03; // Fixed 3% per year regardless of market index
  }
}

// Register at runtime
ReajusteStrategyFactory.registerStrategy('Outro', new IndiceContratoFixoStrategy());
*/

// ============================================
// BENEFITS FOR THIS SYSTEM:
// ============================================
// ✅ Open/Closed: Add new index types (e.g., INPC, IGP-DI) without touching existing code
// ✅ Testability: Test each index calculation in isolation with unit tests
// ✅ Separation of Concerns: Calculation logic separated from database/persistence
// ✅ Flexibility: Different rounding rules, caps, floors per index type
// ✅ Audit Trail: Each calculation returns detailed explanation for contracts
// ✅ Comparison: Easy to simulate "what if" scenarios for tenants/landlords