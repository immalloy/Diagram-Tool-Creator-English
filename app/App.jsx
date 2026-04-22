// Main App
function App(){
  const initial = {
    title: '',
    subtitle: '',
    showTitleOnCanvas: false,
    bgPattern: 'bg-dots',
    bgColor: '#FFF7EC',
    nodes: [],
    edges: [],
  };

  const hist = useHistory(initial);
  const { state, set } = hist;
  const [selection, setSelection] = React.useState(null);
  const [view, setView] = React.useState({ zoom: 1, tx: 200, ty: 120 });
  const [editingEdgeId, setEditingEdgeId] = React.useState(null);
  const [toast, setToast] = React.useState(null);
  const [exporting, setExporting] = React.useState(false);
  const canvasRef = React.useRef(null);

  // ---- toast helper
  const flash = (msg)=>{ setToast(msg); setTimeout(()=>setToast(null), 1800); };

  // ---- mutations
  const nextId = (prefix) => prefix + '_' + Math.random().toString(36).slice(2,8);

  const addNode = (partial={}) => {
    // Place near center of current view
    const stage = canvasRef.current;
    const rect = stage?.getBoundingClientRect();
    const cx = rect ? (rect.width/2 - view.tx)/view.zoom : 400;
    const cy = rect ? (rect.height/2 - view.ty)/view.zoom : 300;
    const color = NODE_COLORS[state.nodes.length % NODE_COLORS.length];
    const id = nextId('n');
    set(s => ({
      ...s,
      nodes:[...s.nodes, {
        id, x: cx + (Math.random()-0.5)*80, y: cy + (Math.random()-0.5)*80,
        name:'New Character', color, emoji: null, image: null, shape:'circle',
        ...partial,
      }]
    }));
    setSelection({type:'node', id});
  };

  const updateNode = (id, patch, opts) => {
    set(s => ({
      ...s,
      nodes: s.nodes.map(n => n.id===id ? { ...n, ...patch } : n),
    }), opts);
  };

  const deleteNode = (id) => {
    set(s => ({
      ...s,
      nodes: s.nodes.filter(n=>n.id!==id),
      edges: s.edges.filter(e=>e.from!==id && e.to!==id),
    }));
    setSelection(null);
  };

  const addEdge = (fromId, toId, partial={}) => {
    const id = nextId('e');
    set(s => ({
      ...s,
      edges:[...s.edges, {
        id, from:fromId, to:toId,
        relation:'like', style:'oneway',
        color: RELATIONS[0].color, label: null, stamp: '♡',
        ...partial,
      }]
    }));
    setSelection({type:'edge', id});
  };

  const updateEdge = (id, patch, opts) => {
    set(s => ({
      ...s,
      edges: s.edges.map(e => e.id===id ? { ...e, ...patch } : e),
    }), opts);
  };

  const deleteEdge = (id) => {
    set(s => ({
      ...s,
      edges: s.edges.filter(e=>e.id!==id),
    }));
    setSelection(null);
  };

  const clearAll = () => {
    if (!confirm('All characters and relationships will be deleted. Continue?')) return;
    set(s => ({...s, nodes:[], edges:[], title:'', subtitle:'', showTitleOnCanvas:false, bgPattern:'bg-dots', bgColor:'#FFF7EC'}));
    setSelection(null);
    try {
      localStorage.removeItem('sankaku_saved_data');
    } catch(e) {}
  };

  // ---- demo data
  const loadDemo = () => {
    const demo = buildDemoData();
    set(s => ({ ...s, nodes: demo.nodes, edges: demo.edges, title: 'Academy Romance Map', subtitle: 'Season 1 Main Cast', showTitleOnCanvas: true }));
    setView({ zoom: 0.85, tx: 100, ty: 40 });
    setSelection(null);
    flash('Sample loaded ✿');
  };

  // ---- setters bound to state via set()
  const setTitle = (t)=> set(s=>({...s,title:t}));
  const setSubtitle = (t)=> set(s=>({...s,subtitle:t}));
  const setShowTitleOnCanvas = (v)=> set(s=>({...s,showTitleOnCanvas:v}));
  const setBgPattern = (v)=> set(s=>({...s,bgPattern:v}));
  const setBgColor = (v)=> set(s=>({...s,bgColor:v}));

  // ---- project file save / load
  const saveProject = () => {
    const data = JSON.stringify(state, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = (state.title || 'relationship') + '.sankaku.json';
    a.click();
    URL.revokeObjectURL(url);
    flash('Project saved 💾');
  };

  const loadProjectFileRef = React.useRef(null);
  const loadProject = () => {
    loadProjectFileRef.current?.click();
  };
  const onLoadProjectFile = (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const data = JSON.parse(reader.result);
        if (!confirm('Current work will be overwritten. Continue?')) return;
        set(s => ({
          ...s,
          title: data.title ?? '',
          subtitle: data.subtitle ?? '',
          showTitleOnCanvas: data.showTitleOnCanvas ?? false,
          bgPattern: data.bgPattern ?? 'bg-dots',
          bgColor: data.bgColor ?? '#FFF7EC',
          nodes: data.nodes ?? [],
          edges: data.edges ?? [],
        }));
        setSelection(null);
        setView({ zoom: 1, tx: 200, ty: 120 });
        flash('Project loaded 📂');
      } catch(err) {
        flash('Failed to load file');
        console.error(err);
      }
    };
    reader.readAsText(f);
    e.target.value = '';
  };

  // ---- keyboard
  React.useEffect(()=>{
    const onKey = (e) => {
      if (e.target.matches('input,textarea')) return;
      if ((e.metaKey||e.ctrlKey) && e.key==='z' && !e.shiftKey){ e.preventDefault(); hist.undo(); }
      else if ((e.metaKey||e.ctrlKey) && (e.key==='y' || (e.shiftKey && e.key==='z'))){ e.preventDefault(); hist.redo(); }
      else if (e.key==='Delete' || e.key==='Backspace'){
        if (selection?.type==='node') deleteNode(selection.id);
        if (selection?.type==='edge') deleteEdge(selection.id);
      }
    };
    window.addEventListener('keydown', onKey);
    return ()=> window.removeEventListener('keydown', onKey);
  }, [selection, hist]);

  // ---- export
  const doExport = async (fmt, quality = 2) => {
    const root = document.getElementById('capture-root');
    if (!root) return;

    // compute content bounds
    const pad = 80;
    let minX=Infinity,minY=Infinity,maxX=-Infinity,maxY=-Infinity;
    state.nodes.forEach(n=>{
      minX = Math.min(minX, n.x-70); minY = Math.min(minY, n.y-70);
      maxX = Math.max(maxX, n.x+70); maxY = Math.max(maxY, n.y+70);
    });
    if (!isFinite(minX)){ minX=0; minY=0; maxX=800; maxY=600; }
    if (state.showTitleOnCanvas){ minY = Math.min(minY, 0); }
    minX-=pad; minY-=pad; maxX+=pad; maxY+=pad;
    const w = Math.ceil(maxX-minX);
    const h = Math.ceil(maxY-minY);

    // temporarily set transform to identity, shift content, and clip size
    const prevTransform = root.style.transform;
    const prevWidth = root.style.width;
    const prevHeight = root.style.height;
    root.style.transform = `translate(${-minX}px, ${-minY}px)`;
    root.style.width = w + 'px';
    root.style.height = h + 'px';

    setExporting(true);
    document.body.classList.add('is-exporting');
    const exportStart = performance.now();
    // give the overlay a frame to paint before the heavy capture starts
    await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));

    try{
      // make sure fonts are ready before capture so text renders correctly
      if (document.fonts && document.fonts.ready) { await document.fonts.ready; }

      const opt = {
        backgroundColor: state.bgColor,
        pixelRatio: quality,
        width: w,
        height: h,
        cacheBust: true,
        skipFonts: false,
        style: {
          fontFamily: '"M PLUS Rounded 1c","Zen Maru Gothic",system-ui,sans-serif',
        },
      };
      const method = fmt==='jpeg' ? 'toJpeg' : 'toPng';
      const dataUrl = await window.htmlToImage[method](root, opt);
      const a = document.createElement('a');
      a.href = dataUrl;
      a.download = (state.title||'relationship') + '.' + (fmt==='jpeg'?'jpg':'png');
      a.click();
      flash('Saved ✿');
    } catch(err){
      console.error(err);
      flash('Export failed: ' + err.message);
    } finally {
      root.style.transform = prevTransform;
      root.style.width = prevWidth;
      root.style.height = prevHeight;
      // keep overlay visible for at least 700ms so the loading effect is perceivable
      const elapsed = performance.now() - exportStart;
      const MIN_MS = 700;
      if (elapsed < MIN_MS) {
        await new Promise(r=>setTimeout(r, MIN_MS - elapsed));
      }
      setExporting(false);
      document.body.classList.remove('is-exporting');
    }
  };

  // ---- edge label inline editor
  const editingEdge = state.edges.find(e=>e.id===editingEdgeId);

  return (
    <div className="app">
      <Toolbar
        title={state.title} setTitle={setTitle}
        subtitle={state.subtitle} setSubtitle={setSubtitle}
        showTitleOnCanvas={state.showTitleOnCanvas} setShowTitleOnCanvas={setShowTitleOnCanvas}
        bgPattern={state.bgPattern} setBgPattern={setBgPattern}
        bgColor={state.bgColor} setBgColor={setBgColor}
        canUndo={hist.canUndo} canRedo={hist.canRedo}
        onUndo={hist.undo} onRedo={hist.redo}
        onAddNode={()=>addNode()}
        onExport={doExport}
        onSaveProject={saveProject}
        onLoadProject={loadProject}
        onLoadDemo={loadDemo}
        onClear={clearAll}
      />
      <input ref={loadProjectFileRef} className="file-hidden" type="file" accept=".json,.sankaku.json" onChange={onLoadProjectFile}/>

      <div className="canvas-wrap">
        <Canvas
          nodes={state.nodes} edges={state.edges}
          selection={selection} setSelection={setSelection}
          updateNode={updateNode} deleteNode={deleteNode} addEdge={addEdge} updateEdge={updateEdge}
          view={view} setView={setView} canvasRef={canvasRef}
          bgPattern={state.bgPattern} bgColor={state.bgColor}
          title={state.title} subtitle={state.subtitle}
          showTitleOnCanvas={state.showTitleOnCanvas}
          onEditEdge={(id)=>setEditingEdgeId(id)}
        />
        {state.nodes.length === 0 && (
          <div className="welcome">
            <div className="card">
              <div style={{fontSize:48}}>💕</div>
              <h1>Relationship Diagram Tool</h1>
              <p>Add characters and draw<br/>love, hate, rivalries...</p>
              <div className="row">
                <button className="btn primary" onClick={()=>addNode()}>+ Add First Node</button>
                <button className="btn" onClick={loadDemo}>View Sample</button>
              </div>
            </div>
          </div>
        )}
      </div>

      <Inspector
        selection={selection}
        nodes={state.nodes} edges={state.edges}
        updateNode={updateNode} updateEdge={updateEdge}
        deleteNode={deleteNode} deleteEdge={deleteEdge}
        addNode={()=>addNode()} clearAll={clearAll}
        onLoadDemo={loadDemo}
      />

      {toast && <div className="toast">{toast}</div>}

      {exporting && (
        <div className="export-overlay" role="alert" aria-live="assertive">
          <div className="export-card">
            <div className="export-hearts">
              <span className="eh eh1">♡</span>
              <span className="eh eh2">♥</span>
              <span className="eh eh3">♡</span>
              <span className="eh eh4">♥</span>
              <span className="eh eh5">♡</span>
            </div>
            <div className="export-spinner">
              <svg viewBox="0 0 50 50" width="64" height="64" aria-hidden="true">
                <circle className="es-track" cx="25" cy="25" r="20" fill="none" stroke="#F7D3DF" strokeWidth="5"/>
                <circle className="es-arc"   cx="25" cy="25" r="20" fill="none" stroke="#F56A92" strokeWidth="5"
                        strokeLinecap="round" strokeDasharray="60 200"/>
              </svg>
            </div>
            <div className="export-title">Exporting...</div>
          </div>
        </div>
      )}
    </div>
  );
}

