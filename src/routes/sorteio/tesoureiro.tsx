import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useRef, useState } from "react";

import { useDataset } from "@/hooks/use-app-data";
import { useEdicaoAtual, usePlantel } from "@/hooks/use-regulamento";
import { Layout } from "@/components/Layout";
import { JA_SORTEADO, fetchTreasurers, insertTreasurer, type TreasurerRow } from "@/lib/db";
import type { Player } from "@/lib/domain";

import sorteioCss from "@/styles/sorteio.css?url";

export const Route = createFileRoute("/sorteio/tesoureiro")({
  head: () => ({
    meta: [{ title: "Sorteio do tesoureiro — Ligas Francesinha" }],
    links: [{ rel: "stylesheet", href: sorteioCss }],
  }),
  component: SorteioTesoureiro,
});

/** Must match `--altura-nome` in sorteio.css: the reel is positioned in pixels. */
const ALTURA_NOME = 76;
/** How many times the eligible names go past before the winner arrives. */
const VOLTAS = 7;
const DURACAO_MS = 3400;

function baralhar<T>(itens: T[]): T[] {
  const copia = [...itens];
  for (let i = copia.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copia[i], copia[j]] = [copia[j], copia[i]];
  }
  return copia;
}

function SorteioTesoureiro() {
  const dataset = useDataset();
  const edicao = useEdicaoAtual();
  const plantel = usePlantel();

  const [tesoureiros, setTesoureiros] = useState<TreasurerRow[] | null>(null);
  const [carregado, setCarregado] = useState(false);
  const [erro, setErro] = useState("");

  const [tira, setTira] = useState<string[]>([]);
  const [deslocamento, setDeslocamento] = useState(0);
  const [aGirar, setAGirar] = useState(false);
  const [revelado, setRevelado] = useState(false);

  const carregar = useCallback(async () => {
    const linhas = await fetchTreasurers();
    setTesoureiros(linhas);
    setCarregado(true);
    return linhas;
  }, []);

  useEffect(() => {
    void carregar();
  }, [carregar]);

  const historico = tesoureiros ?? [];
  const jaForamIds = new Set(historico.map((t) => t.playerId));
  const desteAno = edicao ? historico.find((t) => t.editionId === edicao.id) : undefined;
  const tesoureiro = desteAno ? dataset.playerById.get(desteAno.playerId) : undefined;

  // Out of the hat: anyone who has held the job in any edition. Deriving it from
  // the history is why there is no hand-written list of names to keep up to date.
  const elegiveis = plantel.filter((jogador) => !jaForamIds.has(jogador.id));
  const jaForam = plantel.filter((jogador) => jaForamIds.has(jogador.id));

  async function sortear() {
    if (aGirar || !edicao || elegiveis.length === 0) return;
    setErro("");
    setAGirar(true);

    // Written down before it is shown. If somebody else drew first, the insert
    // is refused and the reel lands on their name instead of ours — the
    // animation always ends on what the database actually holds.
    const candidato = elegiveis[Math.floor(Math.random() * elegiveis.length)];
    let vencedor = candidato;

    try {
      await insertTreasurer(edicao.id, candidato.id);
      await carregar();
    } catch (falha) {
      if (falha instanceof Error && falha.message === JA_SORTEADO) {
        const linhas = await carregar();
        const registado = linhas?.find((t) => t.editionId === edicao.id);
        const jogador = registado ? dataset.playerById.get(registado.playerId) : undefined;
        if (jogador) vencedor = jogador;
      } else {
        setErro("Não deu para gravar o sorteio. Tenta outra vez daqui a bocado.");
        setAGirar(false);
        return;
      }
    }

    const reduzida = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (reduzida) {
      setTira([vencedor.name]);
      setDeslocamento(0);
      setAGirar(false);
      setRevelado(true);
      return;
    }

    const nomes: string[] = [];
    for (let volta = 0; volta < VOLTAS; volta += 1) {
      nomes.push(...baralhar(elegiveis).map((jogador) => jogador.name));
    }
    nomes.push(vencedor.name);

    setTira(nomes);
    setDeslocamento(0);
    setRevelado(false);

    // Two frames: one to paint the reel at rest, one to start the transition
    // from that position rather than from wherever it was before.
    requestAnimationFrame(() =>
      requestAnimationFrame(() => setDeslocamento((nomes.length - 1) * ALTURA_NOME)),
    );
  }

  function aterrou() {
    setAGirar(false);
    setRevelado(true);
  }

  const semTabela = carregado && tesoureiros === null;
  // Once a reel exists it owns the display: the treasurer is known the instant
  // the insert returns, and reading him from state here would swap the fixed
  // name in over a spinning reel.
  const mostraNome = tira.length > 0 ? undefined : (tesoureiro?.name ?? "—");

  return (
    <Layout>
      <div className="sorteio_page tw:mx-auto tw:w-full tw:max-w-3xl tw:px-5 tw:pt-10 tw:pb-24 tw:text-left tw:text-foreground">
        <header className="tw:pb-8">
          <p className="tw:m-0 tw:text-xs tw:tracking-[0.16em] tw:text-primary tw:uppercase">
            {edicao?.name ?? "Master League"}
          </p>
          <h1 className="tw:mt-3 tw:mb-0 tw:text-4xl tw:leading-tight tw:font-bold tw:tracking-tight tw:sm:text-5xl">
            Sorteio do tesoureiro
          </h1>
          <p className="tw:mt-4 tw:mb-0 tw:max-w-prose tw:text-base tw:text-muted-foreground">
            Um nome à sorte de entre quem ainda não foi. Sorteia-se uma vez por época e fica
            guardado: quem voltar a esta página vê sempre o mesmo nome.
          </p>
        </header>

        {semTabela ? <AvisoSemTabela /> : null}

        <div className="sorteio_palco">
          <p className="sorteio_rotulo">
            {tesoureiro && (revelado || !aGirar) ? "O tesoureiro é" : "Na cartola"}
          </p>

          <Rolo
            tira={tira}
            deslocamento={deslocamento}
            aGirar={aGirar}
            nomeFixo={mostraNome}
            onFim={aterrou}
          />

          {tesoureiro && !aGirar ? (
            <p className="sorteio_selado">Sorteado para a {edicao?.name}. Não se repete.</p>
          ) : (
            <button
              type="button"
              onClick={() => void sortear()}
              disabled={aGirar || semTabela || elegiveis.length === 0 || !carregado}
              className="tw:mt-2 tw:cursor-pointer tw:rounded tw:border tw:border-primary tw:bg-primary tw:px-6 tw:py-3 tw:text-base tw:font-semibold tw:text-primary-foreground tw:disabled:cursor-not-allowed tw:disabled:opacity-40"
            >
              {aGirar ? "A sortear…" : "Sortear"}
            </button>
          )}

          {erro ? <p className="tw:mt-3 tw:mb-0 tw:text-sm tw:text-destructive">{erro}</p> : null}
        </div>

        <section className="tw:mt-12">
          <h2 className="tw:mb-3 tw:text-lg tw:font-semibold">
            {tesoureiro ? "Estavam na cartola" : "Entram no sorteio"}{" "}
            <span className="tw:font-normal tw:text-muted-foreground">({elegiveis.length})</span>
          </h2>
          <ul className="sorteio_lista">
            {elegiveis.map((jogador) => (
              <li key={jogador.id} className={tesoureiro?.id === jogador.id ? "escolhido" : ""}>
                {jogador.name}
              </li>
            ))}
          </ul>
        </section>

        <section className="tw:mt-10">
          <h2 className="tw:mb-3 tw:text-lg tw:font-semibold">Quem já foi tesoureiro</h2>
          <Historico dataset={dataset} historico={historico} plantel={jaForam} />
        </section>
      </div>
    </Layout>
  );
}

