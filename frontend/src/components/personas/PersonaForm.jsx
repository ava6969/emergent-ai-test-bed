import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { apiClient } from '@/lib/api/client';
import { useToast } from '@/hooks/use-toast';

export function PersonaForm({ persona, open, onClose, onSuccess }) {
  const [formData, setFormData] = useState({
    name: '',
    background: '',
    organization_id: '',
    tags: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (persona) {
      setFormData({
        name: persona.name || '',
        background: persona.background || '',
        organization_id: persona.organization_id || '',
        tags: persona.tags?.join(', ') || '',
      });
    }
  }, [persona]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const payload = {
        ...formData,
        tags: formData.tags
          .split(',')
          .map((t) => t.trim())
          .filter(Boolean),
      };

      if (persona) {
        await apiClient.updatePersona(persona.id, payload);
        toast({
          title: 'Persona Updated',
          description: 'Successfully updated persona',
        });
      } else {
        await apiClient.createPersona(payload);
        toast({
          title: 'Persona Created',
          description: 'Successfully created persona',
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
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            {persona ? 'Edit Persona' : 'Create Persona'}
          </DialogTitle>
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
              placeholder="e.g., Sarah Johnson"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="background">Background *</Label>
            <Textarea
              id="background"
              value={formData.background}
              onChange={(e) =>
                setFormData({ ...formData, background: e.target.value })
              }
              placeholder="Describe the persona's background, experience, skills, and personality..."
              rows={5}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="organization">Organization ID (optional)</Label>
            <Input
              id="organization"
              value={formData.organization_id}
              onChange={(e) =>
                setFormData({ ...formData, organization_id: e.target.value })
              }
              placeholder="e.g., tech_corp"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="tags">Tags (comma-separated)</Label>
            <Input
              id="tags"
              value={formData.tags}
              onChange={(e) =>
                setFormData({ ...formData, tags: e.target.value })
              }
              placeholder="e.g., senior, technical, customer-facing"
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting
                ? 'Saving...'
                : persona
                ? 'Update'
                : 'Create'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
