// Draggable node with avatar
function Node({
  node, selected, onSelect, onDrag, onDragEnd,
  onStartConnect, onFinishConnect, onDelete,
  dragging, worldZoom
}){
  const ref = React.useRef(null);
  const moveState = React.useRef(null);

  const onPointerDown = (e) => {
    if (e.target.closest('.connect-handle')) return;
    if (e.target.closest('.delete-btn')) return;
    e.stopPropagation();
    onSelect(node.id);
    const startX = e.clientX, startY = e.clientY;
    const ox = node.x, oy = node.y;
    moveState.current = { startX, startY, ox, oy, moved:false };
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const onPointerMove = (e) => {
    if (!moveState.current) return;
    const { startX, startY, ox, oy } = moveState.current;
    const dx = (e.clientX - startX) / worldZoom;
    const dy = (e.clientY - startY) / worldZoom;
    if (Math.abs(dx)+Math.abs(dy) > 2) moveState.current.moved = true;
    onDrag(node.id, ox+dx, oy+dy);
  };

  const onPointerUp = (e) => {
    if (!moveState.current) return;
    const moved = moveState.current.moved;
    moveState.current = null;
    onDragEnd(node.id, moved);
    try { e.currentTarget.releasePointerCapture(e.pointerId); } catch(_){}
  };

  const handleConnectDown = (e) => {
    e.stopPropagation();
    e.preventDefault();
    onStartConnect(node.id, e);
  };

  const handleFinishUp = (e) => {
    // If currently connecting, finish here. Parent handles routing on pointerup too.
    onFinishConnect(node.id);
  };

  const shapeClass = node.shape || 'circle';
  const avatarStyle = { background: node.color || '#fff' };

  let inner;
  if (node.image){
    inner = <img src={node.image} alt="" draggable="false" crossOrigin="anonymous"/>;
  } else if (node.emoji){
    inner = <div className="emoji">{node.emoji}</div>;
  } else {
    const ini = (node.name||'?').trim().charAt(0).toUpperCase();
    inner = <div className="initial" style={{color: contrastInk(node.color)}}>{ini}</div>;
  }

  return (
    <div
      ref={ref}
      className={`node${selected?' selected':''}${dragging?' dragging':''}`}
      style={{ left:node.x, top:node.y }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
    >
      <div
        className={`avatar ${shapeClass==='square'?'square':shapeClass==='bubble'?'bubble':''}`}
        style={avatarStyle}
        onPointerUp={handleFinishUp}
      >
        {inner}
      </div>
      <div className={`ring-wrap ${shapeClass==='square'?'square':shapeClass==='bubble'?'bubble':''}`}>
        <div className={`ring ${shapeClass==='square'?'square':shapeClass==='bubble'?'bubble':''}`}></div>
        <div className={`ring2 ${shapeClass==='square'?'square':shapeClass==='bubble'?'bubble':''}`}></div>
      </div>
      {(node.name || node.subtitle) ? (
        <div className="labels">
          {node.name ? <div className="name">{node.name}</div> : null}
          {node.subtitle ? <div className="subtitle">{node.subtitle}</div> : null}
        </div>
      ) : null}

      <div
        className="connect-handle"
        onPointerDown={handleConnectDown}
        title="Drag to create connection"
      >＋</div>
      <div
        className="delete-btn"
        onClick={(e)=>{e.stopPropagation(); onDelete(node.id);}}
        title="Delete"
      >×</div>
    </div>
  );
}

function contrastInk(bg){
  if (!bg) return '#fff';
  const m = bg.match(/^#([0-9a-f]{6})$/i);
  if (!m) return '#fff';
  const r = parseInt(m[1].slice(0,2),16);
  const g = parseInt(m[1].slice(2,4),16);
  const b = parseInt(m[1].slice(4,6),16);
  const L = (0.299*r+0.587*g+0.114*b)/255;
  return L>0.6 ? '#3a2c3a' : '#fff';
}

window.Node = Node;
window.contrastInk = contrastInk;