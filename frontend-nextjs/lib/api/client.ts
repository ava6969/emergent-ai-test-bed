import axios, { AxiosInstance } from 'axios';

// Types
export interface Persona {
  id: string;
  name: string;
  background: string;
  organization_id: string | null;
  metadata: {
    tags?: string[];
    [key: string]: any;
  };
  created_at: string;
}

export interface Goal {
  id: string;
  name: string;
  objective: string;
  success_criteria: string;
  initial_prompt: string;
  max_turns: number;
  agent_ids: string[];
  difficulty?: string;
  metadata?: Record<string, any>;
}

export interface Product {
  id: string;
  name: string;
  description: string;
  documents: string[];
  metadata?: Record<string, any>;
}

export interface SimulationStatus {
  simulation_id: string;
  status: 'running' | 'completed' | 'failed';
  current_turn: number;
  max_turns: number;
  trajectory: Array<{
    role: string;
    content: string;
  }>;
  goal_achieved: boolean;
  persona_id: string;
  goal_id: string;
  error?: string;
}

class APIClient {
  private client: AxiosInstance;

  constructor() {
    const baseURL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8001';
    this.client = axios.create({
      baseURL,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }

  // ==================== PERSONA ENDPOINTS ====================
  
  async getPersonas(): Promise<Persona[]> {
    const response = await this.client.get('/api/personas');
    return response.data;
  }

  async getPersona(id: string): Promise<Persona> {
    const response = await this.client.get(`/api/personas/${id}`);
    return response.data;
  }

  async generatePersona(description: string, settings?: any) {
    const response = await this.client.post('/api/ai/generate/persona/async', {
      description: description,
      message: description, // backwards compatibility
      count: settings?.count || 1,
      model: settings?.model || 'gpt-5',
      temperature: settings?.temperature || 0.7,
      reasoning_effort: settings?.reasoning_effort || 'medium',
      max_tokens: settings?.max_tokens || 1500,
      use_exa_enrichment: settings?.use_exa_enrichment || false,
      exa_results_count: settings?.exa_results_count || 3,
      organization_id: settings?.organization_id || null,
    });
    return response.data;
  }

  async generateGoal(description: string, settings?: any) {
    const response = await this.client.post('/api/ai/generate/goal/async', {
      description: description,
      message: description, // backwards compatibility
      count: settings?.count || 1,
      model: settings?.model || 'gpt-5',
      temperature: settings?.temperature || 0.7,
      reasoning_effort: settings?.reasoning_effort || 'medium',
      max_tokens: settings?.max_tokens || 1500,
      agent_ids: settings?.agent_ids || [],
      product_context: settings?.product_context || null,
    });
    return response.data;
  }

  async checkJobStatus(jobId: string) {
    const response = await this.client.get(`/api/ai/generate/status/${jobId}`);
    return response.data;
  }

  async deletePersona(id: string): Promise<void> {
    await this.client.delete(`/api/personas/${id}`);
  }

  async deleteAllPersonas(): Promise<{ deleted_count: number }> {
    const response = await this.client.delete('/api/personas');
    return response.data;
  }

  // ==================== GOAL ENDPOINTS ====================
  
  async getGoals(): Promise<Goal[]> {
    const response = await this.client.get('/api/goals');
    return response.data;
  }

  async getGoal(id: string): Promise<Goal> {
    const response = await this.client.get(`/api/goals/${id}`);
    return response.data;
  }

  async generateGoal(request: {
    persona_ids?: string[];
    product_id?: string;
    difficulty?: string;
    max_turns_override?: number;
    organization_id?: string;
    count?: number;
  }) {
    const response = await this.client.post('/api/ai/generate/goal/async', request);
    return response.data;
  }

  async deleteGoal(id: string): Promise<void> {
    await this.client.delete(`/api/goals/${id}`);
  }

  // ==================== PRODUCT ENDPOINTS ====================
  
  async getProducts(): Promise<Product[]> {
    const response = await this.client.get('/api/products');
    return response.data;
  }

  async createProduct(data: { name: string; description: string }): Promise<Product> {
    const response = await this.client.post('/api/products', data);
    return response.data;
  }

  async uploadProductDocument(productId: string, file: File) {
    const formData = new FormData();
    formData.append('file', file);
    
    const response = await this.client.post(
      `/api/products/${productId}/documents`,
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      }
    );
    return response.data;
  }

  async updateProduct(id: string, data: { name: string; description: string }): Promise<Product> {
    const response = await this.client.put(`/api/products/${id}`, data);
    return response.data;
  }

  async deleteProduct(id: string): Promise<void> {
    await this.client.delete(`/api/products/${id}`);
  }

  // ==================== ORGANIZATION ENDPOINTS ====================

  async getOrganizations(): Promise<Organization[]> {
    const response = await this.client.get('/api/organizations');
    return response.data;
  }

  async createOrganization(data: { name: string; description: string }): Promise<Organization> {
    const response = await this.client.post('/api/organizations', data);
    return response.data;
  }

  async updateOrganization(id: string, data: { name: string; description: string }): Promise<Organization> {
    const response = await this.client.put(`/api/organizations/${id}`, data);
    return response.data;
  }

  async deleteOrganization(id: string): Promise<void> {
    await this.client.delete(`/api/organizations/${id}`);
  }

  // ==================== SIMULATION ENDPOINTS ====================

  async startSimulation(
    persona_id: string,
    goal_id: string,
    max_turns: number | null = null,
    reasoning_model: string | null = null,
    reasoning_effort: string | null = null
  ): Promise<{ message: string; persona_id: string; goal_id: string }> {
    const params: any = { persona_id, goal_id };
    if (max_turns) params.max_turns = max_turns;
    if (reasoning_model) params.reasoning_model = reasoning_model;
    if (reasoning_effort) params.reasoning_effort = reasoning_effort;
    
    const response = await this.client.post('/api/simulations/run', null, { params });
    return response.data;
  }

  async getThreadStatus(thread_id: string): Promise<{
    status: string;
    stopped_reason?: string;
    current_turn?: number;
    max_turns?: number;
  }> {
    const response = await this.client.get(`/api/threads/${thread_id}/status`);
    return response.data;
  }

  // ==================== THREAD/TRAJECTORY ENDPOINTS ====================

  async getSimulationThreads(): Promise<any[]> {
    // Fetch threads from LangGraph with owner="testing-ai" metadata filter
    // This gets all simulation runs as threads
    const response = await this.client.get('/api/threads', {
      params: {
        metadata: JSON.stringify({ owner: 'testing-ai' }),
        limit: 100,
      },
    });
    return response.data;
  }

  async getThreadMessages(thread_id: string): Promise<any> {
    // Fetch messages for a specific thread
    const response = await this.client.get(`/api/threads/${thread_id}/messages`);
    return response.data;
  }

  async getThreadStatus(thread_id: string): Promise<any> {
    // Get thread status
    const response = await this.client.get(`/api/threads/${thread_id}/status`);
    return response.data;
  }

  // ==================== EVALUATION ENDPOINTS ====================

  async runEvaluation(request: {
    thread_id: string;
    evaluators: string[];
    model: string;
    dataset_name?: string;
  }): Promise<any> {
    const response = await this.client.post('/api/evaluations/run', request);
    return response.data;
  }

  async getEvaluation(eval_id: string): Promise<any> {
    const response = await this.client.get(`/api/evaluations/${eval_id}`);
    return response.data;
  }
}

export const apiClient = new APIClient();
