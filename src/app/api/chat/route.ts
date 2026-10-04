import { NextRequest } from "next/server";
import { streamText } from "ai";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { createOpenAI } from "@ai-sdk/openai";
import { getAppSettings } from "@/lib/settings";
import {
  generateKhakiLocalResponse,
  extractBookingInfo,
  buildKhakiSystemPrompt,
} from "@/lib/khakiEngine";
import { BookingDetails } from "@/types/chat";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { messages = [], userName, bookingState = {} } = body;

    const lastMessage = messages[messages.length - 1];
    const userPrompt = lastMessage?.content || "";

    // Extract current session booking details
    const updatedBooking: BookingDetails = extractBookingInfo(messages, bookingState);
    if (userName && !updatedBooking.name) {
      updatedBooking.name = userName;
    }

    const settings = getAppSettings();
    const provider = settings.activeProvider;

    const systemPrompt = buildKhakiSystemPrompt(userName);

    // 1. Try Gemini if configured or auto
    const shouldUseGemini =
      (provider === "gemini" || provider === "auto") && Boolean(settings.geminiApiKey);

    if (shouldUseGemini) {
      try {
        const google = createGoogleGenerativeAI({ apiKey: settings.geminiApiKey });
        const modelName = settings.geminiModel || "gemini-2.5-flash";

        const result = streamText({
          model: google(modelName),
          system: systemPrompt,
          messages: messages.map((m: any) => ({
            role: m.role === "assistant" ? "assistant" : "user",
            content: m.content,
          })),
          temperature: 0.7,
        });

        const streamResponse = result.toTextStreamResponse({
          headers: {
            "Content-Type": "text/plain; charset=utf-8",
            "X-Khaki-Booking": encodeURIComponent(JSON.stringify(updatedBooking)),
          },
        });

        return streamResponse;
      } catch (geminiError) {
        console.error("Gemini AI SDK error, falling back to local engine:", geminiError);
      }
    }

    // 2. Try OpenAI if configured
    const shouldUseOpenAI =
      (provider === "openai" || provider === "auto") && Boolean(settings.openaiApiKey);

    if (shouldUseOpenAI) {
      try {
        const openai = createOpenAI({ apiKey: settings.openaiApiKey });
        const modelName = settings.openaiModel || "gpt-4o-mini";

        const result = streamText({
          model: openai(modelName),
          system: systemPrompt,
          messages: messages.map((m: any) => ({
            role: m.role === "assistant" ? "assistant" : "user",
            content: m.content,
          })),
          temperature: 0.7,
        });

        return result.toTextStreamResponse({
          headers: {
            "Content-Type": "text/plain; charset=utf-8",
            "X-Khaki-Booking": encodeURIComponent(JSON.stringify(updatedBooking)),
          },
        });
      } catch (openaiError) {
        console.error("OpenAI AI SDK error, falling back to local engine:", openaiError);
      }
    }

    // 3. Fallback: High-fidelity built-in Khaki knowledge engine
    const localResult = generateKhakiLocalResponse(userPrompt, messages, userName);
    Object.assign(updatedBooking, localResult.booking);

    const encoder = new TextEncoder();
    const words = localResult.responseText.split(" ");

    const stream = new ReadableStream({
      async start(controller) {
        for (let i = 0; i < words.length; i++) {
          const chunk = (i === 0 ? "" : " ") + words[i];
          controller.enqueue(encoder.encode(chunk));
          if (words.length > 8) {
            await new Promise((r) => setTimeout(r, 14));
          }
        }
        controller.close();
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Transfer-Encoding": "chunked",
        "X-Khaki-Booking": encodeURIComponent(JSON.stringify(updatedBooking)),
      },
    });
  } catch (error: any) {
    console.error("Chat API route failure:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
