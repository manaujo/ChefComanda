import React, { useState, useEffect } from 'react';
import { Bug, User, Database, Eye, AlertTriangle, CheckCircle } from 'lucide-react';
import Button from '../ui/Button';
import { useAuth } from '../../contexts/AuthContext';
import { useRestaurante } from '../../contexts/RestauranteContext';
import { supabase } from '../../services/supabase';

interface DebugData {
  employeeData?: any;
  restaurantAccess?: any;
  produtosAccess?: any;
  insumosAccess?: any;
}

const EmployeeDebugPanel: React.FC = () => {
  const { user, isEmployee, employeeData } = useAuth();
  const { restaurante } = useRestaurante();
  const [debugData, setDebugData] = useState<DebugData>({});
  const [loading, setLoading] = useState(false);
  const [showPanel, setShowPanel] = useState(false);

  const runDebugChecks = async () => {
    if (!user || !isEmployee) return;

    setLoading(true);
    try {
      // 1. Verificar dados do funcionário
      const { data: employeeDebugData, error: empError } = await supabase
        .rpc('debug_employee_data', { employee_user_id: user.id });

      // 2. Verificar acesso a produtos
      const { data: produtosDebugData, error: prodError } = await supabase
        .rpc('debug_employee_produtos_access', { employee_user_id: user.id });

      // 3. Verificar acesso a insumos
      const { data: insumosDebugData, error: insError } = await supabase
        .rpc('debug_employee_insumos_access', { employee_user_id: user.id });

      setDebugData({
        employeeData: employeeDebugData,
        produtosAccess: produtosDebugData,
        insumosAccess: insumosDebugData
      });

      console.log('Debug Data:', {
        employeeData: employeeDebugData,
        produtosAccess: produtosDebugData,
        insumosAccess: insumosDebugData,
        contextRestaurant: restaurante,
        authRestaurantId: employeeData?.restaurant_id
      });
    } catch (error) {
      console.error('Error running debug checks:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isEmployee && showPanel) {
      runDebugChecks();
    }
  }, [isEmployee, showPanel]);

  if (!isEmployee) {
    return null;
  }

  return (
    <div className="fixed bottom-4 right-4 z-50">
      {!showPanel ? (
        <Button
          variant="warning"
          onClick={() => setShowPanel(true)}
          icon={<Bug size={18} />}
          className="bg-orange-500 hover:bg-orange-600 text-white shadow-lg"
        >
          Debug
        </Button>
      ) : (
        <div className="bg-white rounded-lg shadow-2xl border border-gray-200 w-96 max-h-96 overflow-y-auto">
          <div className="p-4 border-b border-gray-200 bg-orange-50">
            <div className="flex justify-between items-center">
              <div className="flex items-center">
                <Bug className="w-5 h-5 text-orange-600 mr-2" />
                <h3 className="font-semibold text-orange-800">Debug Panel</h3>
              </div>
              <button
                onClick={() => setShowPanel(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                ×
              </button>
            </div>
          </div>

          <div className="p-4 space-y-4">
            <Button
              variant="primary"
              onClick={runDebugChecks}
              isLoading={loading}
              fullWidth
              size="sm"
            >
              Executar Verificações
            </Button>

            {debugData.employeeData && (
              <div className="space-y-3">
                <div className="bg-blue-50 p-3 rounded-lg">
                  <h4 className="font-medium text-blue-800 mb-2 flex items-center">
                    <User size={16} className="mr-2" />
                    Dados do Funcionário
                  </h4>
                  <div className="text-sm space-y-1">
                    {debugData.employeeData.map((emp: any, index: number) => (
                      <div key={index} className="space-y-1">
                        <p><strong>Nome:</strong> {emp.employee_name}</p>
                        <p><strong>Função:</strong> {emp.employee_role}</p>
                        <p><strong>Ativo:</strong> {emp.employee_active ? 'Sim' : 'Não'}</p>
                        <p><strong>Restaurant ID:</strong> {emp.restaurant_id || 'Não definido'}</p>
                        <p><strong>Restaurant Nome:</strong> {emp.restaurant_name || 'Não encontrado'}</p>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="bg-green-50 p-3 rounded-lg">
                  <h4 className="font-medium text-green-800 mb-2 flex items-center">
                    <Database size={16} className="mr-2" />
                    Acesso a Produtos
                  </h4>
                  <div className="text-sm">
                    {debugData.produtosAccess?.length > 0 ? (
                      <div className="space-y-1">
                        <p className="flex items-center">
                          <CheckCircle size={14} className="text-green-600 mr-1" />
                          {debugData.produtosAccess.length} produtos encontrados
                        </p>
                        {debugData.produtosAccess.slice(0, 3).map((prod: any, index: number) => (
                          <p key={index} className="text-xs text-gray-600">
                            • {prod.produto_nome} (Acesso: {prod.has_access ? 'Sim' : 'Não'})
                          </p>
                        ))}
                      </div>
                    ) : (
                      <p className="flex items-center text-red-600">
                        <AlertTriangle size={14} className="mr-1" />
                        Nenhum produto encontrado
                      </p>
                    )}
                  </div>
                </div>

                <div className="bg-purple-50 p-3 rounded-lg">
                  <h4 className="font-medium text-purple-800 mb-2 flex items-center">
                    <Database size={16} className="mr-2" />
                    Acesso a Insumos
                  </h4>
                  <div className="text-sm">
                    {debugData.insumosAccess?.length > 0 ? (
                      <div className="space-y-1">
                        <p className="flex items-center">
                          <CheckCircle size={14} className="text-green-600 mr-1" />
                          {debugData.insumosAccess.length} insumos encontrados
                        </p>
                        {debugData.insumosAccess.slice(0, 3).map((ins: any, index: number) => (
                          <p key={index} className="text-xs text-gray-600">
                            • {ins.insumo_nome} (Acesso: {ins.has_access ? 'Sim' : 'Não'})
                          </p>
                        ))}
                      </div>
                    ) : (
                      <p className="flex items-center text-red-600">
                        <AlertTriangle size={14} className="mr-1" />
                        Nenhum insumo encontrado
                      </p>
                    )}
                  </div>
                </div>

                <div className="bg-gray-50 p-3 rounded-lg">
                  <h4 className="font-medium text-gray-800 mb-2">Contexto</h4>
                  <div className="text-xs space-y-1">
                    <p><strong>User ID:</strong> {user.id}</p>
                    <p><strong>Restaurant Context:</strong> {restaurante?.id || 'Não carregado'}</p>
                    <p><strong>Restaurant Nome:</strong> {restaurante?.nome || 'Não carregado'}</p>
                    <p><strong>Employee Restaurant ID:</strong> {employeeData?.restaurant_id || 'Não definido'}</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default EmployeeDebugPanel;