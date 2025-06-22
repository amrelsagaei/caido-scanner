export const Severity = {
  INFO: "info",
  LOW: "low",
  MEDIUM: "medium",
  HIGH: "high",
  CRITICAL: "critical",
} as const;

export type Severity = (typeof Severity)[keyof typeof Severity];

export type Finding = {
  name: string;
  description: string;
  severity: Severity;
  requestID?: string;
};
