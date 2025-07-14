"use client";
import { useEffect, useRef, useState, useCallback } from "react";
import io, { Socket } from "socket.io-client";

interface SocketIOMessage {
  type: string;
  podId?: string;
  userId?: string;
  inviteCode?: string;
  sentBy?: string;
  newMember?: any;
  item?: any;
  itemId?: string;
  timestamp?: string;
  [key: string]: any;
}

interface UseSocketIOProps {
  podId: string;
  userId: string;
  onMessage?: (message: SocketIOMessage) => void;
  onConnect?: () => void;
  onDisconnect?: () => void;
}

export function useSocketIO({
  podId,
  userId,
  onMessage,
  onConnect,
  onDisconnect,
}: UseSocketIOProps) {
  const [isConnected, setIsConnected] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const socketRef = useRef<Socket | null>(null);
  const isConnectingRef = useRef(false);

  // Use refs to store callbacks to prevent unnecessary reconnections
  const onMessageRef = useRef(onMessage);
  const onConnectRef = useRef(onConnect);
  const onDisconnectRef = useRef(onDisconnect);

  // Update refs when callbacks change
  useEffect(() => {
    onMessageRef.current = onMessage;
  }, [onMessage]);

  useEffect(() => {
    onConnectRef.current = onConnect;
  }, [onConnect]);

  useEffect(() => {
    onDisconnectRef.current = onDisconnect;
  }, [onDisconnect]);

  const connect = useCallback(() => {
    // Ensure we're on the client side
    if (typeof window === "undefined") {
      return;
    }

    if (socketRef.current?.connected || isConnectingRef.current) {
      return;
    }

    if (!podId || !userId) {
      console.log("Socket.IO: Waiting for podId and userId");
      return;
    }

    isConnectingRef.current = true;

    try {
      console.log("Socket.IO: Connecting via Next.js API route");

      const socket = io("https://socketpod.onrender.com", {
        autoConnect: false,
        reconnection: true,
        reconnectionDelay: 3000,
        reconnectionAttempts: 5,
        forceNew: true, // Prevent connection reuse in development
      });

      socketRef.current = socket;

      socket.on("connect", () => {
        console.log("Socket.IO connected");
        setIsConnected(true);
        setConnectionError(null);
        isConnectingRef.current = false;

        // Join the pod room
        socket.emit("join-pod", { podId, userId });

        onConnectRef.current?.();
      });

      socket.on(
        "pod-joined",
        ({
          podId: joinedPodId = "unknown",
          userId: joinedUserId = "unknown",
        }) => {
          console.log(
            `Successfully joined pod: ${joinedPodId}-${joinedUserId}`
          );
        }
      );

      socket.on("message", (message: SocketIOMessage) => {
        console.log("Socket.IO message received:", message);
        onMessageRef.current?.(message);
      });

      socket.on("disconnect", (reason: string) => {
        console.log("Socket.IO disconnected:", reason);
        setIsConnected(false);
        isConnectingRef.current = false;
        onDisconnectRef.current?.();
      });

      socket.on("connect_error", (error: Error) => {
        console.error("Socket.IO connection error:", error);
        setConnectionError("Connection failed");
        isConnectingRef.current = false;
      });

      socket.on("error", (error: Error) => {
        console.error("Socket.IO error:", error);
        setConnectionError(error.message || "An error occurred");
      });

      // Connect the socket
      socket.connect();
    } catch (error) {
      console.error("Failed to create Socket.IO connection:", error);
      setConnectionError("Failed to connect");
      isConnectingRef.current = false;
    }
  }, [podId, userId]);

  const disconnect = useCallback(() => {
    if (socketRef.current) {
      socketRef.current.disconnect();
      socketRef.current = null;
    }

    setIsConnected(false);
    isConnectingRef.current = false;
  }, []);

  const sendMessage = useCallback((message: SocketIOMessage) => {
    if (socketRef.current?.connected) {
      console.log("Socket.IO: Sending message:", message);
      socketRef.current.emit("message", message);
    } else {
      console.warn("Socket.IO is not connected");
    }
  }, []);

  // Only connect when podId and userId are available and on client side
  useEffect(() => {
    if (typeof window !== "undefined" && podId && userId) {
      connect();
    }

    return () => {
      disconnect();
    };
  }, [podId, userId, connect, disconnect]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      disconnect();
    };
  }, [disconnect]);

  return {
    isConnected,
    connectionError,
    sendMessage,
    connect,
    disconnect,
  };
}