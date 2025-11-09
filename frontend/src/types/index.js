// ==================== CORE MODELS ====================

// Persona model
export const createPersona = (data) => ({
  id: data.id || '',
  name: data.name || '',
  background: data.background || '',
  organization_id: data.organization_id || null,
  tags: data.tags || [],
  trajectory_ids: data.trajectory_ids || [],
  created_at: data.created_at || new Date().toISOString(),
  updated_at: data.updated_at || new Date().toISOString(),
  metadata: data.metadata || {}
});

// Goal model
export const createGoal = (data) => ({
  id: data.id || '',
  name: data.name || '',
  objective: data.objective || '',
  success_criteria: data.success_criteria || '',
  initial_prompt: data.initial_prompt || '',
  max_turns: data.max_turns || 10,
  agent_ids: data.agent_ids || [],
  organization_id: data.organization_id || null,
  evaluators: data.evaluators || [],
  created_at: data.created_at || new Date().toISOString(),
  updated_at: data.updated_at || new Date().toISOString(),
  metadata: data.metadata || {}
});

// Test Configuration
export const createTestConfiguration = (data) => ({
  persona_id: data.persona_id || null,
  goal_id: data.goal_id || null,
  max_turns: data.max_turns || 10,
  use_memory: data.use_memory !== undefined ? data.use_memory : true,
  model: data.model || 'gpt-4o',
  evaluators: data.evaluators || []
});

// ==================== AI CONVERSATION ====================

export const createChatMessage = (data) => ({
  id: data.id || '',
  role: data.role || 'user',
  content: data.content || '',
  timestamp: data.timestamp || new Date(),
  type: data.type || 'text',
  actions: data.actions || [],
  generatedItems: data.generatedItems || null
});

export const createActionButton = (data) => ({
  label: data.label || '',
  action: data.action || '',
  variant: data.variant || 'secondary',
  data: data.data || null
});
