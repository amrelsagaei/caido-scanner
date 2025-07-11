import { type ScanRequestPayload } from "shared";

import { useSDK } from "@/plugins/sdk";

export const useScannerRepository = () => {
  const sdk = useSDK();

  const startActiveScan = async (payload: ScanRequestPayload) => {
    const response = await sdk.backend.startActiveScan(payload);
    return response;
  };

  const getScanSession = async (sessionId: string) => {
    const response = await sdk.backend.getScanSession(sessionId);
    return response;
  };

  const getScanSessions = async () => {
    const response = await sdk.backend.getScanSessions();
    return response;
  };

  const cancelScanSession = async (sessionId: string) => {
    const response = await sdk.backend.cancelScanSession(sessionId);
    return response;
  };

  const deleteScanSession = async (sessionId: string) => {
    const response = await sdk.backend.deleteScanSession(sessionId);
    return response;
  };

  const updateSessionTitle = async (sessionId: string, title: string) => {
    const response = await sdk.backend.updateSessionTitle(sessionId, title);
    return response;
  };

  return {
    startActiveScan,
    getScanSession,
    getScanSessions,
    cancelScanSession,
    deleteScanSession,
    updateSessionTitle,
  };
};
