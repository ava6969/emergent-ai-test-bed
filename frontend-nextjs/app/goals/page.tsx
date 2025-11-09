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

export default function GoalsPage() {
  const queryClient = useQueryClient();
  const [generateInput, setGenerateInput] = useState('');
  const [count, setCount] = useState(1);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationStage, setGenerationStage] = useState('');
  const [generationProgress, setGenerationProgress] = useState(0);
  const [settingsOpen, setSettingsOpen] = useState(false);

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

      const startResponse = await apiClient.generateGoal(generateInput.trim(), {
        ...settings,
        count: count,
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
    </div>
  );
}
