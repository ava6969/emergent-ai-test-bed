'use client';

import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api/client';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Play, StopCircle, Clock, Target, User, Sparkles } from 'lucide-react';
import { TrajectoryViewer } from '@/components/simulations/TrajectoryViewer';
import { toast } from 'sonner';

export default function SimulationsPage() {
  const [selectedPersona, setSelectedPersona] = useState('');
  const [selectedGoal, setSelectedGoal] = useState('');
  const [maxTurns, setMaxTurns] = useState('');
  const [reasoningModel, setReasoningModel] = useState('gpt-5');
  const [reasoningEffort, setReasoningEffort] = useState('medium');
  const [isSimulating, setIsSimulating] = useState(false);
  const [simulationId, setSimulationId] = useState<string | null>(null);
  const [simulationData, setSimulationData] = useState<any>(null);

  // Helper to check if model is reasoning model
  const isReasoningModel = (model: string) => {
    const modelLower = model.toLowerCase();
    return (
      modelLower.startsWith('o1') ||
      modelLower.startsWith('o3') ||
      modelLower.startsWith('gpt-5') ||
      modelLower.startsWith('gpt-6') ||
      modelLower.startsWith('gpt-7')
    );
  };

  // Fetch personas
  const { data: personas = [] } = useQuery({
    queryKey: ['personas'],
    queryFn: () => apiClient.getPersonas(),
  });

  // Fetch goals
  const { data: goals = [] } = useQuery({
    queryKey: ['goals'],
    queryFn: () => apiClient.getGoals(),
  });

  // Poll simulation status
  useEffect(() => {
    if (!simulationId || !isSimulating) return;

    const pollInterval = setInterval(async () => {
      try {
        const status = await apiClient.getSimulationStatus(simulationId);
        setSimulationData(status);

        if (status.status === 'completed') {
          setIsSimulating(false);
          clearInterval(pollInterval);
          toast.success(
            `Simulation complete! ${status.current_turn} turns. Goal ${
              status.goal_achieved ? 'achieved' : 'not achieved'
            }`
          );
        } else if (status.status === 'failed') {
          setIsSimulating(false);
          clearInterval(pollInterval);
          toast.error(status.error || 'Simulation failed');
        }
      } catch (error) {
        console.error('Error polling simulation:', error);
      }
    }, 2000);

    return () => clearInterval(pollInterval);
  }, [simulationId, isSimulating]);

  // Start simulation
  const handleStartSimulation = async () => {
    if (!selectedPersona || !selectedGoal) {
      toast.error('Please select both a persona and a goal');
      return;
    }

    try {
      setIsSimulating(true);
      const response = await apiClient.startSimulation(
        selectedPersona,
        selectedGoal,
        maxTurns ? parseInt(maxTurns) : null,
        reasoningModel,
        reasoningEffort
      );
      setSimulationId(response.simulation_id);
      setSimulationData({
        status: 'running',
        current_turn: 0,
        trajectory: [],
      });
      toast.success('Simulation started');
    } catch (error: any) {
      setIsSimulating(false);
      toast.error(error.message || 'Failed to start simulation');
    }
  };

  // Stop simulation
  const handleStopSimulation = async () => {
    if (!simulationId) return;

    try {
      await apiClient.stopSimulation(simulationId);
      setIsSimulating(false);
      toast.success('Simulation stopped');
    } catch (error: any) {
      toast.error(error.message || 'Failed to stop simulation');
    }
  };

  const selectedPersonaObj = personas.find((p) => p.id === selectedPersona);
  const selectedGoalObj = goals.find((g) => g.id === selectedGoal);

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Simulations</h1>
        <p className="text-gray-600">
          Run simulations to test how personas achieve goals
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Configuration Panel */}
        <div className=\"lg:col-span-1\">
          <Card className=\"p-6\">
            <h2 className=\"text-xl font-semibold mb-4\">Configuration</h2>

            {/* Persona Selection */}
            <div className=\"mb-4\">
              <label className=\"block text-sm font-medium mb-2\">
                <User className=\"inline w-4 h-4 mr-1\" />
                Select Persona
              </label>
              <select
                value={selectedPersona}
                onChange={(e) => setSelectedPersona(e.target.value)}
                disabled={isSimulating}
                className=\"w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 disabled:opacity-50\"
              >
                <option value=\"\">Choose persona...</option>
                {personas.map((persona) => (
                  <option key={persona.id} value={persona.id}>
                    {persona.name}
                  </option>
                ))}
              </select>
              {selectedPersonaObj && (
                <div className=\"mt-2 p-3 bg-gray-50 rounded-lg text-sm\">
                  <p className=\"font-medium\">{selectedPersonaObj.name}</p>
                  <p className=\"text-gray-600 text-xs mt-1 line-clamp-2\">
                    {selectedPersonaObj.background}
                  </p>
                </div>
              )}
            </div>

            {/* Goal Selection */}
            <div className=\"mb-4\">
              <label className=\"block text-sm font-medium mb-2\">
                <Target className=\"inline w-4 h-4 mr-1\" />
                Select Goal
              </label>
              <select
                value={selectedGoal}
                onChange={(e) => setSelectedGoal(e.target.value)}
                disabled={isSimulating}
                className=\"w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 disabled:opacity-50\"
              >
                <option value=\"\">Choose goal...</option>
                {goals.map((goal) => (
                  <option key={goal.id} value={goal.id}>
                    {goal.name}
                  </option>
                ))}
              </select>
              {selectedGoalObj && (
                <div className=\"mt-2 p-3 bg-gray-50 rounded-lg text-sm\">
                  <p className=\"font-medium\">{selectedGoalObj.name}</p>
                  <p className=\"text-gray-600 text-xs mt-1\">
                    Max turns: {selectedGoalObj.max_turns}
                  </p>
                </div>
              )}
            </div>

            {/* Max Turns Override */}
            <div className=\"mb-4\">
              <label className=\"block text-sm font-medium mb-2\">
                <Clock className=\"inline w-4 h-4 mr-1\" />
                Max Turns (optional)
              </label>
              <input
                type=\"number\"
                value={maxTurns}
                onChange={(e) => setMaxTurns(e.target.value)}
                disabled={isSimulating}
                placeholder={
                  selectedGoalObj
                    ? `Default: ${selectedGoalObj.max_turns}`
                    : 'Override max turns'
                }
                min=\"1\"
                className=\"w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 disabled:opacity-50\"
              />
            </div>

            {/* Reasoning Model */}
            <div className=\"mb-4\">
              <label className=\"block text-sm font-medium mb-2\">
                <Sparkles className=\"inline w-4 h-4 mr-1\" />
                Reasoning Model
              </label>
              <select
                value={reasoningModel}
                onChange={(e) => setReasoningModel(e.target.value)}
                disabled={isSimulating}
                className=\"w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 disabled:opacity-50\"
              >
                <option value=\"gpt-5\">GPT-5 (Advanced Reasoning, Default)</option>
                <option value=\"o1\">O1 (Deep Reasoning)</option>
                <option value=\"o3\">O3 (Advanced Reasoning)</option>
                <option value=\"gpt-4o\">GPT-4o (Fast)</option>
                <option value=\"gpt-4o-mini\">GPT-4o Mini (Fastest)</option>
              </select>
              <p className=\"text-xs text-gray-500 mt-1\">
                {isReasoningModel(reasoningModel)
                  ? '🧠 Reasoning model: Thinks through persona decisions carefully'
                  : '⚡ Standard model: Fast responses for quick simulations'}
              </p>
            </div>

            {/* Reasoning Effort */}
            {isReasoningModel(reasoningModel) && (
              <div className=\"mb-6\">
                <label className=\"block text-sm font-medium mb-2\">
                  <Sparkles className=\"inline w-4 h-4 mr-1\" />
                  Reasoning Effort
                </label>
                <select
                  value={reasoningEffort}
                  onChange={(e) => setReasoningEffort(e.target.value)}
                  disabled={isSimulating}
                  className=\"w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 disabled:opacity-50\"
                >
                  <option value=\"low\">Low - Faster, less thorough</option>
                  <option value=\"medium\">Medium - Balanced (Default)</option>
                  <option value=\"high\">High - Slower, most thorough</option>
                </select>
                <p className=\"text-xs text-gray-500 mt-1\">
                  Controls how deeply the model reasons about persona actions
                </p>
              </div>
            )}

            {/* Action Buttons */}
            <div className=\"space-y-2\">
              {!isSimulating ? (
                <Button
                  onClick={handleStartSimulation}
                  disabled={!selectedPersona || !selectedGoal}
                  className=\"w-full\"
                  size=\"lg\"
                >
                  <Play className=\"w-4 h-4 mr-2\" />
                  Run Simulation
                </Button>
              ) : (
                <Button
                  onClick={handleStopSimulation}
                  variant=\"destructive\"
                  className=\"w-full\"
                  size=\"lg\"
                >
                  <StopCircle className=\"w-4 h-4 mr-2\" />
                  Stop Simulation
                </Button>
              )}
            </div>
          </Card>
        </div>

        {/* Results Panel */}
        <div className=\"lg:col-span-2\">
          <Card className=\"p-6\">
            <h2 className=\"text-xl font-semibold mb-4\">Conversation Trajectory</h2>

            {!simulationData ? (
              <div className=\"flex items-center justify-center h-96 text-gray-500\">
                <div className=\"text-center\">
                  <p>Select a persona and goal to start a simulation</p>
                </div>
              </div>
            ) : (
              <TrajectoryViewer
                messages={simulationData.trajectory || []}
                status={simulationData.status}
                currentTurn={simulationData.current_turn}
                maxTurns={simulationData.max_turns || 10}
                goalAchieved={simulationData.goal_achieved}
              />
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
