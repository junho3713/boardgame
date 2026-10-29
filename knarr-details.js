/* Only KNARR has an explanation/practice action; other catalog entries are unchanged. */
(function(){'use strict';const dialog=document.getElementById('knarrDetails');let trigger=null;
 function openKnarr(button){trigger=button;dialog.showModal();document.body.classList.add('catalog-dialog-open');dialog.querySelector('.detail-body').scrollTop=0;document.getElementById('knarrTitle').focus({preventScroll:true});}
 document.addEventListener('click',e=>{const button=e.target.closest('[data-knarr-details]');if(button)openKnarr(button);});
 dialog.querySelector('[data-close-details]').addEventListener('click',()=>dialog.close());
 dialog.addEventListener('click',e=>{const r=dialog.getBoundingClientRect();if(e.target===dialog&&(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom))dialog.close();});
 dialog.addEventListener('close',()=>{document.body.classList.remove('catalog-dialog-open');if(trigger?.isConnected)trigger.focus({preventScroll:true});});
})();
