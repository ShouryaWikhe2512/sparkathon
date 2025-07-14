//@ts-nocheck

import { NextRequest, NextResponse } from 'next/server';
import prisma from '../../../../lib/prisma';

export async function DELETE(req: NextRequest, { params }: { params: { podId: string } }) {
  const { podId } = params;
  try {
    // Delete all items in the pod first
    await prisma.podItem.deleteMany({ where: { podId } });
    // Delete the pod
    await prisma.shoppingPod.delete({ where: { id: podId } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to delete pod:', error);
    return NextResponse.json({ success: false, error: 'Failed to delete pod.' }, { status: 500 });
  }
} 