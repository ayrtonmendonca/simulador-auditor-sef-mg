import React, { useState } from 'react';
import ScenarioForm from './components/ScenarioForm';
import ChartView from './components/ChartView';
import DetailPanel from './components/DetailPanel';
import { legislationLinks } from './data/legislationLinks';

export default function App() {
  const [scenarios, setScenarios] = useState([]);
  const [selectedScenario, setSelectedScenario] = useState(null);

  return (
    <div className="min-h-screen bg-gray-100 p-4">
      <header className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold">Simulador Auditor Fiscal SEF/MG</h1>
        <nav>
          <a href="#" className="mr-4">Home</a>
          <a href="#legislacao">Legislação</a>
        </nav>
      </header>
      <ScenarioForm scenarios={scenarios} setScenarios={setScenarios} />
      <ChartView scenarios={scenarios} setSelectedScenario={setSelectedScenario} />
      {selectedScenario && <DetailPanel scenario={selectedScenario} />}
      <section id="legislacao" className="mt-8">
        <h2 className="text-xl font-semibold mb-2">Legislação</h2>
        <ul className="list-disc ml-6">
          {legislationLinks.map((link, i) => (
            <li key={i}><a className="text-blue-600" href={link.url} target="_blank" rel="noreferrer">{link.title}</a></li>
          ))}
        </ul>
      </section>
    </div>
  );
}