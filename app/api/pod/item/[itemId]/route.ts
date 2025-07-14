//@ts-nocheck

import { NextRequest, NextResponse } from "next/server";
import { PodService } from "../../../../lib/podService";

export async function PUT(
  request: NextRequest,
  { params }: { params: { itemId: string } }
) {
  try {
    const { quantity } = await request.json();
    const { itemId } = params;

    if (quantity === undefined || quantity < 0) {
      return NextResponse.json(
        { error: "Invalid quantity" },
        { status: 400 }
      );
    }

    const item = await PodService.updateItemQuantity(itemId, quantity);

    return NextResponse.json({
      success: true,
      item: item ? {
        id: item.id,
        productId: item.productId,
        name: item.name,
        price: item.price,
        quantity: item.quantity,
        addedById: item.addedById,
        addedAt: item.addedAt,
      } : null,
    });
  } catch (error) {
    console.error("Error updating item quantity:", error);
    return NextResponse.json(
      { error: "Failed to update item quantity" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { itemId: string } }
) {
  try {
    const { itemId } = params;

    await PodService.removeItemFromPod(itemId);

    return NextResponse.json({
      success: true,
    });
  } catch (error) {
    console.error("Error removing item from pod:", error);
    return NextResponse.json(
      { error: "Failed to remove item from pod" },
      { status: 500 }
    );
  }
} 