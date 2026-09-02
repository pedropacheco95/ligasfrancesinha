import regulamentoJson from "@/data/regulamento.json";

/**
 * The league's rulebook, reconstructed from seven years of the WhatsApp group
 * and versioned in `src/data/regulamento.json`. It is deliberately a flat file
 * rather than a table: rules change once or twice a season, always after a
 * poll, and a commit is the cheapest way to keep the decision and its date
 * together.
 *
 * To record a decision: edit the JSON, move the point out of `pontos`, and set
 * the rule's `estado`. The commit is the minute of the vote.
 */

/** How settled a rule is. Drives the badge next to it on `/regulamento`. */
export type EstadoRegra = "vigor" | "pendente" | "contestada" | "proposta" | "dormente";

/** Which round an open point belongs to. */
export type Balde = "decidido" | "votar" | "proposta";

export interface Citacao {
  texto: string;
  autor: string;
  data: string;
}

export interface Verificacao {
  titulo: string;
  texto: string;
}

/**
 * The result of the poll that settled a rule. Only the count and the date are
 * kept: the names live in the sondagem itself, which stays in the group, and
 * votes about people are run anonymously.
 */
export interface Votacao {
  data: string;
  pergunta: string;
  resultado: { opcao: string; votos: number }[];
}

export interface Regra {
  id: string;
  titulo: string;
  detalhe: string;
  estado: EstadoRegra;
  citacoes: Citacao[];
  verificacao?: Verificacao;
  /** Present when the rule was settled by a poll we have the tally for. */
  votacao?: Votacao;
}

export interface Artigo {
  id: string;
  numero: number;
  titulo: string;
  nota: string;
  regras: Regra[];
}

export interface Ponto {
  id: string;
  balde: Balde;
  titulo: string;
  contexto: string;
  regrasAfetadas: string[];
  /** Present on `balde: "votar"` — the options that go on the WhatsApp poll. */
  opcoes?: string[];
  /** Present on `balde: "votar"` — poll text, ready to paste into the group. */
  sondagem?: string;
  /** Present on `balde: "decidido"` — what is left to do, since the vote happened. */
  accao?: string;
  /** Anything the person running the poll needs to know before opening it. */
  nota?: string;
}

export interface Regulamento {
  versao: string;
  notaMetodo: string;
  artigos: Artigo[];
  pontos: Ponto[];
}

export const regulamento = regulamentoJson as Regulamento;

export const ESTADO_LABEL: Record<EstadoRegra, string> = {
  vigor: "Em vigor",
  pendente: "Votada · por implementar",
  contestada: "Contestada",
  proposta: "Proposta",
  dormente: "Dormente",
};

export const BALDE_LABEL: Record<Balde, string> = {
  decidido: "Já decidido",
  votar: "Votar agora",
  proposta: "Precisa de proposta",
};

export const BALDE_NOTA: Record<Balde, string> = {
  decidido: "Já foi a votos e ganhou. Falta escrever e implementar — não se vota outra vez.",
  votar: "Binários, não precisam de proposta prévia. Uma sondagem no grupo por cada um.",
  proposta: "Precisam de uma ideia concreta antes de poderem ir a votos. Segunda ronda.",
};

/** The rules of one article, or all of them, matching an `estado`. */
export function regrasPorEstado(estado: EstadoRegra): Regra[] {
  return regulamento.artigos.flatMap((artigo) =>
    artigo.regras.filter((regra) => regra.estado === estado),
  );
}

export function pontosDoBalde(balde: Balde): Ponto[] {
  return regulamento.pontos.filter((ponto) => ponto.balde === balde);
}

export function totalRegras(): number {
  return regulamento.artigos.reduce((total, artigo) => total + artigo.regras.length, 0);
}
