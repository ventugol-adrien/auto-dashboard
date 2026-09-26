export {};

declare global {
  interface Window {
    fileStream?: {
      watch: (
        filePath: string,
        onData: (content: string) => void,
        onError: (message: string) => void,
      ) => () => void;
    };
  }
}
