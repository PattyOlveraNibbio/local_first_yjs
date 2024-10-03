import { useCallback, useEffect, useState } from 'react';
import { type Edge, type OnEdgesChange, applyEdgeChanges } from '@xyflow/react';
import ydoc, { indexeddbProvider } from '../ydoc';
import useWebSocket from './useWebsocket';

export const edgesMap = ydoc.getMap<Edge>('edges');

function useEdgesStateSynced(): [
  Edge[],
  React.Dispatch<React.SetStateAction<Edge[]>>,
  OnEdgesChange
] {
  const [edges, setEdges] = useState<Edge[]>([]);
  const { sendMessage, messages } = useWebSocket('ws://localhost:8787'); // WebSocket URL

  // Sync edges with Yjs and WebSocket
  const setEdgesSynced = useCallback(
    (edgesOrUpdater: React.SetStateAction<Edge[]>) => {
      const next =
        typeof edgesOrUpdater === 'function'
          ? edgesOrUpdater([...edgesMap.values()])
          : edgesOrUpdater;

      console.log('Syncing edges:', next); // Log the edges being synced

      const seen = new Set<string>();
      for (const edge of next) {
        seen.add(edge.id);
        edgesMap.set(edge.id, edge);
      }

      // Log edges before deleting unseen edges
      console.log('Edges before unseen deletions:', Array.from(edgesMap.values()));

      for (const edge of edgesMap.values()) {
        if (!seen.has(edge.id)) {
          console.log('Deleting unseen edge:', edge); // Log the edge being deleted
          edgesMap.delete(edge.id);
        }
      }

      // Log final edges after deletions and updates
      console.log('Edges after syncing and deletions:', Array.from(edgesMap.values()));

      // Send the updated edges to the backend via WebSocket
      console.log('Sending updated edges to backend:', Array.from(edgesMap.values()));
      sendMessage({ type: 'updateEdges', edges: Array.from(edgesMap.values()) });
    },
    [sendMessage]
  );

  // Handle edge changes from the UI
  const onEdgesChange: OnEdgesChange = useCallback((changes) => {
    const edges = Array.from(edgesMap.values());
    const nextEdges = applyEdgeChanges(changes, edges);

    console.log('Edges changed:', changes); // Log edge changes

    for (const change of changes) {
      if (change.type === 'add' || change.type === 'replace') {
        console.log('Adding or replacing edge:', change.item);
        edgesMap.set(change.item.id, change.item);
      } else if (change.type === 'remove' && edgesMap.has(change.id)) {
        console.log('Removing edge:', change.id);
        edgesMap.delete(change.id);
      } else {
        console.log('Modifying edge:', change.id);
        edgesMap.set(change.id, nextEdges.find((n) => n.id === change.id)!);
      }
    }

    // Log final edges after UI change
    console.log('Final edges after UI change:', Array.from(edgesMap.values()));

    // Send the updated edges to the backend via WebSocket
    sendMessage({ type: 'updateEdges', edges: Array.from(edgesMap.values()) });
  }, [sendMessage]);

  useEffect(() => {
    const observer = () => {
      console.log('Observing edge changes:', Array.from(edgesMap.values())); // Log edge changes during observation
      setEdges(Array.from(edgesMap.values()));
    };

    // Sync with IndexedDB
    indexeddbProvider.on('synced', () => {
      console.log('Edge data synced with IndexedDB');
      setEdges(Array.from(edgesMap.values()));
    });

    edgesMap.observe(observer);

    // Sync with IndexedDB when ready
    indexeddbProvider.whenSynced.then(() => {
      console.log('IndexedDB is now synced, setting edges');
      setEdges(Array.from(edgesMap.values()));
    });

    return () => {
      console.log('Removing edge observer');
      edgesMap.unobserve(observer);
    };
  }, []);

  // Listen for WebSocket messages and update edges accordingly
  useEffect(() => {
    messages.forEach((message) => {
      console.log('Received WebSocket message:', message); // Log incoming WebSocket messages
      try {
        const parsedMessage = JSON.parse(message);
        if (parsedMessage.type === 'updateEdges') {
          console.log('Updating edges from WebSocket message:', parsedMessage.edges);
          setEdges(parsedMessage.edges);
        }
      } catch (error) {
        console.error('Error parsing WebSocket message:', error);
      }
    });
  }, [messages]);

  return [edges, setEdgesSynced, onEdgesChange];
}

export default useEdgesStateSynced;