/* Editable sandbox setup. Values never write to the original run or profile. */
(()=>{'use strict';
const api=window.FrontWaveTest,roster=window.FrontRoster,types=window.FrontTypes,abilities=window.FrontAbilities,$=id=>document.getElementById(id);
class FrontWaveTestSetup{
 constructor(){
  this.mode='recommended';this.draft=null;
  $('waveLoadout').innerHTML=`<h3>시험 병력 · 강화</h3><label class="wave-loadout-mode">편성 기준<select id="waveLoadoutMode"><option value="recommended">시간대 추천 편성</option><option value="current">현재 분대 그대로</option><option value="custom">직접 조절</option></select></label><p id="waveLoadoutGuide"></p><div class="wave-loadout-basics"><label>작전 레벨<input data-wave-field="level" type="number" min="1" max="100"></label><label>생산 자원<input data-wave-field="cash" type="number" min="0" max="100000"></label></div><div class="wave-roster-table"><table><thead><tr><th>병과</th><th>1성 투입 수</th><th>병과 Lv.</th></tr></thead><tbody>${roster.map(t=>`<tr><th scope="row">${types[t].name}</th><td><input aria-label="${types[t].name} 투입 수" data-wave-count="${t}" type="number" min="0"></td><td><input aria-label="${types[t].name} 강화" data-wave-tech="${t}" type="number" min="0" max="5"></td></tr>`).join('')}</tbody></table></div><h4>작전 능력 <small>최대 5종 · 각각 Lv.0~5</small></h4><div class="wave-growth-grid">${Object.entries(abilities).map(([key,a])=>`<label>${a.name}<input aria-label="${a.name} 능력" data-wave-ability="${key}" type="number" min="0" max="5"></label>`).join('')}</div><p id="waveLoadoutSummary" role="status"></p>`;
  $('waveLoadoutMode').onchange=()=>{this.mode=$('waveLoadoutMode').value;if(this.mode!=='custom')this.reload();else this.paint();};
  $('waveLoadout').oninput=e=>{const n=e.target;if(n.tagName!=='INPUT')return;const value=n.value===''?NaN:Number(n.value);this.mode='custom';$('waveLoadoutMode').value='custom';if(n.dataset.waveField)this.draft[n.dataset.waveField]=value;else if(n.dataset.waveCount)this.draft.counts[n.dataset.waveCount]=value;else if(n.dataset.waveTech)this.draft.tech[n.dataset.waveTech]=value;else if(n.dataset.waveAbility)this.draft.abilities[n.dataset.waveAbility]=value;this.summary();};
 }
 open(game,time){if(this.mode==='custom'&&this.game===game&&this.draft){this.time=time;this.paint();return;}this.game=game;this.time=time;this.reload();}
 update(time){this.time=time;if(this.mode==='recommended'&&Number.isFinite(time))this.reload();}
 reload(){if(!this.game||!Number.isFinite(this.time))return;this.draft=this.mode==='recommended'?api.recommended(this.game,this.time):api.current(this.game);this.paint();}
 paint(){if(!this.draft)return;const d=this.draft;$('waveLoadoutMode').value=this.mode;for(const n of $('waveLoadout').querySelectorAll('input')){n.disabled=this.mode==='current';if(n.dataset.waveField)n.value=d[n.dataset.waveField];if(n.dataset.waveCount){n.value=d.counts[n.dataset.waveCount];n.max=this.game.starExperiment?9:8;}if(n.dataset.waveTech)n.value=d.tech[n.dataset.waveTech];if(n.dataset.waveAbility)n.value=d.abilities[n.dataset.waveAbility];}this.summary();}
 summary(){
  $('waveTestHeal').disabled=this.mode!=='current';
  $('waveLoadoutGuide').textContent=this.mode==='current'?'현재 분대의 별·병과 강화·능력·자원을 그대로 복사합니다.':'시간대 추천은 성장 예시입니다. 실제 플레이를 재현한 기록은 아닙니다. 수치를 바꾸면 직접 조절로 전환합니다.';
  if(this.game.starExperiment)$('waveLoadoutGuide').textContent+=this.game.starMax===3?' 1성 3기 → 2성, 9기 → 3성으로 자동 합성합니다.':' 1성 3기 → 2성으로 자동 합성합니다.';
  try{const d=api.validateLoadout(this.game,this.draft),evolved=roster.filter(t=>d.tech[t]===5&&d.abilities[window.FrontEvolutions[t].ability]===5).map(t=>window.FrontEvolutions[t].name);$('waveLoadoutSummary').textContent=`Lv.${d.level} · 대장 제외 ${d.size}/${d.capacity}기 · 능력 ${Object.values(d.abilities).filter(Boolean).length}/5종`+(evolved.length?' · 진화: '+evolved.join(', '):'');$('waveLoadoutSummary').classList.remove('save-error');}catch(e){$('waveLoadoutSummary').textContent=e.message;$('waveLoadoutSummary').classList.add('save-error');}
 }
 value(){return this.mode==='current'?null:api.validateLoadout(this.game,this.draft);}
}
window.FrontWaveTestSetup=FrontWaveTestSetup;
})();
