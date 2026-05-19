export type AmplifyPlatform =
  | 'tweet'
  | 'instagram_caption'
  | 'facebook_post'
  | 'whatsapp_broadcast'
  | 'news_article'
  | 'letter_to_authority'
  | 'press_release'

export type AmplifyTone =
  | 'informative'
  | 'urgent'
  | 'formal'
  | 'empathetic'
  | 'neutral'
  | 'activist'
  | 'opposition'
  | 'public_shame'

export interface PlatformMeta {
  key: AmplifyPlatform
  label: string
  short_hint: string
  char_hint?: number
}

export interface AmplifySessionListItem {
  id: string
  status: string
  created_at: string
  updated_at: string
  tickets: { id: string; ticket_number: string; title: string | null } | null
  users: { full_name: string } | null
}

export interface AmplifyListResponse {
  sessions: AmplifySessionListItem[]
  count: number
}

export interface AmplifySource {
  id: string
  source_type: string
  source_content: string | null
  included: boolean
}

export interface AmplifyOutput {
  id: string
  output_format: string
  tone: string | null
  content: string
  model_used: string | null
  generated_at: string
  metadata_json: Record<string, unknown> | null
}

export interface AmplifySessionDetail {
  id: string
  status: string
  created_at: string
  ticket_id: string
  organization_id: string
  tickets: {
    id: string
    ticket_number: string
    title: string | null
    original_issue_text: string | null
    normalized_summary: string | null
    location_text: string | null
    latitude: number | null
    longitude: number | null
    severity: string | null
  } | null
  sources: AmplifySource[]
  outputs: AmplifyOutput[]
  platforms: PlatformMeta[]
}

export interface CreateAmplifySessionResponse {
  ok: boolean
  id: string
  reused: boolean
}

export interface GenerateAmplifyResponse {
  ok: boolean
  output: AmplifyOutput
}
