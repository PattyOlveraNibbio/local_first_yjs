import { DurableObject } from "cloudflare:workers";

export class CollaborativeFlow extends DurableObject {
  private storage: DurableObjectStorage;
  private sessions: Map<WebSocket, { id?: string }>;

  constructor(ctx, env) {
    super(ctx, env);

    // Persistent storage API provided by the DurableObject framework
    this.storage = ctx.storage;

    // Track WebSocket sessions
    this.sessions = new Map();

    // Restore previous WebSocket sessions after hibernation
    this.ctx.getWebSockets().forEach((ws) => {
      this.sessions.set(ws, { ...ws.deserializeAttachment() });
      console.log('Restored session:', ws);
    });
  }

  async resetState() {
    console.log("Resetting state...");
    await this.storage.deleteAll(); // This will delete everything stored in the Durable Object
    this.sessions.forEach((session, ws) => {
      if (ws.readyState === WebSocket.OPEN) {
        console.log("Closing session:", session);
        ws.close(); // Close all active WebSocket sessions
      }
    });
    this.sessions.clear(); // Clear WebSocket sessions
    console.log("State has been reset.");
  }

  // Handle WebSocket requests
  async fetch(request) {
    console.log("WebSocket fetch request received");
    const pair = new WebSocketPair();
    const [client, server] = Object.values(pair);

    // Accept the server-side WebSocket
    this.ctx.acceptWebSocket(server);
    console.log("WebSocket connection accepted");

    // Store the new WebSocket session
    this.sessions.set(server, {});

    // Return WebSocket to the client
    return new Response(null, { status: 101, webSocket: client });
  }

  async sendCurrentState(ws) {
    console.log("Sending current state...");
    try {
      const nodes = await this.getNodes();
      const edges = await this.getEdges();
      console.log("Current state - Nodes:", nodes, "Edges:", edges);
      ws.send(JSON.stringify({ type: "state", nodes, edges }));
    } catch (error) {
      console.error("Failed to send current state:", error);
      ws.send(JSON.stringify({ error: "Failed to retrieve state" }));
    }
  }

  // Handle incoming WebSocket messages
  webSocketMessage(ws, msg) {
    const session = this.sessions.get(ws);
    console.log('Received message from session:', session);

    if (!session.id) {
      session.id = crypto.randomUUID();
      ws.serializeAttachment({ id: session.id });
      console.log("Assigned new session ID:", session.id);
      ws.send(JSON.stringify({ ready: true, id: session.id }));
    }

    try {
      // Check if the message is a string or ArrayBuffer
      if (typeof msg === 'string') {
        console.log("Received string message:", msg);
        const message = JSON.parse(msg);  // Parse the JSON string

        switch (message.type) {
          case 'updateNodes':
            console.log("Updating nodes:", message.nodes);
            this.updateNodes(message.nodes);
            break;
          case 'updateEdges':
            console.log("Updating edges:", message.edges);
            this.updateEdges(message.edges);
            break;
          case 'getState':
            this.sendCurrentState(ws);
            break;
          case 'resetState': // New case to handle state reset
            console.log("Resetting state on request");
            this.resetState();
            ws.send(JSON.stringify({ message: 'State has been reset' }));
            break;
          default:
            console.error('Unknown message type:', message.type);
        }
      } else if (msg instanceof ArrayBuffer) {
        console.error('Received ArrayBuffer, expected JSON');
        // Optionally, handle ArrayBuffer here if needed.
      } else {
        console.error('Unknown message format:', msg);
      }
    } catch (error) {
      console.error('Failed to process message:', error);
    }
  }

  broadcast(sender, msg) {
    const id = this.sessions.get(sender)?.id;
    console.log("Broadcasting message from session ID:", id);

    try {
      // Check if msg is already a string, parse it if necessary
      let parsedMessage = typeof msg === "string" ? JSON.parse(msg) : msg;

      // Add the sender's id to the message
      parsedMessage = { ...parsedMessage, id };

      for (const [ws] of this.sessions) {
        if (ws !== sender && ws.readyState === WebSocket.OPEN) {
          // Send the message as a serialized JSON string
          console.log("Sending message to another session:", parsedMessage);
          ws.send(JSON.stringify(parsedMessage));
        }
      }
    } catch (error) {
      console.error("Error in broadcast:", error);
    }
  }

  // Handle WebSocket close event
  webSocketClose(ws) {
    console.log("WebSocket connection closed");
    this.close(ws);
  }

  // Handle WebSocket error event
  webSocketError(ws) {
    console.error("WebSocket error occurred");
    this.close(ws);
  }

  // Clean up a closed WebSocket connection
  close(ws) {
    const session = this.sessions.get(ws);
    if (!session?.id) return;

    console.log("Closing session:", session);

    // Notify other clients that this session has left
    this.broadcast(ws, { type: "left", id: session.id });

    // Remove the session from the active sessions
    this.sessions.delete(ws);
  }

  // Update nodes in the persistent storage
  async updateNodes(nodes) {
    console.log("Updating nodes in storage:", nodes);
    await this.storage.put("nodes", nodes);
  }

  // Update edges in the persistent storage
  async updateEdges(edges) {
    console.log("Updating edges in storage:", edges);
    await this.storage.put("edges", edges);
  }

  // Retrieve nodes from the persistent storage
  async getNodes() {
    const nodes = await this.storage.get("nodes") || [];
    console.log("Retrieved nodes from storage:", nodes);
    return nodes;
  }

  // Retrieve edges from the persistent storage
  async getEdges() {
    const edges = await this.storage.get("edges") || [];
    console.log("Retrieved edges from storage:", edges);
    return edges;
  }
}
