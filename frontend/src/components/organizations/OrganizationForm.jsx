import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { apiClient } from '@/lib/api/client';
import { useToast } from '@/hooks/use-toast';

export function OrganizationForm({ organization, open, onClose, onSuccess }) {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    type: '',
    industry: '',
    created_from_real_company: false,
    use_exa_search: false,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (organization) {
      setFormData({
        name: organization.name || '',
        description: organization.description || '',
        type: organization.type || '',
        industry: organization.industry || '',
        created_from_real_company:
          organization.created_from_real_company || false,
        use_exa_search: false,
      });
    }
  }, [organization]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      if (organization) {
        await apiClient.updateOrganization(organization.id, formData);
        toast({
          title: 'Organization Updated',
          description: 'Successfully updated organization',
        });
      } else {
        await apiClient.createOrganization(formData);
        toast({
          title: 'Organization Created',
          description: 'Successfully created organization',
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
            {organization ? 'Edit Organization' : 'Create Organization'}
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
              placeholder="e.g., TechCorp Inc."
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description *</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) =>
                setFormData({ ...formData, description: e.target.value })
              }
              placeholder="Describe the organization..."
              rows={4}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="type">Type</Label>
              <Input
                id="type"
                value={formData.type}
                onChange={(e) =>
                  setFormData({ ...formData, type: e.target.value })
                }
                placeholder="e.g., Startup, Enterprise"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="industry">Industry</Label>
              <Input
                id="industry"
                value={formData.industry}
                onChange={(e) =>
                  setFormData({ ...formData, industry: e.target.value })
                }
                placeholder="e.g., SaaS, E-commerce"
              />
            </div>
          </div>

          <div className="flex items-center justify-between rounded-lg border p-4">
            <div className="space-y-0.5">
              <Label>Real Company</Label>
              <p className="text-sm text-muted-foreground">
                Mark if this is based on a real company
              </p>
            </div>
            <Switch
              checked={formData.created_from_real_company}
              onCheckedChange={(checked) =>
                setFormData({
                  ...formData,
                  created_from_real_company: checked,
                })
              }
            />
          </div>

          {!organization && (
            <div className="flex items-center justify-between rounded-lg border p-4">
              <div className="space-y-0.5">
                <Label>Use Exa Search</Label>
                <p className="text-sm text-muted-foreground">
                  Automatically search for real-world context using Exa.ai
                </p>
              </div>
              <Switch
                checked={formData.use_exa_search}
                onCheckedChange={(checked) =>
                  setFormData({ ...formData, use_exa_search: checked })
                }
              />
            </div>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting
                ? 'Saving...'
                : organization
                ? 'Update'
                : 'Create'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
