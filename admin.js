/* ========== admin.js ========== */
let adminDrinks=[],adminTables=[],adminReservations=[],filteredReservations=[];
let editDrinkId=null,editTableId=null,currentPage=1;
const PAGE_SIZE=10;

document.addEventListener('DOMContentLoaded',()=>{
  checkAdminAuth();
  updateAdminClock();
  setInterval(updateAdminClock,1000);
  document.getElementById('adminLoginForm').addEventListener('submit',handleAdminLogin);
  // Live image preview
  $(document).on('input','#drinkImage',function(){
    const url=$(this).val().trim();
    const preview=document.getElementById('drinkImgPreview');
    const wrap=document.getElementById('drinkImgPreviewWrap');
    if(url&&isValidImageUrl(url)){preview.src=url;wrap.style.display='';}
    else wrap.style.display='none';
  });
  $(document).on('input','#adminSearchDrink',debounce(filterDrinksTable,280));
  $(document).on('change','#adminFilterCat',filterDrinksTable);
  document.getElementById('notifyForm').addEventListener('submit',handleNotifySubmit);
});

function checkAdminAuth(){
  const u=AUTH.get();
  if(u&&u.role==='admin'){showDashboard(u);}
  else{document.getElementById('adminLoginScreen').style.display='';document.getElementById('adminDashboard').classList.add('d-none');}
}
function updateAdminClock(){const el=document.getElementById('adminTime');if(el)el.textContent=new Date().toLocaleString('vi-VN');}

function handleAdminLogin(e){
  e.preventDefault();
  const u=document.getElementById('adminUser').value.trim();
  const p=document.getElementById('adminPass').value;
  clearAllErrors(['adminUser','adminPass']);
  document.getElementById('adminLoginError').classList.add('d-none');
  let valid=true;
  if(!u){showError('adminUser','Vui lòng nhập tên đăng nhập');valid=false;}
  if(!p){showError('adminPass','Vui lòng nhập mật khẩu');valid=false;}
  if(!valid) return;
  const user=AUTH.login(u,p);
  if(!user||user.role!=='admin'){document.getElementById('adminLoginError').textContent='Sai thông tin hoặc không có quyền admin.';document.getElementById('adminLoginError').classList.remove('d-none');return;}
  AUTH.save(user);showDashboard(user);
}
function showDashboard(user){
  document.getElementById('adminLoginScreen').style.display='none';
  document.getElementById('adminDashboard').classList.remove('d-none');
  if(user){
    const initials=(user.name||'AD').split(' ').map(w=>w[0]).join('').slice(0,2).toUpperCase();
    document.getElementById('adminAvatarText').textContent=initials;
    const nd=document.getElementById('adminNameDisplay');if(nd)nd.textContent=user.name||'Admin';
  }
  loadDashboard();
}
function adminLogout(){AUTH.logout();window.location.reload();}
function toggleSidebar(){document.getElementById('adminSidebar').classList.toggle('open');}

function showPage(page){
  document.querySelectorAll('.cb-page').forEach(p=>p.classList.add('d-none'));
  document.querySelectorAll('.cb-admin-nav-item').forEach(i=>i.classList.remove('active'));
  const pg=document.getElementById('page-'+page);
  if(pg)pg.classList.remove('d-none');
  const nav=document.querySelector(`[data-page="${page}"]`);
  if(nav)nav.classList.add('active');
  const titles={dashboard:'Dashboard',analytics:'Phân tích bán hàng',drinks:'Quản lý thực đơn',tables:'Quản lý bàn',reservations:'Đặt bàn & Đơn hàng',notifications:'Gửi thông báo'};
  document.getElementById('pageTitle').textContent=titles[page]||page;
  if(page==='drinks')loadAdminDrinks();
  if(page==='tables')loadAdminTables();
  if(page==='reservations')loadAdminReservations();
  if(page==='analytics')loadAnalytics();
  if(pg){pg.style.opacity=0;setTimeout(()=>{pg.style.transition='opacity .2s';pg.style.opacity=1;},10);}
}

