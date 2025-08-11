import React, { useState, useEffect } from "react";
import {
  Users,
  UserPlus,
  Edit2,
  Trash2,
  Search,
  AlertTriangle,
  Key,
  Eye,
  EyeOff
} from "lucide-react";
import Button from "../../components/ui/Button";
import { useAuth } from "../../contexts/AuthContext";
import { supabase } from "../../services/supabase";
import toast from "react-hot-toast";

interface Employee {
  id: string;
  name: string;
  cpf: string;
  role: string;
  active: boolean;
  created_at: string;
  has_auth: boolean;
}

// Mapeamento de funções em inglês para português
const roleMappings: Record<string, string> = {
  waiter: "Garçom",
  kitchen: "Cozinha",
  cashier: "Caixa",
  stock: "Estoque",
  admin: "Administrador"
};

// Mapeamento inverso (português para inglês)
const roleReverseMapping: Record<string, string> = {
  Garçom: "waiter",
  Cozinha: "kitchen",
  Caixa: "cashier",
  Estoque: "stock",
  Administrador: "admin"
};

const EmployeeManagement: React.FC = () => {
  const { user } = useAuth();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(
    null
  );
  const [searchTerm, setSearchTerm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    cpf: "",
    role: "waiter"
  });

  useEffect(() => {
    if (user) {
      loadEmployees();
    }
  }, [user]);

  const loadEmployees = async () => {
    try {
      if (!user) return;

      const { data: companyData, error: companyError } = await supabase
        .from("company_profiles")
        .select("id")
        .eq("user_id", user.id)
        .maybeSingle();

      if (companyError) throw companyError;

      if (companyData) {
        const { data: employeesData, error: employeesError } = await supabase
          .from("employees")
          .select(
            `
            *,
            employee_auth!left(id)
          `
          )
          .eq("company_id", companyData.id)
          .order("name");

        if (employeesError) throw employeesError;

        const formattedEmployees = (employeesData || []).map((emp) => ({
          ...emp,
          has_auth: !!emp.employee_auth?.id
        }));

        setEmployees(formattedEmployees);
      }
    } catch (error) {
      console.error("Error loading employees:", error);
      toast.error("Erro ao carregar funcionários");
    }
  };

  const validateCPF = (cpf: string) => {
    const cpfRegex = /^\d{3}\.\d{3}\.\d{3}-\d{2}$/;
    return cpfRegex.test(cpf);
  };

  const formatCPF = (value: string) => {
    const digits = value.replace(/\D/g, "");
    return digits
      .replace(/(\d{3})(\d)/, "$1.$2")
      .replace(/(\d{3})(\d)/, "$1.$2")
      .replace(/(\d{3})(\d{1,2})/, "$1-$2")
      .slice(0, 14);
  };

  const handleCPFChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatCPF(e.target.value);
    setFormData({ ...formData, cpf: formatted });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (!validateCPF(formData.cpf)) {
        throw new Error("CPF inválido");
      }

      if (!user) throw new Error("User not authenticated");

      const { data: companyData, error: companyError } = await supabase
        .from("company_profiles")
        .select("id")
        .eq("user_id", user.id)
        .maybeSingle();

      if (companyError) throw companyError;

      if (!companyData) {
        toast.error(
          "Por favor, complete seu perfil empresarial antes de cadastrar funcionários",
          {
            duration: 5000
          }
        );
        window.location.href = "/profile/company";
        return;
      }

      if (selectedEmployee) {
        // Update existing employee
        const { error: employeeError } = await supabase
          .from("employees")
          .update({
            name: formData.name,
            cpf: formData.cpf,
            role: formData.role,
            updated_at: new Date().toISOString()
          })
          .eq("id", selectedEmployee.id);

        if (employeeError) throw employeeError;
      } else {
        // Create new employee
        const { data: newEmployee, error: employeeError } = await supabase
          .from("employees")
          .insert({
            company_id: companyData.id,
            name: formData.name,
            cpf: formData.cpf,
            role: formData.role
          })
          .select()
          .single();

        if (employeeError) throw employeeError;
      }

      await supabase.from("audit_logs").insert({
        user_id: user?.id,
        action_type: selectedEmployee ? "update" : "create",
        entity_type: "employee",
        entity_id: selectedEmployee?.id,
        details: {
          name: formData.name,
          role: formData.role,
          cpf: formData.cpf,
          changes: selectedEmployee
            ? {
                previous: {
                  name: selectedEmployee.name,
                  role: selectedEmployee.role
                },
                new: {
                  name: formData.name,
                  role: formData.role
                }
              }
            : null
        }
      });

      toast.success(
        selectedEmployee
          ? "Funcionário atualizado com sucesso!"
          : "Funcionário cadastrado com sucesso!"
      );
      setShowModal(false);
      loadEmployees();
      resetForm();
    } catch (error) {
      console.error("Error creating/updating employee:", error);
      toast.error(
        error instanceof Error ? error.message : "Erro ao salvar funcionário"
      );
    } finally {
      setLoading(false);
    }
  };

  const handleCreatePassword = async () => {
    if (!selectedEmployee) return;

    if (formData.password !== formData.confirmPassword) {
      toast.error("As senhas não conferem");
      return;
    }

    if (formData.password.length < 6) {
      toast.error("A senha deve ter no mínimo 6 caracteres");
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.rpc("create_employee_auth", {
        p_employee_id: selectedEmployee.id,
        p_cpf: selectedEmployee.cpf,
        p_password: formData.password
      });

      if (error) throw error;

      toast.success("Senha criada com sucesso!");
      setShowPasswordModal(false);
      setFormData({ ...formData, password: "", confirmPassword: "" });
      loadEmployees();
    } catch (error) {
      console.error("Error creating password:", error);
      toast.error("Erro ao criar senha");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedEmployee) return;

    setLoading(true);
    try {
      const { error } = await supabase
        .from("employees")
        .delete()
        .eq("id", selectedEmployee.id);

      if (error) throw error;

      await supabase.from("audit_logs").insert({
        user_id: user?.id,
        action_type: "delete",
        entity_type: "employee",
        entity_id: selectedEmployee.id,
        details: {
          name: selectedEmployee.name,
          role: selectedEmployee.role
        }
      });

      toast.success("Funcionário excluído com sucesso!");
      setShowDeleteModal(false);
      setSelectedEmployee(null);
      loadEmployees();
    } catch (error) {
      console.error("Error deleting employee:", error);
      toast.error("Erro ao excluir funcionário");
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      name: "",
      cpf: "",
      role: "waiter"
    });
  };

  const filteredEmployees = employees.filter(
    (employee) =>
      employee.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      employee.cpf.includes(searchTerm)
  );

  // Função para traduzir o role para português na exibição
  const getLocalizedRole = (role: string) => {
    return roleMappings[role] || role;
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm overflow-hidden">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center">
              <div className="p-2 bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-400 rounded-lg mr-4">
                <Users size={24} />
              </div>
              <div>
                <h2 className="text-lg font-medium text-gray-900 dark:text-white">
                  Gerenciar Funcionários
                </h2>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Cadastre e gerencie os funcionários da empresa
                </p>
              </div>
            </div>
            <Button
              variant="primary"
              icon={<UserPlus size={16} />}
              onClick={() => {
                resetForm();
                setSelectedEmployee(null);
                setShowModal(true);
              }}
            >
              Novo Funcionário
            </Button>
          </div>

          <div className="mb-6">
            <div className="relative">
              <Search
                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                size={20}
              />
              <input
                type="text"
                placeholder="Buscar por nome ou CPF..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 w-full rounded-lg border border-gray-300 py-2 px-4 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Nome
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    CPF
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Função
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Tipo
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Ações
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {filteredEmployees.map((employee) => (
                  <tr
                    key={employee.id}
                    className="hover:bg-gray-50 dark:hover:bg-gray-700"
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900 dark:text-white">
                        {employee.name}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-500 dark:text-gray-400">
                        {employee.cpf}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200">
                        {getLocalizedRole(employee.role)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          employee.active
                            ? "bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200"
                            : "bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200"
                        }`}
                      >
                        {employee.active ? "Ativo" : "Inativo"}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          employee.has_auth
                            ? "bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200"
                            : "bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200"
                        }`}
                      >
                        {employee.has_auth ? "Configurado" : "Pendente"}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex justify-end space-x-2">
                        {!employee.has_auth && (
                          <Button
                            variant="ghost"
                            size="sm"
                            icon={<Key size={16} />}
                            onClick={() => {
                              setSelectedEmployee(employee);
                              setFormData({
                                ...formData,
                                password: "",
                                confirmPassword: ""
                              });
                              setShowPasswordModal(true);
                            }}
                            className="text-green-600 dark:text-green-400"
                          >
                            Criar Senha
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          icon={<Edit2 size={16} />}
                          className="mr-2"
                          onClick={() => {
                            setSelectedEmployee(employee);
                            setFormData({
                              name: employee.name,
                              cpf: employee.cpf,
                              role: employee.role,
                              password: "",
                              confirmPassword: ""
                            });
                            setShowModal(true);
                          }}
                        >
                          Editar
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          icon={<Trash2 size={16} />}
                          className="text-red-600 dark:text-red-400"
                          onClick={() => {
                            setSelectedEmployee(employee);
                            setShowDeleteModal(true);
                          }}
                        >
                          Excluir
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {filteredEmployees.length === 0 && (
              <div className="text-center py-8">
                <p className="text-gray-500 dark:text-gray-400">
                  Nenhum funcionário encontrado
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Employee Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
            <div
              className="fixed inset-0 transition-opacity"
              aria-hidden="true"
            >
              <div className="absolute inset-0 bg-gray-500 opacity-75"></div>
            </div>

            <div className="inline-block align-bottom bg-white dark:bg-gray-800 rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
              <form onSubmit={handleSubmit}>
                <div className="px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                    {selectedEmployee
                      ? "Editar Funcionário"
                      : "Novo Funcionário"}
                  </h3>

                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                        Nome Completo
                      </label>
                      <input
                        type="text"
                        value={formData.name}
                        onChange={(e) =>
                          setFormData({ ...formData, name: e.target.value })
                        }
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white sm:text-sm"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                        CPF
                      </label>
                      <input
                        type="text"
                        value={formData.cpf}
                        onChange={handleCPFChange}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white sm:text-sm"
                        placeholder="000.000.000-00"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                        Função
                      </label>
                      <select
                        value={formData.role}
                        onChange={(e) =>
                          setFormData({ ...formData, role: e.target.value })
                        }
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white sm:text-sm"
                      >
                        <option value="waiter">Garçom</option>
                        <option value="kitchen">Cozinha</option>
                        <option value="cashier">Caixa</option>
                        <option value="stock">Estoque</option>
                      </select>
                    </div>

                    {!selectedEmployee && (
                      <>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                            Senha
                          </label>
                          <div className="mt-1 relative">
                            <input
                              type={showPassword ? "text" : "password"}
                              value={formData.password}
                              onChange={(e) =>
                                setFormData({
                                  ...formData,
                                  password: e.target.value
                                })
                              }
                              className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white sm:text-sm pr-10"
                              required={!selectedEmployee}
                              minLength={6}
                            />
                            <button
                              type="button"
                              onClick={() => setShowPassword(!showPassword)}
                              className="absolute inset-y-0 right-0 pr-3 flex items-center"
                            >
                              {showPassword ? (
                                <EyeOff size={16} className="text-gray-400" />
                              ) : (
                                <Eye size={16} className="text-gray-400" />
                              )}
                            </button>
                          </div>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                            Confirmar Senha
                          </label>
                          <input
                            type={showPassword ? "text" : "password"}
                            value={formData.confirmPassword}
                            onChange={(e) =>
                              setFormData({
                                ...formData,
                                confirmPassword: e.target.value
                              })
                            }
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white sm:text-sm"
                            required={!selectedEmployee}
                            minLength={6}
                          />
                        </div>
                      </>
                    )}
                  </div>
                </div>

                <div className="bg-gray-50 dark:bg-gray-700 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                  <Button
                    type="submit"
                    variant="primary"
                    isLoading={loading}
                    className="w-full sm:w-auto sm:ml-3"
                  >
                    {selectedEmployee ? "Atualizar" : "Cadastrar"}
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => {
                      setShowModal(false);
                      setSelectedEmployee(null);
                      resetForm();
                    }}
                    className="w-full sm:w-auto mt-3 sm:mt-0"
                  >
                    Cancelar
                  </Button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Password Modal */}
      {showPasswordModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
            <div
              className="fixed inset-0 transition-opacity"
              aria-hidden="true"
            >
              <div className="absolute inset-0 bg-gray-500 opacity-75"></div>
            </div>

            <div className="inline-block align-bottom bg-white dark:bg-gray-800 rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
              <div className="px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                  Criar Senha para {selectedEmployee?.name}
                </h3>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                      Nova Senha
                    </label>
                    <div className="mt-1 relative">
                      <input
                        type={showPassword ? "text" : "password"}
                        value={formData.password}
                        onChange={(e) =>
                          setFormData({ ...formData, password: e.target.value })
                        }
                        className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white sm:text-sm pr-10"
                        required
                        minLength={6}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute inset-y-0 right-0 pr-3 flex items-center"
                      >
                        {showPassword ? (
                          <EyeOff size={16} className="text-gray-400" />
                        ) : (
                          <Eye size={16} className="text-gray-400" />
                        )}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                      Confirmar Senha
                    </label>
                    <input
                      type={showPassword ? "text" : "password"}
                      value={formData.confirmPassword}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          confirmPassword: e.target.value
                        })
                      }
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white sm:text-sm"
                      required
                      minLength={6}
                    />
                  </div>
                </div>
              </div>

              <div className="bg-gray-50 dark:bg-gray-700 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                <Button
                  variant="primary"
                  onClick={handleCreatePassword}
                  isLoading={loading}
                  className="w-full sm:w-auto sm:ml-3"
                >
                  Criar Senha
                </Button>
                <Button
                  variant="ghost"
                  onClick={() => {
                    setShowPasswordModal(false);
                    setSelectedEmployee(null);
                    setFormData({
                      ...formData,
                      password: "",
                      confirmPassword: ""
                    });
                  }}
                  className="w-full sm:w-auto mt-3 sm:mt-0"
                >
                  Cancelar
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
            <div
              className="fixed inset-0 transition-opacity"
              aria-hidden="true"
            >
              <div className="absolute inset-0 bg-gray-500 opacity-75"></div>
            </div>

            <div className="inline-block align-bottom bg-white dark:bg-gray-800 rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
              <div className="bg-white dark:bg-gray-800 px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                <div className="sm:flex sm:items-start">
                  <div className="mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-red-100 sm:mx-0 sm:h-10 sm:w-10">
                    <AlertTriangle className="h-6 w-6 text-red-600" />
                  </div>
                  <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left">
                    <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                      Excluir Funcionário
                    </h3>
                    <div className="mt-2">
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        Tem certeza que deseja excluir este funcionário? Esta
                        ação não pode ser desfeita.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
              <div className="bg-gray-50 dark:bg-gray-700 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                <Button
                  variant="danger"
                  onClick={handleDelete}
                  isLoading={loading}
                  className="w-full sm:w-auto sm:ml-3"
                >
                  Excluir
                </Button>
                <Button
                  variant="ghost"
                  onClick={() => {
                    setShowDeleteModal(false);
                    setSelectedEmployee(null);
                  }}
                  className="w-full sm:w-auto mt-3 sm:mt-0"
                >
                  Cancelar
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EmployeeManagement;
