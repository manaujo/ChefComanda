import React, { useState, useEffect } from "react";
import { Search, Plus, CreditCard as Edit, Trash2, Eye, EyeOff, Users, UserPlus, Shield, Mail, Phone, Car as IdCard, Briefcase, CheckCircle, XCircle, AlertTriangle, Filter, RefreshCw, Settings, Crown, Star, Award, Zap, Clock, Activity, User } from "lucide-react";
import Button from "../../components/ui/Button";
import { useAuth } from "../../contexts/AuthContext";
import EmployeeAuthService from "../../services/EmployeeAuthService";
import { supabase } from "../../services/supabase";
import toast from "react-hot-toast";

interface Employee {
  id: string;
  company_id: string;
  name: string;
  cpf: string;
  role: string;
  auth_user_id: string | null;
  active: boolean;
  created_at: string;
  has_auth?: boolean;
}

const EmployeeManagement: React.FC = () => {
  const { user } = useAuth();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [showModal, setShowModal] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [loading, setLoading] = useState(false);
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    cpf: "",
    role: "",
    password: ""
  });

  const roleOptions = [
    { value: "waiter", label: "Garçom", icon: <Users className="w-4 h-4" />, color: "blue" },
    { value: "cashier", label: "Caixa", icon: <Shield className="w-4 h-4" />, color: "green" },
    { value: "stock", label: "Estoque", icon: <Briefcase className="w-4 h-4" />, color: "purple" },
    { value: "kitchen", label: "Cozinha", icon: <Crown className="w-4 h-4" />, color: "orange" }
  ];

  useEffect(() => {
    fetchCompanyId();
  }, [user]);

  useEffect(() => {
    if (companyId) {
      fetchEmployees();
    }
  }, [companyId]);

  const fetchCompanyId = async () => {
    if (!user?.id) return;

    const { data, error } = await supabase
      .from("company_profiles")
      .select("id")
      .eq("user_id", user.id)
      .single();

    if (error) {
      console.error("Error fetching company:", error);
    } else {
      setCompanyId(data.id);
    }
  };

  const fetchEmployees = async () => {
    if (!companyId) return;

    try {
      setLoading(true);
      const employeesData = await EmployeeAuthService.getEmployeesWithAuth(companyId);
      setEmployees(employeesData);
    } catch (error) {
      console.error("Error fetching employees:", error);
      toast.error("Erro ao carregar funcionários");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name || !formData.cpf || !formData.role) {
      toast.error("Preencha todos os campos obrigatórios.");
      return;
    }

    if (!editingEmployee && !formData.email) {
      toast.error("Email é obrigatório para novos funcionários.");
      return;
    }

    if (!editingEmployee && !formData.password) {
      toast.error("Senha é obrigatória para novos funcionários.");
      return;
    }

    if (!companyId) {
      toast.error("Empresa não encontrada.");
      return;
    }

    setLoading(true);

    try {
      if (editingEmployee) {
        // Atualizar funcionário existente
        const { error } = await supabase
          .from("employees")
          .update({ 
            name: formData.name, 
            cpf: formData.cpf, 
            role: formData.role 
          })
          .eq("id", editingEmployee.id);

        if (error) throw error;

        // Atualizar senha se fornecida
        if (formData.password && editingEmployee.auth_user_id) {
          await EmployeeAuthService.updateEmployeePassword(editingEmployee.auth_user_id, formData.password);
        }

        toast.success("Funcionário atualizado com sucesso!");
      } else {
        // Criar novo funcionário
        await EmployeeAuthService.createEmployeeWithAuth(companyId, {
          name: formData.name,
          email: formData.email,
          cpf: formData.cpf,
          role: formData.role as 'waiter' | 'cashier' | 'stock' | 'kitchen',
          password: formData.password,
        });

        toast.success("Funcionário criado com sucesso!");
      }

      fetchEmployees();
      resetForm();
      setShowModal(false);
    } catch (error: any) {
      toast.error(error.message || "Erro ao salvar funcionário.");
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      name: "",
      email: "",
      cpf: "",
      role: "",
      password: ""
    });
    setEditingEmployee(null);
  };

  const handleEdit = (employee: Employee) => {
    setEditingEmployee(employee);
    setFormData({
      name: employee.name,
      email: "", // Não mostrar email por segurança
      cpf: employee.cpf,
      role: employee.role,
      password: "" // Limpar senha por segurança
    });
    setShowModal(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Tem certeza que deseja excluir este funcionário?")) return;

    try {
      setLoading(true);
      await EmployeeAuthService.deleteEmployee(id);
      await fetchEmployees();
      toast.success("Funcionário excluído com sucesso!");
    } catch (error: any) {
      toast.error(error.message || "Erro ao excluir funcionário.");
    } finally {
      setLoading(false);
    }
  };

  const getRoleInfo = (role: string) => {
    return roleOptions.find(r => r.value === role) || { 
      value: role, 
      label: role, 
      icon: <User className="w-4 h-4" />, 
      color: "gray" 
    };
  };

  const getRoleColor = (role: string) => {
    const colors: Record<string, string> = {
      waiter: "bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-200",
      cashier: "bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-200",
      stock: "bg-purple-100 text-purple-800 dark:bg-purple-900/50 dark:text-purple-200",
      kitchen: "bg-orange-100 text-orange-800 dark:bg-orange-900/50 dark:text-orange-200"
    };
    return colors[role] || "bg-gray-100 text-gray-800 dark:bg-gray-900/50 dark:text-gray-200";
  };

  const formatCPF = (value: string) => {
    return value
      .replace(/\D/g, "")
      .replace(/(\d{3})(\d)/, "$1.$2")
      .replace(/(\d{3})(\d)/, "$1.$2")
      .replace(/(\d{3})(\d{1,2})/, "$1-$2")
      .replace(/(-\d{2})\d+?$/, "$1");
  };

  // Filtrar funcionários
  const filteredEmployees = employees.filter((employee) => {
    const matchSearch = employee.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                       employee.cpf.includes(searchTerm);
    const matchRole = roleFilter === "all" || employee.role === roleFilter;
    const matchStatus = statusFilter === "all" || 
                       (statusFilter === "active" && employee.active) ||
                       (statusFilter === "inactive" && !employee.active);
    
    return matchSearch && matchRole && matchStatus;
  });

  const activeEmployees = employees.filter(emp => emp.active).length;
  const inactiveEmployees = employees.filter(emp => !emp.active).length;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50/30 to-indigo-50/30 dark:from-gray-900 dark:via-gray-800 dark:to-gray-700">
      <div className="p-6 w-full">
        {/* Header Moderno */}
        <div className="mb-8">
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center">
            <div className="mb-6 lg:mb-0">
              <div className="flex items-center mb-4">
                <div className="relative">
                  <div className="p-4 bg-gradient-to-br from-blue-500 via-blue-600 to-indigo-600 rounded-3xl shadow-2xl mr-6 transform rotate-3 hover:rotate-0 transition-transform duration-300">
                    <Users size={32} className="text-white" />
                  </div>
                  <div className="absolute -top-2 -right-2 w-6 h-6 bg-gradient-to-r from-yellow-400 to-orange-500 rounded-full flex items-center justify-center shadow-lg">
                    <Star className="w-3 h-3 text-white" />
                  </div>
                </div>
                <div>
                  <h1 className="text-4xl font-bold bg-gradient-to-r from-gray-900 via-blue-800 to-indigo-900 dark:from-white dark:via-blue-200 dark:to-indigo-200 bg-clip-text text-transparent">
                    Gerenciar Funcionários
                  </h1>
                  <p className="text-xl text-gray-600 dark:text-gray-400 mt-2">
                    Controle completo da sua equipe
                  </p>
                </div>
              </div>
            </div>
            
            <div className="flex flex-wrap gap-3">
              <Button
                variant="ghost"
                icon={<RefreshCw size={18} />}
                onClick={fetchEmployees}
                isLoading={loading}
                className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm shadow-lg hover:shadow-xl transition-all duration-300 border border-white/20 dark:border-gray-700/50"
              >
                Atualizar
              </Button>
              <Button
                onClick={() => {
                  resetForm();
                  setShowModal(true);
                }}
                className="bg-gradient-to-r from-blue-600 via-blue-700 to-indigo-700 hover:from-blue-700 hover:via-blue-800 hover:to-indigo-800 text-white px-8 py-3 rounded-2xl flex items-center gap-3 transition-all duration-300 shadow-xl hover:shadow-2xl transform hover:scale-105 active:scale-95"
              >
                <UserPlus className="w-5 h-5" />
                <span className="font-semibold">Novo Funcionário</span>
              </Button>
            </div>
          </div>
        </div>

        {/* Cards de Estatísticas */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-3xl shadow-xl p-6 text-white transform hover:scale-105 transition-all duration-300">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-blue-100 text-sm font-medium">Total</p>
                <p className="text-3xl font-bold mt-1">{employees.length}</p>
                <p className="text-blue-100 text-xs mt-1">Funcionários</p>
              </div>
              <div className="p-3 bg-white/20 backdrop-blur-sm rounded-2xl">
                <Users size={28} />
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-3xl shadow-xl p-6 text-white transform hover:scale-105 transition-all duration-300">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-green-100 text-sm font-medium">Ativos</p>
                <p className="text-3xl font-bold mt-1">{activeEmployees}</p>
                <p className="text-green-100 text-xs mt-1">Trabalhando</p>
              </div>
              <div className="p-3 bg-white/20 backdrop-blur-sm rounded-2xl">
                <CheckCircle size={28} />
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-red-500 to-red-600 rounded-3xl shadow-xl p-6 text-white transform hover:scale-105 transition-all duration-300">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-red-100 text-sm font-medium">Inativos</p>
                <p className="text-3xl font-bold mt-1">{inactiveEmployees}</p>
                <p className="text-red-100 text-xs mt-1">Desativados</p>
              </div>
              <div className="p-3 bg-white/20 backdrop-blur-sm rounded-2xl">
                <XCircle size={28} />
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-3xl shadow-xl p-6 text-white transform hover:scale-105 transition-all duration-300">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-purple-100 text-sm font-medium">Com Acesso</p>
                <p className="text-3xl font-bold mt-1">
                  {employees.filter(emp => emp.has_auth).length}
                </p>
                <p className="text-purple-100 text-xs mt-1">Sistema</p>
              </div>
              <div className="p-3 bg-white/20 backdrop-blur-sm rounded-2xl">
                <Shield size={28} />
              </div>
            </div>
          </div>
        </div>

        {/* Filtros Modernos */}
        <div className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm rounded-3xl shadow-xl border border-white/20 dark:border-gray-700/50 p-6 mb-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Buscar por nome ou CPF..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-4 bg-gray-50/50 dark:bg-gray-700/50 border border-gray-200/50 dark:border-gray-600/50 rounded-2xl focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-blue-500 dark:focus:border-blue-400 transition-all duration-200 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
              />
            </div>

            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="px-4 py-4 bg-gray-50/50 dark:bg-gray-700/50 border border-gray-200/50 dark:border-gray-600/50 rounded-2xl focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-blue-500 dark:focus:border-blue-400 transition-all duration-200 text-gray-900 dark:text-white"
            >
              <option value="all">Todas as funções</option>
              {roleOptions.map(role => (
                <option key={role.value} value={role.value}>{role.label}</option>
              ))}
            </select>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-4 py-4 bg-gray-50/50 dark:bg-gray-700/50 border border-gray-200/50 dark:border-gray-600/50 rounded-2xl focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-blue-500 dark:focus:border-blue-400 transition-all duration-200 text-gray-900 dark:text-white"
            >
              <option value="all">Todos os status</option>
              <option value="active">Ativos</option>
              <option value="inactive">Inativos</option>
            </select>

            <div className="flex items-center justify-center bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-700 dark:to-gray-600 rounded-2xl px-4 py-4">
              <span className="text-lg font-bold text-gray-700 dark:text-gray-300">
                {filteredEmployees.length} {filteredEmployees.length === 1 ? 'funcionário' : 'funcionários'}
              </span>
            </div>
          </div>
        </div>

        {/* Lista de Funcionários */}
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="relative">
              <div className="w-20 h-20 border-4 border-blue-200 dark:border-blue-800 border-t-blue-600 dark:border-t-blue-400 rounded-full animate-spin mx-auto mb-4"></div>
              <div className="absolute inset-0 flex items-center justify-center">
                <Users className="w-8 h-8 text-blue-600 dark:text-blue-400" />
              </div>
            </div>
          </div>
        ) : filteredEmployees.length === 0 ? (
          <div className="text-center py-16">
            <div className="relative mb-8">
              <div className="w-32 h-32 bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-700 dark:to-gray-600 rounded-full mx-auto flex items-center justify-center shadow-2xl">
                <Users className="w-16 h-16 text-gray-400 dark:text-gray-500" />
              </div>
              <div className="absolute -top-2 -right-2 w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center shadow-lg transform translate-x-16">
                <Star className="w-4 h-4 text-white" />
              </div>
            </div>
            <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
              {searchTerm || roleFilter !== "all" || statusFilter !== "all" 
                ? 'Nenhum funcionário encontrado' 
                : 'Sua equipe está vazia'
              }
            </h3>
            <p className="text-lg text-gray-600 dark:text-gray-400 mb-8 max-w-md mx-auto">
              {searchTerm || roleFilter !== "all" || statusFilter !== "all" 
                ? 'Tente ajustar os filtros de busca para encontrar o que procura'
                : 'Comece adicionando seu primeiro funcionário para gerenciar sua equipe'
              }
            </p>
            <Button
              onClick={() => {
                resetForm();
                setShowModal(true);
              }}
              className="bg-gradient-to-r from-blue-600 via-blue-700 to-indigo-700 hover:from-blue-700 hover:via-blue-800 hover:to-indigo-800 text-white px-8 py-4 rounded-2xl font-semibold shadow-xl hover:shadow-2xl transform hover:scale-105 transition-all duration-300"
              icon={<UserPlus size={20} />}
            >
              Adicionar Primeiro Funcionário
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredEmployees.map((employee) => {
              const roleInfo = getRoleInfo(employee.role);
              return (
                <div 
                  key={employee.id}
                  className="group bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm rounded-3xl shadow-xl border border-white/20 dark:border-gray-700/50 overflow-hidden hover:shadow-2xl transition-all duration-300 hover:transform hover:scale-105"
                >
                  {/* Header do Card */}
                  <div className={`p-6 bg-gradient-to-r ${
                    employee.role === 'waiter' ? 'from-blue-500 to-blue-600' :
                    employee.role === 'cashier' ? 'from-green-500 to-green-600' :
                    employee.role === 'stock' ? 'from-purple-500 to-purple-600' :
                    employee.role === 'kitchen' ? 'from-orange-500 to-orange-600' :
                    'from-gray-500 to-gray-600'
                  }`}>
                    <div className="flex justify-between items-start">
                      <div className="flex items-center">
                        <div className="p-3 bg-white/20 backdrop-blur-sm rounded-2xl mr-4">
                          {roleInfo.icon}
                        </div>
                        <div className="text-white">
                          <h3 className="text-xl font-bold">{employee.name}</h3>
                          <p className="text-sm opacity-90">{roleInfo.label}</p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        {employee.active ? (
                          <div className="p-2 bg-green-500/20 rounded-full">
                            <CheckCircle className="w-5 h-5 text-white" />
                          </div>
                        ) : (
                          <div className="p-2 bg-red-500/20 rounded-full">
                            <XCircle className="w-5 h-5 text-white" />
                          </div>
                        )}
                        {employee.has_auth && (
                          <div className="p-2 bg-yellow-500/20 rounded-full">
                            <Shield className="w-5 h-5 text-white" />
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Conteúdo do Card */}
                  <div className="p-6">
                    <div className="space-y-4 mb-6">
                      <div className="flex items-center justify-between p-3 bg-gray-50/50 dark:bg-gray-700/50 rounded-xl">
                        <div className="flex items-center">
                          <IdCard className="w-4 h-4 text-gray-600 dark:text-gray-400 mr-2" />
                          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">CPF</span>
                        </div>
                        <span className="font-semibold text-gray-900 dark:text-white">
                          {employee.cpf}
                        </span>
                      </div>

                      <div className="flex items-center justify-between p-3 bg-gray-50/50 dark:bg-gray-700/50 rounded-xl">
                        <div className="flex items-center">
                          <Clock className="w-4 h-4 text-gray-600 dark:text-gray-400 mr-2" />
                          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Criado em</span>
                        </div>
                        <span className="font-semibold text-gray-900 dark:text-white">
                          {new Date(employee.created_at).toLocaleDateString('pt-BR')}
                        </span>
                      </div>

                      <div className="flex items-center justify-between p-3 bg-gray-50/50 dark:bg-gray-700/50 rounded-xl">
                        <div className="flex items-center">
                          <Activity className="w-4 h-4 text-gray-600 dark:text-gray-400 mr-2" />
                          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Status</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                            employee.active 
                              ? 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-200'
                              : 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-200'
                          }`}>
                            {employee.active ? 'Ativo' : 'Inativo'}
                          </span>
                          {employee.has_auth && (
                            <span className="px-3 py-1 rounded-full text-xs font-bold bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-200">
                              Sistema
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Botões de Ação */}
                    <div className="flex gap-3">
                      <Button
                        onClick={() => handleEdit(employee)}
                        variant="primary"
                        size="sm"
                        className="flex-1 bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white rounded-2xl py-3 font-semibold shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-105"
                        icon={<Edit size={16} />}
                      >
                        Editar
                      </Button>
                      <Button
                        onClick={() => handleDelete(employee.id)}
                        variant="danger"
                        size="sm"
                        className="bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white rounded-2xl py-3 font-semibold shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-105"
                        icon={<Trash2 size={16} />}
                      >
                        Excluir
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Modal de Adicionar/Editar Funcionário */}
        {showModal && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <div className="bg-white/95 dark:bg-gray-800/95 backdrop-blur-sm rounded-3xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-white/20 dark:border-gray-700/50">
              {/* Header do Modal */}
              <div className="relative overflow-hidden">
                <div className="bg-gradient-to-r from-blue-600 via-blue-700 to-indigo-700 p-8">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16"></div>
                  <div className="relative flex justify-between items-center">
                    <div className="flex items-center">
                      <div className="p-3 bg-white/20 backdrop-blur-sm rounded-2xl mr-4">
                        <UserPlus size={24} className="text-white" />
                      </div>
                      <div className="text-white">
                        <h2 className="text-2xl font-bold">
                          {editingEmployee ? 'Editar Funcionário' : 'Novo Funcionário'}
                        </h2>
                        <p className="text-blue-100">
                          {editingEmployee ? 'Atualize os dados do funcionário' : 'Adicione um novo membro à sua equipe'}
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        setShowModal(false);
                        resetForm();
                      }}
                      className="p-2 text-white/70 hover:text-white hover:bg-white/20 rounded-xl transition-colors"
                    >
                      <XCircle size={24} />
                    </button>
                  </div>
                </div>
              </div>
              
              <form onSubmit={handleSubmit} className="p-8 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="md:col-span-2">
                    <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-3">
                      Nome Completo
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                        <User className="w-5 h-5 text-gray-400 dark:text-gray-500" />
                      </div>
                      <input
                        type="text"
                        required
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        className="w-full pl-12 pr-4 py-4 bg-gray-50/50 dark:bg-gray-700/50 border border-gray-200/50 dark:border-gray-600/50 rounded-2xl focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-blue-500 dark:focus:border-blue-400 transition-all duration-200 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
                        placeholder="Nome completo do funcionário"
                      />
                    </div>
                  </div>

                  {!editingEmployee && (
                    <div>
                      <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-3">
                        E-mail
                      </label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                          <Mail className="w-5 h-5 text-gray-400 dark:text-gray-500" />
                        </div>
                        <input
                          type="email"
                          required
                          value={formData.email}
                          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                          className="w-full pl-12 pr-4 py-4 bg-gray-50/50 dark:bg-gray-700/50 border border-gray-200/50 dark:border-gray-600/50 rounded-2xl focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-blue-500 dark:focus:border-blue-400 transition-all duration-200 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
                          placeholder="email@exemplo.com"
                        />
                      </div>
                    </div>
                  )}

                  <div>
                    <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-3">
                      CPF
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                        <IdCard className="w-5 h-5 text-gray-400 dark:text-gray-500" />
                      </div>
                      <input
                        type="text"
                        required
                        value={formData.cpf}
                        onChange={(e) => setFormData({ ...formData, cpf: formatCPF(e.target.value) })}
                        className="w-full pl-12 pr-4 py-4 bg-gray-50/50 dark:bg-gray-700/50 border border-gray-200/50 dark:border-gray-600/50 rounded-2xl focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-blue-500 dark:focus:border-blue-400 transition-all duration-200 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
                        placeholder="000.000.000-00"
                        maxLength={14}
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-3">
                      Função
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                        <Briefcase className="w-5 h-5 text-gray-400 dark:text-gray-500" />
                      </div>
                      <select
                        required
                        value={formData.role}
                        onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                        className="w-full pl-12 pr-4 py-4 bg-gray-50/50 dark:bg-gray-700/50 border border-gray-200/50 dark:border-gray-600/50 rounded-2xl focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-blue-500 dark:focus:border-blue-400 transition-all duration-200 text-gray-900 dark:text-white appearance-none"
                      >
                        <option value="">Selecione a função</option>
                        {roleOptions.map(role => (
                          <option key={role.value} value={role.value}>
                            {role.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-3">
                      {editingEmployee ? 'Nova Senha (opcional)' : 'Senha'}
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                        <Shield className="w-5 h-5 text-gray-400 dark:text-gray-500" />
                      </div>
                      <input
                        type={showPassword ? "text" : "password"}
                        required={!editingEmployee}
                        value={formData.password}
                        onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                        className="w-full pl-12 pr-12 py-4 bg-gray-50/50 dark:bg-gray-700/50 border border-gray-200/50 dark:border-gray-600/50 rounded-2xl focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-blue-500 dark:focus:border-blue-400 transition-all duration-200 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
                        placeholder={editingEmployee ? "Deixe vazio para manter a senha atual" : "Senha de acesso"}
                        minLength={6}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute inset-y-0 right-0 pr-4 flex items-center hover:bg-gray-100/50 dark:hover:bg-gray-600/50 rounded-r-2xl transition-colors"
                      >
                        {showPassword ? (
                          <EyeOff className="w-5 h-5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors" />
                        ) : (
                          <Eye className="w-5 h-5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors" />
                        )}
                      </button>
                    </div>
                    {!editingEmployee && (
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                        Mínimo 6 caracteres. O funcionário usará esta senha para fazer login.
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex gap-4 pt-6">
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => {
                      setShowModal(false);
                      resetForm();
                    }}
                    className="flex-1 bg-gray-100/80 dark:bg-gray-700/80 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-2xl py-4 font-semibold transition-all duration-200"
                  >
                    Cancelar
                  </Button>
                  <Button
                    type="submit"
                    isLoading={loading}
                    className="flex-1 bg-gradient-to-r from-blue-600 via-blue-700 to-indigo-700 hover:from-blue-700 hover:via-blue-800 hover:to-indigo-800 text-white rounded-2xl py-4 font-semibold shadow-xl hover:shadow-2xl transition-all duration-200 transform hover:scale-105"
                  >
                    {editingEmployee ? 'Atualizar' : 'Criar'} Funcionário
                  </Button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default EmployeeManagement;