// ===== DASHBOARD =====
async function loadDashboard(){
  try{
    const[drinks,reservations]=await Promise.all([getDrinks(),getReservations()]);
    adminDrinks=drinks;adminReservations=reservations;
    const pending=reservations.filter(r=>r.status==='pending').length;
    const confirmed=reservations.filter(r=>r.status==='confirmed').length;
    document.getElementById('stat-total').textContent=reservations.length;
    document.getElementById('stat-pending').textContent=pending;
    document.getElementById('stat-confirmed').textContent=confirmed;
    document.getElementById('stat-drinks').textContent=drinks.length;
    document.getElementById('pendingCount').textContent=pending;
    renderRecentReservations(reservations.slice(0,5));
    renderTopDrinksWidget(drinks);
  }catch{showToast('Không thể tải dashboard','error');}
}

function renderRecentReservations(list){
  const c=document.getElementById('recentReservations');
  if(!list||!list.length){c.innerHTML='<p class="text-muted text-center py-3">Chưa có đặt bàn nào.</p>';return;}
  c.innerHTML=`<div class="table-responsive"><table class="table cb-table mb-0">
    <thead><tr><th>Khách hàng</th><th>Loại</th><th>Bàn / Địa chỉ</th><th>Ngày & Giờ</th><th>Tổng tiền</th><th>Trạng thái</th></tr></thead>
    <tbody>${list.map(r=>`<tr>
      <td><strong>${r.guestName||'—'}</strong><br><small class="text-muted">${r.phone||''}</small></td>
      <td>${typeBadge(r.type||r.orderType)}</td>
      <td>${r.tableName||r.address||r.tableId||'—'}</td>
      <td>${formatDate(r.date||r.createdAt)}<br><small class="text-muted">${r.time||''}</small></td>
      <td class="fw-500 cb-text-green">${r.total?formatPrice(r.total):'—'}</td>
      <td>${statusBadge(r.status)}</td>
    </tr>`).join('')}</tbody>
  </table></div>`;
}

function renderTopDrinksWidget(drinks){
  const top=ANALYTICS.getAll().sort((a,b)=>b.count-a.count).slice(0,5);
  const c=document.getElementById('topDrinksWidget');
  if(!top.length){c.innerHTML='<p class="text-muted small text-center py-2">Chưa có dữ liệu bán hàng</p>';return;}
  const max=top[0].count||1;
  c.innerHTML=top.map((item,i)=>`
    <div class="mb-3">
      <div class="d-flex justify-content-between small mb-1">
        <span class="fw-500">${i+1}. ${item.name}</span>
        <span class="text-muted">${item.count} ly</span>
      </div>
      <div class="cb-progress-bar"><div class="cb-progress-fill" style="width:${Math.round(item.count/max*100)}%"></div></div>
    </div>`).join('');
}

// ===== ANALYTICS =====
async function loadAnalytics(){
  try{
    const [reservations,drinks]=await Promise.all([getReservations(),getDrinks()]);
    adminDrinks=drinks;
    const analytics=ANALYTICS.getAll();
    const allOrders=reservations.filter(r=>r.type==='order'||r.orderType);
    const totalRevenue=reservations.reduce((s,r)=>s+(Number(r.total)||0),0);
    const totalItems=analytics.reduce((s,a)=>s+a.count,0);
    const avgOrder=allOrders.length?Math.round(totalRevenue/allOrders.length):0;

    document.getElementById('an-revenue').textContent=formatPrice(totalRevenue);
    document.getElementById('an-orders').textContent=allOrders.length;
    document.getElementById('an-items').textContent=totalItems;
    document.getElementById('an-avg').textContent=formatPrice(avgOrder);

    renderAnalyticsTable(analytics,totalItems);
    renderCategoryChart(analytics);
    renderOrderTypeChart(reservations);
  }catch(e){showToast('Không thể tải analytics','error');}
}

