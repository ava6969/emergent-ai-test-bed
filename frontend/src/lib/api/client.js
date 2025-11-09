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

  async getGoals(filters = {}) {
    const response = await this.client.get('/api/goals', { params: filters });
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

  // ==================== SIMULATION ENDPOINTS ====================

  async runSimulation(config) {
    const response = await this.client.post('/api/simulations/run', config);
    return response.data;
  }

  async getSimulationStatus(id) {
    const response = await this.client.get(`/api/simulations/${id}/status`);
    return response.data;
  }

  async getTrajectory(id) {
    const response = await this.client.get(`/api/trajectories/${id}`);
    return response.data;
  }
}

export const apiClient = new APIClient();