/**
 * The reel. A strip of names taller than its window, slid up to land on the
 * last one; the transition does the easing, so the browser animates a single
 * transform instead of React re-rendering a name at a time.
 */
function Rolo({
  tira,
  deslocamento,
  aGirar,
  nomeFixo,
  onFim,
}: {
  tira: string[];
  deslocamento: number;
  aGirar: boolean;
  nomeFixo: string | undefined;
  onFim: () => void;
}) {
  const janela = useRef<HTMLDivElement>(null);

  if (nomeFixo !== undefined) {
    return (
      <div className="sorteio_janela">
        <p className="sorteio_nome">{nomeFixo}</p>
      </div>
    );
  }

  return (
    <div className={`sorteio_janela ${aGirar ? "a-girar" : ""}`} ref={janela}>
      <div
        className="sorteio_tira"
        style={{
          transform: `translateY(-${deslocamento}px)`,
          transitionDuration: `${DURACAO_MS}ms`,
        }}
        onTransitionEnd={onFim}
      >
        {tira.map((nome, indice) => (
          <p key={`${nome}-${indice}`} className="sorteio_nome">
            {nome}
          </p>
        ))}
      </div>
    </div>
  );
}

function Historico({
  dataset,
  historico,
  plantel,
}: {
  dataset: ReturnType<typeof useDataset>;
  historico: TreasurerRow[];
  plantel: Player[];
}) {
  if (historico.length === 0) {
    return (
      <p className="tw:m-0 tw:text-sm tw:text-muted-foreground">
        Ainda ninguém, ou a tabela ainda não foi criada.
      </p>
    );
  }

  const porEdicao = [...historico].sort((a, b) => b.editionId - a.editionId);

  return (
    <>
      <ol className="sorteio_historico">
        {porEdicao.map((linha) => {
          const jogador = dataset.playerById.get(linha.playerId);
          const edicao = dataset.editionById.get(linha.editionId);
          return (
            <li key={linha.editionId}>
              <span className="edicao">{edicao?.name ?? `Edição ${linha.editionId}`}</span>
              <span className="nome">{jogador?.name ?? "?"}</span>
            </li>
          );
        })}
      </ol>
      {plantel.length > 0 ? (
        <p className="tw:mt-3 tw:mb-0 tw:max-w-prose tw:text-sm tw:text-muted-foreground">
          Destes, {plantel.map((jogador) => jogador.name).join(", ")} ainda joga na liga e fica de
          fora do sorteio até toda a gente ter feito uma vez.
        </p>
      ) : null}
    </>
  );
}

function AvisoSemTabela() {
  return (
    <div className="tw:mb-8 tw:rounded-lg tw:border tw:border-gold tw:bg-gold/10 tw:p-4">
      <p className="tw:m-0 tw:text-sm">
        <strong>O sorteio ainda não está ligado.</strong> Falta correr a migração{" "}
        <code className="tw:rounded tw:bg-muted tw:px-1.5 tw:py-0.5 tw:text-xs">
          supabase/migrations/20260906120000_edition_treasurers.sql
        </code>{" "}
        no SQL editor do Supabase. Sem ela o resultado não ficava guardado, e um sorteio que não
        fica guardado não vale nada.
      </p>
    </div>
  );
}
