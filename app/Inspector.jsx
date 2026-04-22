// Right-side inspector for either the selected node or edge
function Inspector({
  selection, nodes, edges,
  updateNode, updateEdge,
  deleteNode, deleteEdge,
  addNode, clearAll,
  onLoadDemo,
}){
  if (!selection){
    return (
      <div className="side">
        <div className="card">
          <h3>Getting Started</h3>
          <div style={{fontSize:13, lineHeight:1.7, color:'var(--ink-soft)'}}>
            &bull; Click <b>+ Add Node</b> to place a character<br/>
            &bull; Drag the <b style={{color:'#7DD8B4'}}>+</b> on a node to another → creates connection<br/>
            &bull; Click a line or node to edit<br/>
            &bull; <b>Double-click</b> labels to rename
          </div>
        </div>
        <div style={{display:'flex',gap:8, flexDirection:'column'}}>
          <button className="btn primary" onClick={addNode}>+ Add Node</button>
          <button className="btn" onClick={onLoadDemo}>Load Sample Diagram</button>
          <button className="btn ghost" onClick={clearAll}>Clear All</button>
        </div>
        <div className="empty-hint">
          Nothing selected.<br/>Click on nodes or connection lines.
        </div>
      </div>
    );
  }

  if (selection.type === 'node'){
    const node = nodes.find(n=>n.id===selection.id);
    if (!node) return null;
    return (
      <div className="side">
        <NodeInspector node={node} updateNode={updateNode} deleteNode={deleteNode}/>
      </div>
    );
  }

  if (selection.type === 'edge'){
    const edge = edges.find(e=>e.id===selection.id);
    if (!edge) return null;
    return (
      <div className="side">
        <EdgeInspector edge={edge} nodes={nodes} updateEdge={updateEdge} deleteEdge={deleteEdge}/>
      </div>
    );
  }
  return null;
}

function NodeInspector({node, updateNode, deleteNode}){
  const fileRef = React.useRef(null);
  const onFile = async (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    try {
      const dataUrl = await compressImage(f);
      updateNode(node.id, { image: dataUrl });
    } catch(err) {
      console.error('Image compression failed', err);
    }
    e.target.value = '';
  };

  return (
    <>
      <h3>Edit Node</h3>
      <div className="card">
        <div className="field">
          <label>Name</label>
          <input type="text" value={node.name||''}
                 onChange={e=>updateNode(node.id,{name:e.target.value})}
                 placeholder="Character name"/>
        </div>
        <div className="field">
          <label>Subtitle (shown below name)</label>
          <input type="text" value={node.subtitle||''}
                 onChange={e=>updateNode(node.id,{subtitle:e.target.value})}
                 placeholder="Protagonist / Grade 10 / etc."/>
        </div>
      </div>

      <div className="card mint">
        <h3 style={{marginTop:0}}>Icon</h3>
        <div style={{display:'flex',gap:6,marginBottom:10, flexWrap:'wrap'}}>
          <button className="btn sm" onClick={()=>fileRef.current.click()}>Upload Image</button>
          {node.image && <button className="btn sm ghost" onClick={()=>updateNode(node.id,{image:null})}>Clear Image</button>}
          <input ref={fileRef} className="file-hidden" type="file" accept="image/*" onChange={onFile}/>
        </div>
        <div className="field">
          <label>Emoji</label>
          <div className="emoji-row">
            <button className={!node.emoji?'on':''} onClick={()=>updateNode(node.id,{emoji:null})}>—</button>
            {EMOJI_PRESETS.map(em=>(
              <button key={em} className={node.emoji===em?'on':''}
                      onClick={()=>updateNode(node.id,{emoji:em, image:null})}>{em}</button>
            ))}
          </div>
        </div>
        <div className="field">
          <label>Background Color</label>
          <div className="swatches">
            {NODE_COLORS.map(c=>(
              <button key={c} style={{background:c}}
                      className={node.color===c?'on':''}
                      onClick={()=>updateNode(node.id,{color:c})}/>
            ))}
          </div>
        </div>
        <div className="field">
          <label>Shape</label>
          <div className="seg">
            {[['circle','Circle'],['square','Square'],['bubble','Bubble']].map(([v,l])=>(
              <button key={v} className={node.shape===v || (!node.shape && v==='circle')?'on':''}
                      onClick={()=>updateNode(node.id,{shape:v})}>{l}</button>
            ))}
          </div>
        </div>
      </div>

      <button className="btn" style={{background:'#FFE0E0', color:'#C94A4A'}}
              onClick={()=>deleteNode(node.id)}>Delete Node</button>
    </>
  );
}

