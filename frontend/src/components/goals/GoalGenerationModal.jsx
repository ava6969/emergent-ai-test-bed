import React, { useState, useEffect } from 'react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Card } from '../ui/card';
import { X, ChevronDown, ChevronUp } from 'lucide-react';

export default function GoalGenerationModal({ personas, products, onGenerate, onClose, isGenerating }) {
  const [formData, setFormData] = useState({
    persona_ids: [],
    product_id: null,
    difficulty: 'medium',
    max_turns_override: null,
  });
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Auto-fill if only one option
  useEffect(() => {
    if (personas.length === 1 && formData.persona_ids.length === 0) {
      setFormData(prev => ({ ...prev, persona_ids: [personas[0].id] }));
    }
    if (products.length === 1 && !formData.product_id) {
      setFormData(prev => ({ ...prev, product_id: products[0].id }));
    }
  }, [personas, products]);

  const handleSubmit = (e) => {
    e.preventDefault();
    onGenerate(formData);
  };

  const canGenerate = formData.persona_ids.length > 0 && formData.product_id;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-lg">
        <div className="p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold">Generate Goal with AI</h2>
            <Button variant="ghost" size="sm" onClick={onClose} disabled={isGenerating}>
              <X className="h-4 w-4" />
            </Button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Required Section */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-muted-foreground">Required Fields</h3>
              
              {/* Persona Selection */}
              <div className="space-y-2">
                <Label htmlFor="persona">Persona *</Label>
                <select
                  id="persona"
                  className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
                  value={formData.persona_ids[0] || ''}
                  onChange={(e) => setFormData({
                    ...formData,
                    persona_ids: e.target.value ? [e.target.value] : [],
                  })}
                  required
                  disabled={isGenerating}
                >
                  <option value="">Select persona...</option>
                  {personas.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} - {p.organization_id || 'N/A'}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-muted-foreground">
                  {personas.length === 0 && 'No personas available. Create one first.'}
                  {personas.length === 1 && 'Auto-filled (only one persona)'}
                </p>
              </div>

              {/* Product Selection */}
              <div className="space-y-2">
                <Label htmlFor="product">Product *</Label>
                <select
                  id="product"
                  className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
                  value={formData.product_id || ''}
                  onChange={(e) => setFormData({
                    ...formData,
                    product_id: e.target.value || null,
                  })}
                  required
                  disabled={isGenerating}
                >
                  <option value="">Select product...</option>
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.documents?.length || 0} docs)
                    </option>
                  ))}
                </select>
                <p className="text-xs text-muted-foreground">
                  {products.length === 0 && 'No products available. Create one first.'}
                  {products.length === 1 && 'Auto-filled (only one product)'}
                </p>
              </div>

              {/* Difficulty Level */}
              <div className="space-y-2">
                <Label htmlFor="difficulty">Difficulty Level *</Label>
                <select
                  id="difficulty"
                  className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
                  value={formData.difficulty}
                  onChange={(e) => setFormData({
                    ...formData,
                    difficulty: e.target.value,
                  })}
                  disabled={isGenerating}
                >
                  <option value="easy">Easy</option>
                  <option value="medium">Medium</option>
                  <option value="hard">Hard</option>
                  <option value="expert">Expert</option>
                </select>
              </div>
            </div>

            {/* Advanced Options Toggle */}
            <button
              type="button"
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
              disabled={isGenerating}
            >
              {showAdvanced ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              Advanced Options
            </button>

            {/* Advanced Section */}
            {showAdvanced && (
              <div className="space-y-4 pt-2 border-t">
                {/* Max Turns Override */}
                <div className="space-y-2">
                  <Label htmlFor="max_turns">Max Turns (Override)</Label>
                  <Input
                    id="max_turns"
                    type="number"
                    placeholder="Auto (AI will decide)"
                    value={formData.max_turns_override || ''}
                    onChange={(e) => setFormData({
                      ...formData,
                      max_turns_override: e.target.value ? parseInt(e.target.value) : null,
                    })}
                    min={1}
                    max={50}
                    disabled={isGenerating}
                  />
                  <p className="text-xs text-muted-foreground">
                    Leave empty to let AI decide based on difficulty
                  </p>
                </div>
              </div>
            )}

            {/* Progress Indicator */}
            {isGenerating && (
              <div className="p-4 bg-primary/5 border border-primary/20 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-primary"></div>
                  <div>
                    <p className="font-medium text-sm">Generating goal with AI...</p>
                    <p className="text-xs text-muted-foreground">
                      AI is analyzing persona context, product documentation, and difficulty level. This may take 30-60 seconds.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex justify-end gap-2 pt-4">
              <Button type="button" variant="outline" onClick={onClose} disabled={isGenerating}>
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={!canGenerate || isGenerating}
              >
                {isGenerating ? 'Generating...' : 'Generate Goal'}
              </Button>
            </div>
          </form>
        </div>
      </Card>
    </div>
  );
}
