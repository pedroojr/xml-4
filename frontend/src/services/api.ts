import axios from 'axios';
import type { NFE, Product } from '@/types/nfe';

export type { NFE, Product };

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:4005/api';
const DEBUG = import.meta.env.VITE_DEBUG === 'true';

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
    if (DEBUG) {
      console.log(`🚀 API Request: ${config.method?.toUpperCase()} ${config.url}`);
    }
    return config;
  },
  (error) => {
    if (DEBUG) {
      console.error('❌ API Request Error:', error);
    }
    return Promise.reject(error);
  }
);

api.interceptors.response.use(
  (response) => {
    if (DEBUG) {
      console.log(`✅ API Response: ${response.status} ${response.config.url}`);
    }
    return response;
  },
  (error) => {
    if (DEBUG) {
      console.error('❌ API Response Error:', error.response?.data || error.message);
    }
    return Promise.reject(error);
  }
);

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
  // Upload de arquivo de pedido em PDF
  uploadPDF: async (file: File): Promise<{ itens: any[] }> => {
    const formData = new FormData();
    formData.append('pedido', file);

    const response = await api.post('/importar-pedido', formData, {
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
