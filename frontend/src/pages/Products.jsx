import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '../components/ui/button';
import { Card } from '../components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { Trash2, Edit, ExternalLink, Plus } from 'lucide-react';
import { apiClient } from '../lib/api/client';
import { useToast } from '../hooks/use-toast';
import ProductForm from '../components/products/ProductForm';

export function Products() {
  const [showForm, setShowForm] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Fetch products
  const { data: products = [], isLoading } = useQuery({
    queryKey: ['products'],
    queryFn: () => apiClient.getProducts(),
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: (id) => apiClient.deleteProduct(id),
    onSuccess: () => {
      queryClient.invalidateQueries(['products']);
      toast({
        title: 'Product Deleted',
        description: 'Successfully deleted product',
      });
    },
  });

  // Delete all mutation
  const deleteAllMutation = useMutation({
    mutationFn: () => apiClient.deleteAllProducts(),
    onSuccess: (data) => {
      queryClient.invalidateQueries(['products']);
      toast({
        title: 'All Products Deleted',
        description: `Successfully deleted ${data.deleted_count} product(s)`,
      });
    },
  });

  const handleDelete = (id) => {
    if (window.confirm('Are you sure you want to delete this product?')) {
      deleteMutation.mutate(id);
    }
  };

  const handleDeleteAll = () => {
    if (window.confirm(`Are you sure you want to delete all ${products.length} product(s)? This action cannot be undone.`)) {
      deleteAllMutation.mutate();
    }
  };

  const handleEdit = (product) => {
    setEditingProduct(product);
    setShowForm(true);
  };

  const handleFormClose = () => {
    setShowForm(false);
    setEditingProduct(null);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-muted-foreground">Loading products...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="border-b p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Products</h1>
            <p className="text-muted-foreground">Manage products and their documentation</p>
          </div>
          <div className="flex gap-2">
            {products.length > 0 && (
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
              Add Product
            </Button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-6">
        {products.length === 0 ? (
          <Card className="p-8 text-center">
            <p className="text-muted-foreground mb-4">No products yet</p>
            <Button onClick={() => setShowForm(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Create Your First Product
            </Button>
          </Card>
        ) : (
          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Website</TableHead>
                  <TableHead>Documents</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {products.map((product) => (
                  <TableRow key={product.id}>
                    <TableCell className="font-medium">{product.name}</TableCell>
                    <TableCell className="max-w-md truncate">{product.description}</TableCell>
                    <TableCell>
                      {product.website ? (
                        <a
                          href={product.website}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1 text-blue-600 hover:underline"
                        >
                          Link <ExternalLink className="h-3 w-3" />
                        </a>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {product.documents?.length || 0} file(s)
                    </TableCell>
                    <TableCell>
                      {product.created_at ? new Date(product.created_at).toLocaleDateString() : 'N/A'}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEdit(product)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(product.id)}
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

      {/* Product Form Modal */}
      {showForm && (
        <ProductForm
          product={editingProduct}
          onClose={handleFormClose}
        />
      )}
    </div>
  );
}
