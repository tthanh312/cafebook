/* ========== main.js ========== */
let allDrinks     = [];
let allTables     = [];
let cart          = [];
let orderCart     = [];
let selectedTable = null;
let currentFilter = 'all';
let modalDrink    = null;
let modalQty      = 1;
let currentUser   = null;
let orderType     = 'dine-in';

// ===== INIT =====
document.addEventListener('DOMContentLoaded', () => {
  currentUser = AUTH.get();
  updateNavUser();

  const today = new Date().toISOString().split('T')[0];
  const bd = document.getElementById('bookDate');
  if (bd) bd.min = today;

  loadDrinks();
  loadTables();
  loadUserNotifications();
  updateNotifBadge();

  // Filter tabs
  document.querySelectorAll('.cb-filter-btn').forEach(btn => {
    btn.addEventListener('click', function () {
      document.querySelectorAll('.cb-filter-btn').forEach(b => b.classList.remove('active'));
      this.classList.add('active');
      currentFilter = this.dataset.filter;
      renderMenu(allDrinks);
    });
  });

  // Search menu
  const si = document.getElementById('searchDrink');
  if (si) si.addEventListener('input', debounce(() => renderMenu(allDrinks), 280));

  // Search order
  const osi = document.getElementById('orderSearchDrink');
  if (osi) osi.addEventListener('input', debounce(() => renderOrderMenu(allDrinks), 280));

  // Login form
  const lf = document.getElementById('loginForm');
  if (lf) lf.addEventListener('submit', handleLogin);

  // Booking form
  const bf = document.getElementById('bookingForm');
  if (bf) bf.addEventListener('submit', handleBooking);

  document.getElementById('cartBtn').addEventListener('click', openCart);
  document.getElementById('loginBtn').addEventListener('click', openLoginModal);

  // jQuery scroll effect
  $(window).on('scroll', function () {
    $('.cb-navbar').toggleClass('cb-navbar-scrolled', $(this).scrollTop() > 60);
  });
});

// ===== USER NAV =====
function updateNavUser() {
  const btn = document.getElementById('loginBtn');
  if (!btn) return;
  if (currentUser) {
    btn.innerHTML = `<i class="bi bi-person-check-fill me-1"></i>${currentUser.name}`;
    btn.onclick = showUserMenu;
  } else {
    btn.innerHTML = `<i class="bi bi-person-circle me-1"></i>Đăng nhập`;
    btn.onclick = openLoginModal;
  }
}

function showUserMenu() {
  if (confirm(`Xin chào ${currentUser.name}!\n\nĐăng xuất khỏi tài khoản?`)) {
    AUTH.logout(); currentUser = null; updateNavUser();
    showToast('Đã đăng xuất', 'success'); loadUserNotifications();
  }
}

// ===== LOGIN =====
function openLoginModal() {
  new bootstrap.Modal(document.getElementById('loginModal')).show();
}

let loginRole = 'guest';
function switchLoginTab(role) {
  loginRole = role;
  $('#tabGuest').toggleClass('active', role === 'guest');
  $('#tabAdmin').toggleClass('active', role === 'admin');
  document.getElementById('loginUsername').placeholder = role === 'admin' ? 'admin' : 'guest';
  clearAllErrors(['loginUsername', 'loginPassword']);
  $('#loginError').addClass('d-none');
}

function handleLogin(e) {
  e.preventDefault();
  const u = document.getElementById('loginUsername').value.trim();
  const p = document.getElementById('loginPassword').value;
  clearAllErrors(['loginUsername', 'loginPassword']);
  $('#loginError').addClass('d-none');
  let valid = true;
  if (!u) { showError('loginUsername', 'Vui lòng nhập tên đăng nhập'); valid = false; }
  if (!p) { showError('loginPassword', 'Vui lòng nhập mật khẩu'); valid = false; }
  if (!valid) return;

  $('#loginBtnText').addClass('d-none'); $('#loginBtnSpinner').removeClass('d-none');
  setTimeout(() => {
    $('#loginBtnText').removeClass('d-none'); $('#loginBtnSpinner').addClass('d-none');
    const user = AUTH.login(u, p);
    if (!user) { $('#loginError').text('Sai thông tin đăng nhập').removeClass('d-none'); return; }
    if (loginRole === 'admin' && user.role !== 'admin') { $('#loginError').text('Tài khoản không có quyền admin').removeClass('d-none'); return; }
    AUTH.save(user); currentUser = user;
    bootstrap.Modal.getInstance(document.getElementById('loginModal')).hide();
    updateNavUser();
    if (user.role === 'admin') { window.location.href = 'admin.html'; }
    else { showToast(`Chào mừng, ${user.name}! ☕`, 'success'); loadUserNotifications(); }
  }, 700);
}

