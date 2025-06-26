import { defineStore } from "pinia";

import { useChecksRepository } from "@/repositories/checks";
import { useChecksStore } from "@/stores/checks";

export const useChecksService = defineStore("services.checks", () => {
  const repository = useChecksRepository();
  const store = useChecksStore();

  const getState = () => store.getState();

  const initialize = async () => {
    store.send({ type: "Start" });
    const result = await repository.getChecks();

    if (result.kind === "Success") {
      store.send({ type: "Success", checks: result.value });
    } else {
      store.send({ type: "Error", error: result.error });
    }
  };

  return {
    getState,
    initialize,
  };
});
