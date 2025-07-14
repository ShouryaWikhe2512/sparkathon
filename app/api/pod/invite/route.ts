//@ts-nocheck

import { NextRequest, NextResponse } from "next/server";
import { PodService } from "../../../lib/podService";
import prisma from "../../../../lib/prisma";

export async function POST(request: NextRequest) {
  try {
    const { action, podId, inviteCode, userId, userName, userAvatar, userEmail } = await request.json();

    switch (action) {
      case "generate_invite":
        const pod = await PodService.getPodById(podId);
        if (!pod) {
          return NextResponse.json({ error: "Pod not found" }, { status: 404 });
        }

        return NextResponse.json({
          success: true,
          inviteCode: pod.inviteCode,
          inviteLink: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/pod/join/${pod.inviteCode}`
        });

      case "join_pod":
        try {
          // Upsert the user first (create if not exists)
          const user = await prisma.user.upsert({
            where: { clerkId: userId },
            update: {
              name: userName,
              avatar: userAvatar,
              email: userEmail || `${userId}@example.com`,
            },
            create: {
              clerkId: userId,
              email: userEmail || `${userId}@example.com`,
              name: userName,
              avatar: userAvatar,
            },
          });

          const joinedPod = await PodService.joinPod({
            inviteCode,
            userId: user.id, // Use database user ID
            userName,
            userAvatar
          });

          return NextResponse.json({
            success: true,
            pod: joinedPod
          });
        } catch (error: any) {
          return NextResponse.json({ error: error.message }, { status: 400 });
        }

      case "validate_invite":
        const validPod = await PodService.getPodByInviteCode(inviteCode);
        if (!validPod) {
          return NextResponse.json({ error: "Invalid invite code" }, { status: 404 });
        }

        return NextResponse.json({
          success: true,
          pod: {
            id: validPod.id,
            name: validPod.name,
            memberCount: validPod.members.length,
            inviteCode: validPod.inviteCode
          }
        });

      default:
        return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }
  } catch (error) {
    console.error("Pod invite API error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const inviteCode = searchParams.get("code");

    if (!inviteCode) {
      return NextResponse.json({ error: "Invite code required" }, { status: 400 });
    }

    const pod = await PodService.getPodByInviteCode(inviteCode);
    if (!pod) {
      return NextResponse.json({ error: "Invalid invite code" }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      pod: {
        id: pod.id,
        name: pod.name,
        memberCount: pod.members.length,
        inviteCode: pod.inviteCode
      }
    });
  } catch (error) {
    console.error("Pod invite validation error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
} 