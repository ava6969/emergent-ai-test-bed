import React, { useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Loader2, CheckCircle2, AlertCircle } from 'lucide-react';

export function GenerationProgress({ 
  isOpen, 
  stage, 
  progress, 
  error, 
  onClose,
  elapsedTime 
}) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-md p-6 space-y-4">
        {/* Header */}
        <div className="flex items-start gap-3">
          {error ? (
            <AlertCircle className="h-6 w-6 text-destructive shrink-0 mt-0.5" />
          ) : progress === 100 ? (
            <CheckCircle2 className="h-6 w-6 text-green-500 shrink-0 mt-0.5" />
          ) : (
            <Loader2 className="h-6 w-6 animate-spin text-primary shrink-0 mt-0.5" />
          )}
          
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-lg">
              {error ? 'Generation Failed' : progress === 100 ? 'Complete!' : 'Generating Persona'}
            </h3>
            <p className="text-sm text-muted-foreground mt-0.5 break-words">
              {error || stage || 'Preparing...'}
            </p>
          </div>
        </div>

        {/* Progress Bar */}
        {!error && (
          <div className="space-y-2">
            <div className="flex justify-between items-center text-xs text-muted-foreground">
              <span>Progress</span>
              <span>{progress}%</span>
            </div>
            <Progress value={progress} className="h-2" />
          </div>
        )}

        {/* Elapsed Time */}
        {elapsedTime > 0 && !error && (
          <div className="text-xs text-muted-foreground text-center">
            Elapsed time: {elapsedTime}s
            {progress < 40 && <span className="ml-1">(AI models typically take 10-15 seconds)</span>}
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
            <p className="text-sm text-destructive">{error}</p>
          </div>
        )}

        {/* Action Button */}
        {(error || progress === 100) && (
          <Button 
            onClick={onClose} 
            className="w-full"
            variant={error ? "destructive" : "default"}
          >
            {error ? 'Close' : 'Done'}
          </Button>
        )}

        {/* Info Message */}
        {!error && progress < 100 && progress < 40 && (
          <p className="text-xs text-muted-foreground text-center">
            Please wait while we generate your persona. This process involves calling AI models and may take a moment.
          </p>
        )}
      </Card>
    </div>
  );
}
