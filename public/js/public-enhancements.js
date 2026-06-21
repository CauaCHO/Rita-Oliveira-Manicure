const scrollHint = document.getElementById('scrollHint');

function isNearBottom(){
  return window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 160;
}

function updateScrollHint(){
  if(!scrollHint) return;
  scrollHint.classList.toggle('hidden', isNearBottom());
}

if(scrollHint){
  scrollHint.onclick = () => {
    const target = document.getElementById('dateInput') || document.getElementById('timeList');
    if(target){
      target.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }else{
      window.scrollBy({ top: Math.round(window.innerHeight * 0.65), behavior: 'smooth' });
    }
  };
  window.addEventListener('scroll', updateScrollHint, { passive: true });
  window.addEventListener('resize', updateScrollHint);
  updateScrollHint();
}
