import { type QueueTask } from "shared";
import { reactive } from "vue";

import { type QueueState } from "@/types/queue";

type Context = {
  state: QueueState;
};

type Message =
  | { type: "Start" }
  | { type: "Error"; error: string }
  | { type: "Success"; tasks: QueueTask[] }
  | { type: "AddTask"; taskId: string; requestID: string }
  | { type: "StartTask"; taskId: string }
  | { type: "FinishTask"; taskId: string }
  | { type: "Clear" };

export const useQueueState = () => {
  const context: Context = reactive({
    state: { type: "Idle" },
  });

  const getState = () => context.state;

  const send = (message: Message) => {
    const currState = context.state;

    switch (currState.type) {
      case "Idle":
        context.state = processIdle(currState, message);
        break;
      case "Loading":
        context.state = processLoading(currState, message);
        break;
      case "Error":
        context.state = processError(currState, message);
        break;
      case "Success":
        context.state = processSuccess(currState, message);
        break;
    }
  };

  return { getState, send };
};

const processIdle = (
  state: QueueState & { type: "Idle" },
  message: Message,
): QueueState => {
  switch (message.type) {
    case "Start":
      return { type: "Loading" };
    case "AddTask":
      return {
        type: "Success",
        tasks: [
          {
            id: message.taskId,
            requestID: message.requestID,
            status: "pending",
          },
        ],
      };
    case "Error":
    case "Success":
    case "StartTask":
    case "FinishTask":
    case "Clear":
      return state;
  }
};

const processLoading = (
  state: QueueState & { type: "Loading" },
  message: Message,
): QueueState => {
  switch (message.type) {
    case "Error":
      return { type: "Error", error: message.error };
    case "Success":
      return { type: "Success", tasks: message.tasks };
    case "Start":
    case "AddTask":
    case "StartTask":
    case "FinishTask":
    case "Clear":
      return state;
  }
};

const processError = (
  state: QueueState & { type: "Error" },
  message: Message,
): QueueState => {
  switch (message.type) {
    case "Start":
      return { type: "Loading" };
    case "Error":
    case "Success":
    case "AddTask":
    case "StartTask":
    case "FinishTask":
    case "Clear":
      return state;
  }
};
const processSuccess = (
  state: QueueState & { type: "Success" },
  message: Message,
): QueueState => {
  switch (message.type) {
    case "AddTask":
      return {
        ...state,
        tasks: [
          ...state.tasks,
          {
            id: message.taskId,
            requestID: message.requestID,
            status: "pending",
          },
        ],
      };
    case "StartTask":
      return {
        ...state,
        tasks: state.tasks.map((task) =>
          task.id === message.taskId ? { ...task, status: "running" } : task,
        ),
      };
    case "FinishTask": {
      const updatedTasks = state.tasks.filter(
        (task) => task.id !== message.taskId,
      );
      return { ...state, tasks: updatedTasks };
    }
    case "Clear":
      return { ...state, tasks: [] };
    case "Start":
    case "Error":
    case "Success":
      return state;
  }
};
