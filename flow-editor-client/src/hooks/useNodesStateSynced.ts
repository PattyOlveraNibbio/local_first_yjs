import { useCallback, useEffect, useState } from 'react';
import { type Node, type OnNodesChange, applyNodeChanges, getConnectedEdges } from '@xyflow/react';
import ydoc, { indexeddbProvider } from '../ydoc';
import useWebSocket from './useWebsocket';
import { edgesMap } from './useEdgesStateSynced';

export const nodesMap = ydoc.getMap<Node>('nodes');

function useNodesStateSynced(): [
  Node[],
  React.Dispatch<React.SetStateAction<Node[]>>,
  OnNodesChange
] {
  const [nodes, setNodes] = useState<Node[]>([]);
  const { sendMessage, messages } = useWebSocket('ws://localhost:8787'); // WebSocket URL

  // Sync nodes with Yjs and WebSocket
  const setNodesSynced = useCallback(
    (nodesOrUpdater: React.SetStateAction<Node[]>) => {
      const next =
        typeof nodesOrUpdater === 'function'
          ? nodesOrUpdater([...nodesMap.values()])
          : nodesOrUpdater;

      console.log('Syncing nodes:', next); // Log the nodes being synced

      const seen = new Set<string>();
      for (const node of next) {
        seen.add(node.id);
        nodesMap.set(node.id, node);
      }

      // Log nodes before deleting unseen nodes
      console.log('Nodes before unseen deletions:', Array.from(nodesMap.values()));

      for (const node of nodesMap.values()) {
        if (!seen.has(node.id)) {
          console.log('Deleting unseen node:', node);
          nodesMap.delete(node.id);
        }
      }

      // Log final nodes after deletion
      console.log('Nodes after syncing and deletions:', Array.from(nodesMap.values()));

      // Send updated nodes to back end via WebSocket
      console.log('Sending updated nodes to backend:', Array.from(nodesMap.values()));
      sendMessage({ type: 'updateNodes', nodes: Array.from(nodesMap.values()) });
    },
    [sendMessage]
  );

  // Handle node changes from the UI
  const onNodesChange: OnNodesChange = useCallback((changes) => {
    const nodes = Array.from(nodesMap.values());
    const nextNodes = applyNodeChanges(changes, nodes);

    console.log('Nodes changed:', changes); // Log the node changes

    for (const change of changes) {
      if (change.type === 'add' || change.type === 'replace') {
        console.log('Adding or replacing node:', change.item);
        nodesMap.set(change.item.id, change.item);
      } else if (change.type === 'remove' && nodesMap.has(change.id)) {
        const deletedNode = nodesMap.get(change.id)!;
        const connectedEdges = getConnectedEdges(
          [deletedNode],
          Array.from(edgesMap.values())
        );
        console.log('Deleting connected edges:', connectedEdges);
        nodesMap.delete(change.id);
        for (const edge of connectedEdges) {
          console.log('Deleting edge connected to node:', edge);
          edgesMap.delete(edge.id);
        }
      } else {
        console.log('Modifying node:', change.id);
        nodesMap.set(change.id, nextNodes.find((n) => n.id === change.id)!);
      }
    }

    // Log final nodes after UI change
    console.log('Final nodes after UI change:', Array.from(nodesMap.values()));

    // Send the updated nodes to the backend
    sendMessage({ type: 'updateNodes', nodes: Array.from(nodesMap.values()) });
  }, [sendMessage]);

  useEffect(() => {
    const observer = () => {
      console.log('Observing node changes:', Array.from(nodesMap.values()));
      setNodes(Array.from(nodesMap.values()));
    };

    // Sync with IndexedDB
    indexeddbProvider.on('synced', () => {
      console.log('Node data synced with IndexedDB');
      setNodes(Array.from(nodesMap.values()));
    });

    nodesMap.observe(observer);

    // Sync with IndexedDB when ready
    indexeddbProvider.whenSynced.then(() => {
      console.log('IndexedDB is now synced, setting nodes');
      setNodes(Array.from(nodesMap.values()));
    });

    return () => {
      console.log('Removing node observer');
      nodesMap.unobserve(observer);
    };
  }, []);

  // Listen for WebSocket messages and update nodes accordingly
  useEffect(() => {
    messages.forEach((message) => {
      console.log('Received WebSocket message:', message); // Log incoming WebSocket messages
      try {
        const parsedMessage = JSON.parse(message);
        if (parsedMessage.type === 'updateNodes') {
          console.log('Updating nodes from WebSocket message:', parsedMessage.nodes);
          setNodes(parsedMessage.nodes);
        }
      } catch (error) {
        console.error('Error parsing WebSocket message:', error);
      }
    });
  }, [messages]);

  return [nodes, setNodesSynced, onNodesChange];
}

export default useNodesStateSynced;
