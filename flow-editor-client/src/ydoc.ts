import { Doc } from 'yjs'
// import { WebrtcProvider } from 'y-webrtc'
import { IndexeddbPersistence } from 'y-indexeddb';
import { WebsocketProvider } from 'y-websocket';

const ydoc = new Doc();

// export const webrtcProvider = new WebrtcProvider('REACTFLOW-COLLAB-EXAMPLE', ydoc);
export const indexeddbProvider = new IndexeddbPersistence('REACTFLOW-COLLAB-EXAMPLE', ydoc);
export const websocketProvider = new WebsocketProvider('ws://127.0.0.1:8787', 'REACTFLOW-COLLAB-EXAMPLE', ydoc);

export default ydoc;