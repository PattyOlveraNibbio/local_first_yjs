import { DurableObjectState } from "@cloudflare/workers-types";

export interface Env {
    COLLABORATIVE_FLOW: DurableObjectNamespace;
}

export class CollaborativeFlow {
    state: DurableObjectState;
    sessions: WebSocket[];

    constructor(state: DurableObjectState) {
        this.state = state;
        this.sessions = [];
    }

    async fetch(request: Request) {
        const upgradeHeader = request.headers.get('Upgrade');
        if( !upgradeHeader || upgradeHeader !== 'websocket' ) {
            return new Response('Expected Upgrade: websocket', { status: 426 });
        }
        const webSocketPair = new WebSocketPair();
        const [client, server] = Object.values(webSocketPair);

        server.accept();
        this.sessions.push(server);

        server.addEventListener('message', async (event) => {
            this.sessions.forEach((session)=> {
                if(session.readyState === WebSocket.OPEN) {
                    session.send(event.data);
                }
            });
        });

        server.addEventListener('close', () => {
            this.sessions = this.sessions.filter((session) => session !== server);
        });

        return new Response(null, {
            status: 101,
            webSocket: client
        });
    }
}

export default {
    async fetch(request: Request, env: Env) {
        const id = env.COLLABORATIVE_FLOW.idFromName('default');
        const flowObject = env.COLLABORATIVE_FLOW.get(id);
        return flowObject.fetch(request);
    }
};