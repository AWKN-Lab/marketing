export type P6FaultMatrixRecord = {
  operation: string;
  expectedState: string;
  actualState: string;
  errorCode: string | null;
  retryable: boolean | null;
  requestId: string;
  idempotencyKey: string | null;
  traceId: string | null;
  sideEffectCount: number;
  finalRevision: number | null;
  finalConsistency: string;
};

export function assertP6FaultMatrixRecord(record: P6FaultMatrixRecord) {
  const requiredText = [record.operation, record.expectedState, record.actualState, record.requestId, record.finalConsistency];
  if (requiredText.some((value) => !value.trim())) {
    throw new Error("P6 fault matrix record is missing required text fields.");
  }
  if (!Number.isInteger(record.sideEffectCount) || record.sideEffectCount < 0) {
    throw new Error(`Invalid side effect count: ${record.sideEffectCount}`);
  }
  if (record.finalRevision !== null && (!Number.isInteger(record.finalRevision) || record.finalRevision < 0)) {
    throw new Error(`Invalid final revision: ${record.finalRevision}`);
  }
  console.log(`[P6][FAULT-MATRIX] ${JSON.stringify(record)}`);
  return record;
}
