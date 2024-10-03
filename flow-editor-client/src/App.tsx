import { DragEvent, useCallback, useEffect } from "react";
import {
  ReactFlow,
  Node,
  ReactFlowProvider,
  Controls,
  useReactFlow,
  NodeMouseHandler,
  OnConnect,
  addEdge,
} from "@xyflow/react";
import Sidebar from "./components/Sidebar";
import useCursorStateSynced from "./hooks/useCursorStateSynced";
import useNodesStateSynced from "./hooks/useNodesStateSynced";
import useEdgesStateSynced from "./hooks/useEdgesStateSynced";
import "@xyflow/react/dist/style.css";
import Cursors from "./components/Cursors";
import useWebSocket from "./hooks/useWebsocket"; // Import your useWebSocket hook

const proOptions = {
  account: "paid-pro",
  hideAttribution: true,
};

const onDragOver = (event: DragEvent) => {
  event.preventDefault();
  event.dataTransfer.dropEffect = "move";
  console.log("Drag over event:", event); // Log drag event
};


function ReactFlowPro() {
  const [nodes, setNodes, onNodesChange] = useNodesStateSynced();
  const [edges, setEdges, onEdgesChange] = useEdgesStateSynced();
  const [cursors, onMouseMove] = useCursorStateSynced();
  const { screenToFlowPosition } = useReactFlow();

  // Use the WebSocket hook to communicate with the back end
  const { isConnected, sendMessage, connectionStatus } = useWebSocket("ws://localhost:8787");

  // Log connection state
  useEffect(() => {
    console.log("WebSocket connected:", isConnected);
    console.log("Connection status:", connectionStatus);
  }, [isConnected, connectionStatus]);

  // Request the initial state when connected to WebSocket
  useEffect(() => {
    if (isConnected) {
      console.log("Requesting initial state from backend");
      sendMessage({ type: "getState" }); // Request the initial state from the server
    }
  }, [isConnected, sendMessage]);

  const onConnect: OnConnect = useCallback(
    (params) => {
      console.log("Edges connected:", params);
      setEdges((prev) => addEdge(params, prev));

      // Send the updated edges to the backend
      sendMessage({ type: "updateEdges", edges: [...edges, params] });
    },
    [setEdges, sendMessage, edges]
  );

  const onDrop = (event: DragEvent) => {
    event.preventDefault();
    const type = event.dataTransfer.getData("application/reactflow");
    const position = screenToFlowPosition({
      x: event.clientX - 80,
      y: event.clientY - 20,
    });
    const newNode: Node = {
      id: `${Date.now()}`,
      type,
      position,
      data: { label: `${type}` },
    };

    console.log("Node dropped:", newNode);
    setNodes((prev) => [...prev, newNode]);

    // Send the new node to the server
    console.log("Sending new node to backend");
    sendMessage({ type: "updateNodes", nodes: [...nodes, newNode] });
  };

  const onNodeClick: NodeMouseHandler = useCallback(
    (_, clicked) => {
      console.log("Node clicked:", clicked);
      setNodes((prev) =>
        prev.map((node) =>
          node.id === clicked.id ? { ...node, className: "blink" } : node
        )
      );
      window.setTimeout(() => {
        setNodes((prev) =>
          prev.map((node) =>
            node.id === clicked.id ? { ...node, className: undefined } : node
          )
        );
      }, 3000);
    },
    [setNodes]
  );

  return (
    <div className="wrapper">
      <Sidebar />
      <div className="react-flow-wrapper">
        {/* Display connection status */}
        <div className="connection-status">
          Connection Status: {connectionStatus}
        </div>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onEdgesChange={onEdgesChange}
          onNodesChange={onNodesChange}
          onNodeClick={onNodeClick}
          onConnect={onConnect}
          onDrop={onDrop}
          onDragOver={onDragOver}
          onPointerMove={onMouseMove}
          proOptions={proOptions}
        >
          <Cursors cursors={cursors} />
          <Controls />
        </ReactFlow>
      </div>
    </div>
  );
}

export default function Flow() {
  return (
    <ReactFlowProvider>
      <ReactFlowPro />
    </ReactFlowProvider>
  );
}
