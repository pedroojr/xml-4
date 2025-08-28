import axios from 'axios';

// Configuração para diferentes ambientes
const getApiBaseUrl = () => {
  // Se estiver em produção (Hostinger), usar API externa
  if (import.meta.env.PROD) {
    return import.meta.env.VITE_API_URL || 'https://seu-dominio.com/api';
  }
  // Se estiver em desenvolvimento, usar local
  return import.meta.env.VITE_API_URL || 'http://localhost:3001/api';
};

const API_BASE_URL = getApiBaseUrl();

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptor para logs
api.interceptors.request.use(
  (config) => {
    console.log(`🚀 API Request: ${config.method?.toUpperCase()} ${config.url}`);
    return config;
  },
  (error) => {
    console.error('❌ API Request Error:', error);
    return Promise.reject(error);
  }
);

api.interceptors.response.use(
  (response) => {
    console.log(`✅ API Response: ${response.status} ${response.config.url}`);
    return response;
  },
  (error) => {
    console.error('❌ API Response Error:', error.response?.data || error.message);
    return Promise.reject(error);
  }
);

export interface NFE {
  id: string;
  data: string;
  numero: string;
  chaveNFE?: string;
  fornecedor: string;
  valor: number;
  itens: number;
  produtos: Product[];
  impostoEntrada: number;
  xapuriMarkup?: number;
  epitaMarkup?: number;
  roundingType?: string;
  valorFrete?: number;
  isFavorite?: boolean;
  createdAt?: string;
  updatedAt?: string;
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

// API de NFEs
export const nfeAPI = {
  // Listar todas as NFEs
  getAll: async (): Promise<NFE[]> => {
    const response = await api.get('/nfes');
    return response.data;
  },

  // Buscar NFE por ID
  getById: async (id: string): Promise<NFE> => {
    const response = await api.get(`/nfes/${id}`);
    return response.data;
  },

  // Criar/atualizar NFE
  save: async (nfe: NFE): Promise<{ message: string; id: string }> => {
    const response = await api.post('/nfes', nfe);
    return response.data;
  },

  // Atualizar NFE
  update: async (id: string, data: Partial<NFE>): Promise<{ message: string }> => {
    const response = await api.put(`/nfes/${id}`, data);
    return response.data;
  },

  // Excluir NFE
  delete: async (id: string): Promise<{ message: string }> => {
    const response = await api.delete(`/nfes/${id}`);
    return response.data;
  },
};

// API de Upload
export const uploadAPI = {
  // Upload de arquivo XML
  uploadXML: async (file: File): Promise<{ message: string; content: string }> => {
    const formData = new FormData();
    formData.append('xml', file);
    
    const response = await api.post('/upload-xml', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },
};

// API de Status
export const statusAPI = {
  // Verificar status do servidor
  getStatus: async (): Promise<{ status: string; timestamp: string; database: string }> => {
    const response = await api.get('/status');
    return response.data;
  },
};

export default api; 