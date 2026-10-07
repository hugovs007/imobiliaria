// Reajuste Strategy Pattern - Main Export
export type {
  // Types
  ReajusteInput,
  ReajusteResult,
  CalcularReajusteParams,

  // Interface
  ReajusteStrategy,
} from './reajuste-strategy';

export {
  // Concrete Strategies
  IgpmReajusteStrategy,
  IpcaReajusteStrategy,
  OutroReajusteStrategy,

  // Factory & Service
  ReajusteStrategyFactory,
  ReajusteService,
} from './reajuste-strategy';