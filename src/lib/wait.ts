import wait from "wait";

// a setTimeout wrapper that returns a promise and an abort function
// The abort function should also reject the promise
// It is important that the promise is rejected, because else it would create memory leaks
export const wait2 = (time: number) => {
  let timeoutId: number | null = null;
  let rejectFn: (reason?: any) => void;

  const promise = new Promise<void>((resolve, reject) => {
    rejectFn = reject;
    timeoutId = window.setTimeout(() => {
      resolve();
    }, time);
  });

  return {
    promise,
    abort: async () => {
      if (timeoutId) {
        window.clearTimeout(timeoutId);
      }
      if (!rejectFn) {
        await wait(0);
      }
      rejectFn();
    },
  };
};
