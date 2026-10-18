export interface GrupoChecklist {
  comodo: string;
  itens: string[];
}

// Checklist padrão de vistoria — inserido automaticamente ao criar uma vistoria.
// O estado inicial de cada item usa o padrão do banco ("bom") e pode ser ajustado
// item a item na página de detalhes da vistoria.
export const CHECKLIST_PADRAO: GrupoChecklist[] = [
  {
    comodo: "Sala",
    itens: [
      "Piso",
      "Paredes e pintura",
      "Teto",
      "Portas",
      "Janelas",
      "Tomadas e interruptores",
      "Luminárias",
      "Ponto de ar-condicionado",
    ],
  },
  {
    comodo: "Cozinha",
    itens: [
      "Piso",
      "Paredes e azulejos",
      "Teto",
      "Pia e bancada",
      "Armários",
      "Ponto de fogão",
      "Ponto de geladeira",
      "Instalação hidráulica",
      "Instalação elétrica",
    ],
  },
  {
    comodo: "Quartos",
    itens: [
      "Piso",
      "Paredes e pintura",
      "Teto",
      "Portas",
      "Janelas",
      "Tomadas",
      "Guarda-roupa embutido",
    ],
  },
  {
    comodo: "Banheiros",
    itens: [
      "Piso",
      "Azulejos",
      "Teto",
      "Vaso sanitário",
      "Louça da pia",
      "Chuveiro",
      "Torneiras e registros",
      "Espelho e armário",
    ],
  },
  {
    comodo: "Área externa",
    itens: [
      "Piso",
      "Portão",
      "Paredes e muros",
      "Cobertura",
      "Fechaduras",
    ],
  },
  {
    comodo: "Geral",
    itens: [
      "Hidrômetro",
      "Relógio de energia",
      "Interfone",
      "Chaves entregues",
    ],
  },
];
