/* ========== utils.js ========== */
function formatPrice(price) {
  const n = Number(price);
  if (isNaN(n)) return '0đ';
  return n.toLocaleString('vi-VN') + 'đ';
}
function formatDate(s) {
  if (!s) return '';
  const d = new Date(s);
  return isNaN(d) ? s : d.toLocaleDateString('vi-VN', {day:'2-digit',month:'2-digit',year:'numeric'});
}
function showToast(msg, type='success') {
  const toast=document.getElementById('cbToast'), toastMsg=document.getElementById('cbToastMsg');
  if(!toast||!toastMsg) return;
  const icons={success:'✓',error:'✕',warning:'⚠'};
  const colors={success:'#2d6a4f',error:'#c0392b',warning:'#e09f3e'};
  toast.style.background=colors[type]||colors.success;
  toastMsg.innerHTML=`<span style="margin-right:8px">${icons[type]||'ℹ'}</span>${msg}`;
  new bootstrap.Toast(toast,{delay:3000}).show();
}
function isValidImageUrl(url) {
  if (!url||typeof url!=='string') return false;
  return /^https?:\/\/.+/i.test(url);
}
function isValidPhone(phone) {
  return /^(0[3|5|7|8|9])+([0-9]{8})$/.test(phone.trim());
}
function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}
function showError(id, msg) {
  const el=document.getElementById('err-'+id); if(el) el.textContent=msg;
  const inp=document.getElementById(id); if(inp) inp.classList.add('is-invalid');
}
function clearError(id) {
  const el=document.getElementById('err-'+id); if(el) el.textContent='';
  const inp=document.getElementById(id); if(inp) inp.classList.remove('is-invalid');
}
function clearAllErrors(fields) { fields.forEach(f=>clearError(f)); }
function genId() { return Math.random().toString(36).substr(2,9).toUpperCase(); }
function debounce(fn,delay) {
  let t;
  return function(...a) { clearTimeout(t); t=setTimeout(()=>fn.apply(this,a),delay); };
}
function togglePwd() {
  const inp=document.getElementById('loginPassword'), ic=document.getElementById('eyeIcon');
  if(!inp) return;
  inp.type=inp.type==='password'?'text':'password';
  if(ic){ic.classList.toggle('bi-eye');ic.classList.toggle('bi-eye-slash');}
}
function toggleAdminPwd() {
  const inp=document.getElementById('adminPass'), ic=document.getElementById('adminEyeIcon');
  if(!inp) return;
  inp.type=inp.type==='password'?'text':'password';
  if(ic){ic.classList.toggle('bi-eye');ic.classList.toggle('bi-eye-slash');}
}
const AUTH = {
  users:[
    {username:'guest',password:'guest123',role:'guest',name:'Khách hàng'},
    {username:'admin',password:'admin123',role:'admin',name:'Quản trị viên'}
  ],
  login(u,p){return this.users.find(x=>x.username===u&&x.password===p)||null;},
  save(u){sessionStorage.setItem('cbUser',JSON.stringify(u));},
  get(){try{return JSON.parse(sessionStorage.getItem('cbUser'));}catch{return null;}},
  logout(){sessionStorage.removeItem('cbUser');},
  isAdmin(){const u=this.get();return u&&u.role==='admin';}
};
const NOTIF = {
  key:'cbNotifications',
  getAll(){try{return JSON.parse(localStorage.getItem(this.key))||[];}catch{return[];}},
  add(item){
    const list=this.getAll();
    list.unshift({...item,id:genId(),createdAt:new Date().toISOString(),read:false});
    localStorage.setItem(this.key,JSON.stringify(list.slice(0,50)));
  },
  markRead(id){
    const list=this.getAll().map(n=>n.id===id?{...n,read:true}:n);
    localStorage.setItem(this.key,JSON.stringify(list));
  },
  clear(){localStorage.removeItem(this.key);}
};
// Analytics local store for orders
const ANALYTICS = {
  key:'cbOrderAnalytics',
  getAll(){try{return JSON.parse(localStorage.getItem(this.key))||[];}catch{return[];}},
  addOrder(items){
    const all=this.getAll();
    items.forEach(item=>{
      const ex=all.find(x=>x.id===item.id);
      if(ex){ex.count+=item.qty;ex.revenue+=Number(item.price)*item.qty;}
      else all.push({id:item.id,name:item.name,category:item.category||item.type||'',count:item.qty,revenue:Number(item.price)*item.qty});
    });
    localStorage.setItem(this.key,JSON.stringify(all));
  },
  clear(){localStorage.removeItem(this.key);}
};