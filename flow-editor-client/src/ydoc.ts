
import { Doc } from 'yjs'
import { WebrtcProvider } from 'y-webrtc'
import { IndexeddbPersistence } from 'y-indexeddb';


const ydoc = new Doc();

export const webrtcProvider = new WebrtcProvider('REACTFLOW-COLLAB-EXAMPLE', ydoc);


export const indexeddbProvider = new IndexeddbPersistence('REACTFLOW-COLLAB-EXAMPLE', ydoc);


export default ydoc;