// ===== LOAD DRINKS =====
async function loadDrinks() {
  const skels = Array(8).fill(`<div class="col-6 col-md-4 col-lg-3"><div class="cb-card-skeleton"><div class="cb-skel-img"></div><div class="cb-skel-line w-75 mt-3"></div><div class="cb-skel-line w-50 mt-2"></div></div></div>`).join('');
  document.getElementById('menuLoading').innerHTML = skels;
  document.getElementById('menuGrid').innerHTML = '';
  document.getElementById('menuError').classList.add('d-none');
  try {
    allDrinks = await getDrinks();
    document.getElementById('menuLoading').innerHTML = '';
    renderMenu(allDrinks);
    renderOrderMenu(allDrinks);
    populateOrderTableSelect();
  } catch {
    document.getElementById('menuLoading').innerHTML = '';
    document.getElementById('menuError').classList.remove('d-none');
    showToast('Không thể tải thực đơn', 'error');
  }
}

function renderMenu(drinks) {
  const grid = document.getElementById('menuGrid');
  const search = (document.getElementById('searchDrink').value || '').toLowerCase();
  let filtered = drinks;
  if (currentFilter !== 'all') filtered = filtered.filter(d => (d.category || d.type || '') === currentFilter);
  if (search) filtered = filtered.filter(d => (d.name || '').toLowerCase().includes(search) || (d.description || '').toLowerCase().includes(search));
  if (!filtered.length) {
    grid.innerHTML = `<div class="col-12 text-center py-5 text-muted"><i class="bi bi-cup-hot" style="font-size:2.5rem;opacity:.3"></i><p class="mt-2">Không tìm thấy đồ uống phù hợp</p></div>`;
    return;
  }
  grid.innerHTML = filtered.map(d => `
    <div class="col-6 col-md-4 col-lg-3">
      <div class="cb-drink-card" onclick="openDrinkDetail('${d.id}')">
        <div class="cb-drink-img-wrap">
          <img class="cb-drink-img" src="${d.image || d.imageUrl || 'https://placehold.co/300x200/d8f3dc/2d6a4f?text=☕'}" alt="${d.name||''}" onerror="this.src='https://placehold.co/300x200/d8f3dc/2d6a4f?text=CF'" />
          <span class="cb-drink-cat-overlay">${d.category || d.type || 'Đồ uống'}</span>
        </div>
        <div class="cb-drink-body">
          <div class="cb-drink-name">${d.name || ''}</div>
          <div class="cb-drink-desc">${(d.description || 'Thức uống thơm ngon').slice(0,55)}...</div>
          <div class="cb-drink-footer">
            <span class="cb-drink-price">${formatPrice(d.price)}</span>
            <button class="cb-drink-add" onclick="event.stopPropagation();quickAddToCart('${d.id}')"><i class="bi bi-plus"></i></button>
          </div>
        </div>
      </div>
    </div>`).join('');
}

// ===== ORDER MENU =====
function renderOrderMenu(drinks) {
  const list = document.getElementById('orderMenuList');
  if (!list) return;
  const search = (document.getElementById('orderSearchDrink').value || '').toLowerCase();
  let filtered = drinks;
  if (search) filtered = filtered.filter(d => (d.name||'').toLowerCase().includes(search));
  if (!filtered.length) { list.innerHTML = '<div class="text-center text-muted py-3 small">Không tìm thấy món</div>'; return; }
  list.innerHTML = filtered.map(d => `
    <div class="cb-order-menu-item">
      <img src="${d.image || d.imageUrl || 'https://placehold.co/48x48/d8f3dc/2d6a4f?text=☕'}" alt="${d.name||''}" class="cb-order-thumb" onerror="this.src='https://placehold.co/48x48/d8f3dc/2d6a4f?text=CF'" />
      <div class="cb-order-item-info">
        <div class="fw-500">${d.name||''}</div>
        <div class="small text-muted">${d.category||d.type||''}</div>
      </div>
      <div class="cb-order-item-price">${formatPrice(d.price)}</div>
      <button class="cb-drink-add" onclick="addToOrderCart('${d.id}')"><i class="bi bi-plus"></i></button>
    </div>`).join('');
  document.getElementById('orderMenuLoading').style.display = 'none';
}

