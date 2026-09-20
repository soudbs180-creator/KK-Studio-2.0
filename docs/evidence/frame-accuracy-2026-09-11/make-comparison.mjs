import fs from 'node:fs/promises';
const dir = new URL('./', import.meta.url);
const data = JSON.parse(await fs.readFile(new URL('after-preview-dom.json', dir), 'utf8'));
const img = async name => 'data:image/png;base64,' + (await fs.readFile(new URL(name,dir))).toString('base64');
const definitions = [
  {name:'展开', state:'expanded', source:'figma-expanded.png', actual:'after-preview-expanded.png', boxes:[
    ['画布内框','.workspace-content',[291,45,1619,1025]],
    ['任务按钮','.task-button',[321,72,93,30]],
    ['底部工具栏','.canvas-toolbar',[719,998,294,50]],
    ['对话面板','.conversation-panel',[1430,61,470,998]],
    ['输入框','.chat-composer',[1450,844,426,170]],
    ['展开导航','.canvas-top-right',[1138.015625,72,280.984375,31.109]],
    ['搜索','.sidebar-search',[204,75,26,26]],
    ['收起按钮','.sidebar-toggle',[245,75,26,26]],
    ['账号区','.account-row',[14,999,259,41]],
  ]},
  {name:'收纳', state:'both-collapsed', source:'figma-collapsed.png', actual:'after-preview-both-collapsed.png', boxes:[
    ['画布内框','.workspace-content',[70,45,1840,1025]],
    ['任务按钮','.task-button',[100,72,93,30]],
    ['底部工具栏','.canvas-toolbar',[719,998,294,50]],
    ['右上导航','.canvas-top-right',[1562,72,281,31.109]],
    ['展开对话','.chat-reopen',[1859,79,18,18]],
    ['搜索','.sidebar-search',[22,942,26,26]],
    ['设置','.sidebar-settings',[22,982,26,26]],
    ['账号','.sidebar-account',[22,1022,26,26]],
  ]},
];
const states = [];
for (const d of definitions) {
  const actual = data.states.find(s=>s.state===d.state);
  const rows = d.boxes.map(([name,selector,source])=>{
    const rect = actual.elements[selector][0].rect;
    const error = Math.max(...rect.map((n,i)=>Math.abs(n-source[i])));
    return {name,source,actual:rect,error};
  });
  states.push({name:d.name,source:await img(d.source),actual:await img(d.actual),rows});
}
const html = `<!doctype html><html lang="zh-CN"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>KK Studio · 框架位置核对</title>
<style>
*{box-sizing:border-box}body{margin:0;background:#111214;color:#ededf0;font:14px/1.65 system-ui,"Microsoft YaHei",sans-serif}main{max-width:1440px;margin:auto;padding:32px 28px 64px}h1{font-size:30px;font-weight:650;margin:0 0 4px}h2{font-size:20px;margin:30px 0 12px}p{margin:7px 0;color:#a8abb5}.meta{font-size:12px;color:#9899a4;letter-spacing:.06em}.controls{display:flex;align-items:center;gap:12px;flex-wrap:wrap;margin:24px 0 12px}.tabs{display:flex;padding:4px;background:#22242a;border-radius:12px;gap:3px}button{border:0;border-radius:8px;padding:8px 20px;font:inherit;cursor:pointer;color:#b6b8c0;background:transparent}button[aria-pressed=true]{background:#43414f;color:#fff}button:focus-visible,input:focus-visible{outline:2px solid #b4a6ff;outline-offset:3px}label{margin-left:auto;display:flex;align-items:center;gap:10px}input{accent-color:#b4a6ff;width:180px}.stage{aspect-ratio:16/9;position:relative;overflow:hidden;border:1px solid #41434c;border-radius:14px;background:#161616}.stage img{position:absolute;inset:0;width:100%;height:100%;object-fit:fill}.stage .source{width:100.104167%;height:100.185185%;left:-.0520833%;top:-.0925926%;max-width:none}.caption{display:flex;justify-content:space-between;gap:24px;font-size:12px;margin:9px 0;color:#a8abb5}.cards{display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin:24px 0}.card{padding:18px 20px;background:#1d1f24;border:1px solid #32343d;border-radius:14px}.value{font-size:23px;font-weight:650;color:#fff}.card p{font-size:12px}.tablewrap{overflow:auto;border:1px solid #33353e;border-radius:12px}table{width:100%;border-collapse:collapse;text-align:left}th{font-size:12px;color:#999ca9;background:#1e2026}td,th{padding:12px 18px;border-bottom:1px solid #292b32}tr:last-child td{border:0}td{font-variant-numeric:tabular-nums}td:last-child{color:#91d7b4}details{margin-top:24px;padding:20px;border:1px solid #33353e;border-radius:12px;background:#191b20}summary{cursor:pointer;font-weight:600}ul{padding-left:20px;color:#b2b5c0}li{margin:8px 0}a{color:#bcaeff}video{max-width:100%;border-radius:12px;background:#0b0b0b}footer{font-size:12px;color:#7f8291;margin-top:28px}@media(max-width:700px){main{padding:22px 14px}h1{font-size:23px}.cards{grid-template-columns:1fr}label{margin-left:0}.caption{display:block}td,th{padding:10px}}
</style><main><div class="meta">KK STUDIO / 2026.09.11 / 1920 × 1080</div><h1>框架位置核对</h1><p>两种布局的原稿与实际运行截图，可切换或叠加查看。</p>
<div class="controls"><div class="tabs"><button data-state="0" aria-pressed="true">展开</button><button data-state="1" aria-pressed="false">收纳</button></div><div class="tabs"><button data-blend="0" aria-pressed="false">Figma</button><button data-blend="50" aria-pressed="false">叠加</button><button data-blend="100" aria-pressed="true">实际界面</button></div><label>实际界面透明度 <input type="range" min="0" max="100" value="100" aria-label="实际界面透明度"><output>100%</output></label></div>
<div class="stage"><img class="source" alt="Figma 原稿"><img class="actual" alt="实际生产预览截图"></div><div class="caption"><span id="state-caption"></span><span>叠图用于目视检查；精确数值来自 Figma 节点和浏览器 DOM。</span></div>
<div class="cards"><div class="card"><div class="value">291 → 70 px</div><p>左侧展开 / 收纳宽度，内框右边固定。</p></div><div class="card"><div class="value">30 px</div><p>任务按钮到内框左边的距离，过渡过程中保持一致。</p></div><div class="card"><div class="value">719, 998</div><p>底部工具栏左上角；两种状态均为 294 × 50。</p></div></div>
<h2>位置与尺寸</h2><p>坐标为 x, y, width, height；单位为设计像素。桌面缩小时按 1920×1080 等比显示。</p><div class="tablewrap"><table><thead><tr><th>部件</th><th>Figma</th><th>实际 DOM</th><th>最大误差</th></tr></thead><tbody></tbody></table></div>
<h2>展开与收纳实录</h2><p>依次收起左栏、收起对话、展开左栏、展开对话。左右开关独立；底栏保持原位。</p><video controls muted playsinline preload="metadata" src="collapse-interaction.webm"></video>
<details open><summary>这次对照的范围</summary><ul><li>框架、任务按钮、底栏、对话面板、输入区和侧栏控件按相同开关状态验证。Figma 原稿截图包含外描边并经过导出缩放，叠图已按外描边范围校正；尺寸验收以节点和 DOM 数值为准。</li><li>原稿包含示例对话、示例账号和空白画布；实际应用显示初始图片/视频卡片、空对话和 Prototype 账号。收纳稿的 200% 是原稿示例状态，实际截图为 100%。这些内容差异未用于假冒像素一致。</li><li>未接入的多创作页保持禁用并给出 Prototype 原因。项目管理保留在右键和 Shift+F10 菜单；Escape 可关闭并回焦。</li><li>300ms 侧栏宽度变化和文字透明度来自已读取动效；一次点击触发、减少动态、独立开关和焦点归属属于工程交互补充。</li></ul></details>
<footer>来源：<a href="https://www.figma.com/design/0nU0A7pq6eyjwfwm1TtWkO/kk?node-id=404-28667">展开 Frame</a> · <a href="https://www.figma.com/design/0nU0A7pq6eyjwfwm1TtWkO/kk?node-id=410-67357">收纳 Frame</a> · <a href="after-preview-dom.json">实际 DOM 证据</a> · <a href="motion-samples.json">过渡采样</a></footer>
<script>const states=${JSON.stringify(states)};let current=0;const source=document.querySelector('.source'),actual=document.querySelector('.actual'),range=document.querySelector('input'),out=document.querySelector('output');function blend(value){range.value=value;actual.style.opacity=value/100;out.textContent=value+'%';document.querySelectorAll('[data-blend]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.blend===String(value))))}function render(){const s=states[current];source.src=s.source;actual.src=s.actual;document.querySelector('tbody').innerHTML=s.rows.map(r=>'<tr><td>'+r.name+'</td><td>'+r.source.join(', ')+'</td><td>'+r.actual.map(v=>Number(v.toFixed(3))).join(', ')+'</td><td>'+r.error.toFixed(3)+' px</td></tr>').join('');document.querySelector('#state-caption').textContent=s.name+' / 相同开关状态 / 当前应用使用初始内容';document.querySelectorAll('[data-state]').forEach(b=>b.setAttribute('aria-pressed',String(+b.dataset.state===current)))}document.querySelectorAll('[data-state]').forEach(b=>b.onclick=()=>{current=+b.dataset.state;render()});document.querySelectorAll('[data-blend]').forEach(b=>b.onclick=()=>blend(+b.dataset.blend));range.oninput=()=>blend(+range.value);render();blend(100);</script></main></html>`;
await fs.writeFile(new URL('comparison.html',dir), html);
console.log(JSON.stringify(states.map(s=>({state:s.name,maxError:Math.max(...s.rows.map(r=>r.error))}))));
