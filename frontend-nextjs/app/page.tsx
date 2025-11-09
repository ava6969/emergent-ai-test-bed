'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api/client';
import { motion } from 'framer-motion';
import { User, Target, Clock, Sparkles, Play, Loader2 } from 'lucide-react';
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
      router.push(`/simulation/${response.thread_id}`);
    } catch (error: any) {
      setIsStarting(false);
      toast.error(error.message || 'Failed to start simulation');
    }
  };

  const selectedPersonaObj = personas.find((p) => p.id === selectedPersona);
  const selectedGoalObj = goals.find((g) => g.id === selectedGoal);

  return (
    <div className="flex items-center justify-center min-h-screen p-8 relative z-0">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-2xl"
      >
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2 text-white luminance-glow">Create New Simulation</h1>
          <p className="text-[#A0A0A0] text-sm">Configure and run agent evaluation simulations</p>
        </div>

        <div className="space-y-6">
          {/* Persona Selection */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 }}
          >
            <label className="block text-sm font-medium mb-3 text-[#00FF41] opacity-80">
              <User className="inline w-4 h-4 mr-2" />
              Select Persona
            </label>
            <select
              value={selectedPersona}
              onChange={(e) => setSelectedPersona(e.target.value)}
              disabled={isStarting}
              className="w-full px-4 py-3 bg-transparent border border-[#00FF41] border-opacity-20 rounded text-[#00FF41] focus:border-opacity-60 focus:outline-none transition-all"
            >
              <option value="" className="bg-black">Choose persona...</option>
              {personas.map((persona) => (
                <option key={persona.id} value={persona.id} className="bg-black">
                  {persona.name}
                </option>
              ))}
            </select>
            {selectedPersonaObj && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="mt-3 p-4 bg-[#00FF41] bg-opacity-5 border border-[#00FF41] border-opacity-20 rounded"
              >
                <p className="font-medium text-[#00FF41]">{selectedPersonaObj.name}</p>
                <p className="text-[#00FF41] opacity-60 text-xs mt-1 line-clamp-2">
                  {selectedPersonaObj.background}
                </p>
              </motion.div>
            )}
          </motion.div>

          {/* Goal Selection */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
          >
            <label className="block text-sm font-medium mb-3 text-[#00FF41] opacity-80">
              <Target className="inline w-4 h-4 mr-2" />
              Select Goal
            </label>
            <select
              value={selectedGoal}
              onChange={(e) => setSelectedGoal(e.target.value)}
              disabled={isStarting}
              className="w-full px-4 py-3 bg-transparent border border-[#00FF41] border-opacity-20 rounded text-[#00FF41] focus:border-opacity-60 focus:outline-none transition-all"
            >
              <option value="" className="bg-black">Choose goal...</option>
              {goals.map((goal) => (
                <option key={goal.id} value={goal.id} className="bg-black">
                  {goal.name}
                </option>
              ))}
            </select>
            {selectedGoalObj && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="mt-3 p-4 bg-[#00FF41] bg-opacity-5 border border-[#00FF41] border-opacity-20 rounded"
              >
                <p className="font-medium text-[#00FF41]">{selectedGoalObj.name}</p>
                <p className="text-[#00FF41] opacity-60 text-xs mt-1">
                  Max turns: {selectedGoalObj.max_turns}
                </p>
              </motion.div>
            )}
          </motion.div>

          {/* Advanced Settings */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 }}
            className="grid grid-cols-2 gap-4"
          >
            <div>
              <label className="block text-sm font-medium mb-3 text-[#00FF41] opacity-80">
                <Clock className="inline w-4 h-4 mr-2" />
                Max Turns
              </label>
              <input
                type="number"
                value={maxTurns}
                onChange={(e) => setMaxTurns(e.target.value)}
                disabled={isStarting}
                placeholder={selectedGoalObj ? String(selectedGoalObj.max_turns) : '5'}
                className="w-full px-4 py-3 bg-transparent border border-[#00FF41] border-opacity-20 rounded text-[#00FF41] focus:border-opacity-60 focus:outline-none transition-all"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-3 text-[#00FF41] opacity-80">
                <Sparkles className="inline w-4 h-4 mr-2" />
                Model
              </label>
              <select
                value={reasoningModel}
                onChange={(e) => setReasoningModel(e.target.value)}
                disabled={isStarting}
                className="w-full px-4 py-3 bg-transparent border border-[#00FF41] border-opacity-20 rounded text-[#00FF41] focus:border-opacity-60 focus:outline-none transition-all"
              >
                <option value="gpt-5" className="bg-black">GPT-5</option>
                <option value="gpt-4o" className="bg-black">GPT-4o</option>
                <option value="o1" className="bg-black">O1</option>
                <option value="o3" className="bg-black">O3</option>
              </select>
            </div>
          </motion.div>

          {/* Reasoning Effort (only for reasoning models) */}
          {isReasoningModel(reasoningModel) && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
            >
              <label className="block text-sm font-medium mb-3 text-[#00FF41] opacity-80">
                Reasoning Effort
              </label>
              <div className="flex gap-2">
                {['low', 'medium', 'high'].map((effort) => (
                  <button
                    key={effort}
                    onClick={() => setReasoningEffort(effort)}
                    disabled={isStarting}
                    className={`flex-1 px-4 py-2 border rounded transition-all ${
                      reasoningEffort === effort
                        ? 'bg-[#00FF41] bg-opacity-20 border-[#00FF41] text-[#00FF41]'
                        : 'border-[#00FF41] border-opacity-20 text-[#00FF41] opacity-60 hover:opacity-100'
                    }`}
                  >
                    {effort.charAt(0).toUpperCase() + effort.slice(1)}
                  </button>
                ))}
              </div>
            </motion.div>
          )}

          {/* Start Button */}
          <motion.button
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleStartSimulation}
            disabled={isStarting || !selectedPersona || !selectedGoal}
            className="w-full py-4 bg-[#00FF41] bg-opacity-10 border border-[#00FF41] rounded text-[#00FF41] font-medium hover:bg-opacity-20 disabled:opacity-40 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2 animate-glow"
          >
            {isStarting ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Starting Simulation...
              </>
            ) : (
              <>
                <Play className="w-5 h-5" />
                Start Simulation
              </>
            )}
          </motion.button>
        </div>
      </motion.div>
    </div>
  );
}
