import React from 'react';

export default function ChartView({ scenarios, setSelectedScenario }) {
  return (
    <div className="bg-white p-4 rounded shadow mb-4">
      <h2 className="text-lg font-semibold mb-2">Gráfico</h2>
      <p>Gráfico interativo será exibido aqui (implementar com Chart.js)</p>
    </div>
  );
}