function EdgeInspector({edge, nodes, updateEdge, deleteEdge}){
  const from = nodes.find(n=>n.id===edge.from);
  const to = nodes.find(n=>n.id===edge.to);
  const rel = RELATIONS.find(r=>r.id===edge.relation) || RELATIONS[0];

  return (
    <>
      <h3>Edit Relationship</h3>
      <div className="card lav">
        <div style={{fontSize:13, fontWeight:800, marginBottom:8}}>
          <span style={{color:'var(--ink-soft)'}}>from</span> {from?.name||'?'}
          <span style={{margin:'0 6px'}}>→</span>
          <span style={{color:'var(--ink-soft)'}}>to</span> {to?.name||'?'}
          {' '}
          <button className="btn sm ghost" title="Reverse direction"
                  onClick={()=>updateEdge(edge.id,{from:edge.to,to:edge.from})}>⇄</button>
        </div>

        <div className="field">
          <label>Relationship Type</label>
          <div className="seg">
            {RELATIONS.map(r=>(
              <button key={r.id} className={edge.relation===r.id?'on':''}
                      onClick={()=>updateEdge(edge.id,{relation:r.id, color:r.color, label:r.label})}>
                {r.stamp} {r.label}
              </button>
            ))}
          </div>
        </div>

        <div className="field">
          <label>Label (Custom)</label>
          <input type="text" value={edge.label ?? rel.label}
                 onChange={e=>updateEdge(edge.id,{label:e.target.value})}/>
        </div>

        <div className="field">
          <label>Stamp</label>
          <div className="stamp-row">
            <button className={!edge.stamp?'on':''}
                    onClick={()=>updateEdge(edge.id,{stamp:''})}>None</button>
            {STAMPS.map(s=>(
              <button key={s} className={edge.stamp===s?'on':''}
                      onClick={()=>updateEdge(edge.id,{stamp:s})}>{s}</button>
            ))}
          </div>
        </div>
      </div>

      <div className="card sky">
        <h3 style={{marginTop:0}}>Arrow Style</h3>
        <div className="seg">
          {ARROW_STYLES.map(s=>(
            <button key={s.id} className={edge.style===s.id?'on':''}
                    onClick={()=>updateEdge(edge.id,{style:s.id})}>{s.label}</button>
          ))}
        </div>
        <div className="field" style={{marginTop:10}}>
          <label>Line Color</label>
          <div className="swatches">
            {['#F56A92','#F77F6E','#FFB86B','#7DD8B4','#8CCBF0','#B7A0EE','#7a6a7a','#3a2c3a'].map(c=>(
              <button key={c} style={{background:c}}
                      className={edge.color===c?'on':''}
                      onClick={()=>updateEdge(edge.id,{color:c})}/>
            ))}
          </div>
        </div>
        {edge.customOffset !== undefined && edge.customOffset !== 0 && (
          <button className="btn sm" style={{marginTop:8}}
                  onClick={()=>updateEdge(edge.id,{customOffset:undefined})}>Reset Curvature</button>
        )}
      </div>

      <button className="btn" style={{background:'#FFE0E0', color:'#C94A4A'}}
              onClick={()=>deleteEdge(edge.id)}>Delete Relationship</button>
    </>
  );
}

window.Inspector = Inspector;