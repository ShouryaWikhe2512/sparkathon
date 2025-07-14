//@ts-nocheck

import { NextRequest, NextResponse } from "next/server";
import { PodService } from "../../../lib/podService";
import prisma from "../../../../lib/prisma";

export async function POST(request: NextRequest) {
  try {
    const { name, ownerId, ownerName, ownerAvatar, ownerEmail } = await request.json();

    if (!name || !ownerId || !ownerName) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Upsert the user (create if not exists) - use Clerk ID as clerkId
    const user = await prisma.user.upsert({
      where: { clerkId: ownerId },
      update: {
        name: ownerName,
        avatar: ownerAvatar,
        email: ownerEmail || `${ownerId}@example.com`,
      },
      create: {
        clerkId: ownerId,
        email: ownerEmail || `${ownerId}@example.com`,
        name: ownerName,
        avatar: ownerAvatar,
      },
    });

    const pod = await PodService.createPod({
      name,
      ownerId: user.id, // Use the database user ID, not Clerk ID
      ownerName,
      ownerAvatar,
    });

    // Get all unique user IDs from items to fetch user details
    const allUserIds = new Set<string>();
    pod.items.forEach((item: any) => {
      allUserIds.add(item.addedById);
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

    return NextResponse.json({
      success: true,
      pod: {
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
      },
    });
  } catch (error) {
    console.error("Error creating pod:", error);
    return NextResponse.json(
      { error: "Failed to create pod" },
      { status: 500 }
    );
  }
} 