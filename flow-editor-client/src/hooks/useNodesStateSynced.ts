import { useCallback, useEffect, useState } from 'react';
import { type Node, type OnNodesChange, applyNodeChanges, getConnectedEdges } from '@xyflow/react';
import ydoc, { indexeddbProvider, webrtcProvider } from '../ydoc';
import { edgesMap } from './useEdgesStateSynced';


export const nodesMap = ydoc.getMap<Node>('nodes');

function useNodesStateSynced(): [
  Node[],
  React.Dispatch<React.SetStateAction<Node[]>>,
  OnNodesChange
] {
  const [nodes, setNodes] = useState<Node[]>([]);

  const setNodesSynced = useCallback(
    (nodesOrUpdater: React.SetStateAction<Node[]>) => {
      const next =
        typeof nodesOrUpdater === 'function'
          ? nodesOrUpdater([...nodesMap.values()])
          : nodesOrUpdater;
      const seen = new Set<string>();
      for (const node of next) {
        seen.add(node.id);
        nodesMap.set(node.id, node);
      }
      for (const node of nodesMap.values()) {
        if (!seen.has(node.id)) {
          nodesMap.delete(node.id);
        }
      }
    },
    []
  );

  const onNodesChange: OnNodesChange = useCallback((changes) => {
    const nodes = Array.from(nodesMap.values());
    const nextNodes = applyNodeChanges(changes, nodes);
    for (const change of changes) {
      if (change.type === 'add' || change.type === 'replace') {
        nodesMap.set(change.item.id, change.item);
      } else if (change.type === 'remove' && nodesMap.has(change.id)) {
        const deletedNode = nodesMap.get(change.id)!;
        const connectedEdges = getConnectedEdges(
          [deletedNode],
          Array.from(edgesMap.values())
        );
        nodesMap.delete(change.id);
        for (const edge of connectedEdges) {
          edgesMap.delete(edge.id);
        }
      } else {
        nodesMap.set(change.id, nextNodes.find((n) => n.id === change.id)!);
      }
    }
  }, []);

  useEffect(() => {
    const observer = () => {
      setNodes(Array.from(nodesMap.values()));
    };

    indexeddbProvider.on('synced', () => {
      console.log('Node data synced with indexeddb');
      setNodes(Array.from(nodesMap.values()));
    });

    webrtcProvider.on('synced', () => {
      console.log('Node data synced with webrtc');
      setNodes(Array.from(nodesMap.values()));
    });

    nodesMap.observe(observer);

    Promise.all([
      indexeddbProvider.whenSynced,
      new Promise<void>(resolve => {
        webrtcProvider.on('synced', () => {
            resolve();
        });
      })
    ]).then(() => {
      setNodes(Array.from(nodesMap.values()));
    });

    return () => {
      nodesMap.unobserve(observer);
    };
  }, []);

  return [nodes, setNodesSynced, onNodesChange];
}

export default useNodesStateSynced;