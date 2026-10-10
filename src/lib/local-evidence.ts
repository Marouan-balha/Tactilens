import { loadEvidenceResult, type EvidenceResult } from '@/domain/opposition/evidence-result';

export const LOCAL_EVIDENCE_PATH = '/evidence/demo.json';

export function loadLocalEvidence(fetcher: typeof fetch = fetch): Promise<EvidenceResult> {
  return loadEvidenceResult(LOCAL_EVIDENCE_PATH, fetcher);
}