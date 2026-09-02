import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";

import { Layout } from "@/components/Layout";
import {
  BALDE_LABEL,
  BALDE_NOTA,
  ESTADO_LABEL,
  pontosDoBalde,
  regulamento,
  totalRegras,
  type Balde,
  type EstadoRegra,
  type Ponto,
  type Regra,
  type Votacao,
} from "@/lib/regulamento";

export const Route = createFileRoute("/regulamento")({
  head: () => ({ meta: [{ title: "Regulamento — Ligas Francesinha" }] }),
  component: RegulamentoPage,
});

const ESTADO_CLASSE: Record<EstadoRegra, string> = {
  vigor: "tw:bg-primary/10 tw:text-primary",
  pendente: "tw:bg-gold/15 tw:text-foreground",
  contestada: "tw:bg-destructive/10 tw:text-destructive",
  proposta: "tw:bg-muted tw:text-muted-foreground",
  dormente: "tw:bg-muted tw:text-muted-foreground",
};

const BALDES: Balde[] = ["decidido", "votar", "proposta"];

function RegulamentoPage() {
  const contestadas = regulamento.artigos
    .flatMap((artigo) => artigo.regras)
    .filter((regra) => regra.estado === "contestada" || regra.estado === "pendente").length;

  return (
    <Layout>
      <div className="tw:mx-auto tw:w-full tw:max-w-3xl tw:px-5 tw:pt-10 tw:pb-24 tw:text-foreground">
        <header className="tw:border-b-2 tw:border-foreground tw:pb-8">
          <p className="tw:m-0 tw:text-xs tw:tracking-[0.16em] tw:text-primary tw:uppercase">
            Versão {regulamento.versao}
          </p>
          <h1 className="tw:mt-3 tw:mb-0 tw:text-4xl tw:leading-tight tw:font-bold tw:tracking-tight tw:sm:text-5xl">
            Regulamento da Master League
          </h1>
          <p className="tw:mt-4 tw:mb-0 tw:max-w-prose tw:text-base tw:text-muted-foreground">
            {regulamento.notaMetodo}
          </p>

          <dl className="tw:mt-7 tw:mb-0 tw:grid tw:grid-cols-2 tw:gap-x-6 tw:gap-y-4 tw:sm:grid-cols-4">
            <Facto valor={String(totalRegras())} rotulo="regras" />
            <Facto valor={String(regulamento.artigos.length)} rotulo="artigos" />
            <Facto valor={String(contestadas)} rotulo="por resolver" />
            <Facto valor={String(regulamento.pontos.length)} rotulo="pontos em aberto" />
          </dl>
        </header>

        <section className="tw:mt-12" id="pontos">
          <h2 className="tw:mb-1 tw:text-2xl tw:font-bold">Pontos em aberto</h2>
          <p className="tw:mt-0 tw:mb-8 tw:max-w-prose tw:text-sm tw:text-muted-foreground">
            Votação em duas rondas. A sondagem faz-se no grupo, como sempre — esta página só guarda
            o que ficou decidido, porque uma regra votada não é uma regra sabida.
          </p>

          <div className="tw:flex tw:flex-col tw:gap-10">
            {BALDES.map((balde) => {
              const pontos = pontosDoBalde(balde);
              if (pontos.length === 0) return null;
              return (
                <div key={balde}>
                  <div className="tw:flex tw:flex-wrap tw:items-baseline tw:gap-x-3 tw:gap-y-1">
                    <h3 className="tw:m-0 tw:text-lg tw:font-semibold">{BALDE_LABEL[balde]}</h3>
                    <span className="tw:text-xs tw:text-muted-foreground tw:tabular-nums">
                      {pontos.length} {pontos.length === 1 ? "ponto" : "pontos"}
                    </span>
                  </div>
                  <p className="tw:mt-1 tw:mb-4 tw:max-w-prose tw:text-sm tw:text-muted-foreground">
                    {BALDE_NOTA[balde]}
                  </p>
                  <div className="tw:flex tw:flex-col tw:gap-4">
                    {pontos.map((ponto) => (
                      <CartaoPonto key={ponto.id} ponto={ponto} />
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        <section className="tw:mt-16">
          <h2 className="tw:mb-1 tw:text-2xl tw:font-bold">O regulamento</h2>
          <p className="tw:mt-0 tw:mb-2 tw:max-w-prose tw:text-sm tw:text-muted-foreground">
            Cada regra com a data, o autor e a frase em que foi fixada.
          </p>

          {regulamento.artigos.map((artigo) => (
            <article key={artigo.id} id={artigo.id} className="tw:mt-10 tw:scroll-mt-24">
              <div className="tw:flex tw:items-baseline tw:gap-3 tw:border-b tw:border-foreground tw:pb-2">
                <span className="tw:text-xs tw:tracking-[0.08em] tw:text-primary tw:uppercase">
                  Art. {artigo.numero}
                </span>
                <h3 className="tw:m-0 tw:text-xl tw:font-semibold">{artigo.titulo}</h3>
              </div>
              <p className="tw:mt-3 tw:mb-0 tw:max-w-prose tw:text-sm tw:text-muted-foreground">
                {artigo.nota}
              </p>
              <div className="tw:mt-2">
                {artigo.regras.map((regra) => (
                  <LinhaRegra key={regra.id} regra={regra} />
                ))}
              </div>
            </article>
          ))}
        </section>

        <footer className="tw:mt-16 tw:border-t-2 tw:border-foreground tw:pt-6 tw:text-sm tw:text-muted-foreground">
          <p className="tw:mt-0 tw:mb-3">
            <strong className="tw:text-foreground">Como se altera.</strong> Sondagem no grupo, com
            prazo. Ganha a maioria dos que votam; quem não vota conta como abstenção e o empate
            mantém o que estava. Com três ou mais opções, se nenhuma passar de metade faz-se segunda
            ronda entre as duas mais votadas. Depois de fechada, escreve-se aqui a contagem e a data
            — os nomes ficam na sondagem, no grupo — em{" "}
            <code className="tw:rounded tw:bg-muted tw:px-1.5 tw:py-0.5 tw:text-xs">
              src/data/regulamento.json
            </code>{" "}
            e o commit é a ata da votação.
          </p>
          <p className="tw:m-0">
            <strong className="tw:text-foreground">Não existe.</strong> Não há MVP, melhor marcador,
            taça nem qualquer prémio individual além da francesinha.
          </p>
        </footer>
      </div>
    </Layout>
  );
}

function Facto({ valor, rotulo }: { valor: string; rotulo: string }) {
  return (
    <div>
      <dd className="tw:m-0 tw:text-3xl tw:leading-none tw:font-bold tw:tabular-nums">{valor}</dd>
      <dt className="tw:mt-1 tw:text-xs tw:text-muted-foreground">{rotulo}</dt>
    </div>
  );
}

function LinhaRegra({ regra }: { regra: Regra }) {
  return (
    <div className="tw:border-b tw:border-border tw:py-5 tw:last:border-b-0">
      <div className="tw:flex tw:flex-wrap tw:items-start tw:gap-x-4 tw:gap-y-2">
        <span className="tw:w-9 tw:shrink-0 tw:pt-1 tw:text-sm tw:text-muted-foreground tw:tabular-nums">
          {regra.id}
        </span>
        <div className="tw:min-w-0 tw:flex-1 tw:basis-80">
          <h4 className="tw:m-0 tw:text-base tw:leading-snug tw:font-semibold">{regra.titulo}</h4>
          {regra.detalhe ? (
            <p className="tw:mt-1.5 tw:mb-0 tw:max-w-prose tw:text-sm tw:text-muted-foreground">
              {regra.detalhe}
            </p>
          ) : null}
        </div>
        <span
          className={`tw:shrink-0 tw:rounded tw:px-2 tw:py-1 tw:text-[10px] tw:tracking-[0.1em] tw:uppercase ${ESTADO_CLASSE[regra.estado]}`}
        >
          {ESTADO_LABEL[regra.estado]}
        </span>
      </div>

      {regra.citacoes.map((citacao, indice) => (
        <blockquote
          key={indice}
          className="tw:mt-3 tw:mb-0 tw:border-l-2 tw:border-border tw:pl-3.5 tw:sm:ml-13"
        >
          <p className="tw:m-0 tw:text-sm tw:italic">«{citacao.texto}»</p>
          <cite className="tw:mt-1 tw:block tw:text-xs tw:not-italic tw:text-muted-foreground">
            {citacao.autor} · {citacao.data}
          </cite>
        </blockquote>
      ))}

      {regra.votacao ? <BlocoVotacao votacao={regra.votacao} /> : null}

      {regra.verificacao ? (
        <div className="tw:mt-4 tw:rounded tw:border tw:border-border tw:bg-card tw:p-3.5 tw:sm:ml-13">
          <p className="tw:m-0 tw:text-[10px] tw:tracking-[0.12em] tw:text-primary tw:uppercase">
            {regra.verificacao.titulo}
          </p>
          <p className="tw:mt-1.5 tw:mb-0 tw:font-mono tw:text-xs tw:break-words">
            {regra.verificacao.texto}
          </p>
        </div>
      ) : null}
    </div>
  );
}

/**
 * The count and the date, never the voters. The names stay in the sondagem in
 * the group, which is where people already go looking for them; what gets lost
 * is that the vote happened at all, and that is what this puts back.
 */
function BlocoVotacao({ votacao }: { votacao: Votacao }) {
  const total = votacao.resultado.reduce((soma, linha) => soma + linha.votos, 0);

  return (
    <div className="tw:mt-4 tw:sm:ml-13">
      <p className="tw:m-0 tw:text-[10px] tw:tracking-[0.12em] tw:text-primary tw:uppercase">
        {votacao.pergunta} · {votacao.data} · {total} {total === 1 ? "voto" : "votos"}
      </p>
      <ul className="tw:mt-2 tw:mb-0 tw:flex tw:list-none tw:flex-col tw:gap-1.5 tw:pl-0">
        {votacao.resultado.map((linha) => (
          <li
            key={linha.opcao}
            className="tw:grid tw:grid-cols-[1.5rem_1fr] tw:items-center tw:gap-x-3 tw:text-sm"
          >
            <span className="tw:text-right tw:font-semibold tw:tabular-nums">{linha.votos}</span>
            <span className="tw:relative tw:overflow-hidden tw:rounded tw:bg-muted tw:px-2.5 tw:py-1">
              <span
                aria-hidden="true"
                className="tw:absolute tw:inset-y-0 tw:left-0 tw:bg-primary/20"
                style={{ width: total ? `${(linha.votos / total) * 100}%` : "0%" }}
              />
              <span className="tw:relative">{linha.opcao}</span>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function CartaoPonto({ ponto }: { ponto: Ponto }) {
  return (
    <div className="tw:rounded-lg tw:border tw:border-border tw:bg-card tw:p-5">
      <div className="tw:flex tw:flex-wrap tw:items-baseline tw:gap-x-3 tw:gap-y-1">
        <span className="tw:text-xs tw:font-semibold tw:tracking-[0.08em] tw:text-primary">
          {ponto.id}
        </span>
        <h4 className="tw:m-0 tw:text-base tw:font-semibold">{ponto.titulo}</h4>
      </div>

      <p className="tw:mt-2 tw:mb-0 tw:max-w-prose tw:text-sm tw:text-muted-foreground">
        {ponto.contexto}
      </p>

      {ponto.accao ? (
        <p className="tw:mt-3 tw:mb-0 tw:text-sm tw:font-medium">{ponto.accao}</p>
      ) : null}

      {ponto.opcoes ? (
        <ul className="tw:mt-3 tw:mb-0 tw:list-none tw:pl-0">
          {ponto.opcoes.map((opcao) => (
            <li key={opcao} className="tw:flex tw:gap-2.5 tw:py-1 tw:text-sm">
              <span aria-hidden="true" className="tw:text-muted-foreground">
                ○
              </span>
              <span>{opcao}</span>
            </li>
          ))}
        </ul>
      ) : null}

      {ponto.nota ? (
        <p className="tw:mt-3 tw:mb-0 tw:max-w-prose tw:text-xs tw:text-muted-foreground">
          {ponto.nota}
        </p>
      ) : null}

      <div className="tw:mt-4 tw:flex tw:flex-wrap tw:items-center tw:gap-x-4 tw:gap-y-2">
        {ponto.sondagem ? <BotaoCopiar texto={ponto.sondagem} /> : null}
        <span className="tw:text-xs tw:text-muted-foreground">
          Afeta {ponto.regrasAfetadas.join(", ")}
        </span>
      </div>
    </div>
  );
}

/**
 * Copies the poll text so whoever runs the vote pastes a well-formed sondagem
 * into the group instead of improvising the options.
 */
function BotaoCopiar({ texto }: { texto: string }) {
  const [copiado, setCopiado] = useState(false);

  async function copiar() {
    try {
      await navigator.clipboard.writeText(texto);
      setCopiado(true);
      window.setTimeout(() => setCopiado(false), 2000);
    } catch {
      // Clipboard is unavailable outside a secure context; the poll text is
      // still on screen above, so there is nothing to recover from.
      setCopiado(false);
    }
  }

  return (
    <button
      type="button"
      onClick={copiar}
      className="tw:cursor-pointer tw:rounded tw:border tw:border-primary tw:bg-transparent tw:px-3 tw:py-1.5 tw:text-xs tw:font-semibold tw:text-primary tw:hover:bg-primary/10"
    >
      {copiado ? "Copiado" : "Copiar sondagem"}
    </button>
  );
}
