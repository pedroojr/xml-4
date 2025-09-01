import axios, { AxiosError, AxiosResponse } from 'axios';

// Configuração da API
// Em desenvolvimento, usa proxy do Vite. Em produção, usa a URL da API
const API_BASE_URL = import.meta.env.NODE_ENV === 'development' 
  ? '' // Usa proxy do Vite em desenvolvimento
  : (import.meta.env.VITE_API_URL || 'https://xml.lojasrealce.shop/api');

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
  status?: number | undefined;
  details?: string[] | undefined;
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
  (error: AxiosError<any>) => {
    const errorStatus = error.response?.status;
    
    // Para erros 409 (duplicatas), preservar os dados originais
    if (errorStatus === 409 && error.response?.data?.isDuplicate) {
      console.error('❌ Erro 409 - Duplicata detectada:', {
        status: errorStatus,
        data: error.response.data,
        url: error.config?.url
      });
      
      // Retornar o erro original com todos os dados da duplicata
      return Promise.reject(error);
    }
    
    let errorMessage = error.response?.data?.message || error.message || 'Erro desconhecido';
    
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
    } else if (errorStatus === 409) {
      // Para outros conflitos (não duplicatas)
      errorMessage = error.response?.data?.message || 'Conflito detectado';
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

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

export interface XMLValidationResponse {
  success: boolean;
  validation: ValidationResult;
  info?: {
    nfeNumber?: string;
    issuer?: string;
    totalValue?: number;
    issueDate?: string;
  };
  filename?: string;
  size?: number;
  content?: string;
  error?: string;
  // Indica se houve duplicidade e é necessária confirmação
  isDuplicate?: boolean;
  confirmationRequired?: boolean;
  existingNfe?: {
    id: string;
    numero: string;
    fornecedor: string;
    valor: number;
  };
  newNfe?: {
    numero: string;
    fornecedor: string;
    valor: number;
  };
  question?: string;
  options?: {
    replace: string;
    cancel: string;
  };
  // Novo: id salvo pelo servidor ao processar o upload
  id?: string;
}

// Validação de dados
const validateNFE = (nfe: Partial<NFE>): string[] => {
  const errors: string[] = [];
  
  console.log('🔍 Validando NFE:', {
    id: nfe.id,
    fornecedor: nfe.fornecedor,
    numero: nfe.numero,
    valor: nfe.valor,
    valorType: typeof nfe.valor,
    itens: nfe.itens,
    itensType: typeof nfe.itens
  });
  
  if (!nfe.id?.trim()) errors.push('ID é obrigatório');
  if (!nfe.fornecedor?.trim()) errors.push('Fornecedor é obrigatório');
  if (!nfe.numero?.trim()) errors.push('Número da NFE é obrigatório');
  if (typeof nfe.valor !== 'number' || nfe.valor < 0) errors.push('Valor deve ser um número positivo');
  if (typeof nfe.itens !== 'number' || nfe.itens < 0) errors.push('Quantidade de itens deve ser um número positivo');
  
  console.log('🔍 Erros de validação:', errors);
  return errors;
};

// API de NFEs
export const nfeAPI = {
  // Buscar todas as NFEs
  getAll: async (): Promise<NFE[]> => {
    try {
      const response = await api.get<{data: NFE[], pagination: any}>('/api/nfes');
      return Array.isArray(response.data.data) ? response.data.data : [];
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

  // Excluir todas as NFEs
  deleteAll: async (): Promise<ApiResponse<{ count: number }>> => {
    try {
      const response = await api.delete<ApiResponse<{ count: number }>>('/api/nfes');
      return response.data;
    } catch (error) {
      console.error('Erro ao excluir todas as NFEs:', error);
      throw error;
    }
  },
};

// API de Upload
export const uploadAPI = {
  // Upload de arquivo XML
  uploadXML: async (file: File): Promise<UploadResponse> => {
    try {
      const formData = new FormData();
      formData.append('file', file);
      
      console.log('📤 Enviando arquivo XML:', {
        name: file.name,
        size: file.size,
        type: file.type
      });
      
      const response = await api.post<UploadResponse>('/api/upload-xml', formData, {
        timeout: 30000, // 30 segundos para upload
        headers: {
          // Não definir Content-Type, deixar o browser definir automaticamente
        },
      });
      
      console.log('✅ Upload realizado com sucesso:', response.data);
      return response.data;
      
    } catch (error) {
      console.error('❌ Erro no upload:', error);
      throw error;
    }
  },

  // Validação de arquivo XML
  validateXML: async (file: File): Promise<XMLValidationResponse> => {
    try {
      const formData = new FormData();
      formData.append('xmlFile', file);
      
      console.log('🔍 Validando arquivo XML:', {
        name: file.name,
        size: file.size,
        type: file.type
      });
      
      const response = await api.post<XMLValidationResponse>('/api/validate-xml', formData, {
        timeout: 15000, // 15 segundos para validação
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      
      console.log('✅ Validação concluída:', response.data);
      return response.data;
      
    } catch (error) {
      console.error('❌ Erro na validação:', error);
      throw error;
    }
  },

  // Upload com validação integrada
  uploadWithValidation: async (file: File): Promise<XMLValidationResponse> => {
    try {
      const formData = new FormData();
      formData.append('file', file);
      
      console.log('📤🔍 Enviando e validando arquivo XML:', {
        name: file.name,
        size: file.size,
        type: file.type
      });
      
      const response = await api.post<XMLValidationResponse>('/api/upload-xml', formData, {
        timeout: 30000, // 30 segundos para upload e validação
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      
      console.log('✅ Upload e validação concluídos:', response.data);
      return response.data;
      
    } catch (error) {
      console.error('❌ Erro no upload com validação:', error);
      throw error;
    }
  },

  // Upload com confirmação de substituição para NFes duplicadas
  uploadWithConfirmation: async (file: File, confirmReplace: boolean = false): Promise<XMLValidationResponse> => {
    try {
      const formData = new FormData();
      formData.append('file', file);
      
      if (confirmReplace) {
        formData.append('confirmReplace', 'true');
      }
      
      console.log('📤 Enviando arquivo XML com confirmação:', {
        name: file.name,
        size: file.size,
        type: file.type,
        confirmReplace
      });
      
      const endpoint = confirmReplace ? '/api/upload-xml/confirm-replace' : '/api/upload-xml';
      const response = await api.post<XMLValidationResponse>(endpoint, formData, {
        timeout: 30000,
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      
      console.log('✅ Upload com confirmação concluído:', response.data);
      return response.data;
      
    } catch (error) {
      console.error('❌ Erro no upload com confirmação:', error);
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
