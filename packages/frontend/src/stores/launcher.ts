import { type Dialog } from "@caido/sdk-frontend/src/types/types/window";
import { ScanAggressivity, type ScanConfig, Severity } from "engine";
import { defineStore } from "pinia";
import { type BasicRequest, type ScanRequestPayload } from "shared";
import { reactive, ref } from "vue";

import { useScannerService } from "@/services/scanner";
import { type FrontendSDK } from "@/types";

type FormState = {
  targets: BasicRequest[];
  config: ScanConfig;
  title: string;
};

export const useLauncher = defineStore("stores.launcher", () => {
  const scannerService = useScannerService();
  const defaultFormState: FormState = {
    targets: [],
    config: {
      aggressivity: ScanAggressivity.MEDIUM,
      inScopeOnly: false,
      scanTimeout: 10 * 60,
      checkTimeout: 2 * 60,
      concurrentChecks: 2,
      concurrentTargets: 2,
      concurrentRequests: 5,
      severities: [
        Severity.INFO,
        Severity.LOW,
        Severity.MEDIUM,
        Severity.HIGH,
        Severity.CRITICAL,
      ],
      requestsDelayMs: 50,
    },
    title: "Active Scan",
  };

  const dialog = ref<Dialog | undefined>(undefined);

  const form = reactive<FormState>({ ...defaultFormState });

  const toRequestPayload = (): ScanRequestPayload => ({
    requestIDs: form.targets.map((target) => target.id),
    scanConfig: form.config,
    title: form.title,
  });

  const onSubmit = async (sdk: FrontendSDK, incrementCount: () => void) => {
    const payload = toRequestPayload();
    const result = await scannerService.startActiveScan(payload);

    switch (result.kind) {
      case "Success": {
        scannerService.selectSession(result.value.id);
        incrementCount();

        dialog.value?.close();
        break;
      }
      case "Error":
        break;
    }
  };

  const restart = () => {
    Object.assign(form, defaultFormState);
  };

  const setDialog = (newDialog: Dialog) => {
    dialog.value = newDialog;
  };

  return {
    form,
    dialog,
    onSubmit,
    restart,
    setDialog,
  };
});
