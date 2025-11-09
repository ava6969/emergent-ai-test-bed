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

  useEffect(() => {
    if (!simulationId || !isSimulating) return;

    const pollInterval = setInterval(async () => {
      try {
        const status = await apiClient.getSimulationStatus(simulationId);
        setSimulationData(status);

        if (status.status === 'completed') {
          setIsSimulating(false);
          clearInterval(pollInterval);
          toast.success('Simulation complete!');
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
      setSimulationData({ status: 'running', current_turn: 0, trajectory: [] });
      toast.success('Simulation started');
    } catch (error: any) {
      setIsSimulating(false);
      toast.error(error.message || 'Failed to start simulation');
    }
  };

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
        <p className="text-gray-600">Run simulations to test how personas achieve goals</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1">
          <Card className="p-6">
            <h2 className="text-xl font-semibold mb-4">Configuration</h2>
            
            <div className="mb-4">
              <label className="block text-sm font-medium mb-2">
                <User className="inline w-4 h-4 mr-1" />
                Select Persona
              </label>
              <select
                value={selectedPersona}
                onChange={(e) => setSelectedPersona(e.target.value)}
                disabled={isSimulating}
                className="w-full px-3 py-2 border rounded-lg"
              >
                <option value="">Choose persona...</option>
                {personas.map((persona) => (
                  <option key={persona.id} value={persona.id}>{persona.name}</option>
                ))}
              </select>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium mb-2">
                <Target className="inline w-4 h-4 mr-1" />
                Select Goal
              </label>
              <select
                value={selectedGoal}
                onChange={(e) => setSelectedGoal(e.target.value)}
                disabled={isSimulating}
                className="w-full px-3 py-2 border rounded-lg"
              >
                <option value="">Choose goal...</option>
                {goals.map((goal) => (
                  <option key={goal.id} value={goal.id}>{goal.name}</option>
                ))}
              </select>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium mb-2">
                <Clock className="inline w-4 h-4 mr-1" />
                Max Turns (optional)
              </label>
              <input
                type="number"
                value={maxTurns}
                onChange={(e) => setMaxTurns(e.target.value)}
                disabled={isSimulating}
                placeholder="Override max turns"
                className="w-full px-3 py-2 border rounded-lg"
              />
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium mb-2">
                <Sparkles className="inline w-4 h-4 mr-1" />
                Reasoning Model
              </label>
              <select
                value={reasoningModel}
                onChange={(e) => setReasoningModel(e.target.value)}
                disabled={isSimulating}
                className="w-full px-3 py-2 border rounded-lg"
              >
                <option value="gpt-5">GPT-5 (Default)</option>
                <option value="o1">O1 (Reasoning)</option>
                <option value="o3">O3 (Advanced)</option>
                <option value="gpt-4o">GPT-4o (Fast)</option>
              </select>
            </div>

            {isReasoningModel(reasoningModel) && (
              <div className="mb-6">
                <label className="block text-sm font-medium mb-2">Reasoning Effort</label>
                <select
                  value={reasoningEffort}
                  onChange={(e) => setReasoningEffort(e.target.value)}
                  disabled={isSimulating}
                  className="w-full px-3 py-2 border rounded-lg"
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium (Default)</option>
                  <option value="high">High</option>
                </select>
              </div>
            )}

            <div className="space-y-2">
              {!isSimulating ? (
                <Button
                  onClick={handleStartSimulation}
                  disabled={!selectedPersona || !selectedGoal}
                  className="w-full"
                  size="lg"
                >
                  <Play className="w-4 h-4 mr-2" />
                  Run Simulation
                </Button>
              ) : (
                <Button
                  onClick={handleStopSimulation}
                  variant="destructive"
                  className="w-full"
                  size="lg"
                >
                  <StopCircle className="w-4 h-4 mr-2" />
                  Stop Simulation
                </Button>
              )}
            </div>
          </Card>
        </div>

        <div className="lg:col-span-2">
          <Card className="p-6">
            <h2 className="text-xl font-semibold mb-4">Conversation Trajectory</h2>
            {!simulationData ? (
              <div className="flex items-center justify-center h-96 text-gray-500">
                <div className="text-center">
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
