import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Pencil, Trash2, Settings, Plus, Sparkles } from 'lucide-react';
import { PersonaForm } from '@/components/personas/PersonaForm';
import { GenerationSettings } from '@/components/shared/GenerationSettings';
import { GenerationProgress } from '@/components/shared/GenerationProgress';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { useToast } from '@/hooks/use-toast';

export function Personas() {
  const [generateInput, setGenerateInput] = useState('');
  const [showSettings, setShowSettings] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingPersona, setEditingPersona] = useState(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationStage, setGenerationStage] = useState('');
  const [generationProgress, setGenerationProgress] = useState(0);
  const [generationError, setGenerationError] = useState(null);
  const [elapsedTime, setElapsedTime] = useState(0);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Fetch personas
  const { data: personas = [], isLoading } = useQuery({
    queryKey: ['personas'],
    queryFn: () => apiClient.getPersonas(),
  });

  // Note: We use SSE directly in handleGenerate, no mutation needed

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: (id) => apiClient.deletePersona(id),
    onSuccess: () => {
      queryClient.invalidateQueries(['personas']);
      toast({
        title: 'Persona Deleted',
        description: 'Successfully deleted persona',
      });
    },
  });

  // Delete all mutation
  const deleteAllMutation = useMutation({
    mutationFn: () => apiClient.deleteAllPersonas(),
    onSuccess: (data) => {
      queryClient.invalidateQueries(['personas']);
      toast({
        title: 'All Personas Deleted',
        description: `Successfully deleted ${data.deleted_count} persona(s)`,
      });
    },
  });

  const handleGenerate = async () => {
    if (!generateInput.trim()) return;
    
    // Reset state
    setIsGenerating(true);
    setGenerationStage('Initializing...');
    setGenerationProgress(0);
    setGenerationError(null);
    setElapsedTime(0);
    
    // Load settings
    const settings = JSON.parse(
      localStorage.getItem('generation_settings_persona') || '{}'
    );
    
    // Start elapsed timer
    const startTime = Date.now();
    const timer = setInterval(() => {
      setElapsedTime(Math.floor((Date.now() - startTime) / 1000));
    }, 1000);
    
    let pollingInterval = null;
    
    try {
      // Start generation (returns job ID)
      const startResponse = await apiClient.startPersonaGeneration({
        description: generateInput.trim(),
        organization_id: settings.organization_id || null,
        use_exa_enrichment: settings.use_exa_enrichment || false,
        model: settings.model || 'gpt-4o-mini',
        temperature: settings.temperature || 0.7,
        max_tokens: settings.max_tokens || 500,
      });
      
      const jobId = startResponse.job_id;
      
      // Poll for status every 1 second
      pollingInterval = setInterval(async () => {
        try {
          const status = await apiClient.getGenerationStatus(jobId);
          
          // Update UI
          if (status.stage) {
            setGenerationStage(status.stage);
          }
          if (status.progress !== undefined) {
            setGenerationProgress(status.progress);
          }
          
          // Check if complete
          if (status.status === 'completed') {
            clearInterval(pollingInterval);
            clearInterval(timer);
            
            // Refresh personas list
            queryClient.invalidateQueries(['personas']);
            
            // Clear input
            setGenerateInput('');
            
            // Show success
            toast({
              title: 'Persona Generated',
              description: `Successfully created ${status.result.generated_items.persona.name} in ${status.generation_time}s`,
            });
            
            // Keep modal open briefly to show 100%
            setTimeout(() => {
              setIsGenerating(false);
              setGenerationStage('');
              setGenerationProgress(0);
            }, 1500);
          }
          
          // Check if failed
          if (status.status === 'failed') {
            clearInterval(pollingInterval);
            clearInterval(timer);
            setGenerationError(status.error);
            setIsGenerating(false);
            toast({
              title: 'Generation Failed',
              description: status.error,
              variant: 'destructive',
            });
          }
        } catch (pollError) {
          console.error('Polling error:', pollError);
          // Don't stop polling on single error
        }
      }, 1000); // Poll every 1 second
      
    } catch (error) {
      clearInterval(timer);
      if (pollingInterval) clearInterval(pollingInterval);
      setGenerationError(error.message);
      setIsGenerating(false);
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const handleEdit = (persona) => {
    setEditingPersona(persona);
    setShowForm(true);
  };

  const handleDelete = (id) => {
    if (window.confirm('Are you sure you want to delete this persona?')) {
      deleteMutation.mutate(id);
    }
  };

  const handleDeleteAll = () => {
    if (window.confirm(`Are you sure you want to delete all ${personas.length} persona(s)? This action cannot be undone.`)) {
      deleteAllMutation.mutate();
    }
  };

  const handleFormClose = () => {
    setShowForm(false);
    setEditingPersona(null);
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="border-b p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Personas</h1>
            <p className="text-muted-foreground">Manage your test personas</p>
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
            <div className="text-muted-foreground">Loading personas...</div>
          </div>
        ) : personas.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center space-y-4">
              <p className="text-muted-foreground">No personas yet</p>
              <Button onClick={() => setShowForm(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Create First Persona
              </Button>
            </div>
          </div>
        ) : (
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
                    <div className="line-clamp-2 text-sm text-muted-foreground">
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
                      {persona.tags?.slice(0, 2).map((tag) => (
                        <Badge key={tag} variant="secondary" className="text-xs">
                          {tag}
                        </Badge>
                      ))}
                      {persona.tags?.length > 2 && (
                        <Badge variant="secondary" className="text-xs">
                          +{persona.tags.length - 2}
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {persona.created_at
                      ? format(new Date(persona.created_at), 'MMM d, yyyy')
                      : 'N/A'}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleEdit(persona)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(persona.id)}
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
        <div className="flex gap-2">
          <Input
            placeholder="Describe the persona to generate... (e.g., 'Senior customer support agent with 5 years experience')"
            value={generateInput}
            onChange={(e) => setGenerateInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleGenerate();
              }
            }}
            disabled={isGenerating}
          />
          <Button
            variant="outline"
            size="icon"
            onClick={() => setShowSettings(true)}
          >
            <Settings className="h-4 w-4" />
          </Button>
          <Button
            onClick={handleGenerate}
            disabled={!generateInput.trim() || isGenerating}
            className="gap-2"
          >
            <Sparkles className="h-4 w-4" />
            {isGenerating ? 'Generating...' : 'Generate'}
          </Button>
          <Button
            variant="outline"
            onClick={() => {
              setEditingPersona(null);
              setShowForm(true);
            }}
            className="gap-2"
          >
            <Plus className="h-4 w-4" />
            Manual Create
          </Button>
        </div>
      </div>

      {/* Forms and Modals */}
      {showForm && (
        <PersonaForm
          persona={editingPersona}
          open={showForm}
          onClose={handleFormClose}
          onSuccess={() => {
            queryClient.invalidateQueries(['personas']);
            handleFormClose();
          }}
        />
      )}

      {showSettings && (
        <GenerationSettings
          open={showSettings}
          onClose={() => setShowSettings(false)}
          type="persona"
        />
      )}

      {/* Generation Progress Modal */}
      <GenerationProgress
        isOpen={isGenerating}
        stage={generationStage}
        progress={generationProgress}
        error={generationError}
        elapsedTime={elapsedTime}
        onClose={() => {
          setIsGenerating(false);
          setGenerationError(null);
          setGenerationStage('');
          setGenerationProgress(0);
        }}
      />
    </div>
  );
}
