import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8001';

class APIClient {
  constructor() {
    this.client = axios.create({
      baseURL: API_BASE_URL,
      headers: {
        'Content-Type': 'application/json',
      },
      timeout: 30000, // 30 seconds for AI generation
    });
  }

  // ==================== AI ENDPOINTS ====================

  async chat(message, conversationId, context) {
    const response = await this.client.post('/api/ai/chat', {
      message,
      conversation_id: conversationId,
      context,
    });
    return response.data;
  }

  async generatePersona(request) {
    const response = await this.client.post('/api/ai/generate/persona', {
      message: request.description || request.message,
      conversation_id: request.conversation_id,
      context: request.context || {},
    });
    return response.data;
  }

  async startPersonaGeneration(request) {
    const response = await this.client.post('/api/ai/generate/persona/async', {
      description: request.description,
      organization_id: request.organization_id,
      use_exa_enrichment: request.use_exa_enrichment,
      metadata_schema: request.metadata_schema,
      model: request.model,
      temperature: request.temperature,
      max_tokens: request.max_tokens,
    });
    return response.data;
  }

  async getGenerationStatus(jobId) {
    const response = await this.client.get(`/api/ai/generate/status/${jobId}`);
    return response.data;
  }

  async generateGoal(request) {
    const response = await this.client.post('/api/ai/generate/goal', {
      message: request.description || request.message,
      conversation_id: request.conversation_id,
      context: request.context || {},
    });
    return response.data;
  }

  async generateTest(request) {
    const response = await this.client.post('/api/ai/generate/test', request);
    return response.data;
  }

  async refine(request) {
    const response = await this.client.post('/api/ai/refine', request);
    return response.data;
  }

  // ==================== LIBRARY ENDPOINTS ====================

  async getPersonas(filters = {}) {
    const response = await this.client.get('/api/personas', { params: filters });
    return response.data;
  }

  async createPersona(data) {
    const response = await this.client.post('/api/personas', data);
    return response.data;
  }

  async updatePersona(id, data) {
    const response = await this.client.put(`/api/personas/${id}`, data);
    return response.data;
  }

  async deletePersona(id) {
    const response = await this.client.delete(`/api/personas/${id}`);
    return response.data;
  }

  async deleteAllPersonas() {
    const response = await this.client.delete('/api/personas');
    return response.data;
  }

  async getGoals(filters = {}) {
    const response = await this.client.get('/api/goals', { params: filters });
    return response.data;
  }

  async startGoalGeneration(request) {
    const response = await this.client.post('/api/ai/generate/goal/async', request);
    return response.data;
  }

  async getJobStatus(jobId) {
    const response = await this.client.get(`/api/ai/generate/status/${jobId}`);
    return response.data;
  }

  async createGoal(data) {
    const response = await this.client.post('/api/goals', data);
    return response.data;
  }

  async updateGoal(id, data) {
    const response = await this.client.put(`/api/goals/${id}`, data);
    return response.data;
  }

  async deleteGoal(id) {
    const response = await this.client.delete(`/api/goals/${id}`);
    return response.data;
  }

  async deleteAllGoals() {
    const response = await this.client.delete('/api/goals');
    return response.data;
  }

  async getOrganizations() {
    const response = await this.client.get('/api/organizations');
    return response.data;
  }

  async createOrganization(data) {
    const response = await this.client.post('/api/organizations', data);
    return response.data;
  }

  async updateOrganization(id, data) {
    const response = await this.client.put(`/api/organizations/${id}`, data);
    return response.data;
  }

  async deleteOrganization(id) {
    const response = await this.client.delete(`/api/organizations/${id}`);
    return response.data;
  }

  // ==================== PRODUCT ENDPOINTS ====================

  async getProducts() {
    const response = await this.client.get('/api/products');
    return response.data;
  }

  async createProduct(data) {
    const response = await this.client.post('/api/products', data);
    return response.data;
  }

  async updateProduct(id, data) {
    const response = await this.client.put(`/api/products/${id}`, data);
    return response.data;
  }

  async deleteProduct(id) {
    const response = await this.client.delete(`/api/products/${id}`);
    return response.data;
  }

  async deleteAllProducts() {
    const response = await this.client.delete('/api/products');
    return response.data;
  }

  // ==================== SIMULATION ENDPOINTS ====================

  async runSimulation(data) {
    const response = await this.client.post('/api/simulations/run', null, {
      params: data,
    });
    return response.data;
  }

  async getSimulation(simulationId) {
    const response = await this.client.get(`/api/simulations/${simulationId}`);
    return response.data;
  }

  async stopSimulation(simulationId) {
    const response = await this.client.post(`/api/simulations/${simulationId}/stop`);
    return response.data;
  }

  async listSimulations() {
    const response = await this.client.get('/api/simulations');
    return response.data;
  }

  // ==================== SIMULATION ENDPOINTS ====================

  async startSimulation(persona_id, goal_id, max_turns = null, reasoning_model = null, reasoning_effort = null) {
    const params = { persona_id, goal_id };
    if (max_turns) {
      params.max_turns = max_turns;
    }
    if (reasoning_model) {
      params.reasoning_model = reasoning_model;
    }
    if (reasoning_effort) {
      params.reasoning_effort = reasoning_effort;
    }
    const response = await this.client.post('/api/simulations/run', null, { params });
    return response.data;
  }

  async getSimulationStatus(simulation_id) {
    const response = await this.client.get(`/api/simulations/${simulation_id}`);
    return response.data;
  }

  async stopSimulation(simulation_id) {
    const response = await this.client.post(`/api/simulations/${simulation_id}/stop`);
    return response.data;
  }
}

export const apiClient = new APIClient();
