'use client';

import { useState } from 'react';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { apiClient } from '@/lib/api/client';
import { Building2, Plus, Edit, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from 'sonner';

export default function OrganizationsPage() {
  const queryClient = useQueryClient();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingOrg, setEditingOrg] = useState<any>(null);
  const [formData, setFormData] = useState({ name: '', description: '' });

  const { data: organizations = [], isLoading } = useQuery({
    queryKey: ['organizations'],
    queryFn: () => apiClient.getOrganizations(),
  });

  const createMutation = useMutation({
    mutationFn: (data: { name: string; description: string }) => apiClient.createOrganization(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['organizations'] });
      setIsCreateOpen(false);
      setFormData({ name: '', description: '' });
      toast.success('Organization created successfully');
    },
    onError: () => {
      toast.error('Failed to create organization');
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: { name: string; description: string } }) =>
      apiClient.updateOrganization(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['organizations'] });
      setEditingOrg(null);
      setFormData({ name: '', description: '' });
      toast.success('Organization updated successfully');
    },
    onError: () => {
      toast.error('Failed to update organization');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiClient.deleteOrganization(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['organizations'] });
      toast.success('Organization deleted successfully');
    },
    onError: () => {
      toast.error('Failed to delete organization');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      toast.error('Organization name is required');
      return;
    }
    
    if (editingOrg) {
      updateMutation.mutate({ id: editingOrg.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const handleEdit = (org: any) => {
    setEditingOrg(org);
    setFormData({ name: org.name, description: org.description || '' });
  };

  const handleDelete = (id: string) => {
    if (confirm('Are you sure you want to delete this organization?')) {
      deleteMutation.mutate(id);
    }
  };

  return (
    <div className="flex flex-col h-full">
      <div className="border-b p-6 bg-white">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold">Organizations</h1>
            <p className="text-gray-600">Manage organizations</p>
          </div>
          <Button onClick={() => setIsCreateOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            New Organization
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-6">
        {isLoading ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-gray-600">Loading organizations...</div>
          </div>
        ) : organizations.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center space-y-4">
              <Building2 className="h-16 w-16 mx-auto text-gray-400" />
              <p className="text-gray-600">No organizations yet</p>
              <p className="text-sm text-gray-500">Create your first organization to get started</p>
              <Button onClick={() => setIsCreateOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Create Organization
              </Button>
            </div>
          </div>
        ) : (
          <div className="grid gap-4">
            {organizations.map((org) => (
              <div key={org.id} className="bg-white rounded-lg border p-4">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <h3 className="font-medium">{org.name}</h3>
                    <p className="text-sm text-gray-600 mt-1">{org.description}</p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleEdit(org)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(org.id)}
                    >
                      <Trash2 className="h-4 w-4 text-red-500" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Create/Edit Dialog */}
      <Dialog open={isCreateOpen || !!editingOrg} onOpenChange={(open) => {
        if (!open) {
          setIsCreateOpen(false);
          setEditingOrg(null);
          setFormData({ name: '', description: '' });
        }
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingOrg ? 'Edit Organization' : 'Create New Organization'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">Organization Name</label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Enter organization name"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Description</label>
              <Input
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Enter organization description"
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setIsCreateOpen(false);
                  setEditingOrg(null);
                  setFormData({ name: '', description: '' });
                }}
              >
                Cancel
              </Button>
              <Button type="submit">
                {editingOrg ? 'Update' : 'Create'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
