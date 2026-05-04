export {}

declare global {
  interface Window {
    webkit?: {
      messageHandlers?: {
        updateArticle?: {
          postMessage: (payload: { title: string; author: string }) => void;
        };
        [key: string]: unknown;
      };
    };
  }
}
