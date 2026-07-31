import { serve } from "https://deno.land/std@0.224.0/http/server.ts";

serve((req: Request): Response => {
  // Only allow WebSocket upgrade requests
  const upgrade = req.headers.get("upgrade");

  if (!upgrade || upgrade.toLowerCase() !== "websocket") {
    return new Response("Expected WebSocket request", {
      status: 400,
    });
  }

  // Ensure API key exists
  const apiKey = Deno.env.get("ASSEMBLYAI_API_KEY");

  if (!apiKey) {
    return new Response("ASSEMBLYAI_API_KEY is not configured.", {
      status: 500,
    });
  }

  // Upgrade the client connection
  const { socket: clientSocket, response } = Deno.upgradeWebSocket(req);

  let assemblySocket: WebSocket | null = null;

  clientSocket.onopen = async () => {
    try {
      // Request a temporary realtime token
      const tokenResponse = await fetch(
        "https://api.assemblyai.com/v2/realtime/token",
        {
          method: "POST",
          headers: {
            Authorization: apiKey,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            expires_in: 3600,
          }),
        },
      );

      if (!tokenResponse.ok) {
        const error = await tokenResponse.text();
        throw new Error(error);
      }

      const data = await tokenResponse.json() as { token: string };

      const token = data.token;

      // Connect to AssemblyAI
      assemblySocket = new WebSocket(
        `wss://api.assemblyai.com/v2/realtime/ws?sample_rate=16000&token=${token}`
      );

      assemblySocket.onopen = () => {
        console.log("Connected to AssemblyAI");
      };

      // Forward AssemblyAI messages to browser
      assemblySocket.onmessage = (event: MessageEvent) => {
        if (clientSocket.readyState === WebSocket.OPEN) {
          clientSocket.send(event.data);
        }
      };

      assemblySocket.onerror = (event) => {
        console.error("AssemblyAI WebSocket Error:", event);
      };

      assemblySocket.onclose = () => {
        console.log("AssemblyAI socket closed");

        if (clientSocket.readyState === WebSocket.OPEN) {
          clientSocket.close();
        }
      };
    } catch (err) {
      console.error("Failed to initialize AssemblyAI:", err);

      if (clientSocket.readyState === WebSocket.OPEN) {
        clientSocket.close(1011, "Internal Server Error");
      }
    }
  };

  // Forward microphone audio to AssemblyAI
  clientSocket.onmessage = (event: MessageEvent) => {
    if (
      assemblySocket &&
      assemblySocket.readyState === WebSocket.OPEN
    ) {
      assemblySocket.send(event.data);
    }
  };

  clientSocket.onerror = (event) => {
    console.error("Client WebSocket Error:", event);
  };

  clientSocket.onclose = () => {
    console.log("Client disconnected");

    if (
      assemblySocket &&
      assemblySocket.readyState === WebSocket.OPEN
    ) {
      assemblySocket.send(
        JSON.stringify({
          terminate_session: true,
        })
      );

      assemblySocket.close();
    }
  };

  return response;
});