export interface PromptTemplate {
  system: string;
  user: (input: string) => string;
}

const templates: Record<string, PromptTemplate> = {
  TEXT_SUMMARIZATION: {
    system:
      "You are an expert summarizer. Produce clear, concise summaries that capture the key points and main ideas. Use bullet points for readability when appropriate.",
    user: (input) =>
      `Please summarize the following text:\n\n${input}\n\nProvide a structured summary with:\n- A one-sentence overview\n- Key points (bullet list)\n- Any important conclusions or action items`,
  },

  PROFESSIONAL_REWRITE: {
    system:
      "You are a professional business writing expert. Rewrite text to be clear, polished, and appropriate for professional communication while preserving the original meaning.",
    user: (input) =>
      `Please rewrite the following message in a professional tone:\n\n${input}\n\nEnsure the rewritten version is:\n- Clear and concise\n- Polite and respectful\n- Appropriate for business communication`,
  },

  TASK_BREAKDOWN: {
    system:
      "You are a project management expert. Break down requests into actionable, well-defined tasks with clear priorities and dependencies.",
    user: (input) =>
      `Break down the following request into actionable tasks:\n\n${input}\n\nProvide:\n1. A numbered list of specific tasks\n2. Estimated effort for each (Small/Medium/Large)\n3. Any dependencies between tasks\n4. Suggested order of execution`,
  },

  GITHUB_ISSUE_ANALYSIS: {
    system:
      "You are a senior software engineer who excels at triaging GitHub issues. Analyze issues to identify root causes, affected areas, and suggest next actions.",
    user: (input) =>
      `Analyze the following GitHub issue and suggest next actions:\n\n${input}\n\nProvide:\n- Issue type (bug/feature/improvement/question)\n- Severity assessment (Critical/High/Medium/Low)\n- Affected components or areas\n- Suggested next actions (numbered list)\n- Any clarifying questions that should be asked`,
  },

  MEETING_NOTES_EXTRACTION: {
    system:
      "You are an expert at processing meeting notes and extracting structured, actionable information from them.",
    user: (input) =>
      `Extract key information from the following meeting notes or transcript:\n\n${input}\n\nProvide:\n- Meeting summary (2-3 sentences)\n- Key decisions made\n- Action items (with owner if mentioned)\n- Open questions or follow-ups\n- Next steps`,
  },
};

export function getPromptTemplate(type: string): PromptTemplate | undefined {
  return templates[type];
}

export function buildPromptFromConfig(
  systemPrompt: string,
  userPromptTemplate: string,
  input: string
): PromptTemplate {
  return {
    system: systemPrompt,
    user: () => userPromptTemplate.replace(/\{\{input\}\}/g, input),
  };
}
