'use client';

import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient, type Persona } from '@/lib/api/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Trash2, Settings, Sparkles } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { toast } from 'sonner';

export default function PersonasPage() {
  const [generateInput, setGenerateInput] = useState('');
  const [count, setCount] = useState(1);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationStage, setGenerationStage] = useState('');
  const [generationProgress, setGenerationProgress] = useState(0);
  const queryClient = useQueryClient();

  // Clear old settings with incorrect max_tokens on mount
  useEffect(() => {
    const settingsKey = 'generation_settings_persona';
    const stored = localStorage.getItem(settingsKey);
    if (stored) {
      try {
        const settings = JSON.parse(stored);
        if (settings.max_tokens && settings.max_tokens < 1500) {
          localStorage.removeItem(settingsKey);
        }
      } catch (e) {
        localStorage.removeItem(settingsKey);
      }
    }
  }, []);

  // Fetch personas
  const { data: personas = [], isLoading } = useQuery({
    queryKey: ['personas'],
    queryFn: () => apiClient.getPersonas(),
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiClient.deletePersona(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['personas'] });
      toast.success('Persona deleted successfully');
    },
  });

  // Delete all mutation
  const deleteAllMutation = useMutation({
    mutationFn: () => apiClient.deleteAllPersonas(),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['personas'] });
      toast.success(`Successfully deleted ${data.deleted_count} persona(s)`);
    },
  });

  const handleGenerate = async () => {
    if (!generateInput.trim()) return;
    
    setIsGenerating(true);
    setGenerationStage('Initializing...');
    setGenerationProgress(0);
    
    const settings = JSON.parse(
      localStorage.getItem('generation_settings_persona') || '{}'
    );
    
    const maxTokens = Math.max(settings.max_tokens || 1500, 1500);
    
    try {
      const startResponse = await apiClient.generatePersona(generateInput.trim(), {
        ...settings,
        max_tokens: maxTokens,
        count: count,
      });
      
      const jobId = startResponse.job_id;
      
      // Poll for status
      const pollingInterval = setInterval(async () => {
        try {
          const status = await apiClient.checkJobStatus(jobId);
          
          if (status.stage) {
            setGenerationStage(status.stage);
          }
          if (status.progress !== undefined) {
            setGenerationProgress(status.progress);
          }
          
          if (status.status === 'completed') {
            clearInterval(pollingInterval);
            queryClient.invalidateQueries({ queryKey: ['personas'] });
            setGenerateInput('');
            const personaCount = count > 1 ? `${count} personas` : 'persona';
            toast.success(`Successfully created ${personaCount} in ${status.generation_time}s`);
            
            setTimeout(() => {
              setIsGenerating(false);
              setGenerationStage('');
              setGenerationProgress(0);
            }, 1500);
          }
          
          if (status.status === 'failed') {
            clearInterval(pollingInterval);
            setIsGenerating(false);
            toast.error(status.error || 'Generation failed');
          }
        } catch (pollError) {
          console.error('Polling error:', pollError);
        }
      }, 1000);
      
    } catch (error: any) {
      setIsGenerating(false);
      toast.error(error.message || 'Failed to start generation');
    }
  };

  const handleDelete = (id: string) => {
    if (window.confirm('Are you sure you want to delete this persona?')) {
      deleteMutation.mutate(id);
    }
  };

  const handleDeleteAll = () => {
    if (window.confirm(`Are you sure you want to delete all ${personas.length} persona(s)?`)) {
      deleteAllMutation.mutate();
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="border-b p-6 bg-white">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Personas</h1>
            <p className="text-gray-600">Manage your test personas</p>
          </div>
          {personas.length > 0 && (
            <Button
              variant="destructive"
              onClick={handleDeleteAll}
              disabled={deleteAllMutation.isPending}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete All
            </Button>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto p-6">
        {isLoading ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-gray-600">Loading personas...</div>
          </div>
        ) : personas.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center space-y-4">
              <p className="text-gray-600">No personas yet</p>
              <p className="text-sm text-gray-500">Generate one below to get started</p>
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Background</TableHead>
                  <TableHead>Organization</TableHead>
                  <TableHead>Tags</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {personas.map((persona) => (
                  <TableRow key={persona.id}>
                    <TableCell className="font-medium">{persona.name}</TableCell>
                    <TableCell className="max-w-md">
                      <div className="line-clamp-2 text-sm text-gray-600">
                        {persona.background}
                      </div>
                    </TableCell>
                    <TableCell>
                      {persona.organization_id && (
                        <Badge variant="outline">{persona.organization_id}</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {persona.metadata?.tags?.slice(0, 2).map((tag: string) => (
                          <Badge key={tag} variant="secondary" className="text-xs">
                            {tag}
                          </Badge>
                        ))}
                        {persona.metadata?.tags && persona.metadata.tags.length > 2 && (
                          <Badge variant="secondary" className="text-xs">
                            +{persona.metadata.tags.length - 2}
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-gray-600">
                      {persona.created_at
                        ? format(new Date(persona.created_at), 'MMM d, yyyy')
                        : 'N/A'}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(persona.id)}
                        disabled={deleteMutation.isPending}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      {/* Generation Input */}
      <div className="border-t p-6 bg-white">
        <div className="flex gap-2">
          <Input
            placeholder="Describe the persona to generate... (e.g., 'Senior customer support agent with 5 years experience')"
            value={generateInput}
            onChange={(e) => setGenerateInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !isGenerating) {
                handleGenerate();
              }
            }}
            disabled={isGenerating}
            className="flex-1"
          />
          <div className="flex items-center gap-2">
            <label className="text-sm text-gray-600 whitespace-nowrap">Count:</label>
            <Input
              type="number"
              min="1"
              max="10"
              value={count}
              onChange={(e) => setCount(Math.min(10, Math.max(1, parseInt(e.target.value) || 1)))}
              disabled={isGenerating}
              className="w-20"
            />
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => {/* TODO: Open settings modal */}}
            disabled={isGenerating}
          >
            <Settings className="h-5 w-5" />
          </Button>
          <Button
            onClick={handleGenerate}
            disabled={isGenerating || !generateInput.trim()}
          >
            <Sparkles className="h-4 w-4 mr-2" />
            {isGenerating ? 'Generating...' : 'Generate'}
          </Button>
        </div>
        
        {/* Progress indicator */}
        {isGenerating && (
          <div className="mt-4 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">{generationStage}</span>
              <span className="text-gray-600">{generationProgress}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${generationProgress}%` }}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
