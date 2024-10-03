// types.ts

import { type Node, type Edge } from "@xyflow/react";

export type WebSocketMessage =
  | { type: "state"; nodes: Node[]; edges: Edge[] }
  | { type: "updateNodes"; nodes: Node[] }
  | { type: "updateEdges"; edges: Edge[] }
  | { type: "left"; id: string }
  | { type: string; [key: string]: unknown };
