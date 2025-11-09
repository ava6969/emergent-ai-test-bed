import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Pencil, Trash2, Settings, Plus, Sparkles, Play } from 'lucide-react';
import { GoalForm } from '@/components/goals/GoalForm';
import { GenerationSettings } from '@/components/shared/GenerationSettings';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { useToast } from '@/hooks/use-toast';

export function Goals() {
  const [generateInput, setGenerateInput] = useState('');
  const [showSettings, setShowSettings] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingGoal, setEditingGoal] = useState(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Fetch goals
  const { data: goals = [], isLoading } = useQuery({
    queryKey: ['goals'],
    queryFn: () => apiClient.getGoals(),
  });

  // Generate goal mutation
  const generateMutation = useMutation({
    mutationFn: async (description) => {
      return await apiClient.generateGoal({
        description,
        conversation_id: 'goals_page',
        context: {},
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['goals']);
      setGenerateInput('');
      toast({
        title: 'Goal Generated',
        description: 'Successfully generated new goal',
      });
    },
    onError: (error) => {
      toast({
        title: 'Generation Failed',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: (id) => apiClient.deleteGoal(id),
    onSuccess: () => {
      queryClient.invalidateQueries(['goals']);
      toast({
        title: 'Goal Deleted',
        description: 'Successfully deleted goal',
      });
    },
  });

  const handleGenerate = async () => {
    if (!generateInput.trim()) return;
    setIsGenerating(true);
    await generateMutation.mutateAsync(generateInput);
    setIsGenerating(false);
  };

  const handleEdit = (goal) => {
    setEditingGoal(goal);
    setShowForm(true);
  };

  const handleDelete = (id) => {
    if (window.confirm('Are you sure you want to delete this goal?')) {
      deleteMutation.mutate(id);
    }
  };

  const handleRunTest = (goal) => {
    toast({
      title: 'Coming Soon',
      description: 'Run test functionality will be available in Sprint 3',
    });
  };

  const handleFormClose = () => {
    setShowForm(false);
    setEditingGoal(null);
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="border-b p-6">
        <h1 className="text-2xl font-bold">Goals</h1>
        <p className="text-muted-foreground">Manage your test goals and scenarios</p>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto p-6">
        {isLoading ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-muted-foreground">Loading goals...</div>
          </div>
        ) : goals.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center space-y-4">
              <p className="text-muted-foreground">No goals yet</p>
              <Button onClick={() => setShowForm(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Create First Goal
              </Button>
            </div>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Objective</TableHead>
                <TableHead>Success Criteria</TableHead>
                <TableHead>Max Turns</TableHead>
                <TableHead>Created</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {goals.map((goal) => (
                <TableRow key={goal.id}>
                  <TableCell className="font-medium">{goal.name}</TableCell>
                  <TableCell className="max-w-md">
                    <div className="line-clamp-2 text-sm text-muted-foreground">
                      {goal.objective}
                    </div>
                  </TableCell>
                  <TableCell className="max-w-xs">
                    <div className="line-clamp-2 text-sm text-muted-foreground">
                      {goal.success_criteria}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{goal.max_turns}</Badge>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {goal.created_at
                      ? format(new Date(goal.created_at), 'MMM d, yyyy')
                      : 'N/A'}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleRunTest(goal)}
                        title="Run Test"
                      >
                        <Play className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleEdit(goal)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(goal.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      {/* Bottom Bar */}
      <div className="border-t p-4 bg-muted/30">
        <div className="flex gap-2">
          <Input
            placeholder="Describe the goal to generate... (e.g., 'Handle customer complaint about delayed order')"
            value={generateInput}
            onChange={(e) => setGenerateInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleGenerate();
              }
            }}
            disabled={isGenerating}
          />
          <Button
            variant="outline"
            size="icon"
            onClick={() => setShowSettings(true)}
          >
            <Settings className="h-4 w-4" />
          </Button>
          <Button
            onClick={handleGenerate}
            disabled={!generateInput.trim() || isGenerating}
            className="gap-2"
          >
            <Sparkles className="h-4 w-4" />
            {isGenerating ? 'Generating...' : 'Generate'}
          </Button>
          <Button
            variant="outline"
            onClick={() => {
              setEditingGoal(null);
              setShowForm(true);
            }}
            className="gap-2"
          >
            <Plus className="h-4 w-4" />
            Manual Create
          </Button>
        </div>
      </div>

      {/* Forms and Modals */}
      {showForm && (
        <GoalForm
          goal={editingGoal}
          open={showForm}
          onClose={handleFormClose}
          onSuccess={() => {
            queryClient.invalidateQueries(['goals']);
            handleFormClose();
          }}
        />
      )}

      {showSettings && (
        <GenerationSettings
          open={showSettings}
          onClose={() => setShowSettings(false)}
          type="goal"
        />
      )}
    </div>
  );
}
