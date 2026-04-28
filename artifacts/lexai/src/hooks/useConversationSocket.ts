import { useEffect, useRef, useCallback, useState } from "react";
import { ChatMessage } from "./useChatApi";

type WsEvent =
  | { type: "message"; uuid: string; content: string; message_type: string; sender_id: string; is_read: boolean; created_at: string; file?: ChatMessage["file"] }
  | { type: "typing"; sender_id: string; is_typing: boolean }
  | { type: "read"; reader_id: string }
  | { type: "pong" };

interface Options {
  conversationUuid: string;
  token: string | null;
  onMessage: (msg: Omit<ChatMessage, "sender_email">) => void;
  onTyping: (senderId: string, isTyping: boolean) => void;
  onRead: (readerId: string) => void;
  onReconnect?: () => void;
}

const PING_INTERVAL_MS = 25_000;
const INITIAL_RECONNECT_MS = 1_000;
const MAX_RECONNECT_MS = 30_000;
// These close codes mean the server rejected us — don't retry.
const TERMINAL_CODES = new Set([4001, 4004]);

export function useConversationSocket({
  conversationUuid,
  token,
  onMessage,
  onTyping,
  onRead,
  onReconnect,
}: Options) {
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pingTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const isMounted = useRef(true);
  const reconnectDelay = useRef(INITIAL_RECONNECT_MS);

  // Store callbacks in refs so changing them never triggers a reconnect.
  const onMessageRef = useRef(onMessage);
  const onTypingRef = useRef(onTyping);
  const onReadRef = useRef(onRead);
  const onReconnectRef = useRef(onReconnect);
  useEffect(() => { onMessageRef.current = onMessage; }, [onMessage]);
  useEffect(() => { onTypingRef.current = onTyping; }, [onTyping]);
  useEffect(() => { onReadRef.current = onRead; }, [onRead]);
  useEffect(() => { onReconnectRef.current = onReconnect; }, [onReconnect]);

  const [isConnected, setIsConnected] = useState(false);

  // connect is only recreated when uuid or token changes — not on callback changes.
  const connect = useCallback(() => {
    if (!token || !conversationUuid || !isMounted.current) return;

    // Tear down any existing socket cleanly before opening a new one.
    const prev = wsRef.current;
    if (prev) {
      prev.onclose = null; // suppress its reconnect
      if (prev.readyState !== WebSocket.CLOSED) prev.close();
    }
    if (pingTimer.current) { clearInterval(pingTimer.current); pingTimer.current = null; }

    const apiUrl = import.meta.env.VITE_API_URL || "";
    const wsBase = apiUrl
      ? apiUrl.replace(/^http/, "ws").replace(/\/+$/, "")
      : `${location.protocol === "https:" ? "wss" : "ws"}://${location.host}`;

    const ws = new WebSocket(`${wsBase}/ws/chat/${conversationUuid}/?token=${token}`);
    wsRef.current = ws;

    ws.onopen = () => {
      if (!isMounted.current) { ws.close(); return; }
      reconnectDelay.current = INITIAL_RECONNECT_MS; // reset backoff on success
      setIsConnected(true);

      // Keepalive ping so proxies/load balancers don't drop idle connections.
      pingTimer.current = setInterval(() => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({ type: "ping" }));
        }
      }, PING_INTERVAL_MS);

      // If this was a reconnect, refresh messages from REST.
      onReconnectRef.current?.();
    };

    ws.onmessage = (event) => {
      try {
        const data: WsEvent = JSON.parse(event.data);
        if (data.type === "message") {
          onMessageRef.current({
            uuid: data.uuid,
            content: data.content,
            message_type: data.message_type as "text" | "file",
            sender_id: parseInt(data.sender_id, 10),
            is_read: data.is_read,
            created_at: data.created_at,
            file: data.file ?? null,
          });
        } else if (data.type === "typing") {
          onTypingRef.current(data.sender_id, data.is_typing);
        } else if (data.type === "read") {
          onReadRef.current(data.reader_id);
        }
        // pong: no-op — just confirms the connection is alive
      } catch {}
    };

    ws.onclose = (event) => {
      if (pingTimer.current) { clearInterval(pingTimer.current); pingTimer.current = null; }
      setIsConnected(false);

      // Don't reconnect on auth failure or conversation-not-found.
      if (!isMounted.current || TERMINAL_CODES.has(event.code)) return;

      // Exponential backoff: 1 s → 2 s → 4 s → … → 30 s
      if (reconnectTimer.current) clearTimeout(reconnectTimer.current);
      reconnectTimer.current = setTimeout(() => {
        reconnectDelay.current = Math.min(reconnectDelay.current * 2, MAX_RECONNECT_MS);
        connect();
      }, reconnectDelay.current);
    };

    ws.onerror = () => ws.close();
  }, [conversationUuid, token]); // callbacks intentionally omitted — they live in refs

  useEffect(() => {
    isMounted.current = true;
    reconnectDelay.current = INITIAL_RECONNECT_MS;
    connect();

    return () => {
      isMounted.current = false;
      if (reconnectTimer.current) { clearTimeout(reconnectTimer.current); reconnectTimer.current = null; }
      if (pingTimer.current) { clearInterval(pingTimer.current); pingTimer.current = null; }
      const ws = wsRef.current;
      if (ws) {
        ws.onclose = null; // don't trigger reconnect on intentional teardown
        ws.close();
        wsRef.current = null;
      }
      setIsConnected(false);
    };
  }, [connect]);

  const sendMessage = useCallback((content: string): boolean => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: "message", content }));
      return true;
    }
    return false;
  }, []);

  const sendTyping = useCallback((isTyping: boolean) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: "typing", is_typing: isTyping }));
    }
  }, []);

  const sendRead = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: "read" }));
    }
  }, []);

  return { sendMessage, sendTyping, sendRead, isConnected };
}
