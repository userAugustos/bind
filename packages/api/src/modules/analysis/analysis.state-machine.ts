import { badRequest } from '@core/errors';

export const AnalysisStates = ['pending', 'processing', 'completed', 'failed'] as const;
export type AnalysisState = (typeof AnalysisStates)[number];

export const AnalysisEvents = ['start', 'complete', 'fail', 'retry'] as const;
export type AnalysisEvent = (typeof AnalysisEvents)[number];

const transitions: Record<AnalysisState, Partial<Record<AnalysisEvent, AnalysisState>>> = {
  pending: { start: 'processing' },
  processing: { complete: 'completed', fail: 'failed' },
  completed: {},
  failed: { retry: 'processing' },
};

export function transitionAnalysisStatus(
  current: AnalysisState,
  event: AnalysisEvent
): AnalysisState {
  const next = transitions[current]?.[event];
  if (!next) {
    throw badRequest(
      'invalid_analysis_transition',
      `Cannot apply event '${event}' to analysis_status '${current}'`
    );
  }
  return next;
}
