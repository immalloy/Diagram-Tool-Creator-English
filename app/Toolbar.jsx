// Top toolbar: compact, with a popover for background settings
const { useState: useStateTB, useRef: useRefTB, useEffect: useEffectTB } = React;

function Toolbar({
  title, setTitle, subtitle, setSubtitle,
  showTitleOnCanvas, setShowTitleOnCanvas,
  bgPattern, setBgPattern, bgColor, setBgColor,
  canUndo, canRedo, onUndo, onRedo,
  onAddNode, onExport, onSaveProject, onLoadProject, onLoadDemo, onClear,
}){
  const [bgOpen, setBgOpen] = useStateTB(false);
  const [moreOpen, setMoreOpen] = useStateTB(false);
  const [exportOpen, setExportOpen] = useStateTB(false);
  const [quality, setQuality] = useStateTB(2);
  const bgRef = useRefTB(null);
  const moreRef = useRefTB(null);
  const exportRef = useRefTB(null);

  useEffectTB(()=>{
    const onDoc = (e)=>{
      if (bgRef.current && !bgRef.current.contains(e.target)) setBgOpen(false);
      if (moreRef.current && !moreRef.current.contains(e.target)) setMoreOpen(false);
      if (exportRef.current && !exportRef.current.contains(e.target)) setExportOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    return ()=>document.removeEventListener('mousedown', onDoc);
  },[]);

  return (
    <div className="toolbar">
      <div className="brand">
        <div className="logo">♡</div>
        <input className="title-input" value={title}
               onChange={e=>setTitle(e.target.value)}
               placeholder="Diagram Title"/>
      </div>

      <div className="tb-group" style={{background:'var(--bg-lav)'}}>
        <button className="btn sm" disabled={!canUndo} onClick={onUndo} title="Undo (Ctrl+Z)">↶</button>
        <button className="btn sm" disabled={!canRedo} onClick={onRedo} title="Redo (Ctrl+Y)">↷</button>
      </div>

      <div className="tb-popover-wrap" ref={bgRef}>
        <button className="btn" onClick={()=>setBgOpen(v=>!v)} title="Background Settings">
          <span className={`bg-swatch-mini ${bgPattern}`} style={{backgroundColor:bgColor}}/>
          Background ▾
        </button>
        {bgOpen && (
          <div className="tb-popover">
            <div className="pop-section">
              <div className="pop-label">Pattern</div>
              <div className="pop-row">
                {BG_PATTERNS.map(p=>(
                  <button key={p.id}
                          className={`bg-swatch ${p.className} ${bgPattern===p.className?'active':''}`}
                          style={{backgroundColor:p.color}}
                          onClick={()=>setBgPattern(p.className)}
                          title={p.label}/>
                ))}
              </div>
            </div>
            <div className="pop-section">
              <div className="pop-label">Background Color</div>
              <div className="pop-row">
                {BG_COLORS.map(c=>(
                  <button key={c}
                          className={`bg-swatch ${bgColor===c?'active':''}`}
                          style={{backgroundColor:c}}
                          onClick={()=>setBgColor(c)}/>
                ))}
              </div>
            </div>
            <label className="pop-check">
              <input type="checkbox" checked={showTitleOnCanvas}
                     onChange={e=>setShowTitleOnCanvas(e.target.checked)}/>
              Include title in image
            </label>
          </div>
        )}
      </div>

      <div className="tb-spacer"/>

      <button className="btn primary" onClick={onAddNode}>+ Node</button>

      <div className="tb-popover-wrap" ref={moreRef}>
        <button className="btn" onClick={()=>setMoreOpen(v=>!v)}>…</button>
        {moreOpen && (
          <div className="tb-popover right">
            <button className="btn block" onClick={()=>{onLoadDemo(); setMoreOpen(false);}}>Load Sample</button>
            <button className="btn block" onClick={()=>{onClear(); setMoreOpen(false);}}>Clear All</button>
          </div>
        )}
      </div>

      <div className="tb-popover-wrap" ref={exportRef}>
        <button className="btn primary" onClick={()=>setExportOpen(v=>!v)}>⤓ Export ▾</button>
        {exportOpen && (
          <div className="tb-popover right">
            <div className="pop-label">Quality</div>
            <div className="pop-row" style={{marginBottom:8}}>
              {[['1x','Standard',1],['2x','High',2],['3x','Ultra',3],['4x','Max',4]].map(([k,lbl,q])=>(
                <button key={k}
                        className={`btn sm ${quality===q?'primary':''}`}
                        onClick={()=>setQuality(q)}>
                  {lbl} ({k})
                </button>
              ))}
            </div>
            <div className="pop-label">Format</div>
            <button className="btn block primary" onClick={()=>{onExport('png', quality); setExportOpen(false);}}>⤓ Save as PNG</button>
            <button className="btn block" onClick={()=>{onExport('jpeg', quality); setExportOpen(false);}}>⤓ Save as JPEG</button>
            <div style={{borderTop:'2px dashed var(--line)', margin:'8px 0'}}></div>
            <div className="pop-label">Project File</div>
            <button className="btn block" onClick={()=>{onSaveProject(); setExportOpen(false);}}>Save Project</button>
            <button className="btn block" onClick={()=>{onLoadProject(); setExportOpen(false);}}>Open Project</button>
          </div>
        )}
      </div>
    </div>
  );
}

window.Toolbar = Toolbar;