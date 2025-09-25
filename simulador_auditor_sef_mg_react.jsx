import React, { useEffect, useMemo, useState } from "react";
import { Line } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
} from "chart.js";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

// ----------------------------
// Simulador: configuração inicial
// ----------------------------

// Valores de exemplo por nível (substituir por dados oficiais da legislação)
const LEVELS = [
  { id: "A1", label: "Nível A1", baseSalary: 9000, gepiPoints: 100 },
  { id: "A2", label: "Nível A2", baseSalary: 11000, gepiPoints: 120 },
  { id: "B1", label: "Nível B1", baseSalary: 13000, gepiPoints: 140 },
  { id: "B2", label: "Nível B2", baseSalary: 16000, gepiPoints: 165 },
];

// Valores padrão e constantes (podem ser adaptados à legislação real)
const DEFAULT_YEARS = 30;
const DEFAULT_HELP_DAYS = 20; // dias para cálculo da VI (ajuda de custo)
const DEPENDENT_DEDUCTION = 189.59; // valor fictício por dependente para dedução
const PREVID_PERCENT = 0.14; // alíquota fictícia de previdência
const IR_FLAT_PERCENT = 0.15; // simplificação: alíquota fixa de IR

// Util auxiliares
const thisYear = new Date().getFullYear();

function formatMoney(v) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

// ----------------------------
// Cálculo do cenário
// ----------------------------
function projectScenario({
  baseSalary,
  gepiPointValue,
  gepiPoints,
  viPerHelpDay,
  helpDays,
  dependents,
  basicAnnualPctReaj = 0,
  gepiCentsAnnual = 0,
  viReajAnnual = 0,
  years = DEFAULT_YEARS,
}) {
  const labels = [];
  const grossSeries = [];
  const netSeries = [];

  for (let t = 0; t <= years; t++) {
    const year = thisYear + t;
    labels.push(String(year));

    // Aplica reajustes compostos para o vencimento básico
    const basicYear = baseSalary * Math.pow(1 + basicAnnualPctReaj / 100, t);

    // GEPI: o valor do ponto cresce somando os centavos por ano (simplificação)
    const gepiPointYear = gepiPointValue + gepiCentsAnnual * t;
    const gepiTotalYear = gepiPointYear * gepiPoints;

    // VI (ajuda de custo) cresce em R$ por ano (simplificação)
    const viYear = viPerHelpDay * helpDays + viReajAnnual * t;

    const grossMonthly = basicYear + gepiTotalYear + viYear;
    const grossAnnual = grossMonthly * 12; // projeção anual

    // Descontos (simplificados)
    const previd = grossAnnual * PREVID_PERCENT;
    const deductionDependents = dependents * DEPENDENT_DEDUCTION * 12;
    const taxable = Math.max(0, grossAnnual - previd - deductionDependents);
    const ir = taxable * IR_FLAT_PERCENT;

    const netAnnual = grossAnnual - previd - ir;

    grossSeries.push(grossAnnual);
    netSeries.push(netAnnual);
  }

  return { labels, grossSeries, netSeries };
}

