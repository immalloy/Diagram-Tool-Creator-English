// Canvas: pan/zoom stage that holds nodes + edges and handles connect-drag
const { useRef: useRefC, useState: useStateC, useEffect: useEffectC, useMemo: useMemoC } = React;

function Canvas({
  nodes, edges, selection, setSelection,
  updateNode, deleteNode, addEdge, updateEdge,
  setView, view,
  canvasRef, bgPattern, bgColor,
  title, subtitle, showTitleOnCanvas,
  onEditEdge,
}){
  const stageRef = useRefC(null);
  const [panning, setPanning] = useStateC(false);
  const panStart = useRefC(null);
  const [draggingNodeId, setDraggingNodeId] = useStateC(null);
  const [connectFrom, setConnectFrom] = useStateC(null);
  const [connectPos, setConnectPos] = useStateC(null);
  const [draggingEdgeId, setDraggingEdgeId] = useStateC(null);
  const edgeDragStart = useRefC(null);

  // Clamp pan so content never fully leaves the viewport
  const clampView = (tx, ty, zoom) => {
    const el = stageRef.current;
    if (!el || nodes.length === 0) return { tx, ty };
    const rect = el.getBoundingClientRect();
    const margin = 200; // always keep at least 200px of content area visible
    // content bounding box in world coords
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    nodes.forEach(n => {
      minX = Math.min(minX, n.x - 60);
      minY = Math.min(minY, n.y - 60);
      maxX = Math.max(maxX, n.x + 60);
      maxY = Math.max(maxY, n.y + 60);
    });
    // in screen coords: worldX * zoom + tx = screenX
    // We want: at least some part of [minX..maxX] visible in [0..rect.width]
    // maxX * zoom + tx >= margin  =>  tx >= margin - maxX * zoom
    // minX * zoom + tx <= rect.width - margin  =>  tx <= rect.width - margin - minX * zoom
    const txMin = margin - maxX * zoom;
    const txMax = rect.width - margin - minX * zoom;
    const tyMin = margin - maxY * zoom;
    const tyMax = rect.height - margin - minY * zoom;
    return {
      tx: Math.max(txMin, Math.min(txMax, tx)),
      ty: Math.max(tyMin, Math.min(tyMax, ty)),
    };
  };

  // Screen -> world coords
  const screenToWorld = (sx, sy) => {
    const rect = stageRef.current.getBoundingClientRect();
    return {
      x: (sx - rect.left - view.tx) / view.zoom,
      y: (sy - rect.top - view.ty) / view.zoom,
    };
  };

  const handleEdgeDragStart = (id, e) => {
    setDraggingEdgeId(id);
    const edge = edges.find(ed=>ed.id===id);
    if (!edge) return;
    const a = nodes.find(n=>n.id===edge.from);
    const b = nodes.find(n=>n.id===edge.to);
    if (!a || !b) return;

    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const len = Math.hypot(dx, dy) || 1;
    const nx = -dy / len;
    const ny = dx / len;
    
    const i = edges.indexOf(edge);
    const baseOffset = i >= 0 ? edgeOffsets[i] : 0;
    const currentOffset = edge.customOffset !== undefined ? edge.customOffset : baseOffset;
    
    edgeDragStart.current = {
      startX: e.clientX,
      startY: e.clientY,
      startOffset: currentOffset,
      nx, ny,
    };
    e.target.setPointerCapture(e.pointerId);
  };

  const onStageDown = (e) => {
    if (e.target.closest('.node') || e.target.closest('.edge-label') || e.target.closest('.edge-hit') || e.target.closest('.pan-ui') || e.target.closest('.hint')) return;
    setSelection(null);
    // start panning
    setPanning(true);
    panStart.current = { x: e.clientX, y: e.clientY, tx: view.tx, ty: view.ty };
    e.currentTarget.setPointerCapture(e.pointerId);
  };
  const onStageMove = (e) => {
    if (draggingEdgeId && edgeDragStart.current) {
      const state = edgeDragStart.current;
      const dxScreen = (e.clientX - state.startX) / view.zoom;
      const dyScreen = (e.clientY - state.startY) / view.zoom;
      const diff = dxScreen * state.nx + dyScreen * state.ny;
      const newOffset = state.startOffset + diff;
      if (updateEdge) updateEdge(draggingEdgeId, { customOffset: newOffset }, { skipHistory: true });
      return;
    }
    if (panning && panStart.current){
      const rawTx = panStart.current.tx + (e.clientX - panStart.current.x);
      const rawTy = panStart.current.ty + (e.clientY - panStart.current.y);
      const clamped = clampView(rawTx, rawTy, view.zoom);
      setView(v => ({ ...v, tx: clamped.tx, ty: clamped.ty }));
    }
    if (connectFrom){
      setConnectPos(screenToWorld(e.clientX, e.clientY));
    }
  };
  const onStageUp = (e) => {
    if (draggingEdgeId) {
      setDraggingEdgeId(null);
      edgeDragStart.current = null;
    }
    setPanning(false);
    panStart.current = null;
    if (connectFrom){
      setConnectFrom(null);
      setConnectPos(null);
    }
  };

  const onWheel = (e) => {
    e.preventDefault();
    const rect = stageRef.current.getBoundingClientRect();
    const sx = e.clientX - rect.left;
    const sy = e.clientY - rect.top;
    const delta = -e.deltaY * 0.0015;
    const nextZoom = Math.max(0.25, Math.min(2.5, view.zoom * (1+delta)));
    // keep cursor point steady
    const wx = (sx - view.tx) / view.zoom;
    const wy = (sy - view.ty) / view.zoom;
    const tx = sx - wx*nextZoom;
    const ty = sy - wy*nextZoom;
    const clamped = clampView(tx, ty, nextZoom);
    setView({ zoom: nextZoom, tx: clamped.tx, ty: clamped.ty });
  };

  useEffectC(()=>{
    const el = stageRef.current;
    if(!el) return;
    const wheel = (e)=> onWheel(e);
    el.addEventListener('wheel', wheel, { passive:false });
    return ()=> el.removeEventListener('wheel', wheel);
  });

  // Edge offset map: if multiple edges between same pair, stagger them
  const edgeOffsets = useMemoC(()=>{
    const counts = {};
    return edges.map(e => {
      const key = [e.from, e.to].sort().join('--');
      const idx = (counts[key] = (counts[key]||0));
      counts[key]++;
      const dir = e.from < e.to ? 1 : -1;
      const base = 0;
      // spread: 0, +28, -28, +56, -56 ...
      const step = 32;
      const spread = idx===0 ? base : (idx%2? 1: -1) * Math.ceil(idx/2) * step;
      return spread * dir;
    });
  }, [edges]);

  const doStartConnect = (nodeId) => {
    setConnectFrom(nodeId);
    const n = nodes.find(n=>n.id===nodeId);
    if (n) setConnectPos({x:n.x,y:n.y});
  };
  const doFinishConnect = (nodeId) => {
    if (connectFrom && connectFrom !== nodeId){
      addEdge(connectFrom, nodeId);
    }
    setConnectFrom(null);
    setConnectPos(null);
  };

  return (
    <div
      ref={(el)=>{stageRef.current=el; if(canvasRef)canvasRef.current=el;}}
      className={`stage ${panning?'panning':''}`}
      style={{backgroundColor:bgColor}}
      onPointerDown={onStageDown}
      onPointerMove={onStageMove}
      onPointerUp={onStageUp}
      onPointerCancel={onStageUp}
    >
      <div id="capture-root" className="world" style={{
          transform:`translate(${view.tx}px, ${view.ty}px) scale(${view.zoom})`,
          width: 4000, height: 3000,
        }}>

        {/* Background layer inside the scaled world — this is what gets captured on export.
            Extra-wide/tall so export-time content bounds never extend past it. */}
        <div className={`stage-bg ${bgPattern}`} style={{
          position:'absolute', left:-2000, top:-2000, width:8000, height:7000,
          backgroundColor:bgColor, pointerEvents:'none',
        }}/>

        {showTitleOnCanvas && (title || subtitle) && (() => {
          // Center title over actual node content, not the arbitrary world width
          const cx = nodes.length > 0
            ? nodes.reduce((s,n) => s + n.x, 0) / nodes.length
            : 500;
          return (
            <div className="canvas-title" style={{position:'absolute', left: cx, top: 24, transform:'translateX(-50%)'}}>
              {title ? <div className="t1">{title}</div> : null}
              {subtitle ? <div className="t2">{subtitle}</div> : null}
            </div>
          );
        })()}

        <svg className="edges-svg" width="4000" height="3000" style={{position:'absolute',left:0,top:0}}>
          {edges.map((e, i)=>(
            <Edge
              key={e.id}
              edge={e}
              nodes={Object.fromEntries(nodes.map(n=>[n.id,n]))}
              offset={edgeOffsets[i]}
              selected={selection?.type==='edge' && selection.id===e.id}
              onSelect={(id)=>setSelection({type:'edge', id})}
              onEdit={(id)=>onEditEdge(id)}
              onDragStart={handleEdgeDragStart}
            />
          ))}
          {connectFrom && connectPos ? (()=>{
            const from = nodes.find(n=>n.id===connectFrom);
            if(!from) return null;
            return (
              <line className="in-progress-line"
                    x1={from.x} y1={from.y}
                    x2={connectPos.x} y2={connectPos.y}/>
            );
          })() : null}
        </svg>

        {nodes.map(n => (
          <Node
            key={n.id}
            node={n}
            selected={selection?.type==='node' && selection.id===n.id}
            dragging={draggingNodeId===n.id}
            worldZoom={view.zoom}
            onSelect={(id)=>setSelection({type:'node', id})}
            onDrag={(id,x,y)=>{ setDraggingNodeId(id); updateNode(id,{x,y}, {skipHistory:true}); }}
            onDragEnd={(id, moved)=>{
              if (moved){
                // commit a history entry by resetting last position via no-op change
                const n2 = nodes.find(x=>x.id===id);
                if (n2) updateNode(id,{x:n2.x,y:n2.y});
              }
              setDraggingNodeId(null);
            }}
            onStartConnect={doStartConnect}
            onFinishConnect={doFinishConnect}
            onDelete={deleteNode}
          />
        ))}
      </div>

      <div className="pan-ui">
        <button className="btn icon sm" onClick={()=>{
          const z = Math.max(0.25, view.zoom - 0.1);
          const c = clampView(view.tx, view.ty, z);
          setView({ zoom: z, tx: c.tx, ty: c.ty });
        }}>−</button>
        <div className="zoom-val">{Math.round(view.zoom*100)}%</div>
        <button className="btn icon sm" onClick={()=>{
          const z = Math.min(2.5, view.zoom + 0.1);
          const c = clampView(view.tx, view.ty, z);
          setView({ zoom: z, tx: c.tx, ty: c.ty });
        }}>＋</button>
        <button className="btn sm" onClick={()=>{
          const c = clampView(0, 0, 1);
          setView({ zoom: 1, tx: c.tx, ty: c.ty });
        }}>Reset</button>
      </div>
      <div className="hint">Drag to move / Scroll to zoom / Drag <b style={{color:'#7DD8B4'}}>+</b> on a node to another to create connection</div>
    </div>
  );
}

window.Canvas = Canvas;