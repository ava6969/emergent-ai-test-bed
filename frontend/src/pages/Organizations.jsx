import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Pencil, Trash2, Plus, Building2 } from 'lucide-react';
import { OrganizationForm } from '@/components/organizations/OrganizationForm';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { useToast } from '@/hooks/use-toast';

export function Organizations() {
  const [showForm, setShowForm] = useState(false);
  const [editingOrg, setEditingOrg] = useState(null);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Fetch organizations
  const { data: organizations = [], isLoading } = useQuery({
    queryKey: ['organizations'],
    queryFn: () => apiClient.getOrganizations(),
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: (id) => apiClient.deleteOrganization(id),
    onSuccess: () => {
      queryClient.invalidateQueries(['organizations']);
      toast({
        title: 'Organization Deleted',
        description: 'Successfully deleted organization',
      });
    },
  });

  const handleEdit = (org) => {
    setEditingOrg(org);
    setShowForm(true);
  };

  const handleDelete = (id) => {
    if (window.confirm('Are you sure you want to delete this organization?')) {
      deleteMutation.mutate(id);
    }
  };

  const handleFormClose = () => {
    setShowForm(false);
    setEditingOrg(null);
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="border-b p-6">
        <h1 className="text-2xl font-bold">Organizations</h1>
        <p className="text-muted-foreground">Manage your test organizations</p>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto p-6">
        {isLoading ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-muted-foreground">Loading organizations...</div>
          </div>
        ) : organizations.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center space-y-4">
              <Building2 className="h-12 w-12 mx-auto text-muted-foreground" />
              <p className="text-muted-foreground">No organizations yet</p>
              <Button onClick={() => setShowForm(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Create First Organization
              </Button>
            </div>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Industry</TableHead>
                <TableHead>Real Company</TableHead>
                <TableHead>Created</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {organizations.map((org) => (
                <TableRow key={org.id}>
                  <TableCell className="font-medium">{org.name}</TableCell>
                  <TableCell className="max-w-md">
                    <div className="line-clamp-2 text-sm text-muted-foreground">
                      {org.description}
                    </div>
                  </TableCell>
                  <TableCell>
                    {org.type && <Badge variant="outline">{org.type}</Badge>}
                  </TableCell>
                  <TableCell>
                    {org.industry && (
                      <Badge variant="secondary">{org.industry}</Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    {org.created_from_real_company && (
                      <Badge className="bg-green-500">Yes</Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {org.created_at
                      ? format(new Date(org.created_at), 'MMM d, yyyy')
                      : 'N/A'}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleEdit(org)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(org.id)}
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
        <div className="flex gap-2 justify-end">
          <Button
            onClick={() => {
              setEditingOrg(null);
              setShowForm(true);
            }}
            className="gap-2"
          >
            <Plus className="h-4 w-4" />
            Create Organization
          </Button>
        </div>
      </div>

      {/* Form Modal */}
      {showForm && (
        <OrganizationForm
          organization={editingOrg}
          open={showForm}
          onClose={handleFormClose}
          onSuccess={() => {
            queryClient.invalidateQueries(['organizations']);
            handleFormClose();
          }}
        />
      )}
    </div>
  );
}
