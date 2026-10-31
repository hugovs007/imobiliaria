export function formatarData(valor: string | null | undefined) {
  if (!valor) return "—";
  const [ano, mes, dia] = valor.split("-");
  if (!ano || !mes || !dia) return valor;
  return `${dia}/${mes}/${ano}`;
}

export function formatarCompetencia(valor: string | null | undefined) {
  if (!valor) return "—";
  const [ano, mes] = valor.split("-");
  if (!ano || !mes) return valor;
  return `${mes}/${ano}`;
}

export function rotuloImovel(imovel: any) {
  if (!imovel) return "—";
  const partes = [
    imovel.logradouro,
    imovel.numero,
    imovel.bairro,
  ].filter(Boolean);
  return partes.length > 0 ? partes.join(", ") : imovel.codigo || "—";
}