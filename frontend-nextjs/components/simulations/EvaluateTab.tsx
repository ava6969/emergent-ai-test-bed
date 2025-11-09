'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { apiClient } from '@/lib/api/client';
import { toast } from 'sonner';
import { Loader2, CheckCircle2, XCircle, TrendingUp, TrendingDown } from 'lucide-react';
import type { Message } from '@langchain/langgraph-sdk';

interface EvaluateTabProps {
  threadId: string;
  messages: Message[];
}

interface EvaluationResults {
  eval_id: string;
  thread_id: string;
  status: string;
  evaluators: string[];
  results?: {
    total_reward: number;
    positive_rewards: number;
    negative_penalties: number;
    evaluations: Array<{
      key: string;
      score: boolean | number;
      comment: string;
    }>;
    metadata: {
      goal: string;
      persona: string;
      message_count: number;
      model: string;
    };
  };
  error?: string;
}

const EVALUATOR_OPTIONS = [
  {
    id: 'trajectory_accuracy',
    label: 'Trajectory Accuracy',
    description: 'LLM-as-judge evaluation of trajectory quality and goal alignment',
  },
  {
    id: 'goal_completion',
    label: 'Goal Completion',
    description: 'Evaluates whether the agent achieved the stated goal',
  },
  {
    id: 'helpfulness',
    label: 'Helpfulness',
    description: 'Assesses how helpful the agent was to the persona',
  },
];

