import React, { useState, useEffect } from "react";
import { Search, Plus, Edit, Trash2, Eye, EyeOff } from "lucide-react";
import Button from "../../components/ui/Button";
import { useAuth } from "../../contexts/AuthContext";
import { supabase } from "../../supabase";

interface Employee {
  id: string;
  name: string;
  cpf: string;
  role: string;
  password: string;
}

const EmployeeManagement: React.FC = () => {
  const { user } = useAuth();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [name, setName] = useState("");
  const [cpf, setCpf] = useState("");
  const [role, setRole] = useState("");
  const [password, setPassword] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState(""); // <-- agora está no lugar certo
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchEmployees();
  }, []);

  const fetchEmployees = async () => {
    const { data, error } = await supabase
      .from("employees")
      .select("*")
      .eq("user_id", user?.id);

    if (error) {
      console.error(error);
    } else {
      setEmployees(data || []);
    }
  };

  const handleSave = async () => {
    if (!name || !cpf || !role || !password) {
      setError("Preencha todos os campos.");
      return;
    }
    setError("");
    setLoading(true);

    if (editingId) {
      const { error } = await supabase
        .from("employees")
        .update({ name, cpf, role, password })
        .eq("id", editingId);
      if (!error) {
        fetchEmployees();
        clearForm();
      }
    } else {
      const { error } = await supabase.from("employees").insert([
        {
          name,
          cpf,
          role,
          password,
          user_id: user?.id,
        },
      ]);
      if (!error) {
        fetchEmployees();
        clearForm();
      }
    }
    setLoading(false);
  };

  const clearForm = () => {
    setName("");
    setCpf("");
    setRole("");
    setPassword("");
    setEditingId(null);
  };

  const handleEdit = (employee: Employee) => {
    setName(employee.name);
    setCpf(employee.cpf);
    setRole(employee.role);
    setPassword(employee.password);
    setEditingId(employee.id);
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from("employees").delete().eq("id", id);
    if (!error) {
      fetchEmployees();
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
        <input
          type="text"
          placeholder="CPF"
          className="border p-2 rounded"
          value={cpf}
          onChange={(e) => setCpf(e.target.value)}
        />
        <input
          type="text"
          placeholder="Função"
          className="border p-2 rounded"
          value={role}
          onChange={(e) => setRole(e.target.value)}
        />
        <div className="flex items-center border p-2 rounded">
          <input
            type={showPassword ? "text" : "password"}
            placeholder="Senha"
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
                      className="text-blue-500"
                    >
                      <Edit />
                    </button>
                    <button
                      onClick={() => handleDelete(employee.id)}
                      className="text-red-500"
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
