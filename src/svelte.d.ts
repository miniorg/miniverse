declare module 'svelte/store' {
  export function readable<T>(value: T, subscribe: (set: (value: T) => void) => () => void): {
    subscribe(): () => void;
  };
}
