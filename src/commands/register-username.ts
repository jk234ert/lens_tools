function pad(value: number): string {
  return String(value).padStart(2, '0');
}

function formatUtcTimestamp(now: Date): string {
  return [
    now.getUTCFullYear(),
    pad(now.getUTCMonth() + 1),
    pad(now.getUTCDate()),
  ].join('') + `_${pad(now.getUTCHours())}${pad(now.getUTCMinutes())}${pad(now.getUTCSeconds())}`;
}

export function resolveRegisterUsername(username?: string, now: Date = new Date()): string {
  const explicitUsername = username?.trim();

  if (explicitUsername) {
    return explicitUsername;
  }

  return `test_${formatUtcTimestamp(now)}`;
}
