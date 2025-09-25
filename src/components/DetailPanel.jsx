import React from 'react';

export default function DetailPanel({ scenario }) {
  return (
    <div className="bg-white p-4 rounded shadow mb-4">
      <h2 className="text-lg font-semibold mb-2">Detalhamento do Cálculo</h2>
      <p>Exibir valores bruto e líquido do cenário selecionado.</p>
    </div>
  );
}