// ---------- demo data builder ----------
function buildDemoData(){
  const nodes = [
    { id:'nA', name:'Hina',   subtitle:'Protagonist', emoji:'🌸', color:'#FFB3C7', shape:'circle', x:600, y:260 },
    { id:'nB', name:'Kaito',  subtitle:'Childhood Friend', emoji:'🐱', color:'#B5D9F2', shape:'circle', x:320, y:260 },
    { id:'nC', name:'Ren',    subtitle:'Student President', emoji:'⭐', color:'#C9BEF5', shape:'square', x:880, y:260 },
    { id:'nD', name:'Mio',   subtitle:'Rival',          emoji:'🔥', color:'#FFD3A8', shape:'circle', x:600, y:500 },
    { id:'nE', name:'Ao',    subtitle:'Senior',         emoji:'🍵', color:'#C7EFC0', shape:'bubble', x:320, y:500 },
    { id:'nF', name:'Sora',  subtitle:'Junior',          emoji:'🐶', color:'#FFE8A3', shape:'circle', x:880, y:500 },
    { id:'nG', name:'Yui',   subtitle:'Best Friend',    emoji:'🎀', color:'#E8BCE8', shape:'circle', x:150, y:100 },
  ];
  const edges = [
    { id:'e1', from:'nB', to:'nA', relation:'like',    style:'heart',   color:'#F56A92', label:'Love', stamp:'♡' },
    { id:'e2', from:'nA', to:'nC', relation:'crush',   style:'oneway',  color:'#B7A0EE', label:'Interested', stamp:'?' },
    { id:'e3', from:'nD', to:'nA', relation:'rival',   style:'cracked', color:'#F77F6E', label:'Rival', stamp:'⚡' },
    { id:'e4', from:'nC', to:'nD', relation:'like',    style:'oneway',  color:'#F56A92', label:'Love', stamp:'♡' },
    { id:'e5', from:'nE', to:'nB', relation:'trust',   style:'twoway',  color:'#7DD8B4', label:'Trust', stamp:'★' },
    { id:'e6', from:'nF', to:'nA', relation:'like',    style:'dotted',  color:'#F56A92', label:'Admire', stamp:'♡' },
    { id:'e7', from:'nD', to:'nE', relation:'dislike', style:'wavy',    color:'#7a6a7a', label:'Awkward', stamp:'✕' },
    { id:'e8', from:'nG', to:'nA', relation:'trust',   style:'twoway',  color:'#7DD8B4', label:'Best Friend', stamp:'★' },
  ];
  return { nodes, edges };
}

window.App = App;
window.buildDemoData = buildDemoData;