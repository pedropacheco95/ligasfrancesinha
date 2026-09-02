import { Link, createFileRoute } from "@tanstack/react-router";
import { useState, type FormEvent, type ReactNode } from "react";

import { Layout } from "@/components/Layout";

import regulamentoCss from "@/styles/regulamento.css?url";
import { useRegulamentoActivity, useSquad, useVoter } from "@/hooks/use-regulamento";
import { addObjection, addProposal, castVote, type RegulamentoActivity } from "@/lib/db";
import {
  contagem,
  pontosDoBalde,
  regraPorId,
  regrasAprovadas,
  regrasVotadas,
  regulamento,
  todasAprovadas,
  type Ponto,
  type Regra,
} from "@/lib/regulamento";

export const Route = createFileRoute("/regulamento")({
  head: () => ({
    meta: [{ title: "Regulamento — Ligas Francesinha" }],
    links: [{ rel: "stylesheet", href: regulamentoCss }],
  }),
  component: RegulamentoPage,
});

/** The article that carries the reconstruction these rules came out of. */
const SLUG_ARTIGO = "estatutos-da-master-league";

const CAIXA = "tw:rounded-lg tw:border tw:border-border tw:bg-card tw:p-5";
const CAMPO =
  "tw:w-full tw:rounded tw:border tw:border-border tw:bg-background tw:px-3 tw:py-2 tw:text-sm tw:text-foreground";
const BOTAO =
  "tw:cursor-pointer tw:rounded tw:border tw:border-primary tw:bg-primary tw:px-4 tw:py-2 tw:text-sm tw:font-semibold tw:text-primary-foreground tw:disabled:cursor-not-allowed tw:disabled:opacity-40";

