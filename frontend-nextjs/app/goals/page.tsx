'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient, type Goal } from '@/lib/api/client';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Trash2, Target } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';

import { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Settings, Sparkles } from 'lucide-react';
import { GenerationSettingsModal } from '@/components/GenerationSettingsModal';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';

export default function GoalsPage() {
  const queryClient = useQueryClient();
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [generateInput, setGenerateInput] = useState('');
  const [selectedPersona, setSelectedPersona] = useState('');
  const [difficulty, setDifficulty] = useState('');
  const [count, setCount] = useState(1);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationStage, setGenerationStage] = useState('');
  const [generationProgress, setGenerationProgress] = useState(0);
  const [settingsOpen, setSettingsOpen] = useState(false);

  // Fetch personas for dropdown
  const { data: personas = [] } = useQuery({
    queryKey: ['personas'],
    queryFn: () => apiClient.getPersonas(),
  });

  // Fetch goals
  const { data: goals = [], isLoading } = useQuery({
    queryKey: ['goals'],
    queryFn: () => apiClient.getGoals(),
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiClient.deleteGoal(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['goals'] });
      toast.success('Goal deleted successfully');
    },
  });

  const handleDelete = (id: string) => {
    if (window.confirm('Are you sure you want to delete this goal?')) {
      deleteMutation.mutate(id);
    }
  };

  const handleGenerate = async () => {
    if (!generateInput.trim()) {
      toast.error('Please enter a goal description');
      return;
    }

    try {
      setIsGenerating(true);
      setGenerationProgress(0);
      
      // Load settings from localStorage
      const settingsKey = 'generation_settings_goal';
      const storedSettings = localStorage.getItem(settingsKey);
      const settings = storedSettings ? JSON.parse(storedSettings) : {
        model: 'gpt-5',
        temperature: 0.7,
        reasoning_effort: 'medium',
        max_tokens: 1500,
      };

      const startResponse = await apiClient.generateGoal({
        persona_ids: selectedPersona ? [selectedPersona] : [],
        difficulty: difficulty || 'medium',
        organization_id: undefined, // TODO: Add organization context
        product_id: undefined, // TODO: Add product context
      });

      const jobId = startResponse.job_id;

      // Poll for status
      const pollingInterval = setInterval(async () => {
        try {
          const status = await apiClient.checkJobStatus(jobId);

          setGenerationStage(status.stage || '');
          setGenerationProgress(status.progress || 0);

          if (status.status === 'completed') {
            clearInterval(pollingInterval);
            queryClient.invalidateQueries({ queryKey: ['goals'] });
            setGenerateInput('');
            const goalCount = count > 1 ? `${count} goals` : 'goal';
            toast.success(`Successfully created ${goalCount} in ${status.generation_time}s`);
            
            setTimeout(() => {
              setIsGenerating(false);
              setGenerationProgress(0);
              setGenerationStage('');
            }, 500);
          } else if (status.status === 'failed') {
            clearInterval(pollingInterval);
            toast.error(`Generation failed: ${status.error || 'Unknown error'}`);
            setIsGenerating(false);
            setGenerationProgress(0);
            setGenerationStage('');
          }
        } catch (error) {
          console.error('Polling error:', error);
        }
      }, 1000);

      // Cleanup on unmount
      setTimeout(() => {
        if (pollingInterval) {
          clearInterval(pollingInterval);
        }
      }, 120000); // 2 minute timeout

    } catch (error: any) {
      console.error('Generation error:', error);
      toast.error(error.message || 'Failed to start generation');
      setIsGenerating(false);
      setGenerationProgress(0);
      setGenerationStage('');
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="border-b p-6 bg-white">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Goals</h1>
            <p className="text-gray-600">Manage test goals and scenarios</p>
          </div>
          <Button onClick={() => setCreateModalOpen(true)}>
            <Sparkles className="h-4 w-4 mr-2" />
            Create Goal
          </Button>
        </div>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto p-6">
        {isLoading ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-gray-600">Loading goals...</div>
          </div>
        ) : goals.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center space-y-4">
              <Target className="h-16 w-16 mx-auto text-gray-400" />
              <p className="text-gray-600">No goals yet</p>
              <p className="text-sm text-gray-500">Goals will appear here once created</p>
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Objective</TableHead>
                  <TableHead>Success Criteria</TableHead>
                  <TableHead>Max Turns</TableHead>
                  <TableHead>Difficulty</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {goals.map((goal) => (
                  <TableRow key={goal.id}>
                    <TableCell className="font-medium">{goal.name}</TableCell>
                    <TableCell className="max-w-md">
                      <div className="line-clamp-2 text-sm text-gray-600">
                        {goal.objective}
                      </div>
                    </TableCell>
                    <TableCell className="max-w-md">
                      <div className="line-clamp-2 text-sm text-gray-600">
                        {goal.success_criteria}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{goal.max_turns}</Badge>
                    </TableCell>
                    <TableCell>
                      {goal.difficulty && (
                        <Badge variant="secondary">{goal.difficulty}</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(goal.id)}
                        disabled={deleteMutation.isPending}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      {/* Create Goal Modal */}
      <Dialog open={createModalOpen} onOpenChange={setCreateModalOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Create Goal</DialogTitle>
            <DialogDescription>
              Generate AI-powered test goals for your personas
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Description Input */}
            <div>
              <label className="text-sm font-medium mb-2 block">Description</label>
              <Input
                placeholder="Describe the goal... (e.g., 'Create a trading strategy backtest goal')"
                value={generateInput}
                onChange={(e) => setGenerateInput(e.target.value)}
                disabled={isGenerating}
              />
            </div>

            {/* Persona Dropdown */}
            <div>
              <label className="text-sm font-medium mb-2 block">For Persona (Optional)</label>
              <select
                value={selectedPersona}
                onChange={(e) => setSelectedPersona(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg"
                disabled={isGenerating}
              >
                <option value="">All Personas</option>
                {personas.map((persona: any) => (
                  <option key={persona.id} value={persona.id}>
                    {persona.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Difficulty Selector */}
            <div>
              <label className="text-sm font-medium mb-2 block">Difficulty (Optional)</label>
              <select
                value={difficulty}
                onChange={(e) => setDifficulty(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg"
                disabled={isGenerating}
              >
                <option value="">Any</option>
                <option value="easy">Easy</option>
                <option value="medium">Medium</option>
                <option value="hard">Hard</option>
              </select>
            </div>

            {/* Count */}
            <div>
              <label className="text-sm font-medium mb-2 block">Count</label>
              <Input
                type="number"
                min="1"
                max="10"
                value={count}
                onChange={(e) => setCount(Math.min(10, Math.max(1, parseInt(e.target.value) || 1)))}
                disabled={isGenerating}
              />
            </div>

            {/* Progress Bar */}
            {isGenerating && (
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">{generationStage}</span>
                  <span className="text-gray-600">{generationProgress}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${generationProgress}%` }}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex justify-between">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setSettingsOpen(true)}
              disabled={isGenerating}
            >
              <Settings className="h-5 w-5" />
            </Button>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => setCreateModalOpen(false)}
                disabled={isGenerating}
              >
                Cancel
              </Button>
              <Button
                onClick={handleGenerate}
                disabled={isGenerating || !generateInput.trim()}
              >
                <Sparkles className="h-4 w-4 mr-2" />
                {isGenerating ? 'Generating...' : 'Generate'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Generation Settings Modal */}
      <GenerationSettingsModal
        open={settingsOpen}
        onOpenChange={setSettingsOpen}
        settingsKey="generation_settings_goal"
        title="Goal Generation Settings"
        description="Configure AI model parameters for generating goals"
      />
    </div>
  );
}
