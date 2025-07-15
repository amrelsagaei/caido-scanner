import { useLauncher } from "@/stores/launcher";
import { ScanAggressivity, Severity } from "engine";
import { computed } from "vue";
import prettyMs from 'pretty-ms';

export const useForm = () => {
  const { form } = useLauncher();

  const aggressivityOptions = Object.values(ScanAggressivity).map(
    (aggressivity) => ({
      label: aggressivity.charAt(0).toUpperCase() + aggressivity.slice(1),
      value: aggressivity,
    })
  );

  const severityOptions = Object.values(Severity).map((severity) => ({
    label: severity.charAt(0).toUpperCase() + severity.slice(1),
    value: severity,
  }));

  const scopeOptions = [
    { label: "All", value: false },
    { label: "In-Scope only", value: true },
  ];

  const inScopeOnly = computed({
    get: () => form.config.inScopeOnly,
    set: (value: boolean) => {
      form.config.inScopeOnly = value;
    },
  });

  const readableTimeout = computed(() => {
    const timeout = form.config.scanTimeout;
    if (!timeout || timeout <= 0) {
      return "";
    }
    return prettyMs(timeout * 1000, { verbose: true });
  });

  return {
    form,
    aggressivityOptions,
    severityOptions,
    scopeOptions,
    inScopeOnly,
    readableTimeout,
  };
};
