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
    const response = await this.client.post('/api/ai/generate/persona', request);
    return response.data;
  }

  async generateGoal(request) {
    const response = await this.client.post('/api/ai/generate/goal', request);
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

  async getGoals(filters = {}) {
    const response = await this.client.get('/api/goals', { params: filters });
    return response.data;
  }

  async getOrganizations() {
    const response = await this.client.get('/api/organizations');
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
