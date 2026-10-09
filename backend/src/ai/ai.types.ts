export interface AISettings {
  apiKey?: string;
  model: string;
  systemPrompt: string;
  temperature: number;
  bankDetails?: string;
}

export interface AIToolDefinition {
  type: 'function';
  function: {
    name: string;
    description: string;
    parameters: Record<string, any>;
  };
}

export interface AgentContext {
  customerId: string;
  conversationId: string;
  customerName?: string;
  customerUsername?: string;
  selectedProductId?: string | null;
  selectedVariantId?: string | null;
  attachedMediaId?: string | null;
  recentMessages: Array<{
    role: 'user' | 'assistant' | 'system';
    content: string;
  }>;
}

export interface AgentResult {
  reply: string;
  selectedProductId?: string | null;
  selectedVariantId?: string | null;
  toolCallsCount: number;
  toolsExecuted: string[];
}
