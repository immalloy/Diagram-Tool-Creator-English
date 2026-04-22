// Edge rendering: arrow/heart/crack/dotted/wavy between two nodes.
// Also handles multi-edge offset between same pair so they don't overlap.

// Intersection: find point on circle (cx,cy,r) on the line from (cx,cy) toward (tx,ty)
function edgePointOnCircle(cx,cy,tx,ty,r){
  const dx = tx-cx, dy = ty-cy;
  const L = Math.hypot(dx,dy) || 1;
  return { x: cx + dx/L*r, y: cy + dy/L*r };
}

// Build a quadratic-bezier path between two points with a perpendicular offset.
function buildCurve(p1, p2, offset){
  const mx = (p1.x+p2.x)/2, my = (p1.y+p2.y)/2;
  const dx = p2.x-p1.x, dy = p2.y-p1.y;
  const L = Math.hypot(dx,dy) || 1;
  const nx = -dy/L, ny = dx/L;
  const cx = mx + nx*offset;
  const cy = my + ny*offset;
  return { d: `M ${p1.x} ${p1.y} Q ${cx} ${cy} ${p2.x} ${p2.y}`, cx, cy };
}

// Sample points along a quadratic bezier
function sampleQuad(p1, c, p2, n=60){
  const pts=[];
  for(let i=0;i<=n;i++){
    const t=i/n;
    const it=1-t;
    const x = it*it*p1.x + 2*it*t*c.x + t*t*p2.x;
    const y = it*it*p1.y + 2*it*t*c.y + t*t*p2.y;
    pts.push({x,y,t});
  }
  return pts;
}

// Convert a polyline into an SVG path d
function polyToPath(pts){
  return pts.map((p,i)=> (i?'L':'M') + p.x.toFixed(1) + ' ' + p.y.toFixed(1)).join(' ');
}

// Build a "wavy" path along the curve
function wavePathAlong(p1, c, p2, amp=7, freq=0.09){
  const samples = sampleQuad(p1,c,p2,120);
  const out=[];
  for(let i=0;i<samples.length;i++){
    const s = samples[i];
    // tangent
    const prev = samples[Math.max(0,i-1)];
    const nx = -(s.y - prev.y), ny = (s.x - prev.x);
    const L = Math.hypot(nx,ny) || 1;
    const off = Math.sin(i*freq*Math.PI) * amp;
    out.push({x: s.x + nx/L*off, y: s.y + ny/L*off});
  }
  return polyToPath(out);
}

// Build a zig-zag "crack" path along the curve
function crackPathAlong(p1, c, p2, amp=10){
  const samples = sampleQuad(p1,c,p2,14);
  const out=[];
  for(let i=0;i<samples.length;i++){
    const s = samples[i];
    if (i===0 || i===samples.length-1){ out.push({x:s.x,y:s.y}); continue; }
    const prev = samples[i-1];
    const nx = -(s.y - prev.y), ny = (s.x - prev.x);
    const L = Math.hypot(nx,ny) || 1;
    const off = (i%2===0?1:-1) * amp * (1 - Math.abs(i - samples.length/2)/(samples.length/2)*0.3);
    out.push({x: s.x + nx/L*off, y: s.y + ny/L*off});
  }
  return polyToPath(out);
}

