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
 * The result of the poll that settled a rule.
 *
 * These are the votes held before the site ran them, so all we have is the
 * count and the date — WhatsApp kept the names and the export did not. Votes
 * held here record who voted; the exception stays the votes about people,
 * which are run anonymously.
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

export function pontosDoBalde(balde: Balde): Ponto[] {
  return regulamento.pontos.filter((ponto) => ponto.balde === balde);
}

export function totalRegras(): number {
  return regulamento.artigos.reduce((total, artigo) => total + artigo.regras.length, 0);
}

/** Every rule we have the poll result for — what "já está decidido" means. */
export function regrasVotadas(): Regra[] {
  return regulamento.artigos.flatMap((artigo) => artigo.regras.filter((regra) => regra.votacao));
}

/** The rule with this id, for showing what an objection is about. */
export function regraPorId(id: string): Regra | undefined {
  for (const artigo of regulamento.artigos) {
    const regra = artigo.regras.find((r) => r.id === id);
    if (regra) return regra;
  }
  return undefined;
}

/** Total votes per option for one point, in the order the options are listed. */
export function contagem(ponto: Ponto, escolhas: string[]): { opcao: string; votos: number }[] {
  return (ponto.opcoes ?? []).map((opcao) => ({
    opcao,
    votos: escolhas.filter((escolha) => escolha === opcao).length,
  }));
}
