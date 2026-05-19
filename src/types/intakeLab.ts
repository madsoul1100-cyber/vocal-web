export type IntakeRole = 'user' | 'assistant'

export interface IntakeConversationTurn {
  role: IntakeRole
  content: string
}

export interface IntakeResponse {
  language: string
  intent: string
  scopeAssessment: 'in_scope' | 'needs_review' | 'out_of_scope'
  scopeReason?: string
  draftUpdates: Record<string, unknown>
  needsMoreInfo: string[]
  readyToFile: boolean
  replyText: string
  outOfScope: boolean
  outOfScopeReason?: string
  _meta?: { model: string; fallback: boolean; error?: string; raw_response?: string }
}

export interface IntakeTestRequest {
  history: IntakeConversationTurn[]
  newMessage: { text?: string | null }
  existingDraft?: Record<string, unknown>
}

export interface IntakeLabTurn {
  role: IntakeRole
  content: string
  response?: IntakeResponse
}
