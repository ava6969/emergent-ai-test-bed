import React, { useState, useEffect, useRef } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { Card } from '../ui/card';
import { X, Upload, Trash2, FolderOpen, FileText } from 'lucide-react';
import { apiClient } from '../../lib/api/client';
import { useToast } from '../../hooks/use-toast';
import JSZip from 'jszip';

export default function ProductForm({ product, onClose }) {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    website: '',
    documents: [], // [{filename: string, content: string}]
  });
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const fileInputRef = useRef(null);
  const folderInputRef = useRef(null);
  
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Supported text file extensions
  const TEXT_EXTENSIONS = [
    '.txt', '.md', '.xml', '.json', '.html', '.css', '.js', '.jsx',
    '.ts', '.tsx', '.py', '.java', '.c', '.cpp', '.h', '.hpp',
    '.yaml', '.yml', '.sh', '.bash', '.sql', '.csv', '.log',
    '.env', '.gitignore', '.dockerignore', '.conf', '.ini',
    '.toml', '.rst', '.tex', '.r', '.rb', '.go', '.rs', '.swift',
    '.kt', '.scala', '.php', '.pl', '.lua', '.vim', '.dockerfile'
  ];

  useEffect(() => {
    if (product) {
      setFormData({
        name: product.name || '',
        description: product.description || '',
        website: product.website || '',
        documents: product.documents || [],
      });
    }
  }, [product]);

  const createMutation = useMutation({
    mutationFn: (data) => apiClient.createProduct(data),
    onSuccess: () => {
      queryClient.invalidateQueries(['products']);
      toast({
        title: 'Product Created',
        description: 'Successfully created product',
      });
      onClose();
    },
  });

  const updateMutation = useMutation({
    mutationFn: (data) => apiClient.updateProduct(product.id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['products']);
      toast({
        title: 'Product Updated',
        description: 'Successfully updated product',
      });
      onClose();
    },
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (!formData.name || !formData.description) {
      toast({
        title: 'Validation Error',
        description: 'Name and description are required',
        variant: 'destructive',
      });
      return;
    }

    if (product) {
      updateMutation.mutate(formData);
    } else {
      createMutation.mutate(formData);
    }
  };

  const handleFileUpload = (e) => {
    const files = Array.from(e.target.files);
    
    files.forEach((file) => {
      if (file.name.endsWith('.md')) {
        const reader = new FileReader();
        reader.onload = (event) => {
          setFormData((prev) => ({
            ...prev,
            documents: [
              ...prev.documents,
              {
                filename: file.name,
                content: event.target.result,
              },
            ],
          }));
        };
        reader.readAsText(file);
      } else {
        toast({
          title: 'Invalid File',
          description: 'Only .md files are allowed',
          variant: 'destructive',
        });
      }
    });
    
    // Reset file input
    e.target.value = '';
  };

  const handleRemoveDocument = (index) => {
    setFormData((prev) => ({
      ...prev,
      documents: prev.documents.filter((_, i) => i !== index),
    }));
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold">
              {product ? 'Edit Product' : 'Create Product'}
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
                placeholder="e.g., Customer Support Agent"
                required
              />
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="description">Description *</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="What does this product do?"
                rows={4}
                required
              />
            </div>

            {/* Website */}
            <div className="space-y-2">
              <Label htmlFor="website">Website</Label>
              <Input
                id="website"
                type="url"
                value={formData.website}
                onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                placeholder="https://example.com"
              />
            </div>

            {/* Documents */}
            <div className="space-y-2">
              <Label>Documentation Files (.md)</Label>
              <div className="border-2 border-dashed rounded-lg p-4">
                <div className="flex items-center justify-center">
                  <label className="cursor-pointer">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
                      <Upload className="h-4 w-4" />
                      <span>Click to upload .md files</span>
                    </div>
                    <input
                      type="file"
                      accept=".md"
                      multiple
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                  </label>
                </div>

                {/* Document List */}
                {formData.documents.length > 0 && (
                  <div className="mt-4 space-y-2">
                    {formData.documents.map((doc, index) => (
                      <div
                        key={index}
                        className="flex items-center justify-between p-2 bg-muted rounded"
                      >
                        <span className="text-sm truncate">{doc.filename}</span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemoveDocument(index)}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                Upload markdown files containing product documentation
              </p>
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
                {product ? 'Update' : 'Create'} Product
              </Button>
            </div>
          </form>
        </div>
      </Card>
    </div>
  );
}
