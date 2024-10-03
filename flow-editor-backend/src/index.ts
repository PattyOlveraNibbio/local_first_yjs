import { CollaborativeFlow } from './objects/collaborative-flow';

export { CollaborativeFlow };

export default {
    async fetch(request: Request, env: any, ctx: ExecutionContext): Promise<Response> {
        const upgradeHeader = request.headers.get('Upgrade');

        // Check if the request is a WebSocket upgrade request
        if (!upgradeHeader || upgradeHeader.toLowerCase() !== 'websocket') {
            return new Response('Expected WebSocket upgrade', { status: 426 });
        }

        try {
            // Extract the path from the URL to determine which Durable Object to use
            const url = new URL(request.url);
            const id = env.REACTFLOW_COLLAB_EXAMPLE.idFromName(url.pathname); // Use path for naming the instance
            const obj = env.REACTFLOW_COLLAB_EXAMPLE.get(id);

            // Forward the WebSocket request to the Durable Object
            return await obj.fetch(request);
        } catch (error) {
            console.error('Error in WebSocket handling:', error);
            return new Response('Internal Server Error', { status: 500 });
        }
    }
};