export function EvaluateTab({ threadId, messages }: EvaluateTabProps) {
  const [selectedEvaluators, setSelectedEvaluators] = useState<string[]>([
    'trajectory_accuracy',
    'goal_completion',
    'helpfulness',
  ]);
  const [model, setModel] = useState('openai:gpt-4o-mini');
  const [isRunning, setIsRunning] = useState(false);
  const [results, setResults] = useState<EvaluationResults | null>(null);

  // Calculate total reward from messages
  const rewardStats = messages.reduce(
    (acc, msg) => {
      const reward = msg.additional_kwargs?.reward || 0;
      if (reward > 0) {
        acc.positive += reward;
      } else if (reward < 0) {
        acc.negative += Math.abs(reward);
      }
      acc.total += reward;
      return acc;
    },
    { total: 0, positive: 0, negative: 0 }
  );

  const toggleEvaluator = (id: string) => {
    setSelectedEvaluators((prev) =>
      prev.includes(id) ? prev.filter((e) => e !== id) : [...prev, id]
    );
  };

  const runEvaluation = async () => {
    if (selectedEvaluators.length === 0) {
      toast.error('Please select at least one evaluator');
      return;
    }

    try {
      setIsRunning(true);
      setResults(null);

      const evalResults = await apiClient.runEvaluation({
        thread_id: threadId,
        evaluators: selectedEvaluators,
        model,
      });

      console.log('Evaluation results:', JSON.stringify(evalResults, null, 2));
      setResults(evalResults);
      toast.success('Evaluation completed successfully!');
    } catch (error: any) {
      console.error('Evaluation failed:', error);
      toast.error(error.message || 'Evaluation failed');
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Reward Summary Card */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">Trajectory Reward Summary</h3>
        <div className="grid grid-cols-3 gap-4">
          <div className="text-center">
            <div
              className={`text-3xl font-bold ${
                rewardStats.total >= 0 ? 'text-green-600' : 'text-red-600'
              }`}
            >
              {rewardStats.total > 0 ? '+' : ''}
              {rewardStats.total}
            </div>
            <div className="text-sm text-gray-600 mt-1">Total Score</div>
          </div>
          <div className="text-center">
            <div className="flex items-center justify-center gap-2">
              <TrendingUp className="w-5 h-5 text-green-600" />
              <span className="text-2xl font-bold text-green-600">
                +{rewardStats.positive}
              </span>
            </div>
            <div className="text-sm text-gray-600 mt-1">Positive Rewards</div>
          </div>
          <div className="text-center">
            <div className="flex items-center justify-center gap-2">
              <TrendingDown className="w-5 h-5 text-red-600" />
              <span className="text-2xl font-bold text-red-600">
                -{rewardStats.negative}
              </span>
            </div>
            <div className="text-sm text-gray-600 mt-1">Penalties</div>
          </div>
        </div>
      </Card>

      {/* Evaluation Configuration */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">Evaluation Configuration</h3>

        {/* Evaluator Selection */}
        <div className="space-y-3 mb-6">
          <Label className="text-sm font-medium">Select Evaluators</Label>
          {EVALUATOR_OPTIONS.map((evaluator) => (
            <div key={evaluator.id} className="flex items-start space-x-3">
              <Checkbox
                id={evaluator.id}
                checked={selectedEvaluators.includes(evaluator.id)}
                onCheckedChange={() => toggleEvaluator(evaluator.id)}
              />
              <div className="flex-1">
                <label
                  htmlFor={evaluator.id}
                  className="text-sm font-medium leading-none cursor-pointer"
                >
                  {evaluator.label}
                </label>
                <p className="text-xs text-gray-500 mt-1">{evaluator.description}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Model Selection */}
        <div className="mb-6">
          <Label htmlFor="model" className="text-sm font-medium mb-2 block">
            Evaluation Model
          </Label>
          <select
            id="model"
            value={model}
            onChange={(e) => setModel(e.target.value)}
            className="w-full px-3 py-2 border rounded-lg"
            disabled={isRunning}
          >
            <option value="openai:gpt-4o-mini">GPT-4o Mini (Fast & Cost-effective)</option>
            <option value="openai:gpt-4o">GPT-4o (Balanced)</option>
            <option value="openai:gpt-5">GPT-5 (Most Capable)</option>
          </select>
        </div>

        {/* Run Button */}
        <Button
          onClick={runEvaluation}
          disabled={isRunning || selectedEvaluators.length === 0}
          className="w-full"
          size="lg"
        >
          {isRunning ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Running Evaluation...
            </>
          ) : (
            'Run Evaluation'
          )}
        </Button>
      </Card>

      {/* Results Display */}
      {results && results.results && (
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">Evaluation Results</h3>

          {/* Metadata */}
          <div className="bg-gray-50 rounded-lg p-4 mb-6">
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <span className="text-gray-600">Persona:</span>{' '}
                <span className="font-medium">{results.results.metadata.persona}</span>
              </div>
              <div>
                <span className="text-gray-600">Goal:</span>{' '}
                <span className="font-medium">{results.results.metadata.goal}</span>
              </div>
              <div>
                <span className="text-gray-600">Messages:</span>{' '}
                <span className="font-medium">{results.results.metadata.message_count}</span>
              </div>
              <div>
                <span className="text-gray-600">Model:</span>{' '}
                <span className="font-medium">{results.results.metadata.model}</span>
              </div>
            </div>
          </div>

          {/* Evaluation Scores */}
          <div className="space-y-4">
            {results.results.evaluations.map((evaluation, index) => {
              const passed =
                typeof evaluation.score === 'boolean'
                  ? evaluation.score
                  : evaluation.score > 0.5;

              return (
                <div key={index} className="border rounded-lg p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      {passed ? (
                        <CheckCircle2 className="w-5 h-5 text-green-600" />
                      ) : (
                        <XCircle className="w-5 h-5 text-red-600" />
                      )}
                      <h4 className="font-semibold capitalize">
                        {evaluation.key.replace(/_/g, ' ')}
                      </h4>
                    </div>
                    <div
                      className={`px-3 py-1 rounded-full text-sm font-medium ${
                        passed
                          ? 'bg-green-100 text-green-800'
                          : 'bg-red-100 text-red-800'
                      }`}
                    >
                      {typeof evaluation.score === 'boolean'
                        ? passed
                          ? 'PASS'
                          : 'FAIL'
                        : `${(evaluation.score * 100).toFixed(0)}%`}
                    </div>
                  </div>
                  <p className="text-sm text-gray-700 whitespace-pre-wrap">
                    {evaluation.comment}
                  </p>
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {/* Error Display */}
      {results && results.error && (
        <Card className="p-6 border-red-200 bg-red-50">
          <div className="flex items-start gap-3">
            <XCircle className="w-5 h-5 text-red-600 mt-0.5" />
            <div>
              <h4 className="font-semibold text-red-900 mb-1">Evaluation Failed</h4>
              <p className="text-sm text-red-700">{results.error}</p>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}