// ----------------------------
// Componente principal (página)
// ----------------------------
export default function App() {
  // Cenários salvos
  const [scenarios, setScenarios] = useState(() => {
    try {
      const raw = localStorage.getItem("sim_scenarios_v1");
      if (raw) return JSON.parse(raw);
    } catch (e) {}

    // Cenário atual padrão
    return [
      {
        id: "atual",
        name: "Cenário Atual",
        levelId: "A1",
        dependents: 0,
        helpDays: DEFAULT_HELP_DAYS,
        // valores iniciais (deveriam vir da legislação atualizada)
        baseSalary: 9000,
        gepiPointValue: 20.0, // R$ por ponto
        gepiPoints: 100,
        viPerHelpDay: 15.0, // R$ por dia de ajuda de custo (exemplo)
        // parâmetros de reajuste (por ano)
        basicAnnualPctReaj: 0,
        gepiCentsAnnual: 0,
        viReajAnnual: 0,
        years: DEFAULT_YEARS,
        color: "#1f77b4",
      },
    ];
  });

  const [selectedId, setSelectedId] = useState(scenarios[0]?.id ?? null);
  const [yearsGlobal, setYearsGlobal] = useState(DEFAULT_YEARS);

  useEffect(() => {
    localStorage.setItem("sim_scenarios_v1", JSON.stringify(scenarios));
  }, [scenarios]);

  // Adicionar novo cenário com valores padrão
  function addScenario() {
    const id = `c_${Date.now()}`;
    const defaultLevel = LEVELS[0];
    const sc = {
      id,
      name: `Cenário ${scenarios.length + 1}`,
      levelId: defaultLevel.id,
      dependents: 0,
      helpDays: DEFAULT_HELP_DAYS,
      baseSalary: defaultLevel.baseSalary,
      gepiPointValue: 20,
      gepiPoints: defaultLevel.gepiPoints,
      viPerHelpDay: 15,
      basicAnnualPctReaj: 0,
      gepiCentsAnnual: 0,
      viReajAnnual: 0,
      years: yearsGlobal,
      color: pickColor(scenarios.length),
    };
    setScenarios((s) => [...s, sc]);
    setSelectedId(id);
  }

  function updateScenario(id, patch) {
    setScenarios((s) => s.map((it) => (it.id === id ? { ...it, ...patch } : it)));
  }

  function removeScenario(id) {
    const next = scenarios.filter((s) => s.id !== id);
    setScenarios(next);
    if (selectedId === id) setSelectedId(next[0]?.id ?? null);
  }

  // Prepara dados do gráfico
  const chartData = useMemo(() => {
    const years = yearsGlobal;
    const labels = [];
    for (let t = 0; t <= years; t++) labels.push(String(thisYear + t));

    const datasets = scenarios.map((sc, idx) => {
      const { netSeries } = projectScenario({
        ...sc,
        baseSalary: sc.baseSalary,
        gepiPointValue: sc.gepiPointValue,
        gepiPoints: sc.gepiPoints,
        viPerHelpDay: sc.viPerHelpDay,
        helpDays: sc.helpDays,
        dependents: sc.dependents,
        basicAnnualPctReaj: sc.basicAnnualPctReaj,
        gepiCentsAnnual: sc.gepiCentsAnnual,
        viReajAnnual: sc.viReajAnnual,
        years: years,
      });

      return {
        label: sc.name,
        data: netSeries,
        borderColor: sc.color,
        backgroundColor: sc.color,
        tension: 0.2,
      };
    });

    return { labels, datasets };
  }, [scenarios, yearsGlobal]);

  // Detalhe do cenário selecionado
  const selectedScenario = scenarios.find((s) => s.id === selectedId) ?? scenarios[0];
  const detail = selectedScenario
    ? projectScenario({
        ...selectedScenario,
        years: selectedScenario.years ?? yearsGlobal,
      })
    : null;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 p-6">
      <header className="max-w-6xl mx-auto mb-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold">Simulador de Cenários — Auditor Fiscal (SEF/MG)</h1>
          <nav className="space-x-4">
            <a href="#home" className="text-sm hover:underline">
              Home
            </a>
            <a href="#legislacao" className="text-sm hover:underline">
              Legislação
            </a>
            <a href="#sobre" className="text-sm hover:underline">
              Sobre
            </a>
          </nav>
        </div>
      </header>

      <main className="max-w-6xl mx-auto grid md:grid-cols-3 gap-6">
        {/* Painel de controle */}
        <section className="md:col-span-1 bg-white rounded-2xl p-4 shadow-sm">
          <h2 className="text-lg font-medium mb-2">Cenários</h2>

          <div className="space-y-3">
            {scenarios.map((sc) => (
              <div
                key={sc.id}
                className={`flex items-center justify-between p-2 rounded-lg border ${
                  sc.id === selectedId ? "border-indigo-400 bg-indigo-50" : "border-slate-200"
                }`}
              >
                <div className="flex items-center gap-3">
                  <div
                    style={{ width: 14, height: 14, background: sc.color, borderRadius: 4 }}
                  ></div>
                  <button
                    className="text-sm text-left"
                    onClick={() => setSelectedId(sc.id)}
                  >
                    {sc.name}
                  </button>
                </div>
                <div className="flex items-center gap-2">
                  {sc.id !== "atual" && (
                    <button
                      className="text-xs text-red-500"
                      onClick={() => removeScenario(sc.id)}
                    >
                      Remover
                    </button>
                  )}
                </div>
              </div>
            ))}

            <div className="pt-2">
              <button
                className="w-full py-2 rounded-xl bg-indigo-600 text-white text-sm"
                onClick={addScenario}
              >
                + Adicionar cenário
              </button>
            </div>

            <div className="pt-3">
              <label className="text-xs">Horizonte de anos (X):</label>
              <input
                type="number"
                min={1}
                max={50}
                value={yearsGlobal}
                onChange={(e) => setYearsGlobal(Number(e.target.value))}
                className="w-full mt-1 p-2 border rounded"
              />
            </div>
          </div>

          <hr className="my-4" />

          <div>
            <h3 className="text-sm font-medium">Links da Legislação</h3>
            <ul className="mt-2 text-sm space-y-1">
              {/* Exemplos - substituir pelos links oficiais */}
              <li>
                <a href="#" className="underline text-indigo-600 text-sm">
                  Lei / Decreto — Carreira de Auditor Fiscal (link oficial)
                </a>
              </li>
              <li>
                <a href="#" className="underline text-indigo-600 text-sm">
                  Remuneração e tabelas (link oficial)
                </a>
              </li>
            </ul>
          </div>
        </section>

        {/* Gráfico */}
        <section className="md:col-span-2 bg-white rounded-2xl p-4 shadow-sm">
          <div id="home">
            <h2 className="text-lg font-medium mb-2">Gráfico — Remuneração Líquida (anual)</h2>
            <div>
              <Line
                data={chartData}
                options={{
                  responsive: true,
                  plugins: {
                    legend: { position: "top" },
                    title: { display: false },
                    tooltip: { mode: "index", intersect: false },
                  },
                  scales: {
                    y: {
                      ticks: {
                        callback: function (value) {
                          return new Intl.NumberFormat("pt-BR", {
                            style: "currency",
                            currency: "BRL",
                            maximumFractionDigits: 0,
                          }).format(value);
                        },
                      },
                    },
                  },
                }}
              />
            </div>
          </div>

          <div className="mt-4 grid md:grid-cols-2 gap-4">
            {/* Formulário do cenário selecionado */}
            {selectedScenario && (
              <div className="bg-slate-50 p-3 rounded-lg">
                <h3 className="font-medium mb-2">Editar — {selectedScenario.name}</h3>

                <div className="space-y-2">
                  <label className="text-xs">Nome do cenário</label>
                  <input
                    className="w-full p-2 border rounded"
                    value={selectedScenario.name}
                    onChange={(e) => updateScenario(selectedScenario.id, { name: e.target.value })}
                  />

                  <label className="text-xs">Nível na carreira</label>
                  <select
                    className="w-full p-2 border rounded"
                    value={selectedScenario.levelId}
                    onChange={(e) => {
                      const lvl = LEVELS.find((l) => l.id === e.target.value);
                      updateScenario(selectedScenario.id, {
                        levelId: lvl.id,
                        baseSalary: lvl.baseSalary,
                        gepiPoints: lvl.gepiPoints,
                      });
                    }}
                  >
                    {LEVELS.map((l) => (
                      <option key={l.id} value={l.id}>
                        {l.label}
                      </option>
                    ))}
                  </select>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-xs">Dependentes (IR)</label>
                      <input
                        type="number"
                        className="w-full p-2 border rounded"
                        value={selectedScenario.dependents}
                        onChange={(e) => updateScenario(selectedScenario.id, { dependents: Number(e.target.value) })}
                      />
                    </div>

                    <div>
                      <label className="text-xs">Dias (ajuda de custo)</label>
                      <input
                        type="number"
                        className="w-full p-2 border rounded"
                        value={selectedScenario.helpDays}
                        onChange={(e) => updateScenario(selectedScenario.id, { helpDays: Number(e.target.value) })}
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-xs">Vencimento básico (R$)</label>
                    <input
                      type="number"
                      className="w-full p-2 border rounded"
                      value={selectedScenario.baseSalary}
                      onChange={(e) => updateScenario(selectedScenario.id, { baseSalary: Number(e.target.value) })}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-xs">Valor do ponto GEPI (R$)</label>
                      <input
                        type="number"
                        step="0.01"
                        className="w-full p-2 border rounded"
                        value={selectedScenario.gepiPointValue}
                        onChange={(e) => updateScenario(selectedScenario.id, { gepiPointValue: Number(e.target.value) })}
                      />
                    </div>

                    <div>
                      <label className="text-xs">Pontos GEPI (quantidade)</label>
                      <input
                        type="number"
                        className="w-full p-2 border rounded"
                        value={selectedScenario.gepiPoints}
                        onChange={(e) => updateScenario(selectedScenario.id, { gepiPoints: Number(e.target.value) })}
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-xs">VI — Ajuda de custo (R$ por dia)</label>
                    <input
                      type="number"
                      step="0.01"
                      className="w-full p-2 border rounded"
                      value={selectedScenario.viPerHelpDay}
                      onChange={(e) => updateScenario(selectedScenario.id, { viPerHelpDay: Number(e.target.value) })}
                    />
                  </div>

                  <hr />

                  <div>
                    <label className="text-xs">Reajuste anual (% no vencimento básico)</label>
                    <input
                      type="number"
                      step="0.01"
                      className="w-full p-2 border rounded"
                      value={selectedScenario.basicAnnualPctReaj}
                      onChange={(e) => updateScenario(selectedScenario.id, { basicAnnualPctReaj: Number(e.target.value) })}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-xs">Reajuste anual (centavos no ponto GEPI)</label>
                      <input
                        type="number"
                        step="0.01"
                        className="w-full p-2 border rounded"
                        value={selectedScenario.gepiCentsAnnual}
                        onChange={(e) => updateScenario(selectedScenario.id, { gepiCentsAnnual: Number(e.target.value) })}
                      />
                    </div>

                    <div>
                      <label className="text-xs">Reajuste anual (R$ na VI)</label>
                      <input
                        type="number"
                        step="0.01"
                        className="w-full p-2 border rounded"
                        value={selectedScenario.viReajAnnual}
                        onChange={(e) => updateScenario(selectedScenario.id, { viReajAnnual: Number(e.target.value) })}
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-xs">Horizonte anos para este cenário</label>
                    <input
                      type="number"
                      className="w-full p-2 border rounded"
                      value={selectedScenario.years ?? yearsGlobal}
                      onChange={(e) => updateScenario(selectedScenario.id, { years: Number(e.target.value) })}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Detalhamento do cálculo */}
            <div className="bg-slate-50 p-3 rounded-lg">
              <h3 className="font-medium mb-2">Detalhamento — {selectedScenario?.name}</h3>

              {detail && (
                <div className="text-sm">
                  <p>
                    Horizonte: <strong>{(selectedScenario?.years ?? yearsGlobal) + 1}</strong> anos ({thisYear} —{' '}
                    {thisYear + (selectedScenario?.years ?? yearsGlobal)})
                  </p>

                  <div className="mt-3">
                    <table className="w-full text-left text-sm">
                      <thead>
                        <tr>
                          <th>Ano</th>
                          <th>Bruto (anual)</th>
                          <th>Líquido (anual)</th>
                        </tr>
                      </thead>
                      <tbody>
                        {detail.labels.map((lab, i) => (
                          <tr key={lab} className="border-t">
                            <td className="py-2">{lab}</td>
                            <td className="py-2">{formatMoney(detail.grossSeries[i])}</td>
                            <td className="py-2">{formatMoney(detail.netSeries[i])}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <p className="mt-3 text-xs text-slate-600">
                    Observação: os cálculos usam simplificações (alíquotas fixas, dedução por
                    dependente fixa, juros compostos no vencimento básico). Para conformidade
                    plena com a legislação da SEF/MG substitua as constantes por tabelas e
                    regras oficiais.
                  </p>
                </div>
              )}
            </div>
          </div>
        </section>

        {/* Sobre / Legislação */}
        <section id="legislacao" className="md:col-span-3 bg-white rounded-2xl p-4 shadow-sm">
          <h2 className="text-lg font-medium">Legislação e fontes</h2>
          <p className="text-sm mt-2">
            Insira aqui links oficiais (Diário Oficial de MG, leis e decretos) que definem:
            vencimento, GEPI, VI e regras da carreira. O componente já disponibiliza um campo
            para links rápidos no menu.
          </p>

          <ul className="mt-3 list-disc pl-5 text-sm space-y-1">
            <li>
              <a href="#" className="underline text-indigo-600">Exemplo: Lei X / Decreto Y (link oficial)</a>
            </li>
            <li>
              <a href="#" className="underline text-indigo-600">Tabelas de vencimentos (link oficial)</a>
            </li>
          </ul>
        </section>

        <section id="sobre" className="md:col-span-3 bg-white rounded-2xl p-4 shadow-sm">
          <h2 className="text-lg font-medium">Sobre</h2>
          <p className="text-sm mt-2">
            Protótipo de um simulador para comparar cenários de remuneração anual de auditores
            fiscais da SEF/MG. O projeto é entregue como site estático (React) e pode ser
            hospedado no GitHub Pages. Para adequação completa às regras legais, implemente as
            tabelas e alíquotas oficiais e revise a fórmula de imposto de renda.
          </p>
        </section>
      </main>

      <footer className="max-w-6xl mx-auto mt-6 text-sm text-slate-500">
        <p>Protótipo — ajuste os parâmetros conforme a legislação oficial da SEF/MG.</p>
      </footer>
    </div>
  );
}

// ----------------------------
// Helpers
// ----------------------------
function pickColor(i) {
  const palette = [
    "#1f77b4",
    "#ff7f0e",
    "#2ca02c",
    "#d62728",
    "#9467bd",
    "#8c564b",
    "#e377c2",
    "#7f7f7f",
  ];
  return palette[i % palette.length];
}
