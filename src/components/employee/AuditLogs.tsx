import React, { useState, useEffect } from 'react';
import { Search, Filter, Download, FileSpreadsheet, Clock, User, Activity } from 'lucide-react';
import Button from '../ui/Button';
import { supabase } from '../../services/supabase';
import toast from 'react-hot-toast';

interface AuditLog {
  id: string;
  user_id: string;
  action_type: string;
  entity_type: string;
  entity_id?: string;
  details?: any;
  ip_address?: string;
  created_at: string;
  user_email?: string;
  user_name?: string;
  user_role?: string;
}

const AuditLogs: React.FC = () => {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState({
    actionType: 'all',
    startDate: '',
    endDate: '',
    userId: ''
  });
  const [users, setUsers] = useState<Array<{ id: string; name: string }>>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const itemsPerPage = 10;

  useEffect(() => {
    loadLogs();
    loadUsers();
  }, [page, filters]);

  const loadUsers = async () => {
    try {
      // Get users from profiles table instead of trying to join with auth.users
      const { data, error } = await supabase
        .from('profiles')
        .select('id, name');

      if (error) throw error;

      const formattedUsers = data.map(profile => ({
        id: profile.id,
        name: profile.name || 'Usuário sem nome'
      }));

      setUsers(formattedUsers);
    } catch (error) {
      console.error('Error loading users:', error);
      if (!(error instanceof Error && error.message.includes('Failed to fetch'))) {
        toast.error('Erro ao carregar usuários');
      }
    }
  };

  const loadLogs = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('audit_logs')
        .select('*', { count: 'exact' });

      // Apply filters
      if (filters.actionType !== 'all') {
        query = query.eq('action_type', filters.actionType);
      }
      
      if (filters.startDate) {
        query = query.gte('created_at', filters.startDate);
      }
      
      if (filters.endDate) {
        query = query.lte('created_at', filters.endDate);
      }
      
      if (filters.userId) {
        query = query.eq('user_id', filters.userId);
      }

      // Add search term filter
      if (searchTerm) {
        query = query.or(`action_type.ilike.%${searchTerm}%,entity_type.ilike.%${searchTerm}%`);
      }

      // Add pagination
      const from = (page - 1) * itemsPerPage;
      const to = from + itemsPerPage - 1;
      
      const { data: logsData, count, error } = await query
        .order('created_at', { ascending: false })
        .range(from, to);

      if (error) throw error;

      // Enrich logs with user data
      const enrichedLogs = await Promise.all(
        (logsData || []).map(async (log) => {
          try {
            // Get user profile data
            const { data: profileData } = await supabase
              .from('profiles')
              .select('name')
              .eq('id', log.user_id)
              .single();

            // Get user role data
            const { data: roleData } = await supabase
              .from('user_roles')
              .select('role')
              .eq('user_id', log.user_id)
              .single();

            return {
              ...log,
              user_name: profileData?.name || 'Usuário desconhecido',
              user_role: roleData?.role || 'N/A'
            };
          } catch (enrichError) {
            console.error('Error enriching log:', enrichError);
            return {
              ...log,
              user_name: 'Usuário desconhecido',
              user_role: 'N/A'
            };
          }
        })
      );

      setLogs(enrichedLogs);
      setTotalPages(Math.ceil((count || 0) / itemsPerPage));
    } catch (error) {
      console.error('Error loading audit logs:', error);
      if (!(error instanceof Error && error.message.includes('Failed to fetch'))) {
        toast.error('Erro ao carregar logs de auditoria');
      }
    } finally {
      setLoading(false);
    }
  };

  const formatDateTime = (dateStr: string) => {
    return new Date(dateStr).toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const exportLogs = (format: 'excel' | 'pdf') => {
    toast.success(`Logs exportados em ${format.toUpperCase()}`);
  };

  const getActionTypeColor = (actionType: string) => {
    const colors = {
      'create': 'bg-green-100 text-green-800',
      'update': 'bg-blue-100 text-blue-800',
      'delete': 'bg-red-100 text-red-800',
      'login': 'bg-purple-100 text-purple-800',
      'logout': 'bg-gray-100 text-gray-800'
    } as Record<string, string>;

    return colors[actionType] || 'bg-gray-100 text-gray-800';
  };

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="bg-white rounded-lg shadow-sm p-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
            <input
              type="text"
              placeholder="Buscar logs..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 w-full rounded-lg border border-gray-300 py-2 px-4 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div>
            <select
              value={filters.actionType}
              onChange={(e) => setFilters({ ...filters, actionType: e.target.value })}
              className="w-full border border-gray-300 rounded-md py-2 pl-3 pr-10 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="all">Todas as ações</option>
              <option value="create">Criação</option>
              <option value="update">Atualização</option>
              <option value="delete">Exclusão</option>
              <option value="login">Login</option>
              <option value="logout">Logout</option>
            </select>
          </div>

          <div>
            <select
              value={filters.userId}
              onChange={(e) => setFilters({ ...filters, userId: e.target.value })}
              className="w-full border border-gray-300 rounded-md py-2 pl-3 pr-10 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">Todos os usuários</option>
              {users.map(user => (
                <option key={user.id} value={user.id}>
                  {user.name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex space-x-2">
            <input
              type="date"
              value={filters.startDate}
              onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
              className="w-full border border-gray-300 rounded-md py-2 px-3 focus:ring-blue-500 focus:border-blue-500"
            />
            <input
              type="date"
              value={filters.endDate}
              onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
              className="w-full border border-gray-300 rounded-md py-2 px-3 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex justify-end space-x-3">
        <Button
          variant="ghost"
          icon={<FileSpreadsheet size={18} />}
          onClick={() => exportLogs('excel')}
        >
          Excel
        </Button>
        <Button
          variant="ghost"
          icon={<Download size={18} />}
          onClick={() => exportLogs('pdf')}
        >
          PDF
        </Button>
      </div>

      {/* Logs Table */}
      <div className="bg-white rounded-lg shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Data/Hora
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Usuário
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Ação
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Detalhes
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {logs.map((log) => (
                <tr key={log.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    <div className="flex items-center">
                      <Clock size={16} className="mr-2" />
                      {formatDateTime(log.created_at)}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <User size={16} className="mr-2" />
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {log.user_name}
                        </div>
                        <div className="text-sm text-gray-500">
                          {log.user_role}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getActionTypeColor(log.action_type)}`}>
                      {log.action_type}
                    </span>
                    <span className="ml-2 text-sm text-gray-500">
                      {log.entity_type}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    {log.details && (
                      <pre className="whitespace-pre-wrap font-mono text-xs max-w-xs overflow-hidden">
                        {JSON.stringify(log.details, null, 2)}
                      </pre>
                    )}
                  </td>
                </tr>
              ))}

              {logs.length === 0 && !loading && (
                <tr>
                  <td colSpan={4} className="px-6 py-4 text-center text-gray-500">
                    Nenhum log encontrado
                  </td>
                </tr>
              )}

              {loading && (
                <tr>
                  <td colSpan={4} className="px-6 py-4 text-center text-gray-500">
                    Carregando logs...
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6">
            <div className="flex-1 flex justify-between sm:hidden">
              <Button
                variant="ghost"
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
              >
                Anterior
              </Button>
              <Button
                variant="ghost"
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
              >
                Próxima
              </Button>
            </div>
            <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
              <div>
                <p className="text-sm text-gray-700">
                  Mostrando página <span className="font-medium">{page}</span> de{' '}
                  <span className="font-medium">{totalPages}</span>
                </p>
              </div>
              <div>
                <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px">
                  <Button
                    variant="ghost"
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    disabled={page === 1}
                  >
                    Anterior
                  </Button>
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    let pageNum;
                    if (totalPages <= 5) {
                      pageNum = i + 1;
                    } else if (page <= 3) {
                      pageNum = i + 1;
                    } else if (page >= totalPages - 2) {
                      pageNum = totalPages - 4 + i;
                    } else {
                      pageNum = page - 2 + i;
                    }
                    
                    return (
                      <button
                        key={pageNum}
                        onClick={() => setPage(pageNum)}
                        className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${
                          page === pageNum
                            ? 'z-10 bg-blue-50 border-blue-500 text-blue-600'
                            : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50'
                        }`}
                      >
                        {pageNum}
                      </button>
                    );
                  })}
                  <Button
                    variant="ghost"
                    onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                  >
                    Próxima
                  </Button>
                </nav>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AuditLogs;