import { Doc } from 'yjs';
import { WebsocketProvider } from 'y-websocket';

const ydoc = new Doc();
export const provider = new WebsocketProvider('wss://your-cloudflare-worker-url.workers.dev', 'flow-editor-room', ydoc);

export default ydoc;