function renderAnalyticsTable(analytics,totalItems){
  const sorted=[...analytics].sort((a,b)=>b.count-a.count);
  const tbody=document.getElementById('analyticsTableBody');
  if(!sorted.length){tbody.innerHTML='<tr><td colspan="6" class="text-center text-muted py-4">Chưa có dữ liệu bán hàng.<br><small>Khi khách đặt món, dữ liệu sẽ tích lũy tại đây.</small></td></tr>';return;}
  const medals=['🥇','🥈','🥉'];
  tbody.innerHTML=sorted.map((item,i)=>{
    const pct=totalItems?Math.round(item.count/totalItems*100):0;
    return`<tr>
      <td>${medals[i]||`#${i+1}`}</td>
      <td class="fw-500">${item.name}</td>
      <td><span class="badge bg-light text-dark border">${item.category||'—'}</span></td>
      <td><span class="fw-bold">${item.count}</span></td>
      <td class="cb-text-green fw-500">${formatPrice(item.revenue||0)}</td>
      <td>
        <div class="d-flex align-items-center gap-2">
          <div class="cb-progress-bar flex-grow-1"><div class="cb-progress-fill" style="width:${pct}%"></div></div>
          <span class="small text-muted">${pct}%</span>
        </div>
      </td>
    </tr>`;
  }).join('');
}

function renderCategoryChart(analytics){
  const cats={};
  analytics.forEach(a=>{const c=a.category||'Khác';cats[c]=(cats[c]||0)+a.revenue;});
  const total=Object.values(cats).reduce((s,v)=>s+v,0)||1;
  const colors=['#2d6a4f','#40916c','#74c69d','#e09f3e','#d95f3b'];
  const el=document.getElementById('categoryChart');
  if(!Object.keys(cats).length){el.innerHTML='<p class="text-muted small text-center py-2">Chưa có dữ liệu</p>';return;}
  el.innerHTML=Object.entries(cats).map(([cat,rev],i)=>{
    const pct=Math.round(rev/total*100);
    return`<div class="mb-2">
      <div class="d-flex justify-content-between small mb-1">
        <span style="color:${colors[i%colors.length]}" class="fw-500">${cat}</span>
        <span class="text-muted">${formatPrice(rev)} (${pct}%)</span>
      </div>
      <div class="cb-progress-bar"><div class="cb-progress-fill" style="width:${pct}%;background:${colors[i%colors.length]}"></div></div>
    </div>`;
  }).join('');
}

function renderOrderTypeChart(reservations){
  const types={'reservation':0,'order':0};
  reservations.forEach(r=>{const t=r.type||'reservation';types[t]=(types[t]||0)+1;});
  const total=Object.values(types).reduce((s,v)=>s+v,0)||1;
  const labels={'reservation':'Đặt bàn','order':'Đặt món'};
  const colors={'reservation':'#2d6a4f','order':'#e09f3e'};
  const el=document.getElementById('orderTypeChart');
  el.innerHTML=Object.entries(types).map(([type,count])=>{
    const pct=Math.round(count/total*100);
    return`<div class="mb-2">
      <div class="d-flex justify-content-between small mb-1">
        <span style="color:${colors[type]}" class="fw-500">${labels[type]||type}</span>
        <span class="text-muted">${count} (${pct}%)</span>
      </div>
      <div class="cb-progress-bar"><div class="cb-progress-fill" style="width:${pct}%;background:${colors[type]}"></div></div>
    </div>`;
  }).join('');
}

// ===== DRINKS CRUD =====
async function loadAdminDrinks(){
  $('#drinksLoading').removeClass('d-none');$('#drinksTableBody').html('');
  try{
    adminDrinks=await getDrinks();
    $('#drinksLoading').addClass('d-none');
    renderDrinksTable(adminDrinks);
  }catch{$('#drinksLoading').addClass('d-none');showToast('Không thể tải thực đơn','error');}
}

function renderDrinksTable(drinks){
  const tbody=document.getElementById('drinksTableBody');
  if(!drinks||!drinks.length){tbody.innerHTML='<tr><td colspan="6" class="text-center text-muted py-4">Chưa có món nào.</td></tr>';return;}
  tbody.innerHTML=drinks.map(d=>`<tr>
    <td><img class="cb-admin-thumb" src="${d.image||d.imageUrl||'https://placehold.co/48x48/d8f3dc/2d6a4f?text=☕'}" alt="${d.name||''}" onerror="this.src='https://placehold.co/48x48/d8f3dc/2d6a4f?text=CF'"/></td>
    <td><strong>${d.name||'—'}</strong></td>
    <td><span class="badge bg-light text-dark border">${d.category||d.type||'—'}</span></td>
    <td class="text-nowrap fw-500 cb-text-green">${formatPrice(d.price)}</td>
    <td style="max-width:180px"><small class="text-muted">${(d.description||'').slice(0,60)}${(d.description||'').length>60?'…':''}</small></td>
    <td class="text-nowrap">
      <button class="btn btn-sm btn-outline-success me-1" onclick="openDrinkModal('${d.id}')" title="Sửa"><i class="bi bi-pencil"></i></button>
      <button class="btn btn-sm btn-outline-danger" onclick="confirmDelete('drink','${d.id}','${(d.name||'').replace(/'/g,'')}')" title="Xóa"><i class="bi bi-trash3"></i></button>
    </td>
  </tr>`).join('');
}

function filterDrinksTable(){
  const search=($('#adminSearchDrink').val()||'').toLowerCase();
  const cat=$('#adminFilterCat').val()||'';
  let f=adminDrinks;
  if(search) f=f.filter(d=>(d.name||'').toLowerCase().includes(search)||(d.description||'').toLowerCase().includes(search));
  if(cat) f=f.filter(d=>(d.category||d.type||'')===cat);
  renderDrinksTable(f);
}

function openDrinkModal(id=null){
  editDrinkId=id;
  clearAllErrors(['drinkName','drinkPrice','drinkCategory','drinkImage']);
  document.getElementById('drinkImgPreviewWrap').style.display='none';
  if(id){
    const d=adminDrinks.find(x=>String(x.id)===String(id));
    if(!d) return;
    document.getElementById('drinkModalTitle').textContent='Sửa món';
    document.getElementById('drinkId').value=d.id;
    document.getElementById('drinkName').value=d.name||'';
    document.getElementById('drinkPrice').value=d.price||'';
    document.getElementById('drinkCategory').value=d.category||d.type||'';
    document.getElementById('drinkImage').value=d.image||d.imageUrl||'';
    document.getElementById('drinkDesc').value=d.description||'';
    if(d.image||d.imageUrl){document.getElementById('drinkImgPreview').src=d.image||d.imageUrl;document.getElementById('drinkImgPreviewWrap').style.display='';}
  }else{
    document.getElementById('drinkModalTitle').textContent='Thêm món mới';
    document.getElementById('drinkForm').reset();
  }
  new bootstrap.Modal(document.getElementById('drinkEditModal')).show();
}

function validateDrinkForm(){
  clearAllErrors(['drinkName','drinkPrice','drinkCategory','drinkImage']);
  let valid=true;
  const name=document.getElementById('drinkName').value.trim();
  const price=Number(document.getElementById('drinkPrice').value);
  const cat=document.getElementById('drinkCategory').value;
  const img=document.getElementById('drinkImage').value.trim();
  if(!name){showError('drinkName','Tên món không được để trống');valid=false;}
  if(!price||price<=0){showError('drinkPrice','Giá phải lớn hơn 0');valid=false;}
  if(!cat){showError('drinkCategory','Vui lòng chọn danh mục');valid=false;}
  if(!img){showError('drinkImage','URL ảnh không được để trống');valid=false;}
  else if(!isValidImageUrl(img)){showError('drinkImage','URL ảnh không hợp lệ');valid=false;}
  return valid;
}

async function saveDrink(){
  if(!validateDrinkForm()) return;
  const data={name:document.getElementById('drinkName').value.trim(),price:Number(document.getElementById('drinkPrice').value),category:document.getElementById('drinkCategory').value,image:document.getElementById('drinkImage').value.trim(),description:document.getElementById('drinkDesc').value.trim()};
  $('#saveDrinkText').addClass('d-none');$('#saveDrinkSpinner').removeClass('d-none');$('#saveDrinkBtn').prop('disabled',true);
  try{
    if(editDrinkId){await updateDrink(editDrinkId,data);showToast('Cập nhật món thành công!','success');}
    else{await createDrink(data);showToast('Thêm món mới thành công!','success');}
    bootstrap.Modal.getInstance(document.getElementById('drinkEditModal')).hide();
    loadAdminDrinks();loadDashboard();
  }catch{showToast('Lưu thất bại. Vui lòng thử lại!','error');}
  finally{$('#saveDrinkText').removeClass('d-none');$('#saveDrinkSpinner').addClass('d-none');$('#saveDrinkBtn').prop('disabled',false);}
}

// ===== IMPORT DRINKS FROM API =====
async function openImportDrinksModal(){
  document.getElementById('importDrinksUrl').value='';
  document.getElementById('importDrinksResult').innerHTML='';
  document.getElementById('importDrinksForm').reset();
  new bootstrap.Modal(document.getElementById('importDrinksModal')).show();
}

async function importDrinksFromApi(){
  const url=document.getElementById('importDrinksUrl').value.trim();
  const resultDiv=document.getElementById('importDrinksResult');
  
  if(!url){
    showError('importDrinksUrl','Vui lòng nhập URL API');
    return;
  }
  
  if(!url.startsWith('http://') && !url.startsWith('https://')){
    showError('importDrinksUrl','URL phải bắt đầu với http:// hoặc https://');
    return;
  }
  
  clearError('importDrinksUrl');
  $('#importDrinksText').addClass('d-none');
  $('#importDrinksSpinner').removeClass('d-none');
  $('#importDrinksBtn').prop('disabled',true);
  resultDiv.innerHTML='<div class="text-center"><div class="cb-spinner"></div> Đang tải dữ liệu...</div>';
  
  try{
    const data=await apiFetch(url);
    const drinks=Array.isArray(data)?data:data.data||data.items||[];
    
    if(!drinks.length){
      resultDiv.innerHTML='<div class="alert alert-warning"><i class="bi bi-exclamation-triangle me-2"></i>Không tìm thấy dữ liệu đồ uống trong API</div>';
      return;
    }
    
    let successCount=0,errorCount=0;
    const results=[];
    
    for(const item of drinks){
      try{
        const drinkData={
          name:item.name||item.title||item.productName||'',
          price:Number(item.price)||0,
          category:item.category||item.type||item.category_name||'Khác',
          image:item.image||item.imageUrl||item.img||item.photo||'https://placehold.co/48x48/d8f3dc/2d6a4f?text=☕',
          description:item.description||item.desc||item.notes||''
        };
        
        if(!drinkData.name||!drinkData.price){
          errorCount++;
          results.push(`<small class="text-danger"><i class="bi bi-x-circle me-1"></i>${item.name||'(Không có tên)'} - Thiếu thông tin bắt buộc</small>`);
          continue;
        }
        
        await createDrink(drinkData);
        successCount++;
        results.push(`<small class="text-success"><i class="bi bi-check-circle me-1"></i>${drinkData.name}</small>`);
      }catch(e){
        errorCount++;
        results.push(`<small class="text-danger"><i class="bi bi-x-circle me-1"></i>${item.name||'(Lỗi)'} - ${e.message}</small>`);
      }
    }
    
    resultDiv.innerHTML=`
      <div class="alert alert-info mb-3">
        <strong>Kết quả import:</strong> ${successCount} thành công, ${errorCount} thất bại
      </div>
      <div style="max-height:200px;overflow-y:auto;">
        ${results.join('<br>')}
      </div>
    `;
    
    if(successCount>0){
      showToast(`Đã thêm ${successCount} món thành công!`,'success');
      setTimeout(()=>{
        bootstrap.Modal.getInstance(document.getElementById('importDrinksModal')).hide();
        loadAdminDrinks();
        loadDashboard();
      },1500);
    }
  }catch(e){
    resultDiv.innerHTML=`<div class="alert alert-danger"><i class="bi bi-exclamation-circle me-2"></i>Lỗi: ${e.message}</div>`;
    showError('importDrinksUrl',e.message);
  }finally{
    $('#importDrinksText').removeClass('d-none');
    $('#importDrinksSpinner').addClass('d-none');
    $('#importDrinksBtn').prop('disabled',false);
  }
}

// ===== TABLES CRUD =====
async function loadAdminTables(){
  try{
    adminTables=await getTables();
    renderTablesTable(adminTables);
  }catch{showToast('Không thể tải bàn','error');}
}

function renderTablesTable(tables){
  const container=document.getElementById('adminTablesGrid');
  if(!container){console.error('adminTablesGrid not found');return;}
  if(!tables||!tables.length){container.innerHTML='<div class="col-12"><p class="text-center text-muted py-4">Chưa có bàn nào.</p></div>';return;}
  container.innerHTML=tables.map(t=>`
    <div class="col-sm-6 col-lg-4">
      <div class="cb-admin-card">
        <h6 class="fw-bold mb-2">${t.name||t.tableName||'—'}</h6>
        <p class="mb-2"><span class="badge bg-light text-dark border">${t.capacity||'—'} chỗ</span></p>
        <p class="mb-3"><span class="cb-status ${t.status==='available'?'cb-status-confirmed':'cb-status-pending'}">${t.status==='available'?'Trống':'Đang sử dụng'}</span></p>
        <div class="d-flex gap-2">
          <button class="btn btn-sm btn-outline-success flex-grow-1" onclick="openTableModal('${t.id}')" title="Sửa"><i class="bi bi-pencil me-1"></i>Sửa</button>
          <button class="btn btn-sm btn-outline-danger" onclick="confirmDelete('table','${t.id}','${(t.name||t.tableName||'').replace(/'/g,'')}')" title="Xóa"><i class="bi bi-trash3"></i></button>
        </div>
      </div>
    </div>`).join('');
}

function openTableModal(id=null){
  editTableId=id;
  clearAllErrors(['tableName','tableCapacity']);
  if(id){
    const t=adminTables.find(x=>String(x.id)===String(id));
    if(!t) return;
    document.getElementById('tableModalTitle').textContent='Sửa bàn';
    document.getElementById('tableId').value=t.id;
    document.getElementById('tableName').value=t.name||t.tableName||'';
    document.getElementById('tableCapacity').value=t.capacity||'';
  }else{
    document.getElementById('tableModalTitle').textContent='Thêm bàn mới';
    document.getElementById('tableForm').reset();
  }
  new bootstrap.Modal(document.getElementById('tableEditModal')).show();
}

function validateTableForm(){
  clearAllErrors(['tableName','tableCapacity']);
  let valid=true;
  const name=document.getElementById('tableName').value.trim();
  const cap=Number(document.getElementById('tableCapacity').value);
  if(!name){showError('tableName','Tên bàn không được để trống');valid=false;}
  if(!cap||cap<=0){showError('tableCapacity','Sức chứa phải lớn hơn 0');valid=false;}
  return valid;
}

async function saveTable(){
  if(!validateTableForm()) return;
  const data={name:document.getElementById('tableName').value.trim(),capacity:Number(document.getElementById('tableCapacity').value),status:'available'};
  $('#saveTableText').addClass('d-none');$('#saveTableSpinner').removeClass('d-none');$('#saveTableBtn').prop('disabled',true);
  try{
    if(editTableId){await updateTable(editTableId,data);showToast('Cập nhật bàn thành công!','success');}
    else{await createTable(data);showToast('Thêm bàn mới thành công!','success');}
    bootstrap.Modal.getInstance(document.getElementById('tableEditModal')).hide();
    loadAdminTables();
  }catch{showToast('Lưu thất bại. Vui lòng thử lại!','error');}
  finally{$('#saveTableText').removeClass('d-none');$('#saveTableSpinner').addClass('d-none');$('#saveTableBtn').prop('disabled',false);}
}

// ===== RESERVATIONS CRUD =====
async function loadAdminReservations(){
  const loading=document.getElementById('reservLoading');
  if(loading) loading.style.display='';
  try{
    adminReservations=await getReservations();
    if(loading) loading.style.display='none';
    filteredReservations=adminReservations;
    renderReservationsTable(adminReservations);
  }catch{
    if(loading) loading.style.display='none';
    showToast('Không thể tải đơn','error');
  }
}

function renderReservationsTable(reservations){
  const tbody=document.getElementById('reservTableBody');
  if(!tbody){console.error('reservTableBody not found');return;}
  if(!reservations||!reservations.length){tbody.innerHTML='<tr><td colspan="9" class="text-center text-muted py-4">Chưa có đơn nào.</td></tr>';return;}
  tbody.innerHTML=reservations.map(r=>{
    const rtype=r.type||'reservation';
    const items=r.items?`${r.items.length} món`:'';
    const detail=rtype==='order'?items:`${r.guestCount||'—'} khách`;
    return`<tr>
      <td class="text-muted small">#${r.id||'—'}</td>
      <td>${typeBadge(rtype)}</td>
      <td><strong>${r.guestName||'—'}</strong><br><small class="text-muted">${r.phone||''}</small></td>
      <td><small>${detail}</small>${r.note?`<br><small class="text-muted"><i class="bi bi-chat-dots me-1"></i>${r.note.slice(0,30)}</small>`:''}</td>
      <td><small>${r.tableName||r.address||r.tableId||'—'}</small></td>
      <td class="text-nowrap"><small>${formatDate(r.date||r.createdAt)}<br>${r.time||''}</small></td>
      <td class="fw-500 text-nowrap ${r.total?'cb-text-green':''}">${r.total?formatPrice(r.total):'—'}</td>
      <td>${statusBadge(r.status)}</td>
      <td class="text-nowrap">
        <button class="btn btn-sm btn-outline-secondary me-1" onclick="showReservDetail('${r.id}')" title="Chi tiết"><i class="bi bi-eye"></i></button>
        ${r.status==='pending'?`
          <button class="btn btn-sm btn-success me-1" onclick="changeReservStatus('${r.id}','confirmed')" title="Xác nhận"><i class="bi bi-check-lg"></i></button>
          <button class="btn btn-sm btn-warning me-1" onclick="changeReservStatus('${r.id}','cancelled')" title="Hủy"><i class="bi bi-x-lg"></i></button>`:''}
        <button class="btn btn-sm btn-outline-danger" onclick="confirmDelete('reservation','${r.id}','#${r.id}')" title="Xóa"><i class="bi bi-trash3"></i></button>
      </td>
    </tr>`;
  }).join('');
}

function showReservDetail(id){
  const r=adminReservations.find(x=>String(x.id)===String(id));
  if(!r)return;
  document.getElementById('reservDetailTitle').textContent=`Chi tiết đơn #${r.id}`;
  const isOrder=r.type==='order'||r.orderType;
  const itemsHtml=r.items&&r.items.length?`
    <h6 class="fw-600 mt-3 mb-2">Danh sách món:</h6>
    ${r.items.map(it=>`<div class="d-flex justify-content-between py-1 border-bottom small"><span>${it.name} × ${it.qty}</span><span class="fw-500">${formatPrice(Number(it.price)*it.qty)}</span></div>`).join('')}
    <div class="d-flex justify-content-between pt-2 fw-bold"><span>Tổng cộng</span><span class="cb-text-green">${formatPrice(r.total)}</span></div>`:'';
  document.getElementById('reservDetailBody').innerHTML=`
    <div class="row g-3">
      <div class="col-md-6">
        <div class="cb-admin-card p-3">
          <h6 class="fw-600 mb-3"><i class="bi bi-person me-2 cb-text-green"></i>Thông tin khách</h6>
          <p class="mb-1 small"><strong>Họ tên:</strong> ${r.guestName||'—'}</p>
          <p class="mb-1 small"><strong>Điện thoại:</strong> ${r.phone||'—'}</p>
          <p class="mb-1 small"><strong>Email:</strong> ${r.email||'—'}</p>
          <p class="mb-0 small"><strong>Ghi chú:</strong> ${r.note||'Không có'}</p>
        </div>
      </div>
      <div class="col-md-6">
        <div class="cb-admin-card p-3">
          <h6 class="fw-600 mb-3"><i class="bi bi-info-circle me-2 cb-text-green"></i>Thông tin đơn</h6>
          <p class="mb-1 small"><strong>Loại:</strong> ${typeBadge(r.type||r.orderType||'reservation')}</p>
          <p class="mb-1 small"><strong>Hình thức:</strong> ${r.orderType?({dineIn:'Tại quán',takeaway:'Mang về',online:'Đặt online'}[r.orderType]||r.orderType):'Đặt bàn'}</p>
          <p class="mb-1 small"><strong>Bàn / Địa chỉ:</strong> ${r.tableName||r.address||r.tableId||'—'}</p>
          <p class="mb-1 small"><strong>Ngày & Giờ:</strong> ${formatDate(r.date||r.createdAt)} ${r.time||''}</p>
          <p class="mb-0 small"><strong>Trạng thái:</strong> ${statusBadge(r.status)}</p>
        </div>
      </div>
      ${itemsHtml?`<div class="col-12"><div class="cb-admin-card p-3">${itemsHtml}</div></div>`:''}
    </div>
    ${r.status==='pending'?`<div class="d-flex gap-2 mt-3">
      <button class="btn cb-btn-primary flex-grow-1" onclick="changeReservStatus('${r.id}','confirmed');bootstrap.Modal.getInstance(document.getElementById('reservDetailModal')).hide()"><i class="bi bi-check-lg me-2"></i>Xác nhận</button>
      <button class="btn btn-outline-danger flex-grow-1" onclick="changeReservStatus('${r.id}','cancelled');bootstrap.Modal.getInstance(document.getElementById('reservDetailModal')).hide()"><i class="bi bi-x-lg me-2"></i>Hủy đơn</button>
    </div>`:''}`;
  new bootstrap.Modal(document.getElementById('reservDetailModal')).show();
}

async function changeReservStatus(id,status){
  jqUpdateReservationStatus(id,status,()=>{
    showToast(status==='confirmed'?`✅ Đã xác nhận đơn #${id}`:`❌ Đã hủy đơn #${id}`,'success');
    const r=adminReservations.find(x=>String(x.id)===String(id));
    if(r){
      NOTIF.add({type:status==='confirmed'?'booking':'info',
        title:status==='confirmed'?'Đơn của bạn đã được xác nhận!':'Đơn hàng bị hủy',
        message:status==='confirmed'?`Bàn ${r.tableName||r.tableId||''} lúc ${r.time||''} ngày ${formatDate(r.date||r.createdAt)} đã xác nhận.`:`Đơn #${id} đã bị hủy. Liên hệ quán để biết thêm.`,
        icon:status==='confirmed'?'bi-calendar-check':'bi-x-circle'});
      // Update analytics if confirmed order
      if(status==='confirmed'&&r.items&&r.items.length) ANALYTICS.addOrder(r.items);
    }
    loadAdminReservations();loadDashboard();
  },()=>showToast('Cập nhật thất bại','error'));
}

function updatePendingBadge(){
  const p=adminReservations.filter(r=>r.status==='pending').length;
  $('#pendingCount').text(p);
  const se=document.getElementById('stat-pending');if(se)se.textContent=p;
}

// ===== STATUS/TYPE BADGES =====
function statusBadge(status){
  const m={pending:['cb-status-pending','Chờ xác nhận'],confirmed:['cb-status-confirmed','Đã xác nhận'],cancelled:['cb-status-cancelled','Đã hủy']};
  const[cls,label]=m[status]||m.pending;
  return`<span class="cb-status ${cls}">${label}</span>`;
}
function typeBadge(type){
  const m={reservation:'<span class="badge bg-light text-dark border"><i class="bi bi-calendar-check me-1"></i>Đặt bàn</span>',order:'<span class="badge cb-badge-amber"><i class="bi bi-bag me-1"></i>Đặt món</span>'};
  return m[type]||m.reservation;
}

// ===== DELETE =====
function confirmDelete(type,id,label){
  const modal=new bootstrap.Modal(document.getElementById('deleteConfirmModal'));
  document.getElementById('deleteConfirmMsg').textContent=`Bạn có chắc muốn xóa "${label}"? Thao tác không thể hoàn tác.`;
  document.getElementById('confirmDeleteBtn').onclick=async()=>{
    try{
      if(type==='drink') await deleteDrink(id);
      if(type==='table') await deleteTable(id);
      if(type==='reservation') await deleteReservation(id);
      bootstrap.Modal.getInstance(document.getElementById('deleteConfirmModal')).hide();
      showToast('Đã xóa thành công!','success');
      if(type==='drink') loadAdminDrinks();
      if(type==='table') loadAdminTables();
      if(type==='reservation') loadAdminReservations();
      loadDashboard();
    }catch{showToast('Xóa thất bại','error');}
  };
  modal.show();
}

// ===== NOTIFICATIONS =====
function handleNotifySubmit(e){
  e.preventDefault();
  clearAllErrors(['notifyTitle','notifyContent']);
  const title=document.getElementById('notifyTitle').value.trim();
  const content=document.getElementById('notifyContent').value.trim();
  const type=document.getElementById('notifyType').value;
  let valid=true;
  if(!title){showError('notifyTitle','Tiêu đề không được để trống');valid=false;}
  if(!content){showError('notifyContent','Nội dung không được để trống');valid=false;}
  if(!valid)return;
  NOTIF.add({type,title,message:content,icon:'bi-bell'});
  showToast('Đã gửi thông báo!','success');
  document.getElementById('notifyForm').reset();
  const typeMap={promo:{cls:'cb-notify-promo',badge:'<span class="badge bg-warning text-dark">Khuyến mãi</span>'},confirm:{cls:'cb-notify-confirm',badge:'<span class="badge bg-success">Xác nhận</span>'},info:{cls:'cb-notify-info',badge:'<span class="badge bg-info text-dark">Thông tin</span>'}};
  const t=typeMap[type]||typeMap.info;
  const item=document.createElement('div');
  item.className=`cb-notify-item ${t.cls}`;
  item.innerHTML=`<div class="d-flex justify-content-between"><strong>${title}</strong>${t.badge}</div><p class="small text-muted mb-0 mt-1">${content}</p>`;
  item.style.display='none';
  document.getElementById('notifyHistory').prepend(item);
  $(item).slideDown(300);
}

function clearNotifyHistory(){
  document.getElementById('notifyHistory').innerHTML='<p class="text-muted small text-center py-3">Chưa có thông báo nào được gửi.</p>';
}
