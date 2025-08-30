import axios, { AxiosError, AxiosResponse } from 'axios';

// Configuração da API
const API_BASE_URL = import.meta.env.VITE_API_URL || '';

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Tipos para tratamento de erro
interface ApiError {
  message: string;
  status?: number;
  details?: string[];
}

// Interceptador de requisição
api.interceptors.request.use(
  (config) => {
    if (process.env.NODE_ENV === 'development') {
      console.log('🚀 Requisição:', config.method?.toUpperCase(), config.url);
    }
    return config;
  },
  (error: AxiosError) => {
    console.error('❌ Erro na requisição:', error);
    return Promise.reject(error);
  }
);

// Interceptador de resposta
api.interceptors.response.use(
  (response: AxiosResponse) => {
    if (process.env.NODE_ENV === 'development') {
      console.log('✅ Resposta:', response.status, response.config.url);
    }
    return response;
  },
  (error: AxiosError<ApiError>) => {
    let errorMessage = error.response?.data?.message || error.message || 'Erro desconhecido';
    const errorStatus = error.response?.status;
    
    // Mensagens mais específicas baseadas no status
    if (errorStatus === 404) {
      errorMessage = 'Recurso não encontrado';
    } else if (errorStatus === 500) {
      errorMessage = 'Erro interno do servidor. Tente novamente em alguns instantes.';
    } else if (errorStatus === 400) {
      errorMessage = error.response?.data?.message || 'Dados inválidos enviados';
    } else if (errorStatus === 401) {
      errorMessage = 'Não autorizado. Verifique suas credenciais.';
    } else if (errorStatus === 403) {
      errorMessage = 'Acesso negado';
    } else if (error.code === 'ECONNABORTED') {
      errorMessage = 'Tempo limite da requisição excedido';
    } else if (error.code === 'ERR_NETWORK') {
      errorMessage = 'Erro de conexão. Verifique sua internet ou se o servidor está funcionando.';
    }
    
    console.error('❌ Erro na resposta:', {
      status: errorStatus,
      message: errorMessage,
      url: error.config?.url,
      code: error.code
    });
    
    // Criar erro padronizado
    const apiError: ApiError = {
      message: errorMessage,
      status: errorStatus,
      details: error.response?.data?.details
    };
    
    return Promise.reject(apiError);
  }
);

// Interfaces
export interface NFE {
  id: string;
  data: string;
  numero: string;
  chaveNFE?: string;
  fornecedor: string;
  valor: number;
  itens: number;
  impostoEntrada?: number;
  xapuriMarkup?: number;
  epitaMarkup?: number;
  roundingType?: 'none' | 'up' | 'down' | 'nearest';
  valorFrete?: number;
  isFavorite?: boolean;
  createdAt?: string;
  updatedAt?: string;
  produtos?: Product[];
  produtosCount?: number;
  valorTotal?: number;
}

export interface Product {
  id?: number;
  nfeId?: string;
  codigo: string;
  descricao: string;
  ncm?: string;
  cfop?: string;
  unidade?: string;
  quantidade: number;
  valorUnitario: number;
  valorTotal: number;
  baseCalculoICMS?: number;
  valorICMS?: number;
  aliquotaICMS?: number;
  baseCalculoIPI?: number;
  valorIPI?: number;
  aliquotaIPI?: number;
  ean?: string;
  reference?: string;
  brand?: string;
  imageUrl?: string;
  descricao_complementar?: string;
  custoExtra?: number;
  freteProporcional?: number;
}

export interface ApiResponse<T> {
  data?: T;
  message?: string;
  error?: string;
}

export interface UploadResponse {
  message: string;
  filename?: string;
  size?: number;
  content?: string;
}

// Validação de dados
const validateNFE = (nfe: Partial<NFE>): string[] => {
  const errors: string[] = [];
  
  if (!nfe.id?.trim()) errors.push('ID é obrigatório');
  if (!nfe.fornecedor?.trim()) errors.push('Fornecedor é obrigatório');
  if (!nfe.numero?.trim()) errors.push('Número da NFE é obrigatório');
  if (typeof nfe.valor !== 'number' || nfe.valor < 0) errors.push('Valor deve ser um número positivo');
  if (typeof nfe.itens !== 'number' || nfe.itens < 0) errors.push('Quantidade de itens deve ser um número positivo');
  
  return errors;
};

