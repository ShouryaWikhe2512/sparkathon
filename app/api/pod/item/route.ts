//@ts-nocheck

import { NextRequest, NextResponse } from "next/server";
import { PodService } from "../../../lib/podService";

export async function POST(request: NextRequest) {
  try {
    const { podId, productId, name, price, quantity, addedById } = await request.json();

    if (!podId || !productId || !name || !price || !addedById) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    const item = await PodService.addItemToPod({
      podId,
      productId,
      name,
      price,
      quantity,
      addedById,
    });

    return NextResponse.json({
      success: true,
      item: {
        id: item.id,
        productId: item.productId,
        name: item.name,
        price: item.price,
        quantity: item.quantity,
        addedBy: item.addedBy,
        addedAt: item.addedAt,
      },
    });
  } catch (error) {
    console.error("Error adding item to pod:", error);
    return NextResponse.json(
      { error: "Failed to add item to pod" },
      { status: 500 }
    );
  }
} 