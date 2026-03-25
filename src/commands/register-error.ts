function formatUnknownError(error: unknown): string {
  if (error instanceof Error) {
    return error.message || error.name;
  }

  if (typeof error === 'string') {
    return error;
  }

  try {
    return JSON.stringify(error);
  } catch {
    return String(error);
  }
}

export function formatRegisterFailure(
  stage: string,
  error: unknown,
  txHash?: string
): string {
  const prefix = txHash ? `${stage} for tx ${txHash}` : stage;
  return `${prefix}: ${formatUnknownError(error)}`;
}
