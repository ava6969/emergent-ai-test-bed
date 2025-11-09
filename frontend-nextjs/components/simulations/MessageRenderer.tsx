'use client';

import React, { useState } from 'react';
import { ChevronDown, ChevronRight, Code, Tool } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import type { Message } from '@langchain/langgraph-sdk';

interface MessageRendererProps {
  message: Message;
}

export function MessageRenderer({ message }: MessageRendererProps) {
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());

  const toggleSection = (key: string) => {
    const newExpanded = new Set(expandedSections);
    if (newExpanded.has(key)) {
      newExpanded.delete(key);
    } else {
      newExpanded.add(key);
    }
    setExpandedSections(newExpanded);
  };

  // Handle tool calls (from assistant)
  if (message.type === 'ai' && message.tool_calls && message.tool_calls.length > 0) {
    return (
      <div className="space-y-2">
        {/* Regular content if exists */}
        {message.content && typeof message.content === 'string' && message.content.trim() && (
          <div className="prose prose-sm max-w-none text-gray-700 mb-3">
            <ReactMarkdown>{message.content}</ReactMarkdown>
          </div>
        )}

        {/* Tool calls */}
        {message.tool_calls.map((toolCall, idx) => {
          const key = `tool-call-${idx}`;
          const isExpanded = expandedSections.has(key);

          return (
            <div key={idx} className="border rounded-lg overflow-hidden bg-amber-50 border-amber-200">
              <button
                onClick={() => toggleSection(key)}
                className="w-full flex items-center gap-2 p-3 hover:bg-amber-100 transition-colors text-left"
              >
                {isExpanded ? (
                  <ChevronDown className="w-4 h-4 text-amber-700 flex-shrink-0" />
                ) : (
                  <ChevronRight className="w-4 h-4 text-amber-700 flex-shrink-0" />
                )}
                <Tool className="w-4 h-4 text-amber-700 flex-shrink-0" />
                <span className="font-mono text-sm text-amber-900 font-semibold">
                  {toolCall.name}
                </span>
                <span className="text-xs text-amber-600 ml-auto">Tool Call</span>
              </button>

              {isExpanded && (
                <div className="p-3 bg-white border-t border-amber-200">
                  <JsonViewer data={toolCall.args} />
                </div>
              )}
            </div>
          );
        })}
      </div>
    );
  }

  // Handle tool messages (tool results)
  if (message.type === 'tool') {
    const key = `tool-result`;
    const isExpanded = expandedSections.has(key);
    const toolName = message.name || 'Unknown Tool';

    return (
      <div className="border rounded-lg overflow-hidden bg-blue-50 border-blue-200">
        <button
          onClick={() => toggleSection(key)}
          className="w-full flex items-center gap-2 p-3 hover:bg-blue-100 transition-colors text-left"
        >
          {isExpanded ? (
            <ChevronDown className="w-4 h-4 text-blue-700 flex-shrink-0" />
          ) : (
            <ChevronRight className="w-4 h-4 text-blue-700 flex-shrink-0" />
          )}
          <Code className="w-4 h-4 text-blue-700 flex-shrink-0" />
          <span className="font-mono text-sm text-blue-900 font-semibold">
            {toolName}
          </span>
          <span className="text-xs text-blue-600 ml-auto">Tool Result</span>
        </button>

        {isExpanded && (
          <div className="p-3 bg-white border-t border-blue-200">
            {typeof message.content === 'string' ? (
              <div className="prose prose-sm max-w-none">
                <ReactMarkdown>{message.content}</ReactMarkdown>
              </div>
            ) : (
              <JsonViewer data={message.content} />
            )}
          </div>
        )}
      </div>
    );
  }

  // Regular text message
  return (
    <div className="prose prose-sm max-w-none text-gray-700">
      <ReactMarkdown>
        {typeof message.content === 'string'
          ? message.content
          : JSON.stringify(message.content, null, 2)}
      </ReactMarkdown>
    </div>
  );
}

interface JsonViewerProps {
  data: any;
  level?: number;
}

function JsonViewer({ data, level = 0 }: JsonViewerProps) {
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());

  const toggleCollapse = (key: string) => {
    const newCollapsed = new Set(collapsed);
    if (newCollapsed.has(key)) {
      newCollapsed.delete(key);
    } else {
      newCollapsed.add(key);
    }
    setCollapsed(newCollapsed);
  };

  if (data === null) {
    return <span className="text-gray-500">null</span>;
  }

  if (data === undefined) {
    return <span className="text-gray-500">undefined</span>;
  }

  if (typeof data === 'string') {
    return <span className="text-green-700">"{data}"</span>;
  }

  if (typeof data === 'number') {
    return <span className="text-blue-700">{data}</span>;
  }

  if (typeof data === 'boolean') {
    return <span className="text-purple-700">{data.toString()}</span>;
  }

  if (Array.isArray(data)) {
    if (data.length === 0) {
      return <span className="text-gray-500">[]</span>;
    }

    const key = `array-${level}`;
    const isCollapsed = collapsed.has(key);

    return (
      <div className="font-mono text-sm">
        <button
          onClick={() => toggleCollapse(key)}
          className="text-gray-600 hover:text-gray-900 inline-flex items-center gap-1"
        >
          {isCollapsed ? (
            <ChevronRight className="w-3 h-3" />
          ) : (
            <ChevronDown className="w-3 h-3" />
          )}
          <span>[{data.length} items]</span>
        </button>

        {!isCollapsed && (
          <div className="ml-4 mt-1 space-y-1">
            {data.map((item, idx) => (
              <div key={idx} className="flex gap-2">
                <span className="text-gray-400">{idx}:</span>
                <JsonViewer data={item} level={level + 1} />
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  if (typeof data === 'object') {
    const keys = Object.keys(data);
    if (keys.length === 0) {
      return <span className="text-gray-500">{'{}'}</span>;
    }

    const key = `object-${level}`;
    const isCollapsed = collapsed.has(key);

    return (
      <div className="font-mono text-sm">
        <button
          onClick={() => toggleCollapse(key)}
          className="text-gray-600 hover:text-gray-900 inline-flex items-center gap-1"
        >
          {isCollapsed ? (
            <ChevronRight className="w-3 h-3" />
          ) : (
            <ChevronDown className="w-3 h-3" />
          )}
          <span>{'{'}{keys.length} keys{'}'}</span>
        </button>

        {!isCollapsed && (
          <div className="ml-4 mt-1 space-y-1">
            {keys.map((k) => (
              <div key={k} className="flex gap-2">
                <span className="text-orange-700 font-semibold">{k}:</span>
                <JsonViewer data={data[k]} level={level + 1} />
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  return <span>{String(data)}</span>;
}
