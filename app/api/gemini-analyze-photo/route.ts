//@ts-nocheck
import { NextRequest, NextResponse } from 'next/server';

const GEMINI_API_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent";

export async function POST(req: NextRequest) {
  try {
    const { imageBase64 } = await req.json();
    if (!imageBase64) {
      return NextResponse.json({ error: 'No image provided.' }, { status: 400 });
    }

    // Prepare Gemini API request
    const geminiReq = {
      contents: [
        {
          parts: [
            {
              text: "Analyze this photo and list the shopping products you see or infer. Return only a comma-separated list of product names, no explanations."
            },
            {
              inlineData: {
                mimeType: "image/jpeg",
                data: imageBase64.replace(/^data:image\/\w+;base64,/, "")
              }
            }
          ]
        }
      ]
    };

    const geminiRes = await fetch(`${GEMINI_API_URL}?key=${process.env.GEMINI_API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(geminiReq)
    });

    const geminiData = await geminiRes.json();
    // Parse Gemini's response for product names
    let products: string[] = [];
    const text = geminiData?.candidates?.[0]?.content?.parts?.[0]?.text || '';
    if (text) {
      // Split by comma or new line, trim, and filter empty
      products = text.split(/,|\n/).map((s: string) => s.trim()).filter(Boolean);
    }

    return NextResponse.json({ products });
  } catch (error) {
    console.error('Gemini analyze error:', error);
    return NextResponse.json({ error: 'Failed to analyze photo.' }, { status: 500 });
  }
} 