function RegulamentoPage() {
  const { activity, loading, refresh } = useRegulamentoActivity();
  const [voter, setVoter] = useVoter();
  const squad = useSquad();

  const aprovadas = todasAprovadas();
  const decididas = regrasVotadas();
  const paraVotar = pontosDoBalde("votar");
  const paraPropor = pontosDoBalde("proposta");

  return (
    <Layout>
      {/* `styles_frontend.css` centres the body text for the ported Bootstrap
            pages; a document reads as a column, so this one opts out. */}
      <div className="regulamento_page tw:mx-auto tw:w-full tw:max-w-3xl tw:px-5 tw:pt-10 tw:pb-24 tw:text-left tw:text-foreground">
        <header className="tw:pb-4">
          <p className="tw:m-0 tw:text-xs tw:tracking-[0.16em] tw:text-primary tw:uppercase">
            Versão {regulamento.versao}
          </p>
          <h1 className="tw:mt-3 tw:mb-0 tw:text-4xl tw:leading-tight tw:font-bold tw:tracking-tight tw:sm:text-5xl">
            Regulamento da Master League
          </h1>
          <p className="tw:mt-4 tw:mb-0 tw:max-w-prose tw:text-base tw:text-muted-foreground">
            As regras por que a liga se rege. Uma regra só entra aqui depois de aprovada — o que
            ainda é proposta, ou que duas pessoas leem de maneiras incompatíveis, está em baixo, à
            espera de voto.
          </p>

          <dl className="tw:mt-7 tw:mb-0 tw:grid tw:grid-cols-2 tw:gap-x-6 tw:gap-y-4 tw:sm:grid-cols-4">
            <Facto valor={String(aprovadas.length)} rotulo="regras em vigor" />
            <Facto valor={String(decididas.length)} rotulo="já votadas" />
            <Facto valor={String(paraVotar.length)} rotulo="a votar agora" />
            <Facto valor={String(paraPropor.length)} rotulo="à espera de proposta" />
          </dl>
        </header>

        {!loading && !activity.available ? <AvisoSemTabelas /> : null}

        <Parte numero={1} titulo="O que está decidido">
          <p className="tw:mt-0 tw:mb-6 tw:max-w-prose tw:text-sm tw:text-muted-foreground">
            Foi a votos e ganhou. Não se vota outra vez — se discordares de alguma, é na Parte 2 que
            se diz, e não em campo à segunda-feira.
          </p>

          <div className="tw:grid tw:gap-4 tw:sm:grid-cols-2">
            {decididas.map((regra) => (
              <CartaoDecidido key={regra.id} regra={regra} />
            ))}
          </div>

          <h3 className="tw:mt-14 tw:mb-1 tw:text-xl tw:font-semibold">O regulamento</h3>
          <p className="tw:mt-0 tw:mb-2 tw:max-w-prose tw:text-sm tw:text-muted-foreground">
            As {aprovadas.length} regras em vigor, por artigo.
          </p>

          {regulamento.artigos.map((artigo) => {
            const regras = regrasAprovadas(artigo);
            if (regras.length === 0) return null;
            return (
              <article key={artigo.id} id={artigo.id} className="tw:mt-10 tw:scroll-mt-24">
                <div className="tw:flex tw:items-baseline tw:gap-3 tw:border-b tw:border-foreground tw:pb-2">
                  <span className="tw:text-xs tw:tracking-[0.08em] tw:text-primary tw:uppercase">
                    Art. {artigo.numero}
                  </span>
                  <h4 className="tw:m-0 tw:text-lg tw:font-semibold">{artigo.titulo}</h4>
                </div>
                <div className="tw:mt-2">
                  {regras.map((regra) => (
                    <LinhaRegra key={regra.id} regra={regra} />
                  ))}
                </div>
              </article>
            );
          })}
        </Parte>

        <Parte numero={2} titulo="Votar">
          <p className="tw:mt-0 tw:mb-6 tw:max-w-prose tw:text-sm tw:text-muted-foreground">
            Escolhe o teu nome uma vez e vota. Podes mudar o voto enquanto a votação estiver aberta
            — fica sempre o último. As contagens aparecem à medida que as pessoas votam.
          </p>

          <SeletorVotante squad={squad} voter={voter} onChange={setVoter} />

          <div className="tw:mt-8 tw:flex tw:flex-col tw:gap-5">
            {paraVotar.map((ponto) => (
              <Sondagem
                key={ponto.id}
                ponto={ponto}
                activity={activity}
                voter={voter}
                squad={squad}
                onDone={refresh}
              />
            ))}
          </div>

          <h3 className="tw:mt-12 tw:mb-1 tw:text-xl tw:font-semibold">
            Não concordo com uma regra
          </h3>
          <p className="tw:mt-0 tw:mb-4 tw:max-w-prose tw:text-sm tw:text-muted-foreground">
            Escolhe a regra, diz porquê e, se tiveres, escreve como devia ser. Podes fazê-lo a
            tantas regras quantas quiseres — depois de submeteres uma, o formulário fica pronto para
            a seguinte.
          </p>

          <FormDiscordancia voter={voter} onDone={refresh} />
          <ListaDiscordancias activity={activity} />
        </Parte>

        <Parte numero={3} titulo="Propor">
          <p className="tw:mt-0 tw:mb-6 tw:max-w-prose tw:text-sm tw:text-muted-foreground">
            Estes cinco não se resolvem com um sim ou um não: falta alguém escrever o que devia
            ficar na regra. Quando houver propostas, vão a votos como os da Parte 2.
          </p>

          <div className="tw:flex tw:flex-col tw:gap-5">
            {paraPropor.map((ponto) => (
              <CartaoProposta
                key={ponto.id}
                ponto={ponto}
                activity={activity}
                voter={voter}
                onDone={refresh}
              />
            ))}

            <div className={CAIXA}>
              <h4 className="tw:mt-0 tw:mb-1 tw:text-base tw:font-semibold">
                Outra ideia qualquer
              </h4>
              <p className="tw:mt-0 tw:mb-4 tw:text-sm tw:text-muted-foreground">
                Alguma coisa que devia estar no regulamento e não está em nenhum dos pontos acima.
              </p>
              <FormProposta pontoId={null} voter={voter} onDone={refresh} />
              <ListaPropostas activity={activity} pontoId={null} />
            </div>
          </div>
        </Parte>

        <footer className="tw:mt-16 tw:border-t-2 tw:border-foreground tw:pt-6 tw:text-sm tw:text-muted-foreground">
          <p className="tw:mt-0 tw:mb-3">
            <strong className="tw:text-foreground">Como se altera.</strong> Vota-se aqui, com prazo.
            Ganha a maioria dos que votam; quem não vota conta como abstenção e o empate mantém o
            que estava. Com três ou mais opções, se nenhuma passar de metade faz-se segunda ronda
            entre as duas mais votadas.
          </p>
          <p className="tw:mt-0 tw:mb-3">
            <strong className="tw:text-foreground">Não existe.</strong> Não há MVP, melhor marcador,
            taça nem qualquer prémio individual além da francesinha.
          </p>
          <p className="tw:m-0">
            <strong className="tw:text-foreground">De onde vêm.</strong> Cada regra foi reconstruída
            a partir das 27 453 mensagens do grupo. Quem quiser ver a data, o autor e a frase em que
            cada uma ficou fixada — e as contradições que ainda não foram resolvidas — encontra tudo
            em{" "}
            <Link
              activeProps={{ className: "" }}
              to="/noticias/$slug"
              params={{ slug: SLUG_ARTIGO }}
            >
              Estatutos da Master League
            </Link>
            .
          </p>
        </footer>
      </div>
    </Layout>
  );
}

