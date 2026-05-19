export type IntakeVersion = 'v1' | 'v2'

export interface IntakeSettingsResponse {
  version: IntakeVersion
}

export interface SaveIntakeSettingsResponse {
  ok: boolean
  version: IntakeVersion
  previous: IntakeVersion
}
