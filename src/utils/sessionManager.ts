/**
 * Gerenciador de sessão para manter estado entre mudanças de aba
 */
export class SessionManager {
  private static readonly PREFIX = 'chefcomanda_';

  /**
   * Salva dados no sessionStorage com prefixo
   */
  static save(key: string, data: any): void {
    try {
      const serialized = JSON.stringify(data);
      sessionStorage.setItem(this.PREFIX + key, serialized);
    } catch (error) {
      console.error('Error saving to session:', error);
    }
  }

  /**
   * Recupera dados do sessionStorage
   */
  static load<T>(key: string, defaultValue: T): T {
    try {
      const item = sessionStorage.getItem(this.PREFIX + key);
      if (item) {
        return JSON.parse(item);
      }
    } catch (error) {
      console.error('Error loading from session:', error);
    }
    return defaultValue;
  }

  /**
   * Remove dados do sessionStorage
   */
  static remove(key: string): void {
    sessionStorage.removeItem(this.PREFIX + key);
  }

  /**
   * Limpa todos os dados da aplicação do sessionStorage
   */
  static clear(): void {
    const keys = Object.keys(sessionStorage);
    keys.forEach(key => {
      if (key.startsWith(this.PREFIX)) {
        sessionStorage.removeItem(key);
      }
    });
  }

  /**
   * Salva o estado atual da página
   */
  static savePageState(page: string, state: any): void {
    this.save(`page_${page}`, {
      ...state,
      timestamp: Date.now()
    });
  }

  /**
   * Recupera o estado da página
   */
  static loadPageState<T>(page: string, defaultState: T, maxAge: number = 30 * 60 * 1000): T {
    const saved = this.load(`page_${page}`, null);
    
    if (saved && saved.timestamp) {
      const age = Date.now() - saved.timestamp;
      if (age <= maxAge) {
        const { timestamp, ...state } = saved;
        return { ...defaultState, ...state };
      }
    }
    
    return defaultState;
  }
}