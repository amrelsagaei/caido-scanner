import { useThrottleFn } from "@vueuse/core";
import { defineStore } from "pinia";
import {
  type DeepPartial,
  type ScanRequestPayload,
  type SessionProgress,
} from "shared";
import { computed } from "vue";

import { useSDK } from "@/plugins/sdk";
import { useScannerRepository } from "@/repositories/scanner";
import { useScannerStore } from "@/stores/scanner";

export const useScannerService = defineStore("services.scanner", () => {
  const sdk = useSDK();
  const store = useScannerStore();
  const repository = useScannerRepository();

  const getState = () => store.getState();

  const getSelectedSession = () => {
    const selectionState = store.selectionState.getState();
    const sessionsState = store.getState();

    if (selectionState !== undefined && sessionsState.type === "Success") {
      return sessionsState.sessions.find(
        (session) => session.id === selectionState,
      );
    }

    return undefined;
  };

  const initialize = async () => {
    store.send({ type: "Start" });
    const result = await repository.getScanSessions();

    if (result.kind === "Success") {
      store.send({ type: "Success", sessions: result.value });
    } else {
      store.send({ type: "Error", error: result.error });
      sdk.window.showToast("Failed to load scan sessions", {
        variant: "error",
      });
    }

    sdk.backend.onEvent("session:updated", (_, state) => {
      store.send({ type: "UpdateSession", session: state });
    });

    sdk.backend.onEvent("session:created", (id, state) => {
      store.send({ type: "AddSession", session: state });
    });

    const throttledProgressUpdate = useThrottleFn(
      (id: string, progress: DeepPartial<SessionProgress>) => {
        store.send({ type: "UpdateSessionProgress", sessionId: id, progress });
      },
      200,
    );

    sdk.backend.onEvent("session:progress", (id, progress) => {
      throttledProgressUpdate(id, progress);
    });
  };

  const startActiveScan = async (payload: ScanRequestPayload) => {
    const result = await repository.startActiveScan(payload);

    if (result.kind === "Success") {
      sdk.window.showToast("Scan submitted", { variant: "success" });
    } else {
      sdk.window.showToast(result.error, {
        variant: "error",
      });
    }

    return result;
  };

  const selectSession = (sessionId: string) => {
    store.selectionState.select(sessionId);
  };

  const clearSelection = () => {
    store.selectionState.reset();
  };

  const cancelScanSession = async (sessionId: string) => {
    const result = await repository.cancelScanSession(sessionId);
    switch (result.kind) {
      case "Success":
        sdk.window.showToast("Scan cancelled", { variant: "success" });
        store.send({ type: "CancelSession", sessionId });
        break;
      case "Error":
        sdk.window.showToast(result.error, { variant: "error" });
    }
  };

  const deleteScanSession = async (sessionId: string) => {
    const currentSelection = store.selectionState.getState();
    const isCurrentlySelected = currentSelection === sessionId;

    const result = await repository.deleteScanSession(sessionId);
    switch (result.kind) {
      case "Success":
        sdk.window.showToast("Scan deleted", { variant: "success" });
        store.send({ type: "DeleteSession", sessionId });

        if (isCurrentlySelected) {
          store.selectionState.reset();
        }
        break;
      case "Error":
        sdk.window.showToast(result.error, { variant: "error" });
    }
  };

  const updateSessionTitle = async (sessionId: string, title: string) => {
    const result = await repository.updateSessionTitle(sessionId, title);
    switch (result.kind) {
      case "Success":
        store.send({ type: "UpdateSession", session: result.value });
        break;
      case "Error":
        sdk.window.showToast(result.error, { variant: "error" });
    }
  };

  const selectedSession = computed(() => getSelectedSession());

  return {
    getState,
    getSelectedSession,
    selectedSession,
    initialize,
    startActiveScan,
    selectSession,
    clearSelection,
    cancelScanSession,
    deleteScanSession,
    updateSessionTitle,
  };
});
