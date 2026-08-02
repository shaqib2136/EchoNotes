Deno.serve((req: Request) => {
  if (req.headers.get("upgrade") !== "websocket") {
    return new Response("Expected a websocket connection", { status: 400 });
  }
  const apiKey = Deno.env.get('ASSEMBLYAI_API_KEY');
  if (!apiKey) {
    console.error("Missing ASSEMBLYAI_API_KEY");
    return new Response("Missing API key", { status: 500 });
  }
  const url = new URL(req.url);
  const lang = url.searchParams.get('lang') || 'en';
  const { socket: clientSocket, response } = Deno.upgradeWebSocket(req);
  let aaiSocket: WebSocket | null = null;
  clientSocket.onopen = async () => {
    try {
      const tokenRes = await fetch('https://api.assemblyai.com/v2/realtime/token', {
        method: 'POST',
        headers: {
          'Authorization': apiKey,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ expires_in: 3600 })
      });
      
      if (!tokenRes.ok) throw new Error("Failed to get AssemblyAI token");
      
      const { token } = await tokenRes.json();
      
      const aaiUrl = `wss://api.assemblyai.com/v2/realtime/ws?sample_rate=16000&token=${token}&language_code=${lang}`;
      aaiSocket = new WebSocket(aaiUrl);
      aaiSocket.onopen = () => console.log("Connected to AssemblyAI WS");
      
      aaiSocket.onmessage = (msg) => {
        if (clientSocket.readyState === WebSocket.OPEN) {
          clientSocket.send(msg.data);
        }
      };
      
      aaiSocket.onerror = (e) => {
        console.error("AssemblyAI WS error");
        clientSocket.close();
      };
      
      aaiSocket.onclose = () => {
        console.log("AssemblyAI WS closed");
        clientSocket.close();
      };
  
    } catch (err) {
      console.error("Proxy initialization error:", err);
      clientSocket.close();
    }
  };
  clientSocket.onmessage = (msg) => {
    if (aaiSocket && aaiSocket.readyState === WebSocket.OPEN) {
      aaiSocket.send(msg.data);
    }
  };
  clientSocket.onclose = () => {
    if (aaiSocket && aaiSocket.readyState === WebSocket.OPEN) {
      aaiSocket.send(JSON.stringify({ terminate_session: true }));
      aaiSocket.close();
    }
  };
  
  clientSocket.onerror = () => {
    if (aaiSocket && aaiSocket.readyState === WebSocket.OPEN) {
      aaiSocket.close();
    }
  };
  return response;
});