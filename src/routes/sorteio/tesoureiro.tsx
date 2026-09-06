import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";

import { Layout } from "@/components/Layout";
import { useSquad } from "@/hooks/use-regulamento";

import sorteioCss from "@/styles/sorteio.css?url";

export const Route = createFileRoute("/sorteio/tesoureiro")({
  head: () => ({
    meta: [{ title: "Sorteio do tesoureiro — Ligas Francesinha" }],
    links: [{ rel: "stylesheet", href: sorteioCss }],
  }),
  component: SorteioTesoureiro,
});

/**
 * Whoever has already done the job, and is therefore out of the hat.
 *
 * Add this season's winner to the end when the season is over — that is the
 * whole maintenance this page needs, and it is why the eligible list is
 * computed from the squad rather than written out by hand.
 */
const JA_FORAM = ["Kiko TM", "Pedro Pacheco", "Luis Fragoso", "Bernardo Castro"];

/** How long the names roll before settling, and how fast they start. */
const DURACAO_MS = 2600;
const INTERVALO_INICIAL_MS = 60;

function SorteioTesoureiro() {
  const plantel = useSquad();
  const elegiveis = plantel.filter((nome) => !JA_FORAM.includes(nome));
  const jaForam = plantel.filter((nome) => JA_FORAM.includes(nome));

  const [aRolar, setARolar] = useState(false);
  const [mostrado, setMostrado] = useState<string | null>(null);
  const [sorteado, setSorteado] = useState<string | null>(null);
  const temporizador = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (temporizador.current !== null) window.clearTimeout(temporizador.current);
    };
  }, []);

  function sortear() {
    if (aRolar || elegiveis.length === 0) return;

    // The winner is chosen before the animation starts, so what the roll does
    // is show the draw rather than decide it.
    const vencedor = elegiveis[Math.floor(Math.random() * elegiveis.length)];

    setARolar(true);
    setSorteado(null);

    const inicio = Date.now();

    function passo() {
      const decorrido = Date.now() - inicio;
      if (decorrido >= DURACAO_MS) {
        setMostrado(vencedor);
        setSorteado(vencedor);
        setARolar(false);
        return;
      }
      setMostrado(elegiveis[Math.floor(Math.random() * elegiveis.length)]);
      // Slows down as it goes, so it reads as settling rather than stopping.
      const progresso = decorrido / DURACAO_MS;
      const intervalo = INTERVALO_INICIAL_MS + progresso * progresso * 320;
      temporizador.current = window.setTimeout(passo, intervalo);
    }

    passo();
  }

  return (
    <Layout>
      <div className="sorteio_page tw:mx-auto tw:w-full tw:max-w-3xl tw:px-5 tw:pt-10 tw:pb-24 tw:text-left tw:text-foreground">
        <header className="tw:pb-8">
          <p className="tw:m-0 tw:text-xs tw:tracking-[0.16em] tw:text-primary tw:uppercase">
            7ª Edição Master League
          </p>
          <h1 className="tw:mt-3 tw:mb-0 tw:text-4xl tw:leading-tight tw:font-bold tw:tracking-tight tw:sm:text-5xl">
            Sorteio do tesoureiro
          </h1>
          <p className="tw:mt-4 tw:mb-0 tw:max-w-prose tw:text-base tw:text-muted-foreground">
            Um nome à sorte de entre quem ainda não foi. Quem já fez o trabalho fica de fora, e a
            lista sai do plantel da época a decorrer — não é preciso mexer aqui quando alguém entra
            ou sai da liga.
          </p>
        </header>

        <div className="sorteio_palco">
          <p className="sorteio_rotulo">{sorteado ? "O tesoureiro é" : "Na cartola"}</p>
          <p className={`sorteio_nome ${sorteado ? "ganhou" : ""} ${aRolar ? "a-rolar" : ""}`}>
            {mostrado ?? `${elegiveis.length} nomes`}
          </p>

          <button
            type="button"
            onClick={sortear}
            disabled={aRolar || elegiveis.length === 0}
            className="tw:mt-2 tw:cursor-pointer tw:rounded tw:border tw:border-primary tw:bg-primary tw:px-6 tw:py-3 tw:text-base tw:font-semibold tw:text-primary-foreground tw:disabled:cursor-not-allowed tw:disabled:opacity-40"
          >
            {aRolar ? "A sortear…" : sorteado ? "Sortear outra vez" : "Sortear"}
          </button>

          {sorteado ? (
            <p className="tw:mt-4 tw:mb-0 tw:max-w-prose tw:text-sm tw:text-muted-foreground">
              Sortear outra vez dá outro nome. A regra 4.2 diz que repetir um sorteio até sair o que
              se quer é batota — vale para este tanto como para as equipas.
            </p>
          ) : null}
        </div>

        <section className="tw:mt-12">
          <h2 className="tw:mb-3 tw:text-lg tw:font-semibold">
            Entram no sorteio{" "}
            <span className="tw:font-normal tw:text-muted-foreground">({elegiveis.length})</span>
          </h2>
          <ul className="sorteio_lista">
            {elegiveis.map((nome) => (
              <li key={nome} className={sorteado === nome ? "escolhido" : ""}>
                {nome}
              </li>
            ))}
          </ul>
        </section>

        {jaForam.length > 0 ? (
          <section className="tw:mt-10">
            <h2 className="tw:mb-3 tw:text-lg tw:font-semibold">
              Já foram tesoureiros{" "}
              <span className="tw:font-normal tw:text-muted-foreground">({jaForam.length})</span>
            </h2>
            <ul className="sorteio_lista fora">
              {jaForam.map((nome) => (
                <li key={nome}>{nome}</li>
              ))}
            </ul>
            <p className="tw:mt-3 tw:mb-0 tw:max-w-prose tw:text-sm tw:text-muted-foreground">
              Ficam de fora até já toda a gente ter feito uma vez.
            </p>
          </section>
        ) : null}
      </div>
    </Layout>
  );
}
