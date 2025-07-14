//@ts-nocheck

import { NextRequest, NextResponse } from "next/server";
import prisma from "../../../../lib/prisma";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const clerkId = searchParams.get("userId"); // This is actually the Clerk ID
    if (!clerkId) {
      return NextResponse.json({ error: "Missing userId" }, { status: 400 });
    }

    // Find the user by Clerk ID
    const user = await prisma.user.findUnique({
      where: { clerkId },
    });

    if (!user) {
      return NextResponse.json({ pods: [] });
    }

    // Find all pods where user is a member
    const pods = await prisma.shoppingPod.findMany({
      where: {
        members: {
          some: { userId: user.id }
        }
      },
      include: {
        members: { include: { user: true } },
        items: true
      }
    });

    // Get all unique user IDs from items to fetch user details
    const allUserIds = new Set<string>();
    pods.forEach(pod => {
      pod.items.forEach((item: any) => {
        allUserIds.add(item.addedById);
      });
    });

    // Fetch all users in one query
    const users = await prisma.user.findMany({
      where: {
        id: { in: Array.from(allUserIds) }
      },
      select: {
        id: true,
        name: true,
        avatar: true
      }
    });

    // Create a map for quick user lookup
    const userMap = new Map();
    users.forEach(user => {
      userMap.set(user.id, user);
    });

    // Format pods for frontend
    const formattedPods = pods.map((pod: any) => ({
      id: pod.id,
      name: pod.name,
      inviteCode: pod.inviteCode,
      members: pod.members.map((member: any) => ({
        id: member.user.id,
        name: member.user.name,
        avatar: member.user.avatar,
        isOwner: member.isOwner,
      })),
      items: pod.items.map((item: any) => {
        const addedByUser = userMap.get(item.addedById);
        return {
          id: item.id,
          productId: item.productId,
          name: item.name,
          price: item.price,
          quantity: item.quantity,
          addedBy: {
            id: item.addedById,
            name: addedByUser?.name || "Unknown",
            avatar: addedByUser?.avatar || "👤",
          },
          addedAt: new Date(item.addedAt), // Convert string to Date object
        };
      }),
      createdAt: new Date(pod.createdAt), // Convert string to Date object
      ownerId: pod.ownerId,
    }));

    return NextResponse.json({ pods: formattedPods });
  } catch (error) {
    console.error("Error fetching user pods:", error);
    return NextResponse.json({ error: "Failed to fetch pods" }, { status: 500 });
  }
} 