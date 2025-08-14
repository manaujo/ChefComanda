import React, { useState, useContext, useEffect } from 'react';
import { Plus, Search, Package, AlertTriangle, TrendingDown, Edit, Trash2 } from 'lucide-react';
import RestauranteContext from '../contexts/RestauranteContext';
import { useEmployeeAuth } from '../hooks/useEmployeeAuth';

interface SaidaEstoque {
  id: string;
  insumo_id: string;
  quantidade: number;
  motivo: string;
  observacoes?: string;
  funcionario_id: string;
  data_saida: string;
}

const motivosSaida = [
  'Uso na cozinha',
  'Vencimento',
  'Perda/Quebra',
  'Transferência',
  'Outros'
];

export default function Estoque() {
  const { insumos, adicionarInsumo, editarInsumo, removerInsumo } = useContext(RestauranteContext);
  const { employee } = useEmployeeAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [showSaidaModal, setShowSaidaModal] = useState(false);
  const [editingInsumo, setEditingInsumo] = useState(null);
  const [selectedInsumo, setSelectedInsumo] = useState(null);
  const [saidaForm, setSaidaForm] = useState({
    quantidade: '',
    motivo: '',
    observacoes: ''
  });

  const [novoInsumo, setNovoInsumo] = useState({
    nome: '',
    categoria: '',
    quantidade_atual: '',
    quantidade_minima: '',
    unidade_medida: '',
    preco_unitario: '',
    fornecedor: ''
  });

  const filteredInsumos = insumos.filter(insumo =>
    insumo.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
    insumo.categoria.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const insumosComEstoqueBaixo = insumos.filter(
    insumo => insumo.quantidade_atual <= insumo.quantidade_minima
  );

  const handleSubmit = (e) => {
    e.preventDefault();
    if (editingInsumo) {
      editarInsumo(editingInsumo.id, {
        ...novoInsumo,
        quantidade_atual: parseFloat(novoInsumo.quantidade_atual),
        quantidade_minima: parseFloat(novoInsumo.quantidade_minima),
        preco_unitario: parseFloat(novoInsumo.preco_unitario)
      });
    } else {
      adicionarInsumo({
        ...novoInsumo,
        quantidade_atual: parseFloat(novoInsumo.quantidade_atual),
        quantidade_minima: parseFloat(novoInsumo.quantidade_minima),
        preco_unitario: parseFloat(novoInsumo.preco_unitario)
      });
    }
    resetForm();
  };

  const handleSaidaSubmit = (e) => {
    e.preventDefault();
    const quantidade = parseFloat(saidaForm.quantidade);
    
    if (quantidade > selectedInsumo.quantidade_atual) {
      alert('Quantidade de saída não pode ser maior que o estoque atual');
      return;
    }

    // Registrar saída e atualizar estoque
    const novaQuantidade = selectedInsumo.quantidade_atual - quantidade;
    editarInsumo(selectedInsumo.id, {
      ...selectedInsumo,
      quantidade_atual: novaQuantidade
    });

    // Aqui você pode adicionar lógica para salvar o histórico de saída
    console.log('Saída registrada:', {
      insumo: selectedInsumo.nome,
      quantidade,
      motivo: saidaForm.motivo,
      observacoes: saidaForm.observacoes,
      funcionario: employee?.nome,
      data: new Date().toISOString()
    });

    resetSaidaForm();
    alert('Saída registrada com sucesso!');
  };

  const resetForm = () => {
    setNovoInsumo({
      nome: '',
      categoria: '',
      quantidade_atual: '',
      quantidade_minima: '',
      unidade_medida: '',
      preco_unitario: '',
      fornecedor: ''
    });
    setEditingInsumo(null);
    setShowModal(false);
  };

  const resetSaidaForm = () => {
    setSaidaForm({
      quantidade: '',
      motivo: '',
      observacoes: ''
    });
    setSelectedInsumo(null);
    setShowSaidaModal(false);
  };

  const handleEdit = (insumo) => {
    setEditingInsumo(insumo);
    setNovoInsumo({
      nome: insumo.nome,
      categoria: insumo.categoria,
      quantidade_atual: insumo.quantidade_atual.toString(),
      quantidade_minima: insumo.quantidade_minima.toString(),
      unidade_medida: insumo.unidade_medida,
      preco_unitario: insumo.preco_unitario.toString(),
      fornecedor: insumo.fornecedor || ''
    });
    setShowModal(true);
  };

  const handleSaida = (insumo) => {
    setSelectedInsumo(insumo);
    setShowSaidaModal(true);
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Controle de Estoque</h1>
          <p className="text-gray-600 mt-1">Gerencie insumos e matérias-primas</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Novo Insumo
        </button>
      </div>

      {/* Resumo */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total de Insumos</p>
              <p className="text-2xl font-bold text-gray-900">{insumos.length}</p>
            </div>
            <Package className="w-8 h-8 text-blue-600" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Estoque Baixo</p>
              <p className="text-2xl font-bold text-red-600">{insumosComEstoqueBaixo.length}</p>
            </div>
            <AlertTriangle className="w-8 h-8 text-red-600" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Insumos Ativos</p>
              <p className="text-2xl font-bold text-green-600">
                {insumos.filter(i => i.quantidade_atual > 0).length}
              </p>
            </div>
            <Package className="w-8 h-8 text-green-600" />
          </div>
        </div>
      </div>

      {/* Alertas de Estoque Baixo */}
      {insumosComEstoqueBaixo.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="w-5 h-5 text-red-600" />
            <h3 className="font-semibold text-red-800">Atenção: Estoque Baixo</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
            {insumosComEstoqueBaixo.map(insumo => (
              <div key={insumo.id} className="text-sm text-red-700">
                <span className="font-medium">{insumo.nome}</span>: {insumo.quantidade_atual} {insumo.unidade_medida}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Busca */}
      <div className="mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <input
            type="text"
            placeholder="Buscar insumos..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
      </div>

      {/* Lista de Insumos */}
      <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Insumo
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Categoria
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Estoque Atual
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Estoque Mínimo
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Preço Unitário
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Ações
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredInsumos.map((insumo) => (
                <tr key={insumo.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <Package className="w-5 h-5 text-gray-400 mr-3" />
                      <div>
                        <div className="text-sm font-medium text-gray-900">{insumo.nome}</div>
                        {insumo.fornecedor && (
                          <div className="text-sm text-gray-500">{insumo.fornecedor}</div>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800">
                      {insumo.categoria}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <span className={`text-sm font-medium ${
                        insumo.quantidade_atual <= insumo.quantidade_minima 
                          ? 'text-red-600' 
                          : 'text-gray-900'
                      }`}>
                        {insumo.quantidade_atual} {insumo.unidade_medida}
                      </span>
                      {insumo.quantidade_atual <= insumo.quantidade_minima && (
                        <AlertTriangle className="w-4 h-4 text-red-500 ml-2" />
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {insumo.quantidade_minima} {insumo.unidade_medida}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    R$ {insumo.preco_unitario?.toFixed(2) || '0,00'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleSaida(insumo)}
                        className="text-orange-600 hover:text-orange-900 p-1 rounded"
                        title="Registrar Saída"
                      >
                        <TrendingDown className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleEdit(insumo)}
                        className="text-indigo-600 hover:text-indigo-900 p-1 rounded"
                        title="Editar"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => removerInsumo(insumo.id)}
                        className="text-red-600 hover:text-red-900 p-1 rounded"
                        title="Remover"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredInsumos.length === 0 && (
          <div className="text-center py-12">
            <Package className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Nenhum insumo encontrado</h3>
            <p className="text-gray-500">
              {searchTerm ? 'Tente ajustar sua busca' : 'Comece adicionando um novo insumo'}
            </p>
          </div>
        )}
      </div>

      {/* Modal Novo/Editar Insumo */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
            <h2 className="text-xl font-bold mb-4">
              {editingInsumo ? 'Editar Insumo' : 'Novo Insumo'}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nome do Insumo
                </label>
                <input
                  type="text"
                  value={novoInsumo.nome}
                  onChange={(e) => setNovoInsumo({...novoInsumo, nome: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Categoria
                </label>
                <input
                  type="text"
                  value={novoInsumo.categoria}
                  onChange={(e) => setNovoInsumo({...novoInsumo, categoria: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Quantidade Atual
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={novoInsumo.quantidade_atual}
                    onChange={(e) => setNovoInsumo({...novoInsumo, quantidade_atual: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Quantidade Mínima
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={novoInsumo.quantidade_minima}
                    onChange={(e) => setNovoInsumo({...novoInsumo, quantidade_minima: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Unidade de Medida
                  </label>
                  <select
                    value={novoInsumo.unidade_medida}
                    onChange={(e) => setNovoInsumo({...novoInsumo, unidade_medida: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  >
                    <option value="">Selecione</option>
                    <option value="kg">Quilograma (kg)</option>
                    <option value="g">Grama (g)</option>
                    <option value="l">Litro (l)</option>
                    <option value="ml">Mililitro (ml)</option>
                    <option value="un">Unidade (un)</option>
                    <option value="cx">Caixa (cx)</option>
                    <option value="pct">Pacote (pct)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Preço Unitário
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={novoInsumo.preco_unitario}
                    onChange={(e) => setNovoInsumo({...novoInsumo, preco_unitario: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Fornecedor (opcional)
                </label>
                <input
                  type="text"
                  value={novoInsumo.fornecedor}
                  onChange={(e) => setNovoInsumo({...novoInsumo, fornecedor: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={resetForm}
                  className="flex-1 px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors"
                >
                  {editingInsumo ? 'Salvar' : 'Adicionar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Saída de Estoque */}
      {showSaidaModal && selectedInsumo && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
            <h2 className="text-xl font-bold mb-4">Registrar Saída de Estoque</h2>
            
            <div className="bg-gray-50 p-4 rounded-lg mb-4">
              <h3 className="font-medium text-gray-900">{selectedInsumo.nome}</h3>
              <p className="text-sm text-gray-600">
                Estoque atual: {selectedInsumo.quantidade_atual} {selectedInsumo.unidade_medida}
              </p>
            </div>

            <form onSubmit={handleSaidaSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Quantidade de Saída
                </label>
                <input
                  type="number"
                  step="0.01"
                  max={selectedInsumo.quantidade_atual}
                  value={saidaForm.quantidade}
                  onChange={(e) => setSaidaForm({...saidaForm, quantidade: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
                <p className="text-xs text-gray-500 mt-1">
                  Máximo: {selectedInsumo.quantidade_atual} {selectedInsumo.unidade_medida}
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Motivo da Saída
                </label>
                <select
                  value={saidaForm.motivo}
                  onChange={(e) => setSaidaForm({...saidaForm, motivo: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                >
                  <option value="">Selecione o motivo</option>
                  {motivosSaida.map(motivo => (
                    <option key={motivo} value={motivo}>{motivo}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Observações (opcional)
                </label>
                <textarea
                  value={saidaForm.observacoes}
                  onChange={(e) => setSaidaForm({...saidaForm, observacoes: e.target.value})}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Detalhes adicionais sobre a saída..."
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={resetSaidaForm}
                  className="flex-1 px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-md transition-colors"
                >
                  Registrar Saída
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}