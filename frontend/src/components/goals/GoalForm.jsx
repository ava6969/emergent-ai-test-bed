import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { apiClient } from '@/lib/api/client';
import { useToast } from '@/hooks/use-toast';

export function GoalForm({ goal, open, onClose, onSuccess }) {
  const [formData, setFormData] = useState({
    name: '',
    objective: '',
    success_criteria: '',
    initial_prompt: '',
    max_turns: 10,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (goal) {
      setFormData({
        name: goal.name || '',
        objective: goal.objective || '',
        success_criteria: goal.success_criteria || '',
        initial_prompt: goal.initial_prompt || '',
        max_turns: goal.max_turns || 10,
      });
    }
  }, [goal]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      if (goal) {
        await apiClient.updateGoal(goal.id, formData);
        toast({
          title: 'Goal Updated',
          description: 'Successfully updated goal',
        });
      } else {
        await apiClient.createGoal(formData);
        toast({
          title: 'Goal Created',
          description: 'Successfully created goal',
        });
      }

      onSuccess();
    } catch (error) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{goal ? 'Edit Goal' : 'Create Goal'}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Name *</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) =>
                setFormData({ ...formData, name: e.target.value })
              }
              placeholder="e.g., Handle Customer Complaint"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="objective">Objective *</Label>
            <Textarea
              id="objective"
              value={formData.objective}
              onChange={(e) =>
                setFormData({ ...formData, objective: e.target.value })
              }
              placeholder="What should be achieved in this test?"
              rows={3}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="success_criteria">Success Criteria *</Label>
            <Textarea
              id="success_criteria"
              value={formData.success_criteria}
              onChange={(e) =>
                setFormData({ ...formData, success_criteria: e.target.value })
              }
              placeholder="How will success be measured?"
              rows={3}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="initial_prompt">Initial Prompt *</Label>
            <Textarea
              id="initial_prompt"
              value={formData.initial_prompt}
              onChange={(e) =>
                setFormData({ ...formData, initial_prompt: e.target.value })
              }
              placeholder="The first message to start the conversation"
              rows={2}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="max_turns">Max Turns *</Label>
            <Input
              id="max_turns"
              type="number"
              min="1"
              max="50"
              value={formData.max_turns}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  max_turns: parseInt(e.target.value),
                })
              }
              required
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Saving...' : goal ? 'Update' : 'Create'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
