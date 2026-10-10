// Inspired by react-hot-toast library
import { useState, useEffect } from "react";

/**
 * @typedef {import("react").ReactNode} ReactNode
 * @typedef {{
 *   id: string,
 *   title?: ReactNode,
 *   description?: ReactNode,
 *   action?: ReactNode,
 *   variant?: "default" | "destructive",
 *   open?: boolean,
 *   onOpenChange?: (open: boolean) => void,
 * }} ToasterToast
 * @typedef {{ toasts: ToasterToast[] }} ToastState
 * @typedef {{ type: "ADD_TOAST", toast: ToasterToast }
 *   | { type: "UPDATE_TOAST", toast: Partial<ToasterToast> & { id: string } }
 *   | { type: "DISMISS_TOAST", toastId?: string }
 *   | { type: "REMOVE_TOAST", toastId?: string }} ToastAction
 */

const TOAST_LIMIT = 20;
const TOAST_REMOVE_DELAY = 1000000;

/** @type {{ readonly ADD_TOAST: "ADD_TOAST", readonly UPDATE_TOAST: "UPDATE_TOAST", readonly DISMISS_TOAST: "DISMISS_TOAST", readonly REMOVE_TOAST: "REMOVE_TOAST" }} */
const actionTypes = {
  ADD_TOAST: "ADD_TOAST",
  UPDATE_TOAST: "UPDATE_TOAST",
  DISMISS_TOAST: "DISMISS_TOAST",
  REMOVE_TOAST: "REMOVE_TOAST",
};

let count = 0;

function genId() {
  count = (count + 1) % Number.MAX_VALUE;
  return count.toString();
}

const toastTimeouts = new Map();

/** @param {string} toastId */
const addToRemoveQueue = (toastId) => {
  if (toastTimeouts.has(toastId)) {
    return;
  }

  const timeout = setTimeout(() => {
    toastTimeouts.delete(toastId);
    dispatch({
      type: actionTypes.REMOVE_TOAST,
      toastId,
    });
  }, TOAST_REMOVE_DELAY);

  toastTimeouts.set(toastId, timeout);
};

/** @param {string} toastId */
const _clearFromRemoveQueue = (toastId) => {
  const timeout = toastTimeouts.get(toastId);
  if (timeout) {
    clearTimeout(timeout);
    toastTimeouts.delete(toastId);
  }
};

/**
 * @param {ToastState} state
 * @param {ToastAction} action
 * @returns {ToastState}
 */
export const reducer = (state, action) => {
  switch (action.type) {
    case actionTypes.ADD_TOAST:
      return {
        ...state,
        toasts: [action.toast, ...state.toasts].slice(0, TOAST_LIMIT),
      };

    case actionTypes.UPDATE_TOAST:
      return {
        ...state,
        toasts: state.toasts.map((t) =>
          t.id === action.toast.id ? { ...t, ...action.toast } : t
        ),
      };

    case actionTypes.DISMISS_TOAST: {
      const { toastId } = action;

      // ! Side effects ! - This could be extracted into a dismissToast() action,
      // but I'll keep it here for simplicity
      if (toastId) {
        addToRemoveQueue(toastId);
      } else {
        state.toasts.forEach((toast) => {
          addToRemoveQueue(toast.id);
        });
      }

      return {
        ...state,
        toasts: state.toasts.map((t) =>
          t.id === toastId || toastId === undefined
            ? {
                ...t,
                open: false,
              }
            : t
        ),
      };
    }
    case actionTypes.REMOVE_TOAST:
      if (action.toastId === undefined) {
        return {
          ...state,
          toasts: [],
        };
      }
      return {
        ...state,
        toasts: state.toasts.filter((t) => t.id !== action.toastId),
      };
  }
};

/** @type {Array<(state: ToastState) => void>} */
const listeners = [];

/** @type {ToastState} */
let memoryState = { toasts: [] };

/** @param {ToastAction} action */
function dispatch(action) {
  memoryState = reducer(memoryState, action);
  listeners.forEach((listener) => {
    listener(memoryState);
  });
}

/** @param {Omit<ToasterToast, "id" | "open" | "onOpenChange">} props */
function toast(props) {
  const id = genId();

  /** @param {Partial<ToasterToast>} next */
  const update = (next) =>
    dispatch({
      type: actionTypes.UPDATE_TOAST,
      toast: { ...next, id },
    });

  const dismiss = () =>
    dispatch({ type: actionTypes.DISMISS_TOAST, toastId: id });

  dispatch({
    type: actionTypes.ADD_TOAST,
    toast: {
      ...props,
      id,
      open: true,
      onOpenChange: (/** @type {boolean} */ open) => {
        if (!open) dismiss();
      },
    },
  });

  return {
    id,
    dismiss,
    update,
  };
}

function useToast() {
  const [state, setState] = useState(memoryState);

  useEffect(() => {
    listeners.push(setState);
    return () => {
      const index = listeners.indexOf(setState);
      if (index > -1) {
        listeners.splice(index, 1);
      }
    };
  }, [state]);

  return {
    ...state,
    toast,
    dismiss: (/** @type {string | undefined} */ toastId) => dispatch({ type: actionTypes.DISMISS_TOAST, toastId }),
  };
}

export { useToast, toast };
