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

  // Check if file is text-based
  const isTextFile = (filename) => {
    return TEXT_EXTENSIONS.some(ext => filename.toLowerCase().endsWith(ext));
  };

  // Process a single file
  const processFile = async (file, path = '') => {
    return new Promise((resolve) => {
      const fullPath = path ? `${path}/${file.name}` : file.name;
      
      if (!isTextFile(file.name)) {
        resolve(null); // Skip non-text files
        return;
      }

      const reader = new FileReader();
      reader.onload = (event) => {
        resolve({
          filename: fullPath,
          content: event.target.result,
        });
      };
      reader.onerror = () => resolve(null);
      reader.readAsText(file);
    });
  };

  // Process zip file
  const processZipFile = async (file) => {
    const zip = await JSZip.loadAsync(file);
    const documents = [];
    
    for (const [filename, zipEntry] of Object.entries(zip.files)) {
      if (!zipEntry.dir && isTextFile(filename)) {
        const content = await zipEntry.async('text');
        documents.push({
          filename: filename,
          content: content,
        });
      }
    }
    
    return documents;
  };

  // Process folder (recursive)
  const processFolderFiles = async (files, basePath = '') => {
    const documents = [];
    
    for (const file of files) {
      const relativePath = file.webkitRelativePath || file.name;
      const doc = await processFile(file, '');
      if (doc) {
        doc.filename = relativePath;
        documents.push(doc);
      }
    }
    
    return documents;
  };

  // Handle file/folder upload
  const handleFilesUpload = async (files) => {
    setIsProcessing(true);
    const newDocuments = [];
    let skippedCount = 0;

    try {
      for (const file of files) {
        if (file.name.endsWith('.zip')) {
          // Process zip file
          const zipDocs = await processZipFile(file);
          newDocuments.push(...zipDocs);
        } else if (file.webkitRelativePath) {
          // Part of folder upload - handle separately
          continue;
        } else if (isTextFile(file.name)) {
          // Process single text file
          const doc = await processFile(file);
          if (doc) newDocuments.push(doc);
        } else {
          skippedCount++;
        }
      }

      // Handle folder files
      const folderFiles = Array.from(files).filter(f => f.webkitRelativePath);
      if (folderFiles.length > 0) {
        const folderDocs = await processFolderFiles(folderFiles);
        newDocuments.push(...folderDocs);
      }

      // MERGE with existing documents (not replace)
      setFormData((prev) => ({
        ...prev,
        documents: [...prev.documents, ...newDocuments],
      }));

      toast({
        title: 'Documents Uploaded',
        description: `Added ${newDocuments.length} document(s)${skippedCount > 0 ? `, skipped ${skippedCount} non-text file(s)` : ''}`,
      });
    } catch (error) {
      toast({
        title: 'Upload Error',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setIsProcessing(false);
    }
  };

  // File input change handler
  const handleFileInputChange = (e) => {
    const files = Array.from(e.target.files);
    handleFilesUpload(files);
    e.target.value = ''; // Reset input
  };

  // Drag and drop handlers
  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const items = Array.from(e.dataTransfer.items);
    const files = [];

    for (const item of items) {
      if (item.kind === 'file') {
        const entry = item.webkitGetAsEntry();
        if (entry) {
          await traverseFileTree(entry, files);
        }
      }
    }

    if (files.length > 0) {
      handleFilesUpload(files);
    }
  };

  // Recursive folder traversal for drag & drop
  const traverseFileTree = async (entry, files, path = '') => {
    if (entry.isFile) {
      const file = await new Promise((resolve) => entry.file(resolve));
      file.webkitRelativePath = path + file.name;
      files.push(file);
    } else if (entry.isDirectory) {
      const reader = entry.createReader();
      const entries = await new Promise((resolve) => reader.readEntries(resolve));
      for (const childEntry of entries) {
        await traverseFileTree(childEntry, files, path + entry.name + '/');
      }
    }
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
              <Label>Documentation Files</Label>
              <div
                className={`border-2 border-dashed rounded-lg p-6 transition-colors ${
                  isDragging ? 'border-primary bg-primary/5' : 'border-muted-foreground/25'
                } ${isProcessing ? 'opacity-50 pointer-events-none' : ''}`}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
              >
                <div className="text-center space-y-4">
                  <div className="flex justify-center">
                    <Upload className="h-10 w-10 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">
                      {isProcessing ? 'Processing files...' : 'Drag & Drop or Click to Upload'}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Folders, zip files, or documents
                    </p>
                  </div>
                  
                  <div className="flex flex-wrap gap-2 justify-center text-xs text-muted-foreground">
                    <span>Supports:</span>
                    <span className="font-mono">.md .txt .json .xml .py</span>
                    <span className="font-mono">.html .css .js .yaml</span>
                    <span>and more...</span>
                  </div>

                  {!isProcessing && (
                    <div className="flex gap-2 justify-center">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => fileInputRef.current?.click()}
                      >
                        <FileText className="h-4 w-4 mr-2" />
                        Upload Files
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => folderInputRef.current?.click()}
                      >
                        <FolderOpen className="h-4 w-4 mr-2" />
                        Upload Folder
                      </Button>
                    </div>
                  )}

                  {/* Hidden file inputs */}
                  <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    onChange={handleFileInputChange}
                    className="hidden"
                  />
                  <input
                    ref={folderInputRef}
                    type="file"
                    webkitdirectory="true"
                    directory="true"
                    multiple
                    onChange={handleFileInputChange}
                    className="hidden"
                  />
                </div>

                {/* Document List */}
                {formData.documents.length > 0 && (
                  <div className="mt-6 space-y-2 max-h-60 overflow-y-auto">
                    <p className="text-sm font-medium mb-2">
                      {formData.documents.length} document(s)
                    </p>
                    {formData.documents.map((doc, index) => (
                      <div
                        key={index}
                        className="flex items-center justify-between p-2 bg-muted rounded text-sm"
                      >
                        <span className="truncate flex-1 font-mono text-xs">
                          {doc.filename}
                        </span>
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
                {product ? 'New documents will be merged with existing ones' : 'Upload documentation about your product'}
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
