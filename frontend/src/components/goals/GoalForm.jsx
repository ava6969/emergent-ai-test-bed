import React, { useState, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { Card } from '../ui/card';
import { X } from 'lucide-react';
import { apiClient } from '../../lib/api/client';
import { useToast } from '../../hooks/use-toast';

export default function GoalForm({ goal, personas, onClose }) {
  const [formData, setFormData] = useState({
    name: '',
    objective: '',
    success_criteria: '',
    initial_prompt: '',
    max_turns: 10,
    agent_ids: [],
  });
  
  const queryClient = useQueryClient();
  const { toast } = useToast();

  useEffect(() => {
    if (goal) {
      setFormData({
        name: goal.name || '',
        objective: goal.objective || '',
        success_criteria: goal.success_criteria || '',
        initial_prompt: goal.initial_prompt || '',
        max_turns: goal.max_turns || 10,
        agent_ids: goal.agent_ids || [],
      });
    }
  }, [goal]);

  const createMutation = useMutation({
    mutationFn: (data) => apiClient.createGoal(data),
    onSuccess: () => {
      queryClient.invalidateQueries(['goals']);
      toast({
        title: 'Goal Created',
        description: 'Successfully created goal',
      });
      onClose();
    },
  });

  const updateMutation = useMutation({
    mutationFn: (data) => apiClient.updateGoal(goal.id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['goals']);
      toast({
        title: 'Goal Updated',
        description: 'Successfully updated goal',
      });
      onClose();
    },
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (!formData.name || !formData.objective || !formData.success_criteria || !formData.initial_prompt) {
      toast({
        title: 'Validation Error',
        description: 'All fields are required',
        variant: 'destructive',
      });
      return;
    }

    if (goal) {
      updateMutation.mutate(formData);
    } else {
      createMutation.mutate(formData);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold">
              {goal ? 'Edit Goal' : 'Create Goal'}
            </h2>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Name */}
            <div className="space-y-2">
              <Label htmlFor="name">Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., Debug Production Issue"
                required
              />
            </div>

            {/* Objective */}
            <div className="space-y-2">
              <Label htmlFor="objective">Objective *</Label>
              <Textarea
                id="objective"
                value={formData.objective}
                onChange={(e) => setFormData({ ...formData, objective: e.target.value })}
                placeholder="Clear statement of what should be achieved"
                rows={3}
                required
              />
            </div>

            {/* Success Criteria */}
            <div className="space-y-2">
              <Label htmlFor="success_criteria">Success Criteria *</Label>
              <Textarea
                id="success_criteria"
                value={formData.success_criteria}
                onChange={(e) => setFormData({ ...formData, success_criteria: e.target.value })}
                placeholder="Measurable criteria for determining success"
                rows={3}
                required
              />
            </div>

            {/* Initial Prompt */}
            <div className="space-y-2">
              <Label htmlFor="initial_prompt">Initial Prompt *</Label>
              <Textarea
                id="initial_prompt"
                value={formData.initial_prompt}
                onChange={(e) => setFormData({ ...formData, initial_prompt: e.target.value })}
                placeholder="First message to start the conversation"
                rows={3}
                required
              />
            </div>

            {/* Max Turns */}
            <div className="space-y-2">
              <Label htmlFor="max_turns">Max Turns</Label>
              <Input
                id="max_turns"
                type="number"
                value={formData.max_turns}
                onChange={(e) => setFormData({ ...formData, max_turns: parseInt(e.target.value) })}
                min={1}
                max={50}
              />
            </div>

            {/* Persona Assignment */}
            <div className="space-y-2">
              <Label>Assign to Personas (Optional)</Label>
              <div className="border rounded-lg p-3 max-h-40 overflow-y-auto">
                {personas.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No personas available</p>
                ) : (
                  <div className="space-y-2">
                    {personas.map((persona) => (
                      <label key={persona.id} className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          checked={formData.agent_ids.includes(persona.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setFormData({
                                ...formData,
                                agent_ids: [...formData.agent_ids, persona.id],
                              });
                            } else {
                              setFormData({
                                ...formData,
                                agent_ids: formData.agent_ids.filter((id) => id !== persona.id),
                              });
                            }
                          }}
                          className="rounded border-gray-300"
                        />
                        <span className="text-sm">{persona.name}</span>
                      </label>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={createMutation.isPending || updateMutation.isPending}
              >
                {goal ? 'Update' : 'Create'} Goal
              </Button>
            </div>
          </form>
        </div>
      </Card>
    </div>
  );
}
