import { type SDK } from "caido:plugin";
import {
  type RequestResponse,
  type RequestSpec,
  type RequestSpecRaw,
} from "caido:utils";

import {
  type InterruptReason,
  type ScanConfig,
  type ScanEvents,
} from "../types/runner";

import {
  ScanRunnableError,
  ScanRunnableErrorCode,
  ScanRunnableInterruptedError,
} from "./errors";

type QueuedRequest = {
  request: RequestSpec | RequestSpecRaw;
  resolve: (value: RequestResponse) => void;
  reject: (error: Error) => void;
  pendingRequestID: string;
  targetRequestID: string;
  checkID: string;
};

type RequestQueue = {
  enqueue: (
    request: RequestSpec | RequestSpecRaw,
    pendingRequestID: string,
    targetRequestID: string,
    checkID: string,
  ) => Promise<RequestResponse>;
};

export const createRequestQueue = ({
  sdk,
  config,
  emit,
  getInterruptReason,
}: {
  sdk: SDK;
  config: ScanConfig;
  emit: (event: keyof ScanEvents, data: ScanEvents[keyof ScanEvents]) => void;
  getInterruptReason: () => InterruptReason | undefined;
}): RequestQueue => {
  const queue: QueuedRequest[] = [];
  let activeRequests = 0;
  let lastRequestTime = 0;
  let requestLock = Promise.resolve();
  let processingPromise: Promise<void> | undefined;

  const rejectAllPending = (): void => {
    const interruptReason = getInterruptReason();
    while (queue.length > 0) {
      const item = queue.shift();
      if (item) {
        item.reject(new ScanRunnableInterruptedError(interruptReason!));
      }
    }
  };

  const processRequest = async (item: QueuedRequest): Promise<void> => {
    try {
      if (getInterruptReason()) {
        throw new ScanRunnableInterruptedError(getInterruptReason()!);
      }

      if (config.requestsDelayMs > 0) {
        requestLock = requestLock.then(async () => {
          const timeSinceLastRequest = Date.now() - lastRequestTime;
          const delayNeeded = Math.max(
            0,
            config.requestsDelayMs - timeSinceLastRequest,
          );

          if (delayNeeded > 0) {
            await new Promise((resolve) => setTimeout(resolve, delayNeeded));
          }

          lastRequestTime = Date.now();
        });

        await requestLock;
      }

      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => {
          reject(new Error("Request timeout after 60 seconds"));
        }, 60000);
      });

      const result = await Promise.race([
        sdk.requests.send(item.request),
        timeoutPromise,
      ]);

      emit("scan:request-completed", {
        pendingRequestID: item.pendingRequestID,
        requestID: result.request.getId(),
        responseID: result.response.getId(),
        checkID: item.checkID,
        targetRequestID: item.targetRequestID,
      });

      item.resolve(result);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";

      emit("scan:request-failed", {
        pendingRequestID: item.pendingRequestID,
        error: errorMessage,
        targetRequestID: item.targetRequestID,
        checkID: item.checkID,
      });

      item.reject(
        new ScanRunnableError(
          `Request ID: ${item.targetRequestID} failed: ${errorMessage}`,
          ScanRunnableErrorCode.REQUEST_FAILED,
        ),
      );
    }
  };

  const processQueue = async (): Promise<void> => {
    while (queue.length > 0 || activeRequests > 0) {
      if (getInterruptReason()) {
        rejectAllPending();
        break;
      }

      if (queue.length === 0) {
        await new Promise((resolve) => setTimeout(resolve, 10));
        continue;
      }

      if (activeRequests >= config.concurrentRequests) {
        await new Promise((resolve) => setTimeout(resolve, 10));
        continue;
      }

      const item = queue.shift();
      if (!item) {
        continue;
      }

      activeRequests++;
      processRequest(item).finally(() => {
        activeRequests--;
      });
    }

    processingPromise = undefined;
  };

  const startProcessing = (): void => {
    if (processingPromise) {
      return;
    }

    processingPromise = processQueue();
  };

  const enqueue = async (
    request: RequestSpec | RequestSpecRaw,
    pendingRequestID: string,
    targetRequestID: string,
    checkID: string,
  ): Promise<RequestResponse> => {
    return new Promise((resolve, reject) => {
      queue.push({
        request,
        pendingRequestID,
        targetRequestID,
        checkID,
        resolve,
        reject,
      });

      startProcessing();
    });
  };

  return {
    enqueue,
  };
};
