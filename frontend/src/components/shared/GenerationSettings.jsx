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
  max_tokens: 500,
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
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Generation Settings - {type}</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
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
              <SelectContent className="max-h-[300px]">
                {/* OpenAI Models */}
                <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">
                  OpenAI
                </div>
                <SelectItem value="gpt-5">GPT-5 (Latest)</SelectItem>
                <SelectItem value="gpt-5-mini">GPT-5 Mini</SelectItem>
                <SelectItem value="gpt-5-nano">GPT-5 Nano</SelectItem>
                <SelectItem value="gpt-4o">GPT-4o</SelectItem>
                <SelectItem value="gpt-4o-mini">GPT-4o Mini (Default)</SelectItem>
                <SelectItem value="gpt-4-turbo">GPT-4 Turbo</SelectItem>
                <SelectItem value="o3">O3 (Reasoning)</SelectItem>
                <SelectItem value="o1">O1 (Research)</SelectItem>
                
                {/* Anthropic Models */}
                <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground mt-2">
                  Anthropic
                </div>
                <SelectItem value="claude-3-5-sonnet-latest">
                  Claude 3.5 Sonnet (Latest)
                </SelectItem>
                <SelectItem value="claude-3-5-sonnet-20241022">
                  Claude 3.5 Sonnet (Oct 2024)
                </SelectItem>
                <SelectItem value="claude-3-opus-latest">
                  Claude 3 Opus
                </SelectItem>
                <SelectItem value="claude-3-opus-20240229">
                  Claude 3 Opus (Feb 2024)
                </SelectItem>
                <SelectItem value="claude-3-haiku-latest">
                  Claude 3 Haiku
                </SelectItem>
                <SelectItem value="claude-3-haiku-20240307">
                  Claude 3 Haiku (Mar 2024)
                </SelectItem>
                <SelectItem value="claude-sonnet-4-5">
                  Claude Sonnet 4.5
                </SelectItem>
                <SelectItem value="claude-opus-4-1">
                  Claude Opus 4.1
                </SelectItem>
                
                {/* Google Models */}
                <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground mt-2">
                  Google
                </div>
                <SelectItem value="gemini-2.5-pro">
                  Gemini 2.5 Pro (Latest)
                </SelectItem>
                <SelectItem value="gemini-2.5-flash">
                  Gemini 2.5 Flash
                </SelectItem>
                <SelectItem value="gemini-2.5-flash-lite">
                  Gemini 2.5 Flash Lite
                </SelectItem>
                <SelectItem value="gemini-2.0-flash">
                  Gemini 2.0 Flash
                </SelectItem>
                <SelectItem value="gemini-2.0-flash-lite">
                  Gemini 2.0 Flash Lite
                </SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Choose the AI model for generation
            </p>
          </div>

          {/* Temperature */}
          <div className="space-y-2">
            <div className="flex justify-between">
              <Label>Temperature</Label>
              <span className="text-sm text-muted-foreground">
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
            />
            <p className="text-xs text-muted-foreground">
              Higher = more creative, Lower = more focused
            </p>
          </div>

          {/* Max Tokens */}
          <div className="space-y-2">
            <Label>Max Tokens</Label>
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
            />
            <p className="text-xs text-muted-foreground">
              Maximum length of generated content
            </p>
          </div>

          {/* Exa Enrichment */}
          <div className="flex items-center justify-between rounded-lg border p-4">
            <div className="space-y-0.5">
              <Label>Use Exa.ai Enrichment</Label>
              <p className="text-sm text-muted-foreground">
                Add real-world context from web search
              </p>
            </div>
            <Switch
              checked={settings.use_exa_enrichment}
              onCheckedChange={(checked) =>
                setSettings({ ...settings, use_exa_enrichment: checked })
              }
            />
          </div>

          {/* Exa Results Count */}
          {settings.use_exa_enrichment && (
            <div className="space-y-2">
              <Label>Exa Results Count</Label>
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
              />
              <p className="text-xs text-muted-foreground">
                Number of web results to fetch for context
              </p>
            </div>
          )}

          {/* Organization Context */}
          <div className="space-y-2">
            <Label>Organization ID (Optional)</Label>
            <Input
              value={settings.organization_id}
              onChange={(e) =>
                setSettings({ ...settings, organization_id: e.target.value })
              }
              placeholder="e.g., tech_corp"
            />
            <p className="text-xs text-muted-foreground">
              Link generated item to an organization
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleReset}>
            Reset to Defaults
          </Button>
          <Button onClick={handleSave}>Save Settings</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