function Edge({ edge, nodes, offset, selected, onSelect, onEdit, onDragStart }){
  const a = nodes[edge.from];
  const b = nodes[edge.to];
  if (!a || !b) return null;

  const nr = 48; // visual radius of node avatar (approx)

  const p1full = { x:a.x, y:a.y };
  const p2full = { x:b.x, y:b.y };
  const actualOffset = edge.customOffset !== undefined ? edge.customOffset : offset;
  const { cx, cy } = buildCurve(p1full, p2full, actualOffset);

  // shrink endpoints to node boundary using control point direction
  const p1 = edgePointOnCircle(a.x,a.y, cx, cy, nr);
  const p2 = edgePointOnCircle(b.x,b.y, cx, cy, nr);

  const curve = buildCurve(p1, p2, actualOffset * 0.6);

  const rel = RELATIONS.find(r => r.id === edge.relation) || RELATIONS[0];
  const color = edge.color || rel.color;
  const stroke = 4;
  const style = edge.style || 'oneway';

  let pathD = curve.d;
  let dash = '';
  if (style === 'dotted') dash = '0.1 12';
  if (style === 'wavy') pathD = wavePathAlong(p1, {x:curve.cx,y:curve.cy}, p2, 6, 0.12);
  if (style === 'cracked') pathD = crackPathAlong(p1, {x:curve.cx,y:curve.cy}, p2, 10);

  const markerStart = style === 'twoway' ? `url(#arrow-${edge.id})` : '';
  const markerEnd = (style === 'oneway' || style === 'twoway' || style === 'dotted' || style === 'wavy')
    ? `url(#arrow-${edge.id})` : '';

  // label position: mid of curve
  const labelX = 0.25*p1.x + 0.5*curve.cx + 0.25*p2.x;
  const labelY = 0.25*p1.y + 0.5*curve.cy + 0.25*p2.y;

  // hearts along curve (for heart style)
  const hearts = [];
  if (style === 'heart'){
    for (let t of [0.25,0.5,0.75]){
      const it=1-t;
      const x = it*it*p1.x + 2*it*t*curve.cx + t*t*p2.x;
      const y = it*it*p1.y + 2*it*t*curve.cy + t*t*p2.y;
      hearts.push({x,y,t});
    }
  }

  const labelText = edge.label ?? rel.label;
  const stamp = edge.stamp || '';

  return (
    <g className={`edge-group${selected?' selected':''}`}>
      <defs>
        <marker id={`arrow-${edge.id}`} viewBox="0 0 10 10" refX="8" refY="5"
                markerWidth="7" markerHeight="7" orient="auto-start-reverse">
          <path d="M 0 0 L 10 5 L 0 10 z" fill={color} />
        </marker>
      </defs>

      <path className="edge-hit" d={curve.d} 
            onClick={()=>onSelect(edge.id)} 
            onDoubleClick={()=>onEdit(edge.id)}
            onPointerDown={(e)=>{
              if(onDragStart) onDragStart(edge.id, e);
            }}/>
      <path
        className="edge-path"
        d={pathD}
        stroke={color}
        strokeWidth={stroke}
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeDasharray={dash || undefined}
        markerStart={markerStart || undefined}
        markerEnd={markerEnd || undefined}
        fill="none"
      />

      {hearts.map((h,i)=>(
        <g key={i} transform={`translate(${h.x},${h.y}) scale(${0.9 + i*0.05})`}>
          <HeartShape color={color} />
        </g>
      ))}

      {labelText || stamp ? (() => {
        const full = (stamp ? stamp + ' ' : '') + (labelText || '');
        const approxW = Math.max(36, full.length * 10 + 20);
        return (
          <g
            transform={`translate(${labelX},${labelY})`}
            className={`edge-label-g${selected?' selected':''}`}
            onClick={(e)=>{e.stopPropagation(); onSelect(edge.id);}}
            onDoubleClick={(e)=>{e.stopPropagation(); onEdit(edge.id);}}
            onPointerDown={(e)=>{
              e.stopPropagation();
              onSelect(edge.id);
              if(onDragStart) onDragStart(edge.id, e);
            }}
            style={{cursor:'pointer'}}
          >
            <rect
              x={-approxW/2} y={-14} width={approxW} height={28} rx={14}
              fill="#fff"
              stroke={selected ? '#F56A92' : '#F2D4DD'}
              strokeWidth={2}
            />
            <text
              x={0} y={1}
              textAnchor="middle"
              dominantBaseline="middle"
              fontFamily='"M PLUS Rounded 1c","Zen Maru Gothic",system-ui,sans-serif'
              fontWeight={800}
              fontSize={13}
              fill={color}
            >{full}</text>
          </g>
        );
      })() : null}
    </g>
  );
}

function HeartShape({color}){
  return (
    <path d="M0,-2 C -4,-10 -14,-6 -14,2 C -14,10 0,16 0,16 C 0,16 14,10 14,2 C 14,-6 4,-10 0,-2 Z"
          fill={color}
          stroke="#fff" strokeWidth="2"
          transform="scale(0.7)"/>
  );
}

window.Edge = Edge;