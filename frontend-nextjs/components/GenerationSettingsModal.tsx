'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface GenerationSettings {
  model: string;
  temperature: number;
  max_tokens: number;
  reasoning_effort?: string;
  use_exa_enrichment?: boolean;
}

interface GenerationSettingsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  settingsKey: string;
  title?: string;
  description?: string;
}

export function GenerationSettingsModal({
  open,
  onOpenChange,
  settingsKey,
  title = 'Generation Settings',
  description = 'Configure AI model parameters for generation',
}: GenerationSettingsModalProps) {
  const [settings, setSettings] = useState<GenerationSettings>({
    model: 'gpt-5',
    temperature: 0.7,
    max_tokens: 8000,  // Higher for reasoning models
    reasoning_effort: 'medium',
    use_exa_enrichment: false,
  });

  // Load settings from localStorage
  useEffect(() => {
    if (open) {
      const stored = localStorage.getItem(settingsKey);
      if (stored) {
        try {
          setSettings(JSON.parse(stored));
        } catch (e) {
          console.error('Failed to load settings:', e);
        }
      }
    }
  }, [open, settingsKey]);

  const handleSave = () => {
    localStorage.setItem(settingsKey, JSON.stringify(settings));
    onOpenChange(false);
  };

  const handleReset = () => {
    const defaults = {
      model: 'gpt-5',
      temperature: 0.7,
      max_tokens: 1500,
      reasoning_effort: 'medium',
      use_exa_enrichment: false,
    };
    setSettings(defaults);
    localStorage.setItem(settingsKey, JSON.stringify(defaults));
  };

  const isReasoningModel = (model: string) => {
    const modelLower = model.toLowerCase();
    return (
      modelLower.startsWith('o1') ||
      modelLower.startsWith('o3') ||
      modelLower.startsWith('gpt-5')
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Model Selection */}
          <div className="space-y-2">
            <Label htmlFor="model">Model</Label>
            <select
              id="model"
              value={settings.model}
              onChange={(e) => setSettings({ ...settings, model: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg"
            >
              <option value="gpt-5">GPT-5 (Reasoning)</option>
              <option value="o1">O1 (Reasoning)</option>
              <option value="o3">O3 (Reasoning)</option>
              <option value="gpt-4.1">GPT-4.1 (Latest)</option>
              <option value="gpt-4.1-mini">GPT-4.1 Mini (Fast)</option>
            </select>
          </div>

          {/* Temperature */}
          {!isReasoningModel(settings.model) && (
            <div className="space-y-2">
              <Label htmlFor="temperature">
                Temperature: {settings.temperature}
              </Label>
              <input
                type="range"
                id="temperature"
                min="0"
                max="2"
                step="0.1"
                value={settings.temperature}
                onChange={(e) =>
                  setSettings({ ...settings, temperature: parseFloat(e.target.value) })
                }
                className="w-full"
              />
              <p className="text-xs text-gray-500">
                Lower = more focused, Higher = more creative
              </p>
            </div>
          )}

          {/* Reasoning Effort */}
          {isReasoningModel(settings.model) && (
            <div className="space-y-2">
              <Label>Reasoning Effort</Label>
              <div className="flex gap-2">
                {['low', 'medium', 'high'].map((effort) => (
                  <button
                    key={effort}
                    onClick={() => setSettings({ ...settings, reasoning_effort: effort })}
                    className={`flex-1 px-4 py-2 border rounded-lg transition-colors ${
                      settings.reasoning_effort === effort
                        ? 'bg-black text-white'
                        : 'bg-white hover:bg-gray-50'
                    }`}
                  >
                    {effort.charAt(0).toUpperCase() + effort.slice(1)}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Max Tokens */}
          <div className="space-y-2">
            <Label htmlFor="max_tokens">Max Tokens</Label>
            <Input
              type="number"
              id="max_tokens"
              min="500"
              max="4000"
              value={settings.max_tokens}
              onChange={(e) =>
                setSettings({ ...settings, max_tokens: parseInt(e.target.value) || 1500 })
              }
            />
            <p className="text-xs text-gray-500">Maximum length of generated content</p>
          </div>

          {/* Exa Enrichment */}
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="use_exa"
              checked={settings.use_exa_enrichment}
              onChange={(e) =>
                setSettings({ ...settings, use_exa_enrichment: e.target.checked })
              }
              className="rounded"
            />
            <Label htmlFor="use_exa" className="cursor-pointer">
              Use Exa.ai enrichment (real-world data)
            </Label>
          </div>
        </div>

        <div className="flex justify-between">
          <Button variant="outline" onClick={handleReset}>
            Reset to Defaults
          </Button>
          <div className="flex gap-2">
            <Button variant="ghost" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave}>Save Settings</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
