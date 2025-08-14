import React, { useState, useEffect } from "react";
import { Search, Plus, Edit, Trash2, Eye, EyeOff } from "lucide-react";
import Button from "../../components/ui/Button";
import { useAuth } from "../../contexts/AuthContext";
import EmployeeAuthService from "../../services/EmployeeAuthService";
import { supabase } from "../../services/supabase";

interface Employee {
  id: string;
  company_id: string;
  name: string;
  cpf: string;
  role: string;
  auth_user_id: string | null;
  active: boolean;
}

const EmployeeManagement: React.FC = () => {
  const { user } = useAuth();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [cpf, setCpf] = useState("");
  const [role, setRole] = useState("");
  const [password, setPassword] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState(""); // <-- agora está no lugar certo
  const [loading, setLoading] = useState(false);
  const [companyId, setCompanyId] = useState<string | null>(null);

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
      const employeesData = await EmployeeAuthService.getEmployeesWithAuth(companyId);
      setEmployees(employeesData);
    } catch (error) {
      console.error("Error fetching employees:", error);
    }
  };

  const handleSave = async () => {
    if (!name || !cpf || !role) {
      setError("Preencha todos os campos obrigatórios.");
      return;
    }

    if (!editingId && !email) {
      setError("Email é obrigatório para novos funcionários.");
      return;
    }

    if (!editingId && !password) {
      setError("Senha é obrigatória para novos funcionários.");
      return;
    }

    if (!companyId) {
      setError("Empresa não encontrada.");
      return;
    }

    setError("");
    setLoading(true);

    try {
      if (editingId) {
        // Atualizar funcionário existente
        const { error } = await supabase
          .from("employees")
          .update({ name, cpf, role })
          .eq("id", editingId);

        if (error) throw error;

        // Atualizar senha se fornecida
        if (password) {
          const employee = employees.find(emp => emp.id === editingId);
          if (employee?.auth_user_id) {
            await EmployeeAuthService.updateEmployeePassword(employee.auth_user_id, password);
          }
        }
      } else {
        // Criar novo funcionário
        await EmployeeAuthService.createEmployeeWithAuth(companyId, {
          name,
          email,
          cpf,
          role: role as 'waiter' | 'cashier' | 'stock' | 'kitchen',
          password,
        });
      }

      fetchEmployees();
      clearForm();
    } catch (error: any) {
      setError(error.message || "Erro ao salvar funcionário.");
    }

    setLoading(false);
  };

  const clearForm = () => {
    setName("");
    setEmail("");
    setCpf("");
    setRole("");
    setPassword("");
    setEditingId(null);
  };

  const handleEdit = (employee: Employee) => {
    setName(employee.name);
    setCpf(employee.cpf);
    setRole(employee.role);
    setPassword(""); // Clear password for security
    setEditingId(employee.id);
  };

  const handleDelete = async (id: string) => {
    try {
      await EmployeeAuthService.deleteEmployee(id);
      fetchEmployees();
    } catch (error: any) {
      setError(error.message || "Erro ao excluir funcionário.");
    }
  };

  // Filtro corrigido
  const filteredEmployees = employees.filter(
    (employee) =>
      employee.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      employee.cpf.includes(searchTerm)
  );

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Gerenciar Funcionários</h1>

      <div className="flex items-center mb-4">
        <Search className="w-5 h-5 mr-2" />
        <input
          type="text"
          placeholder="Pesquisar por nome ou CPF"
          className="border p-2 rounded w-full"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      {error && <div className="text-red-500 mb-2">{error}</div>}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        <input
          type="text"
          placeholder="Nome"
          className="border p-2 rounded"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        {!editingId && (
          <input
            type="email"
            placeholder="Email"
            className="border p-2 rounded"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        )}
        <input
          type="text"
          placeholder="CPF"
          className="border p-2 rounded"
          value={cpf}
          onChange={(e) => setCpf(e.target.value)}
        />
        <select
          value={role}
          onChange={(e) => setRole(e.target.value)}
          className="border p-2 rounded"
        >
          <option value="">Selecione a função</option>
          <option value="waiter">Garçom</option>
          <option value="cashier">Caixa</option>
          <option value="stock">Estoque</option>
          <option value="kitchen">Cozinha</option>
        </select>
        <div className="flex items-center border p-2 rounded">
          <input
            type={showPassword ? "text" : "password"}
            placeholder={editingId ? "Nova senha (opcional)" : "Senha"}
            className="flex-1 outline-none"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
          >
            {showPassword ? <EyeOff /> : <Eye />}
          </button>
        </div>
      </div>

      <Button onClick={handleSave} disabled={loading}>
        {loading ? "Salvando..." : editingId ? "Atualizar Funcionário" : "Adicionar Funcionário"}
      </Button>

      <div className="mt-6">
        {filteredEmployees.length === 0 ? (
          <p className="text-gray-500">Nenhum funcionário encontrado.</p>
        ) : (
          <table className="w-full border">
            <thead>
              <tr>
                <th className="border p-2">Nome</th>
                <th className="border p-2">CPF</th>
                <th className="border p-2">Função</th>
                <th className="border p-2">Ações</th>
              </tr>
            </thead>
            <tbody>
              {filteredEmployees.map((employee) => (
                <tr key={employee.id}>
                  <td className="border p-2">{employee.name}</td>
                  <td className="border p-2">{employee.cpf}</td>
                  <td className="border p-2">{employee.role}</td>
                  <td className="border p-2 flex gap-2">
                    <button
                      onClick={() => handleEdit(employee)}
                      className="text-blue-500 hover:text-blue-700 p-1"
                    >
                      <Edit />
                    </button>
                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        if (window.confirm('Tem certeza que deseja excluir este funcionário?')) {
                          handleDelete(employee.id);
                        }
                      }}
                      className="text-red-500 hover:text-red-700 p-1"
                    >
                      <Trash2 />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

export default EmployeeManagement;