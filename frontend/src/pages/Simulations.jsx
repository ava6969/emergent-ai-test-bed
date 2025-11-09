import React, { useState, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Button } from '../components/ui/button';
import { Card } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Play, StopCircle, Clock, Target, User, MessageSquare, Sparkles } from 'lucide-react';
import { apiClient } from '../lib/api/client';
import { useToast } from '../hooks/use-toast';

export function Simulations() {
  const [selectedPersona, setSelectedPersona] = useState('');
  const [selectedGoal, setSelectedGoal] = useState('');
  const [maxTurns, setMaxTurns] = useState('');
  const [reasoningModel, setReasoningModel] = useState('gpt-4o');
  const [isSimulating, setIsSimulating] = useState(false);
  const [simulationId, setSimulationId] = useState(null);
  const [simulationData, setSimulationData] = useState(null);
  const { toast } = useToast();

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
          toast({
            title: 'Simulation Complete',
            description: `Completed ${status.current_turn} turns. Goal ${status.goal_achieved ? 'achieved' : 'not achieved'}`,
          });
        } else if (status.status === 'failed') {
          setIsSimulating(false);
          clearInterval(pollInterval);
          toast({
            title: 'Simulation Failed',
            description: status.error || 'An error occurred',
            variant: 'destructive',
          });
        }
      } catch (error) {
        console.error('Error polling simulation:', error);
      }
    }, 2000); // Poll every 2 seconds

    return () => clearInterval(pollInterval);
  }, [simulationId, isSimulating, toast]);

  // Start simulation
  const handleStartSimulation = async () => {
    if (!selectedPersona || !selectedGoal) {
      toast({
        title: 'Missing Selection',
        description: 'Please select both a persona and a goal',
        variant: 'destructive',
      });
      return;
    }

    try {
      setIsSimulating(true);
      const response = await apiClient.startSimulation(
        selectedPersona,
        selectedGoal,
        maxTurns ? parseInt(maxTurns) : null,
        reasoningModel
      );
      setSimulationId(response.simulation_id);
      setSimulationData({
        status: 'running',
        current_turn: 0,
        trajectory: [],
      });
      toast({
        title: 'Simulation Started',
        description: 'Running simulation...',
      });
    } catch (error) {
      setIsSimulating(false);
      toast({
        title: 'Error',
        description: error.message || 'Failed to start simulation',
        variant: 'destructive',
      });
    }
  };

  // Stop simulation
  const handleStopSimulation = async () => {
    if (!simulationId) return;

    try {
      await apiClient.stopSimulation(simulationId);
      setIsSimulating(false);
      toast({
        title: 'Simulation Stopped',
        description: 'Simulation was stopped',
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to stop simulation',
        variant: 'destructive',
      });
    }
  };

  // Get selected persona and goal details
  const selectedPersonaObj = personas.find(p => p.id === selectedPersona);
  const selectedGoalObj = goals.find(g => g.id === selectedGoal);

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
        <div className="lg:col-span-1">
          <Card className="p-6">
            <h2 className="text-xl font-semibold mb-4">Configuration</h2>

            {/* Persona Selection */}
            <div className="mb-4">
              <label className="block text-sm font-medium mb-2">
                <User className="inline w-4 h-4 mr-1" />
                Select Persona
              </label>
              <select
                value={selectedPersona}
                onChange={(e) => setSelectedPersona(e.target.value)}
                disabled={isSimulating}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
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
            <div className="mb-4">
              <label className="block text-sm font-medium mb-2">
                <Target className="inline w-4 h-4 mr-1" />
                Select Goal
              </label>
              <select
                value={selectedGoal}
                onChange={(e) => setSelectedGoal(e.target.value)}
                disabled={isSimulating}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
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
                placeholder={selectedGoalObj ? `Default: ${selectedGoalObj.max_turns}` : 'Override max turns'}
                min="1"
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
              />
            </div>

            {/* Reasoning Model Selector */}
            <div className="mb-6">
              <label className="block text-sm font-medium mb-2">
                <Sparkles className="inline w-4 h-4 mr-1" />
                Reasoning Model
              </label>
              <select
                value={reasoningModel}
                onChange={(e) => setReasoningModel(e.target.value)}
                disabled={isSimulating}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
              >
                <option value="gpt-4o">GPT-4o (Fast)</option>
                <option value="gpt-4o-mini">GPT-4o Mini (Faster)</option>
                <option value="o1-preview">o1 Preview (Deep Reasoning)</option>
                <option value="o1-mini">o1 Mini (Reasoning)</option>
              </select>
              <p className="text-xs text-gray-500 mt-1">
                Model used by the test persona to decide next actions
              </p>
            </div>

            {/* Action Buttons */}
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

        {/* Results Panel */}
        <div className="lg:col-span-2">
          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold">
                <MessageSquare className="inline w-5 h-5 mr-2" />
                Conversation Trajectory
              </h2>
              {simulationData && (
                <div className="flex items-center gap-2">
                  <Badge variant={
                    simulationData.status === 'running' ? 'default' :
                    simulationData.status === 'completed' ? 'success' :
                    'destructive'
                  }>
                    {simulationData.status}
                  </Badge>
                  {simulationData.current_turn > 0 && (
                    <Badge variant="outline">
                      Turn {simulationData.current_turn} / {simulationData.max_turns}
                    </Badge>
                  )}
                </div>
              )}
            </div>

            {!simulationData ? (
              <div className="text-center py-12 text-gray-500">
                <MessageSquare className="w-16 h-16 mx-auto mb-4 opacity-20" />
                <p>Select a persona and goal to start a simulation</p>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Progress Indicator */}
                {isSimulating && (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-blue-900">
                        Simulation in progress...
                      </span>
                      <span className="text-sm text-blue-700">
                        Turn {simulationData.current_turn} / {simulationData.max_turns}
                      </span>
                    </div>
                    <div className="w-full bg-blue-200 rounded-full h-2">
                      <div
                        className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                        style={{
                          width: `${(simulationData.current_turn / simulationData.max_turns) * 100}%`
                        }}
                      />
                    </div>
                  </div>
                )}

                {/* Trajectory Messages */}
                <div className="space-y-3 max-h-[600px] overflow-y-auto">
                  {simulationData.trajectory && simulationData.trajectory.length > 0 ? (
                    simulationData.trajectory.map((message, idx) => (
                      <div
                        key={idx}
                        className={`p-4 rounded-lg ${
                          message.role === 'user'
                            ? 'bg-blue-50 border border-blue-200'
                            : 'bg-gray-50 border border-gray-200'
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          <div className={`mt-1 p-2 rounded-full ${
                            message.role === 'user' ? 'bg-blue-200' : 'bg-gray-300'
                          }`}>
                            {message.role === 'user' ? (
                              <User className="w-4 h-4 text-blue-900" />
                            ) : (
                              <MessageSquare className="w-4 h-4 text-gray-700" />
                            )}
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="font-medium text-sm">
                                {message.role === 'user' ? 'Persona' : 'Assistant'}
                              </span>
                              <span className="text-xs text-gray-500">
                                Turn {Math.floor(idx / 2) + 1}
                              </span>
                            </div>
                            <div className="text-sm text-gray-700 whitespace-pre-wrap">
                              {typeof message.content === 'string' 
                                ? message.content 
                                : message.content?.thinking || message.content?.text || JSON.stringify(message.content, null, 2)}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-8 text-gray-500">
                      <p className="text-sm">Waiting for conversation to start...</p>
                    </div>
                  )}
                </div>

                {/* Final Results */}
                {simulationData.status === 'completed' && (
                  <div className={`p-4 rounded-lg border-2 ${
                    simulationData.goal_achieved
                      ? 'bg-green-50 border-green-300'
                      : 'bg-yellow-50 border-yellow-300'
                  }`}>
                    <div className="flex items-center gap-2">
                      <Target className={`w-5 h-5 ${
                        simulationData.goal_achieved ? 'text-green-700' : 'text-yellow-700'
                      }`} />
                      <span className={`font-semibold ${
                        simulationData.goal_achieved ? 'text-green-900' : 'text-yellow-900'
                      }`}>
                        {simulationData.goal_achieved
                          ? '✓ Goal Achieved!'
                          : '⚠ Goal Not Achieved'}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}

export default Simulations;
