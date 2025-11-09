'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api/client';
import { motion } from 'framer-motion';
import { User, Target, Clock, Sparkles, Play } from 'lucide-react';
import { toast } from 'sonner';

export default function Home() {
  const router = useRouter();
  const [selectedPersona, setSelectedPersona] = useState('');
  const [selectedGoal, setSelectedGoal] = useState('');
  const [maxTurns, setMaxTurns] = useState('');
  const [reasoningModel, setReasoningModel] = useState('gpt-5');
  const [reasoningEffort, setReasoningEffort] = useState('medium');
  const [isStarting, setIsStarting] = useState(false);

  const isReasoningModel = (model: string) => {
    const modelLower = model.toLowerCase();
    return (
      modelLower.startsWith('o1') ||
      modelLower.startsWith('o3') ||
      modelLower.startsWith('gpt-5')
    );
  };

  const { data: personas = [] } = useQuery({
    queryKey: ['personas'],
    queryFn: () => apiClient.getPersonas(),
  });

  const { data: goals = [] } = useQuery({
    queryKey: ['goals'],
    queryFn: () => apiClient.getGoals(),
  });

  const handleStartSimulation = async () => {
    if (!selectedPersona || !selectedGoal) {
      toast.error('Please select both a persona and a goal');
      return;
    }

    try {
      setIsStarting(true);
      const response = await apiClient.startSimulation(
        selectedPersona,
        selectedGoal,
        maxTurns ? parseInt(maxTurns) : null,
        reasoningModel,
        reasoningEffort
      );

      toast.success('Simulation started!');
      // Navigate to simulation view
      router.push(`/simulation/${response.thread_id}`);
    } catch (error: any) {
      setIsStarting(false);
      toast.error(error.message || 'Failed to start simulation');
    }
  };

  const selectedPersonaObj = personas.find((p) => p.id === selectedPersona);
  const selectedGoalObj = goals.find((g) => g.id === selectedGoal);

  return (
    <div className="flex items-center justify-center min-h-screen p-8 bg-gray-50">
      <Card className="w-full max-w-2xl p-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Create New Simulation</h1>
          <p className="text-gray-600">Configure and run agent evaluation simulations</p>
        </div>

        <div className="space-y-6">
          {/* Persona Selection */}
          <div>
            <label className="block text-sm font-medium mb-2">
              <User className="inline w-4 h-4 mr-1" />
              Select Persona
            </label>
            <select
              value={selectedPersona}
              onChange={(e) => setSelectedPersona(e.target.value)}
              disabled={isStarting}
              className="w-full px-3 py-2 border rounded-lg"
            >
              <option value="">Choose persona...</option>
              {personas.map((persona) => (
                <option key={persona.id} value={persona.id}>
                  {persona.name}
                </option>
              ))}
            </select>
            {selectedPersonaObj && (
              <div className="mt-2 p-3 bg-gray-50 rounded-lg text-sm">
                <p className="font-medium">{selectedPersonaObj.name}</p>
                <p className="text-gray-600 text-xs mt-1 line-clamp-2">
                  {selectedPersonaObj.background}
                </p>
              </div>
            )}
          </div>

          {/* Goal Selection */}
          <div>
            <label className="block text-sm font-medium mb-2">
              <Target className="inline w-4 h-4 mr-1" />
              Select Goal
            </label>
            <select
              value={selectedGoal}
              onChange={(e) => setSelectedGoal(e.target.value)}
              disabled={isStarting}
              className="w-full px-3 py-2 border rounded-lg"
            >
              <option value="">Choose goal...</option>
              {goals.map((goal) => (
                <option key={goal.id} value={goal.id}>
                  {goal.name}
                </option>
              ))}
            </select>
            {selectedGoalObj && (
              <div className="mt-2 p-3 bg-gray-50 rounded-lg text-sm">
                <p className="font-medium">{selectedGoalObj.name}</p>
                <p className="text-gray-600 text-xs mt-1">
                  Max turns: {selectedGoalObj.max_turns}
                </p>
              </div>
            )}
          </div>

          {/* Max Turns Override */}
          <div>
            <label className="block text-sm font-medium mb-2">
              <Clock className="inline w-4 h-4 mr-1" />
              Max Turns (optional)
            </label>
            <input
              type="number"
              value={maxTurns}
              onChange={(e) => setMaxTurns(e.target.value)}
              disabled={isStarting}
              placeholder={
                selectedGoalObj
                  ? `Default: ${selectedGoalObj.max_turns}`
                  : 'Override max turns'
              }
              min="1"
              className="w-full px-3 py-2 border rounded-lg"
            />
          </div>

          {/* Reasoning Model */}
          <div>
            <label className="block text-sm font-medium mb-2">
              <Sparkles className="inline w-4 h-4 mr-1" />
              Reasoning Model
            </label>
            <select
              value={reasoningModel}
              onChange={(e) => setReasoningModel(e.target.value)}
              disabled={isStarting}
              className="w-full px-3 py-2 border rounded-lg"
            >
              <option value="gpt-5">GPT-5 (Default)</option>
              <option value="o1">O1 (Reasoning)</option>
              <option value="o3">O3 (Advanced)</option>
              <option value="gpt-4o">GPT-4o (Fast)</option>
            </select>
            <p className="text-xs text-gray-500 mt-1">
              {isReasoningModel(reasoningModel)
                ? '🧠 Reasoning model: Thinks through persona decisions carefully'
                : '⚡ Standard model: Fast responses for quick simulations'}
            </p>
          </div>

          {/* Reasoning Effort */}
          {isReasoningModel(reasoningModel) && (
            <div>
              <label className="block text-sm font-medium mb-2">Reasoning Effort</label>
              <select
                value={reasoningEffort}
                onChange={(e) => setReasoningEffort(e.target.value)}
                disabled={isStarting}
                className="w-full px-3 py-2 border rounded-lg"
              >
                <option value="low">Low</option>
                <option value="medium">Medium (Default)</option>
                <option value="high">High</option>
              </select>
            </div>
          )}

          {/* Submit Button */}
          <Button
            onClick={handleStartSimulation}
            disabled={!selectedPersona || !selectedGoal || isStarting}
            className="w-full"
            size="lg"
          >
            {isStarting ? 'Starting...' : 'Run Simulation'}
          </Button>
        </div>
      </Card>
    </div>
  );
}
