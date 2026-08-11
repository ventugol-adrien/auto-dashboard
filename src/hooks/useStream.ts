import { useState, useEffect, useRef } from "react";

interface UseSSEOptions {
  /** Maximum number of items to keep in state buffer (default: 1000) */
  maxBuffer?: number;
  /** Whether to send credentials/cookies with request */
  withCredentials?: boolean;
}

interface UseSSEReturn<T> {
  data: T[];
  latestItem: T | null;
  isConnected: boolean;
  error: Event | null;
  clear: () => void;
}

const parseFileContent = <T>(content: string): T[] =>
  content
    .split(/\r?\n/)
    .filter(Boolean)
    .map((line) => {
      try {
        return JSON.parse(line) as T;
      } catch {
        return line as T;
      }
    });

export function useStream<T>(
  url: string,
  options: UseSSEOptions = {},
): UseSSEReturn<T> {
  const { maxBuffer = 1000, withCredentials = false } = options;

  const [data, setData] = useState<T[]>([]);
  const [latestItem, setLatestItem] = useState<T | null>(null);
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [error, setError] = useState<Event | null>(null);

  // Use ref for maxBuffer to avoid re-triggering useEffect when options change
  const maxBufferRef = useRef(maxBuffer);
  maxBufferRef.current = maxBuffer;

  useEffect(() => {
    if (!url) return;

    const isRemote = /^https?:\/\//i.test(url);

    if (!isRemote) {
      if (!window.fileStream) {
        let cancelled = false;

        const loadFile = async () => {
          try {
            const response = await fetch(url);

            if (!response.ok) {
              throw new Error(`Failed to load ${url}: ${response.statusText}`);
            }

            const items = parseFileContent<T>(await response.text()).slice(
              -maxBufferRef.current,
            );

            if (!cancelled) {
              setData(items);
              setLatestItem(items.at(-1) ?? null);
              setIsConnected(true);
              setError(null);
            }
          } catch (loadError) {
            if (!cancelled) {
              setIsConnected(false);
              setError(
                new ErrorEvent("error", {
                  message:
                    loadError instanceof Error
                      ? loadError.message
                      : String(loadError),
                }),
              );
            }
          }
        };

        void loadFile();

        return () => {
          cancelled = true;
          setIsConnected(false);
        };
      }

      setIsConnected(true);
      setError(null);

      const stopWatching = window.fileStream.watch(
        url,
        (content) => {
          const items = parseFileContent<T>(content).slice(
            -maxBufferRef.current,
          );
          setData(items);
          setLatestItem(items.at(-1) ?? null);
        },
        (message) => {
          setIsConnected(false);
          setError(new ErrorEvent("error", { message }));
        },
      );

      return () => {
        stopWatching();
        setIsConnected(false);
      };
    }

    // 1. Initialize EventSource
    const eventSource = new EventSource(url, { withCredentials });

    eventSource.onopen = () => {
      setIsConnected(true);
      setError(null);
    };

    // 2. Handle default 'message' events
    eventSource.onmessage = (event: MessageEvent) => {
      try {
        // Attempt JSON parse, fallback to raw string if not JSON
        const parsed: T =
          typeof event.data === "string" && event.data.startsWith("{")
            ? JSON.parse(event.data)
            : (event.data as unknown as T);

        setLatestItem(parsed);
        setData((prev) => {
          const next = [...prev, parsed];
          // Keep state memory capped to maxBuffer limit
          return next.slice(-maxBufferRef.current);
        });
      } catch (err) {
        console.error("Failed to parse SSE event data:", err);
      }
    };

    // 3. Handle errors (EventSource automatically attempts reconnects)
    eventSource.onerror = (err) => {
      setIsConnected(false);
      setError(err);
    };

    // 4. Cleanup: Close connection when component unmounts or URL changes
    return () => {
      eventSource.close();
      setIsConnected(false);
    };
  }, [url, withCredentials]);

  const clear = () => {
    setData([]);
    setLatestItem(null);
  };

  return { data, latestItem, isConnected, error, clear };
}
