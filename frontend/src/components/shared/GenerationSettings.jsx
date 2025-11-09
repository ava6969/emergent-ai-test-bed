import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';

const DEFAULT_SETTINGS = {
  model: 'gpt-4o-mini',
  temperature: 0.7,
  max_tokens: 1000,
  use_exa_enrichment: false,
  exa_results_count: 3,
  organization_id: '',
};

export function GenerationSettings({ open, onClose, type }) {
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);

  // Load settings from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem(`generation_settings_${type}`);
    if (stored) {
      setSettings({ ...DEFAULT_SETTINGS, ...JSON.parse(stored) });
    }
  }, [type]);

  const handleSave = () => {
    localStorage.setItem(
      `generation_settings_${type}`,
      JSON.stringify(settings)
    );
    onClose();
  };

  const handleReset = () => {
    setSettings(DEFAULT_SETTINGS);
    localStorage.removeItem(`generation_settings_${type}`);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg w-[95vw] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-lg sm:text-xl">
            Generation Settings - {type}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 sm:space-y-6 py-2">
          {/* Model Selection */}
          <div className="space-y-2">
            <Label>Model</Label>
            <Select
              value={settings.model}
              onValueChange={(value) =>
                setSettings({ ...settings, model: value })
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="gpt-4o">GPT-4o</SelectItem>
                <SelectItem value="gpt-4o-mini">GPT-4o Mini (Default)</SelectItem>
                <SelectItem value="o1">O1 (Reasoning)</SelectItem>
                <SelectItem value="gpt-5">GPT-5 (Reasoning, Latest)</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Choose the AI model for generation
            </p>
          </div>

          {/* Temperature */}
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <Label className="text-sm sm:text-base">Temperature</Label>
              <span className="text-xs sm:text-sm text-muted-foreground font-medium">
                {settings.temperature}
              </span>
            </div>
            <Slider
              value={[settings.temperature]}
              onValueChange={([value]) =>
                setSettings({ ...settings, temperature: value })
              }
              min={0}
              max={1}
              step={0.1}
              className="touch-none"
            />
            <p className="text-xs text-muted-foreground">
              Higher = more creative, Lower = more focused
            </p>
          </div>

          {/* Max Tokens */}
          <div className="space-y-2">
            <Label className="text-sm sm:text-base">Max Tokens</Label>
            <Input
              type="number"
              value={settings.max_tokens}
              onChange={(e) =>
                setSettings({
                  ...settings,
                  max_tokens: parseInt(e.target.value),
                })
              }
              min={100}
              max={2000}
              step={50}
              className="text-base"
            />
            <p className="text-xs text-muted-foreground">
              Maximum length of generated content
            </p>
          </div>

          {/* Exa Enrichment */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between rounded-lg border p-3 sm:p-4 gap-3 sm:gap-0">
            <div className="space-y-0.5 flex-1">
              <Label className="text-sm sm:text-base">Use Exa.ai Enrichment</Label>
              <p className="text-xs sm:text-sm text-muted-foreground">
                Add real-world context from web search
              </p>
            </div>
            <Switch
              checked={settings.use_exa_enrichment}
              onCheckedChange={(checked) =>
                setSettings({ ...settings, use_exa_enrichment: checked })
              }
              className="self-end sm:self-auto"
            />
          </div>

          {/* Exa Results Count */}
          {settings.use_exa_enrichment && (
            <div className="space-y-2">
              <Label className="text-sm sm:text-base">Exa Results Count</Label>
              <Input
                type="number"
                value={settings.exa_results_count}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    exa_results_count: parseInt(e.target.value),
                  })
                }
                min={1}
                max={10}
                className="text-base"
              />
              <p className="text-xs text-muted-foreground">
                Number of web results to fetch for context
              </p>
            </div>
          )}

          {/* Organization Context */}
          <div className="space-y-2">
            <Label className="text-sm sm:text-base">Organization ID (Optional)</Label>
            <Input
              value={settings.organization_id}
              onChange={(e) =>
                setSettings({ ...settings, organization_id: e.target.value })
              }
              placeholder="e.g., tech_corp"
              className="text-base"
            />
            <p className="text-xs text-muted-foreground">
              Link generated item to an organization
            </p>
          </div>
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2 sm:gap-0">
          <Button 
            variant="outline" 
            onClick={handleReset}
            className="w-full sm:w-auto"
          >
            Reset to Defaults
          </Button>
          <Button 
            onClick={handleSave}
            className="w-full sm:w-auto"
          >
            Save Settings
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