// API de NFEs
export const nfeAPI = {
  // Buscar todas as NFEs
  getAll: async (): Promise<NFE[]> => {
    try {
      const response = await api.get<NFE[]>('/api/nfes');
      return response.data;
    } catch (error) {
      console.error('Erro ao buscar NFEs:', error);
      throw error;
    }
  },

  // Buscar NFE por ID
  getById: async (id: string): Promise<NFE> => {
    if (!id?.trim()) {
      throw new Error('ID é obrigatório');
    }
    
    try {
      const response = await api.get<NFE>(`/api/nfes/${encodeURIComponent(id)}`);
      return response.data;
    } catch (error) {
      console.error(`Erro ao buscar NFE ${id}:`, error);
      throw error;
    }
  },

  // Salvar nova NFE
  save: async (nfe: NFE): Promise<ApiResponse<{ id: string }>> => {
    const validationErrors = validateNFE(nfe);
    if (validationErrors.length > 0) {
      throw new Error(`Dados inválidos: ${validationErrors.join(', ')}`);
    }
    
    try {
      const response = await api.post<ApiResponse<{ id: string }>>('/api/nfes', nfe);
      return response.data;
    } catch (error) {
      console.error('Erro ao salvar NFE:', error);
      throw error;
    }
  },

  // Atualizar NFE
  update: async (id: string, nfe: Partial<NFE>): Promise<ApiResponse<void>> => {
    if (!id?.trim()) {
      throw new Error('ID é obrigatório');
    }
    
    try {
      const response = await api.put<ApiResponse<void>>(`/api/nfes/${encodeURIComponent(id)}`, nfe);
      return response.data;
    } catch (error) {
      console.error(`Erro ao atualizar NFE ${id}:`, error);
      throw error;
    }
  },

  // Excluir NFE
  delete: async (id: string): Promise<ApiResponse<void>> => {
    if (!id?.trim()) {
      throw new Error('ID é obrigatório');
    }
    
    try {
      const response = await api.delete<ApiResponse<void>>(`/api/nfes/${encodeURIComponent(id)}`);
      return response.data;
    } catch (error) {
      console.error(`Erro ao excluir NFE ${id}:`, error);
      throw error;
    }
  },
};

// API de Upload
export const uploadAPI = {
  // Upload de arquivo XML
  uploadXML: async (file: File): Promise<UploadResponse> => {
    if (!file) {
      throw new Error('Arquivo é obrigatório');
    }
    
    // Validar tipo de arquivo
    const allowedTypes = ['text/xml', 'application/xml', 'text/plain'];
    if (!allowedTypes.includes(file.type)) {
      throw new Error('Apenas arquivos XML são permitidos');
    }
    
    // Validar tamanho (10MB)
    if (file.size > 10 * 1024 * 1024) {
      throw new Error('Arquivo muito grande. Tamanho máximo: 10MB');
    }
    
    const formData = new FormData();
    formData.append('xml', file);
    
    try {
      const response = await api.post<UploadResponse>('/api/upload-xml', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        timeout: 30000, // 30 segundos para upload
      });
      
      return response.data;
    } catch (error) {
      console.error('Erro no upload:', error);
      throw error;
    }
  },
};

// API de Status
export const statusAPI = {
  // Verificar status do servidor
  check: async (): Promise<{ status: string }> => {
    try {
      // Tenta endpoint de produção primeiro
      try {
        const resApi = await api.get<{ status: string }>('/api/status');
        return resApi.data;
      } catch (e) {
        // Fallback para endpoint usado no dev
        const resRoot = await api.get<{ status: string }>('/status');
        return resRoot.data;
      }
    } catch (error) {
      console.error('Erro ao verificar status:', error);
      throw error;
    }
  },
};

export default api;
