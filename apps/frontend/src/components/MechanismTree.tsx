import { useCallback, useMemo, useEffect, useContext } from 'react'
import '@xyflow/react/dist/style.css'
import {
  ReactFlow,
  useNodesState,
  useEdgesState,
  addEdge,
  Connection,
  Edge,
  Position,
  Controls,
  Node as FlowNode,
  MarkerType,
} from '@xyflow/react'
import dagre from 'dagre'
import { ExtendedMechanismNode, MechanismNodeData } from '../types'
import CustomNode from './CustomNode'
import { ThemeContext } from './ThemeProvider'

interface MechanismTreeProps {
  data: ExtendedMechanismNode;
}

const nodeWidth = 260
const nodeHeight = 80

const nodeTypes = {
  custom: CustomNode,
}

const getLayoutedElements = (nodes: FlowNode<MechanismNodeData>[], edges: Edge[]) => {
  const dagreGraph = new dagre.graphlib.Graph()
  dagreGraph.setDefaultEdgeLabel(() => ({}))

  // INCREASED SPACING: nodesep (Horizontal) and ranksep (Vertical)
  dagreGraph.setGraph({ rankdir: 'TB', nodesep: 100, ranksep: 120 })

  nodes.forEach((node) => {
    dagreGraph.setNode(node.id, { width: nodeWidth, height: nodeHeight })
  })

  edges.forEach((edge) => {
    dagreGraph.setEdge(edge.source, edge.target)
  })

  dagre.layout(dagreGraph)

  nodes.forEach((node) => {
    const nodeWithPosition = dagreGraph.node(node.id)
    node.targetPosition = Position.Top
    node.sourcePosition = Position.Bottom

    node.position = {
      x: nodeWithPosition.x - nodeWidth / 2,
      y: nodeWithPosition.y - nodeHeight / 2,
    }
  })

  return { nodes, edges }
}

const flattenTree = (
  node: ExtendedMechanismNode,
  isDarkMode: boolean,
  parentId?: string,
  visited: Set<string> = new Set()
): { nodes: FlowNode<MechanismNodeData>[]; edges: Edge[] } => {
  const nodes: FlowNode<MechanismNodeData>[] = []
  const edges: Edge[] = []

  const isRoot = !parentId
  const isMechanism = !!(parentId && parentId === 'virtual-root')

  const edgeColor = isDarkMode ? '#818cf8' : '#6366f1'

  // 1. If we have already fully processed this node's children,
  // just return the edge connection to it.
  if (parentId) {
    edges.push({
      id: `${parentId}-${node.id}`,
      source: parentId,
      target: node.id,
      type: 'smoothstep',
      animated: true,
      style: { stroke: edgeColor, strokeWidth: 1.5 },
      markerEnd: { type: MarkerType.ArrowClosed, color: edgeColor },
    })
  }

  // 2. If this node has already been added to the nodes list, stop recursion
  if (visited.has(node.id)) {
    return { nodes: [], edges }
  }

  visited.add(node.id)

  const flowNode: FlowNode<MechanismNodeData> = {
    id: node.id,
    type: 'custom',
    data: {
      title: node.title,
      active_ingredient: node.active_ingredient,
      communityId: node.community_id, // New field for coloring
      canonicalName: node.canonical_name,
      score: node.score,
      seedScore: node.seed_score,
      pathStrength: node.path_strength,
      matchReasons: node.match_reasons,
      aliases: node.aliases,
      sourcePostIds: node.source_post_ids,
      applications: node.applications, // New field for analogical cues
      isRoot,
      isMechanism,
    },
    position: { x: 0, y: 0 },
  }

  nodes.push(flowNode)

  if (node.children) {
    node.children.forEach((child) => {
      const { nodes: childNodes, edges: childEdges } = flattenTree(child, isDarkMode, node.id, visited)
      nodes.push(...childNodes)
      edges.push(...childEdges)
    })
  }

  return { nodes, edges }
}

export const MechanismTree = ({ data }: MechanismTreeProps) => {
  const { theme } = useContext(ThemeContext)
  const isDarkMode = theme === 'dark'

  // Initial layout calculation
  const { nodes: initialNodes, edges: initialEdges } = useMemo(() => {
    const { nodes, edges } = flattenTree(data, isDarkMode)
    return getLayoutedElements(nodes, edges)
  }, [data, isDarkMode])

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes)
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges)

  // Sync state when data changes (Critical Fix)
  useEffect(() => {
    const { nodes: newNodes, edges: newEdges } = flattenTree(data, isDarkMode)
    const layouted = getLayoutedElements(newNodes, newEdges)
    setNodes(layouted.nodes)
    setEdges(layouted.edges)
  }, [data, isDarkMode, setNodes, setEdges]) // Depend on data and setters

  const onConnect = useCallback(
    (params: Connection) => setEdges((eds) => addEdge(params, eds)),
    [setEdges]
  )

  return (
    <div className='w-full h-full min-h-[600px] bg-transparent transition-colors duration-300'>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        fitView
        fitViewOptions={{ duration: 800, padding: 0.1 }}
        attributionPosition='bottom-right'
        proOptions={{ hideAttribution: true }}
      >
        <Controls className='!bg-white/5 !border-white/10 [&>button]:!border-b-white/10 [&_svg]:!fill-slate-300 shadow-none !m-4' />
      </ReactFlow>
    </div>
  )
}
