//@ts-nocheck

import { NextRequest } from "next/server";

// WebSocket connections store
const connections = new Map<string, WebSocket>();

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const podId = searchParams.get("podId");
  const userId = searchParams.get("userId");

  if (!podId || !userId) {
    return new Response("Missing podId or userId", { status: 400 });
  }

  // For Next.js, we'll use a different approach since Deno.upgradeWebSocket is not available
  // This is a simplified version that would work with a proper WebSocket server
  return new Response("WebSocket endpoint - use a proper WebSocket server for production", {
    status: 200,
    headers: {
      "Content-Type": "text/plain",
    },
  });
}

// Helper function to send message to specific user
export function sendToUser(podId: string, userId: string, message: any) {
  const connectionId = `${podId}-${userId}`;
  const socket = connections.get(connectionId);
  
  if (socket && socket.readyState === WebSocket.OPEN) {
    socket.send(JSON.stringify(message));
  }
}

// Helper function to broadcast to all pod members
export function broadcastToPodMembers(podId: string, message: any) {
  const podConnections = Array.from(connections.entries())
    .filter(([connectionId]) => connectionId.startsWith(podId))
    .map(([, socket]) => socket);

  const messageStr = JSON.stringify(message);
  
  podConnections.forEach(socket => {
    if (socket.readyState === WebSocket.OPEN) {
      socket.send(messageStr);
    }
  });
} 