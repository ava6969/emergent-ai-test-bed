import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '../components/ui/button';
import { Card } from '../components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { Badge } from '../components/ui/badge';
import { Trash2, Edit, Plus, Sparkles } from 'lucide-react';
import { apiClient } from '../lib/api/client';
import { useToast } from '../hooks/use-toast';
import GoalForm from '../components/goals/GoalForm';
import GoalGenerationModal from '../components/goals/GoalGenerationModal';

export function Goals() {
  const [showForm, setShowForm] = useState(false);
  const [showGenerateModal, setShowGenerateModal] = useState(false);
  const [editingGoal, setEditingGoal] = useState(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Fetch goals
  const { data: goals = [], isLoading } = useQuery({
    queryKey: ['goals'],
    queryFn: () => apiClient.getGoals(),
  });

  // Fetch personas for dropdown
  const { data: personas = [] } = useQuery({
    queryKey: ['personas'],
    queryFn: () => apiClient.getPersonas(),
  });

  // Fetch products for dropdown
  const { data: products = [] } = useQuery({
    queryKey: ['products'],
    queryFn: () => apiClient.getProducts(),
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

  // Delete all mutation
  const deleteAllMutation = useMutation({
    mutationFn: () => apiClient.deleteAllGoals(),
    onSuccess: (data) => {
      queryClient.invalidateQueries(['goals']);
      toast({
        title: 'All Goals Deleted',
        description: `Successfully deleted ${data.deleted_count} goal(s)`,
      });
    },
  });

  // Generate goal with AI
  const handleGenerate = async (settings) => {
    setIsGenerating(true);
    
    try {
      const goal = await apiClient.generateGoal(settings);
      
      queryClient.invalidateQueries(['goals']);
      toast({
        title: 'Goal Generated',
        description: `Successfully generated: ${goal.name}`,
      });
      setShowGenerateModal(false);
    } catch (error) {
      toast({
        title: 'Generation Failed',
        description: error.response?.data?.detail || error.message,
        variant: 'destructive',
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDelete = (id) => {
    if (window.confirm('Are you sure you want to delete this goal?')) {
      deleteMutation.mutate(id);
    }
  };

  const handleDeleteAll = () => {
    if (window.confirm(`Are you sure you want to delete all ${goals.length} goal(s)? This action cannot be undone.`)) {
      deleteAllMutation.mutate();
    }
  };

  const handleEdit = (goal) => {
    setEditingGoal(goal);
    setShowForm(true);
  };

  const handleFormClose = () => {
    setShowForm(false);
    setEditingGoal(null);
  };

  const getDifficultyColor = (difficulty) => {
    const colors = {
      easy: 'bg-green-500/10 text-green-700',
      medium: 'bg-blue-500/10 text-blue-700',
      hard: 'bg-orange-500/10 text-orange-700',
      expert: 'bg-red-500/10 text-red-700',
    };
    return colors[difficulty] || colors.medium;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-muted-foreground">Loading goals...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="border-b p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Goals</h1>
            <p className="text-muted-foreground">Manage test goals and objectives</p>
          </div>
          <div className="flex gap-2">
            {goals.length > 0 && (
              <Button
                variant="destructive"
                onClick={handleDeleteAll}
                disabled={deleteAllMutation.isPending}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete All
              </Button>
            )}
            <Button onClick={() => setShowForm(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Goal
            </Button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-6 space-y-6">
        {/* AI Generation Button */}
        <Button
          onClick={() => setShowGenerateModal(true)}
          className="w-full"
          size="lg"
        >
          <Sparkles className="h-5 w-5 mr-2" />
          Generate Goal with AI
        </Button>

        {/* Goals Table */}
        {goals.length === 0 ? (
          <Card className="p-8 text-center">
            <p className="text-muted-foreground mb-4">No goals yet</p>
            <Button onClick={() => setShowForm(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Create Your First Goal
            </Button>
          </Card>
        ) : (
          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Objective</TableHead>
                  <TableHead>Success Criteria</TableHead>
                  <TableHead>Max Turns</TableHead>
                  <TableHead>Persona</TableHead>
                  <TableHead>Difficulty</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {goals.map((goal) => (
                  <TableRow key={goal.id}>
                    <TableCell className="font-medium">{goal.name}</TableCell>
                    <TableCell className="max-w-xs truncate">{goal.objective}</TableCell>
                    <TableCell className="max-w-xs truncate">{goal.success_criteria}</TableCell>
                    <TableCell>{goal.max_turns}</TableCell>
                    <TableCell>
                      {goal.agent_ids?.length > 0 ? (
                        <Badge variant="outline">
                          {goal.agent_ids.length} persona(s)
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground">Standalone</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {goal.difficulty ? (
                        <Badge className={getDifficultyColor(goal.difficulty)}>
                          {goal.difficulty}
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEdit(goal)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(goal.id)}
                          disabled={deleteMutation.isPending}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        )}
      </div>

      {/* Goal Form Modal */}
      {showForm && (
        <GoalForm
          goal={editingGoal}
          personas={personas}
          onClose={handleFormClose}
        />
      )}
    </div>
  );
}