// ===== ORDER TYPE =====
function setOrderType(type, btn) {
  orderType = type;
  document.querySelectorAll('.cb-order-type-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  const labels = { 'dine-in': 'Tại quán', 'takeaway': 'Mang về', 'online': 'Đặt online' };
  document.getElementById('orderTypeBadge').textContent = labels[type];
  if (type === 'dine-in') {
    $('#dineInFields').show(); $('#deliveryFields').addClass('d-none'); $('#addressField').addClass('d-none');
  } else {
    $('#dineInFields').hide(); $('#deliveryFields').removeClass('d-none');
    if (type === 'online') $('#addressField').removeClass('d-none'); else $('#addressField').addClass('d-none');
  }
}

// ===== ORDER CART =====
function addToOrderCart(id) {
  const d = allDrinks.find(x => String(x.id) === String(id));
  if (!d) return;
  const ex = orderCart.find(x => x.id === id);
  if (ex) ex.qty++; else orderCart.push({...d, qty:1});
  renderReceipt(); showToast(`Thêm ${d.name}`, 'success');
}

function updateOrderQty(id, delta) {
  const item = orderCart.find(x => x.id === id);
  if (!item) return;
  item.qty = Math.max(0, item.qty + delta);
  if (item.qty === 0) orderCart = orderCart.filter(x => x.id !== id);
  renderReceipt();
}

function renderReceipt() {
  const container = document.getElementById('receiptItems');
  const totalEl   = document.getElementById('receiptTotal');
  if (!orderCart.length) {
    container.innerHTML = `<div class="text-center py-4 text-muted"><i class="bi bi-bag" style="font-size:2rem;opacity:.3"></i><p class="mt-2 small">Chưa có món nào</p></div>`;
    if (totalEl) totalEl.style.display = 'none';
    return;
  }
  container.innerHTML = orderCart.map(item => `
    <div class="cb-receipt-item">
      <img src="${item.image||item.imageUrl||'https://placehold.co/40x40/d8f3dc/2d6a4f?text=☕'}" class="cb-receipt-thumb" onerror="this.src='https://placehold.co/40x40/d8f3dc/2d6a4f?text=CF'" />
      <div style="flex:1">
        <div class="small fw-500">${item.name}</div>
        <div class="small text-muted">${formatPrice(item.price)} × ${item.qty}</div>
        <div class="d-flex align-items-center gap-2 mt-1">
          <div class="cb-qty-sm" onclick="updateOrderQty('${item.id}',-1)"><i class="bi bi-dash"></i></div>
          <span class="small fw-600">${item.qty}</span>
          <div class="cb-qty-sm" onclick="updateOrderQty('${item.id}',1)"><i class="bi bi-plus"></i></div>
        </div>
      </div>
      <div class="fw-600 small cb-text-green">${formatPrice(Number(item.price)*item.qty)}</div>
    </div>`).join('');
  const sub = orderCart.reduce((s,i) => s + Number(i.price)*i.qty, 0);
  const tax = Math.round(sub * 0.1);
  document.getElementById('receiptSubtotal').textContent = formatPrice(sub);
  document.getElementById('receiptTax').textContent = formatPrice(tax);
  document.getElementById('receiptGrandTotal').textContent = formatPrice(sub + tax);
  if (totalEl) totalEl.style.display = '';
}

async function placeOrder() {
  const errEl = document.getElementById('err-order');
  errEl.textContent = '';

  if (!orderCart.length) { errEl.textContent = 'Vui lòng chọn ít nhất 1 món'; return; }

  let payload = { orderType, items: orderCart.map(i => ({id:i.id, name:i.name, price:i.price, qty:i.qty})),
    note: document.getElementById('orderNote').value.trim(),
    status: 'pending', createdAt: new Date().toISOString() };

  if (orderType === 'dine-in') {
    const tbl = document.getElementById('orderTableSelect').value;
    payload.guestName  = document.getElementById('orderGuestName').value.trim() || 'Khách';
    payload.tableId    = tbl;
    payload.tableName  = tbl ? allTables.find(t => String(t.id)===tbl)?.name || tbl : 'Chưa chọn bàn';
  } else {
    const name  = document.getElementById('orderDeliveryName').value.trim();
    const phone = document.getElementById('orderDeliveryPhone').value.trim();
    if (!name)  { errEl.textContent = 'Vui lòng nhập họ tên'; return; }
    if (!phone || !isValidPhone(phone)) { errEl.textContent = 'Số điện thoại không hợp lệ'; return; }
    payload.guestName = name; payload.phone = phone;
    if (orderType === 'online') {
      const addr = document.getElementById('orderAddress').value.trim();
      if (!addr) { errEl.textContent = 'Vui lòng nhập địa chỉ giao hàng'; return; }
      payload.address = addr;
    }
  }

  const sub = orderCart.reduce((s,i) => s + Number(i.price)*i.qty, 0);
  payload.subtotal = sub; payload.tax = Math.round(sub*0.1); payload.total = sub + Math.round(sub*0.1);

  $('#placeOrderText').addClass('d-none'); $('#placeOrderSpinner').removeClass('d-none');
  document.getElementById('placeOrderBtn').disabled = true;

  try {
    const result = await createReservation({ ...payload, type: 'order' });
    const typeLabel = {	'dine-in':'Tại quán', takeaway:'Mang về', online:'Đặt online'}[orderType];

    document.getElementById('orderSuccessTitle').textContent = 'Đặt hàng thành công!';
    document.getElementById('orderSuccessMsg').textContent = `Đơn hàng của bạn đang được chuẩn bị. Vui lòng chờ!`;
    document.getElementById('orderRef').innerHTML = `
      <p class="mb-1"><strong>Mã đơn:</strong> #${result.id || genId()}</p>
      <p class="mb-1"><strong>Hình thức:</strong> ${typeLabel}</p>
      <p class="mb-1"><strong>Số món:</strong> ${orderCart.length} loại</p>
      <p class="mb-0"><strong>Tổng tiền:</strong> <span class="cb-text-green fw-bold">${formatPrice(payload.total)}</span></p>`;
    new bootstrap.Modal(document.getElementById('orderSuccessModal')).show();

    NOTIF.add({ type:'order', title:`Đặt hàng thành công (#${result.id||''})`,
      message:`${orderCart.length} món · ${typeLabel} · ${formatPrice(payload.total)}`, icon:'bi-bag-check' });
    updateNotifBadge(); loadUserNotifications();

    orderCart = []; renderReceipt();
    document.getElementById('orderNote').value = '';
    document.getElementById('orderGuestName') && (document.getElementById('orderGuestName').value = '');
  } catch { showToast('Đặt hàng thất bại. Vui lòng thử lại!', 'error'); }
  finally {
    $('#placeOrderText').removeClass('d-none'); $('#placeOrderSpinner').addClass('d-none');
    document.getElementById('placeOrderBtn').disabled = false;
  }
}

// ===== CART (sidebar) =====
function quickAddToCart(id) {
  const d = allDrinks.find(x => String(x.id)===String(id));
  if (d) addToCart(d, 1);
}

function addToCart(drink, qty=1) {
  const ex = cart.find(i => i.id === drink.id);
  if (ex) ex.qty += qty; else cart.push({...drink, qty});
  updateCartUI();
  showToast(`Đã thêm ${drink.name} ☕`, 'success');
}

function removeFromCart(id) { cart = cart.filter(i => i.id !== id); updateCartUI(); }
function updateCartQty(id, delta) {
  const item = cart.find(i => i.id === id);
  if (item) { item.qty = Math.max(1, item.qty + delta); updateCartUI(); }
}

function clearCart() { cart = []; updateCartUI(); showToast('Đã xóa giỏ hàng', 'success'); }

function goToOrder() {
  closeCart();
  orderCart = cart.map(i => ({...i}));
  cart = []; updateCartUI();
  renderReceipt();
  document.getElementById('order-section').scrollIntoView({behavior:'smooth'});
}

function updateCartUI() {
  const count = cart.reduce((s,i) => s+i.qty, 0);
  document.getElementById('cartCount').textContent = count;

  const sub   = cart.reduce((s,i) => s+Number(i.price)*i.qty, 0);
  const tax   = Math.round(sub*0.1);
  const total = sub + tax;
  const se = document.getElementById('cartSubtotal'); if(se) se.textContent = formatPrice(sub);
  const te = document.getElementById('cartTaxAmt');   if(te) te.textContent = formatPrice(tax);
  const ge = document.getElementById('cartTotal');    if(ge) ge.textContent = formatPrice(total);
  const fe = document.getElementById('cartFooter');   if(fe) fe.style.display = cart.length ? '' : 'none';

  const body = document.getElementById('cartItems');
  if (!body) return;
  if (!cart.length) {
    body.innerHTML = `<div class="text-center py-5 text-muted"><i class="bi bi-bag-x" style="font-size:2.5rem;opacity:.3"></i><p class="mt-2">Giỏ hàng trống</p></div>`;
    return;
  }
  body.innerHTML = cart.map(item => `
    <div class="cb-cart-item">
      <img class="cb-cart-thumb" src="${item.image||item.imageUrl||'https://placehold.co/52x52/d8f3dc/2d6a4f?text=☕'}" alt="${item.name}" onerror="this.src='https://placehold.co/52x52/d8f3dc/2d6a4f?text=CF'" />
      <div style="flex:1">
        <div class="cb-cart-item-name">${item.name}</div>
        <div class="cb-cart-item-price">${formatPrice(Number(item.price)*item.qty)}</div>
        <div class="cb-cart-qty">
          <div class="cb-qty-sm" onclick="updateCartQty('${item.id}',-1)"><i class="bi bi-dash"></i></div>
          <span style="font-size:.9rem;font-weight:600">${item.qty}</span>
          <div class="cb-qty-sm" onclick="updateCartQty('${item.id}',1)"><i class="bi bi-plus"></i></div>
        </div>
      </div>
      <span class="cb-cart-remove" onclick="removeFromCart('${item.id}')"><i class="bi bi-trash3"></i></span>
    </div>`).join('');
}

function openCart()  { document.getElementById('cartSidebar').classList.add('open'); document.getElementById('cartOverlay').classList.add('active'); }
function closeCart() { document.getElementById('cartSidebar').classList.remove('open'); document.getElementById('cartOverlay').classList.remove('active'); }

// ===== DRINK DETAIL =====
function openDrinkDetail(id) {
  const d = allDrinks.find(x => String(x.id)===String(id));
  if (!d) return;
  modalDrink = d; modalQty = 1;
  document.getElementById('drinkModalName').textContent = d.name||'';
  document.getElementById('drinkModalImg').src = d.image||d.imageUrl||'https://placehold.co/300x200/d8f3dc/2d6a4f?text=CaféBook';
  document.getElementById('drinkModalDesc').textContent = d.description||'Thức uống thơm ngon tại CaféBook';
  document.getElementById('drinkModalPrice').textContent = formatPrice(d.price);
  document.getElementById('drinkModalCat').textContent = d.category||d.type||'Đồ uống';
  document.getElementById('modalQty').textContent = 1;
  new bootstrap.Modal(document.getElementById('drinkModal')).show();
}

function changeQty(delta) { modalQty = Math.max(1, modalQty+delta); document.getElementById('modalQty').textContent = modalQty; }

function addToCartFromModal() {
  if (!modalDrink) return;
  addToCart(modalDrink, modalQty);
  bootstrap.Modal.getInstance(document.getElementById('drinkModal')).hide();
}

function addToOrderFromModal() {
  if (!modalDrink) return;
  for (let i=0;i<modalQty;i++) addToOrderCart(modalDrink.id);
  document.getElementById('order-section').scrollIntoView({behavior:'smooth'});
}

// ===== TABLES =====
async function loadTables() {
  document.getElementById('tablesLoading').style.display=''; document.getElementById('tablesGrid').innerHTML='';
  try {
    allTables = await getTables();
    document.getElementById('tablesLoading').style.display='none';
    renderTables(allTables);
    populateOrderTableSelect();
  } catch {
    document.getElementById('tablesLoading').style.display='none';
    document.getElementById('tablesGrid').innerHTML=`<div class="col-12 text-center text-muted py-3"><p>Không thể tải sơ đồ bàn. <span class="text-decoration-underline" style="cursor:pointer" onclick="loadTables()">Thử lại</span></p></div>`;
  }
}

function populateOrderTableSelect() {
  const sel = document.getElementById('orderTableSelect');
  if (!sel) return;
  const available = allTables.filter(t => (t.status||'available') === 'available');
  sel.innerHTML = '<option value="">-- Chọn bàn --</option>' + available.map(t => `<option value="${t.id}">${t.name||'Bàn '+t.id} (${t.capacity||2} khách)</option>`).join('');
}

function renderTables(tables) {
  const grid = document.getElementById('tablesGrid');
  if (!tables||!tables.length) { grid.innerHTML='<div class="col-12 text-center text-muted py-3">Chưa có bàn.</div>'; return; }
  const icons = {available:'bi-chair', reserved:'bi-calendar-check', occupied:'bi-person-fill'};
  const labels = {available:'Còn trống', reserved:'Đã đặt', occupied:'Đang dùng'};
  grid.innerHTML = tables.map(t => {
    const st = (t.status||'available').toLowerCase();
    const isSel = selectedTable && selectedTable.id === t.id;
    return `<div class="col-6 col-md-4 col-lg-3">
      <div class="cb-table-card status-${st}${isSel?' selected':''}"
        onclick="${st==='available'?`selectTable('${t.id}')`:''}"
        style="${st==='available'?'cursor:pointer':'opacity:.65;cursor:not-allowed'}">
        <div class="cb-table-icon ${st}"><i class="bi ${icons[st]||'bi-chair'}"></i></div>
        <div class="cb-table-name">${t.name||'Bàn '+t.id}</div>
        <div class="cb-table-cap"><i class="bi bi-people me-1"></i>${t.capacity||2} khách · ${t.zone||'Indoor'}</div>
        <div class="cb-table-status-label status-label-${st}">${labels[st]||st}</div>
        ${isSel?'<div class="cb-table-selected-mark"><i class="bi bi-check-circle-fill"></i></div>':''}
      </div>
    </div>`;
  }).join('');
}

function selectTable(id) {
  selectedTable = allTables.find(t => String(t.id)===String(id));
  if (!selectedTable) return;
  renderTables(allTables);
  document.getElementById('selectedTableDisplay').value = `${selectedTable.name||'Bàn '+selectedTable.id} (${selectedTable.capacity||2} khách)`;
  clearError('table');
  showToast(`Đã chọn ${selectedTable.name||'Bàn '+selectedTable.id}`, 'success');
  if (window.innerWidth < 992) document.getElementById('bookingForm').scrollIntoView({behavior:'smooth'});
}

// ===== BOOKING =====
function validateBookingForm() {
  clearAllErrors(['guestName','guestPhone','guestEmail','bookDate','bookTime','guestCount','table']);
  let valid = true;
  const name  = document.getElementById('guestName').value.trim();
  const phone = document.getElementById('guestPhone').value.trim();
  const email = document.getElementById('guestEmail').value.trim();
  const date  = document.getElementById('bookDate').value;
  const time  = document.getElementById('bookTime').value;
  const count = Number(document.getElementById('guestCount').value);

  if (!name||name.length<2) { showError('guestName','Họ tên phải có ít nhất 2 ký tự'); valid=false; }
  if (!phone) { showError('guestPhone','Vui lòng nhập số điện thoại'); valid=false; }
  else if (!isValidPhone(phone)) { showError('guestPhone','Số điện thoại không hợp lệ (VD: 0901234567)'); valid=false; }
  if (email && !isValidEmail(email)) { showError('guestEmail','Email không đúng định dạng'); valid=false; }
  if (!date) { showError('bookDate','Vui lòng chọn ngày'); valid=false; }
  else { const today=new Date().toISOString().split('T')[0]; if(date<today){showError('bookDate','Ngày không được trong quá khứ');valid=false;} }
  if (!time) { showError('bookTime','Vui lòng chọn giờ'); valid=false; }
  if (!count||count<1) { showError('guestCount','Số khách phải lớn hơn 0'); valid=false; }
  else if (count>10) { showError('guestCount','Tối đa 10 khách mỗi bàn'); valid=false; }
  if (!selectedTable) { showError('table','Vui lòng chọn bàn trên sơ đồ'); valid=false; }
  else if (selectedTable.capacity && count>Number(selectedTable.capacity)) { showError('guestCount',`Bàn này chỉ chứa tối đa ${selectedTable.capacity} khách`); valid=false; }
  return valid;
}

async function handleBooking(e) {
  e.preventDefault();
  if (!validateBookingForm()) return;
  const payload = {
    guestName:  document.getElementById('guestName').value.trim(),
    phone:      document.getElementById('guestPhone').value.trim(),
    email:      document.getElementById('guestEmail').value.trim(),
    tableId:    selectedTable.id, tableName: selectedTable.name||'Bàn '+selectedTable.id,
    date:       document.getElementById('bookDate').value,
    time:       document.getElementById('bookTime').value,
    guestCount: Number(document.getElementById('guestCount').value),
    note:       document.getElementById('bookNote').value.trim(),
    status:     'pending', type: 'reservation', createdAt: new Date().toISOString()
  };
  $('#bookingBtnText').addClass('d-none'); $('#bookingBtnSpinner').removeClass('d-none');
  document.getElementById('submitBookingBtn').disabled=true;
  try {
    const result = await createReservation(payload);
    document.getElementById('bookingForm').reset();
    document.getElementById('selectedTableDisplay').value='';
    selectedTable=null; renderTables(allTables);
    document.getElementById('bookingSuccessMsg').textContent=`Cảm ơn ${payload.guestName}! Đặt bàn đang chờ xác nhận từ quán.`;
    document.getElementById('bookingRef').innerHTML=`
      <p class="mb-1"><strong>Mã đặt bàn:</strong> #${result.id||genId()}</p>
      <p class="mb-1"><strong>Bàn:</strong> ${payload.tableName}</p>
      <p class="mb-1"><strong>Ngày & Giờ:</strong> ${formatDate(payload.date)} lúc ${payload.time}</p>
      <p class="mb-0"><strong>Số khách:</strong> ${payload.guestCount}</p>`;
    new bootstrap.Modal(document.getElementById('bookingSuccessModal')).show();
    NOTIF.add({type:'booking',title:'Đặt bàn thành công!',message:`Bàn ${payload.tableName} lúc ${payload.time} ngày ${formatDate(payload.date)}. Chờ xác nhận.`,icon:'bi-calendar-check'});
    updateNotifBadge(); loadUserNotifications();
    showToast('Đặt bàn thành công! Vui lòng chờ xác nhận.','success');
  } catch { showToast('Đặt bàn thất bại. Vui lòng thử lại!','error'); }
  finally { $('#bookingBtnText').removeClass('d-none'); $('#bookingBtnSpinner').addClass('d-none'); document.getElementById('submitBookingBtn').disabled=false; }
}

// ===== NOTIFICATIONS =====
function updateNotifBadge() {
  const count = NOTIF.getAll().filter(n=>!n.read).length;
  const badge = document.getElementById('notifBadge');
  if (!badge) return;
  badge.textContent = count;
  badge.classList.toggle('d-none', count===0);
}

function clearNotifications() {
  NOTIF.clear(); loadUserNotifications(); updateNotifBadge();
  showToast('Đã xóa tất cả thông báo','success');
}

function loadUserNotifications() {
  const container = document.getElementById('userNotifications');
  if (!container) return;
  const list = NOTIF.getAll();
  if (!list.length) {
    $(container).html(`<div class="cb-notify-empty text-center py-5 text-muted"><i class="bi bi-bell-slash" style="font-size:2.5rem;opacity:.3"></i><p class="mt-2">Chưa có thông báo nào.<br><small>Đặt bàn hoặc đặt món để nhận thông báo.</small></p></div>`).hide().fadeIn(300);
    return;
  }
  const typeMap = {
    booking:{cls:'cb-notify-confirm',badge:'<span class="badge bg-success">Đặt bàn</span>'},
    order:  {cls:'cb-notify-promo',  badge:'<span class="badge bg-warning text-dark">Đơn hàng</span>'},
    promo:  {cls:'cb-notify-promo',  badge:'<span class="badge bg-warning text-dark">Khuyến mãi</span>'},
    info:   {cls:'cb-notify-info',   badge:'<span class="badge bg-info text-dark">Thông tin</span>'}
  };
  const html = list.map(n => {
    const t = typeMap[n.type]||typeMap.info;
    const time = n.createdAt?new Date(n.createdAt).toLocaleString('vi-VN'):'';
    return `<div class="cb-notify-item ${t.cls} ${n.read?'':'cb-notify-unread'}">
      <div class="d-flex justify-content-between align-items-start gap-2">
        <strong class="small">${n.title}</strong>${t.badge}
      </div>
      <p class="small text-muted mb-0 mt-1">${n.message}</p>
      ${time?`<p class="small text-muted mb-0 mt-1 opacity-75"><i class="bi bi-clock me-1"></i>${time}</p>`:''}
    </div>`;
  }).join('');
  $(container).html(html).hide().slideDown(250);
}