function Parte({
  numero,
  titulo,
  children,
}: {
  numero: number;
  titulo: string;
  children: ReactNode;
}) {
  return (
    <section id={`p${numero}`} className="tw:mt-14 tw:scroll-mt-24">
      <div className="tw:flex tw:flex-wrap tw:items-baseline tw:gap-x-3 tw:border-t-2 tw:border-foreground tw:pt-5">
        <span className="tw:text-xs tw:tracking-[0.14em] tw:text-primary tw:uppercase">
          Parte {numero}
        </span>
        <h2 className="tw:m-0 tw:text-2xl tw:font-bold">{titulo}</h2>
      </div>
      <div className="tw:mt-4">{children}</div>
    </section>
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

/**
 * The migration is applied by hand in the Supabase dashboard, so the page has
 * to be honest about the gap rather than throwing: the rules are what most
 * people come for, and they render without a database.
 */
function AvisoSemTabelas() {
  return (
    <div className="tw:mt-8 tw:rounded-lg tw:border tw:border-gold tw:bg-gold/10 tw:p-4">
      <p className="tw:m-0 tw:text-sm">
        <strong>A votação ainda não está ligada.</strong> Falta correr a migração{" "}
        <code className="tw:rounded tw:bg-muted tw:px-1.5 tw:py-0.5 tw:text-xs">
          supabase/migrations/20260902160000_regulamento_votes.sql
        </code>{" "}
        no SQL editor do Supabase. Até lá lê-se o regulamento, mas não se vota.
      </p>
    </div>
  );
}

function CartaoDecidido({ regra }: { regra: Regra }) {
  const votacao = regra.votacao;
  const total = votacao ? votacao.resultado.reduce((soma, linha) => soma + linha.votos, 0) : 0;
  const vencedora = votacao
    ? [...votacao.resultado].sort((a, b) => b.votos - a.votos)[0]
    : undefined;
  const porImplementar = regra.estado === "pendente";

  return (
    <div
      className={`tw:rounded-lg tw:border tw:p-5 ${
        porImplementar ? "tw:border-gold tw:bg-gold/10" : "tw:border-border tw:bg-card"
      }`}
    >
      <p className="tw:m-0 tw:text-xs tw:text-muted-foreground tw:tabular-nums">{regra.id}</p>
      <h4 className="tw:mt-1 tw:mb-0 tw:text-base tw:leading-snug tw:font-semibold">
        {regra.titulo}
      </h4>
      {vencedora ? (
        <p className="tw:mt-2 tw:mb-0 tw:text-sm tw:text-muted-foreground">
          Ganhou «{vencedora.opcao}» com {vencedora.votos} de {total} votos.
        </p>
      ) : null}
      {votacao ? (
        <p className="tw:mt-2 tw:mb-0 tw:text-[10px] tw:tracking-[0.1em] tw:text-primary tw:uppercase">
          {votacao.pergunta} · {votacao.data}
          {porImplementar ? " · falta implementar" : ""}
        </p>
      ) : null}
    </div>
  );
}

function LinhaRegra({ regra }: { regra: Regra }) {
  return (
    <div className="tw:border-b tw:border-border tw:py-4 tw:last:border-b-0">
      <div className="tw:flex tw:flex-wrap tw:items-start tw:gap-x-4 tw:gap-y-1">
        <span className="tw:w-9 tw:shrink-0 tw:pt-0.5 tw:text-sm tw:text-muted-foreground tw:tabular-nums">
          {regra.id}
        </span>
        <div className="tw:min-w-0 tw:flex-1 tw:basis-80">
          <h5 className="tw:m-0 tw:text-base tw:leading-snug tw:font-semibold">{regra.titulo}</h5>
          {regra.detalhe ? (
            <p className="tw:mt-1.5 tw:mb-0 tw:max-w-prose tw:text-sm tw:text-muted-foreground">
              {regra.detalhe}
            </p>
          ) : null}
        </div>
        {regra.estado === "pendente" ? (
          <span className="tw:shrink-0 tw:rounded tw:bg-gold/15 tw:px-2 tw:py-1 tw:text-[10px] tw:tracking-[0.1em] tw:text-foreground tw:uppercase">
            Falta implementar
          </span>
        ) : null}
      </div>
    </div>
  );
}

function SeletorVotante({
  squad,
  voter,
  onChange,
}: {
  squad: string[];
  voter: string;
  onChange: (name: string) => void;
}) {
  return (
    <div className={CAIXA}>
      <label
        htmlFor="votante"
        className="tw:mb-2 tw:block tw:text-sm tw:font-semibold tw:text-foreground"
      >
        Quem és tu?
      </label>
      <select
        id="votante"
        className={CAMPO}
        value={voter}
        onChange={(event) => onChange(event.target.value)}
      >
        <option value="">— escolhe o teu nome —</option>
        {squad.map((name) => (
          <option key={name} value={name}>
            {name}
          </option>
        ))}
      </select>
      <p className="tw:mt-2 tw:mb-0 tw:text-xs tw:text-muted-foreground">
        Fica guardado neste browser. Não há palavra-passe — somos catorze e conhecemo-nos.
      </p>
    </div>
  );
}

function Sondagem({
  ponto,
  activity,
  voter,
  squad,
  onDone,
}: {
  ponto: Ponto;
  activity: RegulamentoActivity;
  voter: string;
  squad: string[];
  onDone: () => Promise<void>;
}) {
  const [erro, setErro] = useState("");
  const [aGravar, setAGravar] = useState(false);

  const votos = activity.votes.filter((voto) => voto.pointId === ponto.id);
  const resultado = contagem(
    ponto,
    votos.map((voto) => voto.choice),
  );
  const total = votos.length;
  const meu = votos.find((voto) => voto.voter === voter)?.choice ?? "";
  const emFalta = squad.filter((name) => !votos.some((voto) => voto.voter === name));

  async function votar(opcao: string) {
    if (!voter) return;
    setAGravar(true);
    setErro("");
    try {
      await castVote(ponto.id, voter, opcao);
      await onDone();
    } catch {
      setErro("Não deu para gravar o voto. Tenta outra vez daqui a bocado.");
    } finally {
      setAGravar(false);
    }
  }

  return (
    <div className={CAIXA}>
      <div className="tw:flex tw:flex-wrap tw:items-baseline tw:gap-x-3 tw:gap-y-1">
        <span className="tw:text-xs tw:font-semibold tw:tracking-[0.08em] tw:text-primary">
          {ponto.id}
        </span>
        <h4 className="tw:m-0 tw:text-base tw:font-semibold">{ponto.titulo}</h4>
      </div>
      <p className="tw:mt-2 tw:mb-0 tw:max-w-prose tw:text-sm tw:text-muted-foreground">
        {ponto.contexto}
      </p>

      <fieldset className="tw:mt-4 tw:mb-0 tw:border-0 tw:p-0" disabled={!voter || aGravar}>
        <legend className="tw:sr-only">{ponto.titulo}</legend>
        <div className="tw:flex tw:flex-col tw:gap-2">
          {resultado.map(({ opcao, votos: votosNaOpcao }) => {
            const escolhida = meu === opcao;
            return (
              <label
                key={opcao}
                className={`opcao tw:relative tw:cursor-pointer tw:overflow-hidden tw:rounded tw:border tw:px-3 tw:py-2.5 tw:text-sm ${
                  escolhida ? "tw:border-primary tw:bg-primary/5" : "tw:border-border"
                }`}
              >
                <span
                  aria-hidden="true"
                  className="tw:absolute tw:inset-y-0 tw:left-0 tw:bg-primary/10"
                  style={{ width: total ? `${(votosNaOpcao / total) * 100}%` : "0%" }}
                />
                <input
                  type="radio"
                  name={`ponto-${ponto.id}`}
                  checked={escolhida}
                  onChange={() => void votar(opcao)}
                />
                <span className="texto tw:relative">{opcao}</span>
                <span className="contagem tw:relative tw:text-sm tw:font-semibold">
                  {votosNaOpcao}
                </span>
              </label>
            );
          })}
        </div>
      </fieldset>

      {ponto.nota ? (
        <p className="tw:mt-3 tw:mb-0 tw:text-xs tw:text-muted-foreground">{ponto.nota}</p>
      ) : null}

      <p className="tw:mt-3 tw:mb-0 tw:text-xs tw:text-muted-foreground">
        {!voter ? "Escolhe o teu nome acima para poderes votar. " : ""}
        {total === 0
          ? "Ainda ninguém votou."
          : `${total} ${total === 1 ? "voto" : "votos"}${
              emFalta.length ? ` · faltam ${emFalta.join(", ")}` : " · votaram todos"
            }`}
      </p>

      {erro ? <p className="tw:mt-2 tw:mb-0 tw:text-xs tw:text-destructive">{erro}</p> : null}
    </div>
  );
}

/**
 * One objection at a time, cleared and left open for the next — a player may
 * disagree with any number of rules, and a fixed set of slots would either
 * waste the page or run out.
 */
function FormDiscordancia({ voter, onDone }: { voter: string; onDone: () => Promise<void> }) {
  const [ruleId, setRuleId] = useState("");
  const [reason, setReason] = useState("");
  const [proposal, setProposal] = useState("");
  const [estado, setEstado] = useState<"" | "a-gravar" | "gravado" | "erro">("");

  async function submeter(event: FormEvent) {
    event.preventDefault();
    if (!voter || !ruleId || !reason.trim()) return;
    setEstado("a-gravar");
    try {
      await addObjection(ruleId, voter, reason.trim(), proposal.trim() || null);
      setRuleId("");
      setReason("");
      setProposal("");
      setEstado("gravado");
      await onDone();
    } catch {
      setEstado("erro");
    }
  }

  return (
    <form className={CAIXA} onSubmit={(event) => void submeter(event)}>
      <fieldset className="tw:m-0 tw:border-0 tw:p-0" disabled={!voter || estado === "a-gravar"}>
        <legend className="tw:sr-only">Discordar de uma regra</legend>

        <label htmlFor="regra" className="tw:mb-1.5 tw:block tw:text-sm tw:font-semibold">
          Que regra?
        </label>
        <select
          id="regra"
          className={CAMPO}
          value={ruleId}
          onChange={(event) => setRuleId(event.target.value)}
          required
        >
          <option value="">— escolhe a regra —</option>
          {regulamento.artigos.map((artigo) => (
            <optgroup key={artigo.id} label={`Art. ${artigo.numero} · ${artigo.titulo}`}>
              {regrasAprovadas(artigo).map((regra) => (
                <option key={regra.id} value={regra.id}>
                  {regra.id} · {regra.titulo}
                </option>
              ))}
            </optgroup>
          ))}
        </select>

        <label htmlFor="porque" className="tw:mt-4 tw:mb-1.5 tw:block tw:text-sm tw:font-semibold">
          Porque é que discordas?
        </label>
        <textarea
          id="porque"
          className={CAMPO}
          rows={3}
          value={reason}
          onChange={(event) => setReason(event.target.value)}
          placeholder="O que é que esta regra faz mal, na prática."
          required
        />

        <label htmlFor="melhor" className="tw:mt-4 tw:mb-1.5 tw:block tw:text-sm tw:font-semibold">
          Como devia ser? <span className="opcional tw:text-muted-foreground">(opcional)</span>
        </label>
        <textarea
          id="melhor"
          className={CAMPO}
          rows={2}
          value={proposal}
          onChange={(event) => setProposal(event.target.value)}
          placeholder="Se já tens uma alternativa concreta, escreve-a aqui."
        />

        <div className="tw:mt-4 tw:flex tw:flex-wrap tw:items-center tw:gap-3">
          <button type="submit" className={BOTAO}>
            {estado === "a-gravar" ? "A gravar…" : "Registar discordância"}
          </button>
          {!voter ? (
            <span className="tw:text-xs tw:text-muted-foreground">
              Escolhe o teu nome primeiro.
            </span>
          ) : null}
          {estado === "gravado" ? (
            <span className="tw:text-xs tw:text-primary">
              Registada. Podes escolher outra regra.
            </span>
          ) : null}
          {estado === "erro" ? (
            <span className="tw:text-xs tw:text-destructive">Não deu para gravar.</span>
          ) : null}
        </div>
      </fieldset>
    </form>
  );
}

function ListaDiscordancias({ activity }: { activity: RegulamentoActivity }) {
  if (activity.objections.length === 0) return null;

  return (
    <div className="tw:mt-5">
      <h4 className="tw:mt-0 tw:mb-3 tw:text-sm tw:font-semibold tw:text-muted-foreground">
        Discordâncias registadas ({activity.objections.length})
      </h4>
      <div className="tw:flex tw:flex-col tw:gap-3">
        {activity.objections.map((objection) => {
          const regra = regraPorId(objection.ruleId);
          return (
            <div
              key={objection.id}
              className="tw:rounded tw:border-l-2 tw:border-destructive tw:bg-card tw:px-4 tw:py-3"
            >
              <p className="tw:m-0 tw:text-xs tw:text-muted-foreground">
                {objection.voter} · regra {objection.ruleId}
                {regra ? ` · ${regra.titulo}` : ""}
              </p>
              <p className="tw:mt-1.5 tw:mb-0 tw:text-sm">{objection.reason}</p>
              {objection.proposal ? (
                <p className="tw:mt-2 tw:mb-0 tw:text-sm">
                  <strong>Propõe:</strong> {objection.proposal}
                </p>
              ) : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function CartaoProposta({
  ponto,
  activity,
  voter,
  onDone,
}: {
  ponto: Ponto;
  activity: RegulamentoActivity;
  voter: string;
  onDone: () => Promise<void>;
}) {
  return (
    <div className={CAIXA}>
      <div className="tw:flex tw:flex-wrap tw:items-baseline tw:gap-x-3 tw:gap-y-1">
        <span className="tw:text-xs tw:font-semibold tw:tracking-[0.08em] tw:text-primary">
          {ponto.id}
        </span>
        <h4 className="tw:m-0 tw:text-base tw:font-semibold">{ponto.titulo}</h4>
      </div>
      <p className="tw:mt-2 tw:mb-4 tw:max-w-prose tw:text-sm tw:text-muted-foreground">
        {ponto.contexto}
      </p>
      <FormProposta pontoId={ponto.id} voter={voter} onDone={onDone} />
      <ListaPropostas activity={activity} pontoId={ponto.id} />
    </div>
  );
}

function FormProposta({
  pontoId,
  voter,
  onDone,
}: {
  pontoId: string | null;
  voter: string;
  onDone: () => Promise<void>;
}) {
  const [proposal, setProposal] = useState("");
  const [estado, setEstado] = useState<"" | "a-gravar" | "gravado" | "erro">("");
  const campoId = `proposta-${pontoId ?? "livre"}`;

  async function submeter(event: FormEvent) {
    event.preventDefault();
    if (!voter || !proposal.trim()) return;
    setEstado("a-gravar");
    try {
      await addProposal(pontoId, voter, proposal.trim());
      setProposal("");
      setEstado("gravado");
      await onDone();
    } catch {
      setEstado("erro");
    }
  }

  return (
    <form onSubmit={(event) => void submeter(event)}>
      <fieldset className="tw:m-0 tw:border-0 tw:p-0" disabled={!voter || estado === "a-gravar"}>
        <legend className="tw:sr-only">Escrever uma proposta</legend>
        <label htmlFor={campoId} className="tw:sr-only">
          A tua proposta
        </label>
        <textarea
          id={campoId}
          className={CAMPO}
          rows={2}
          value={proposal}
          onChange={(event) => setProposal(event.target.value)}
          placeholder="Escreve a regra como ela devia ficar."
          required
        />
        <div className="tw:mt-3 tw:flex tw:flex-wrap tw:items-center tw:gap-3">
          <button type="submit" className={BOTAO}>
            {estado === "a-gravar" ? "A gravar…" : "Propor"}
          </button>
          {!voter ? (
            <span className="tw:text-xs tw:text-muted-foreground">
              Escolhe o teu nome primeiro.
            </span>
          ) : null}
          {estado === "gravado" ? (
            <span className="tw:text-xs tw:text-primary">Proposta registada.</span>
          ) : null}
          {estado === "erro" ? (
            <span className="tw:text-xs tw:text-destructive">Não deu para gravar.</span>
          ) : null}
        </div>
      </fieldset>
    </form>
  );
}

function ListaPropostas({
  activity,
  pontoId,
}: {
  activity: RegulamentoActivity;
  pontoId: string | null;
}) {
  const propostas = activity.proposals.filter((proposta) => proposta.pointId === pontoId);
  if (propostas.length === 0) return null;

  return (
    <div className="tw:mt-4 tw:flex tw:flex-col tw:gap-3">
      {propostas.map((proposta) => (
        <div
          key={proposta.id}
          className="tw:rounded tw:border-l-2 tw:border-primary tw:bg-background tw:px-4 tw:py-3"
        >
          <p className="tw:m-0 tw:text-xs tw:text-muted-foreground">{proposta.voter}</p>
          <p className="tw:mt-1.5 tw:mb-0 tw:text-sm">{proposta.proposal}</p>
        </div>
      ))}
    </div>
  );
}
