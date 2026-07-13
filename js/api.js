// Safe localStorage wrapper to prevent crashes in private windows / disabled cookies
window.safeStorage = {
  getItem(key) {
    try {
      return localStorage.getItem(key);
    } catch (e) {
      console.warn('localStorage.getItem failed for key: ' + key, e);
      return window['__fs_' + key] || null;
    }
  },
  setItem(key, value) {
    try {
      localStorage.setItem(key, value);
    } catch (e) {
      console.warn('localStorage.setItem failed for key: ' + key, e);
      window['__fs_' + key] = String(value);
    }
  },
  removeItem(key) {
    try {
      localStorage.removeItem(key);
    } catch (e) {
      console.warn('localStorage.removeItem failed for key: ' + key, e);
      delete window['__fs_' + key];
    }
  }
};

// ─── CONFIGURATION ────────────────────────────────────────────────────────────
// Replace with your Supabase credentials.
const SUPABASE_URL = 'https://uqtuozxvnfsnyystiehl.supabase.co';
const SUPABASE_KEY = 'sb_publishable_rcotKh3gunvWw5RMJN_msA_ndNAgIY8';

// ─── CORE FETCH WRAPPER FOR SUPABASE ──────────────────────────────────────────
async function _supabaseFetch(path, options = {}) {
  const url = `${SUPABASE_URL}/rest/v1${path}`;
  const token = safeStorage.getItem('inv_auth_token') || SUPABASE_KEY;
  const headers = {
    'apikey': SUPABASE_KEY,
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json',
    ...options.headers
  };
  
  const res = await fetch(url, {
    ...options,
    headers
  });
  
  if (!res.ok) {
    if (res.status === 401 || res.status === 403) {
      // Clear expired credentials and reload
      safeStorage.removeItem('inv_auth_token');
      safeStorage.removeItem('inv_auth');
      safeStorage.removeItem('inv_user_mobile');
      window.location.reload();
      throw new Error('Session expired. Please log in again.');
    }
    const errText = await res.text();
    throw new Error(`Supabase error: ${res.status} - ${errText}`);
  }
  
  const contentType = res.headers.get('content-type');
  if (contentType && contentType.includes('application/json')) {
    return await res.json();
  }
  return null;
}

// ─── AUTHENTICATION API ──────────────────────────────────────────────────────
async function login(usernameOrEmail, password) {
  try {
    const email = usernameOrEmail.includes('@') ? usernameOrEmail : `${usernameOrEmail.toLowerCase()}@skagro.com`;
    const url = `${SUPABASE_URL}/auth/v1/token?grant_type=password`;
    
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'apikey': SUPABASE_KEY,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ email, password })
    });
    
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error_description || err.error || 'Authentication failed');
    }
    
    const json = await res.json();
    
    // Store token and credentials in local storage
    safeStorage.setItem('inv_auth_token', json.access_token);
    
    const username = email.split('@')[0];
    const capitalizedUser = username.charAt(0).toUpperCase() + username.slice(1);
    safeStorage.setItem('inv_auth', capitalizedUser);
    
    const mobile = json.user?.user_metadata?.mobile || json.user?.phone || '9999999999';
    safeStorage.setItem('inv_user_mobile', mobile);
    
    return { success: true, mobile };
  } catch (err) {
    console.error('Auth error:', err);
    return { success: false, error: err.message };
  }
}

// ─── DATA MAPPING HELPERS ────────────────────────────────────────────────────
function mapDbToProduct(row) {
  return {
    ProductID: row.product_id,
    BrandName: row.brand_name,
    ProductName: row.product_name,
    PackagingSize: row.packaging_size,
    UnitPrice: parseFloat(row.unit_price) || 0,
    LastUpdated: row.last_updated
  };
}

function mapProductToDb(p) {
  return {
    product_id: p.ProductID,
    brand_name: p.BrandName,
    product_name: p.ProductName,
    packaging_size: p.PackagingSize,
    unit_price: parseFloat(p.UnitPrice) || 0,
    last_updated: new Date().toISOString()
  };
}

function mapDbToClient(row) {
  return {
    ClientID: row.client_id,
    ClientName: row.client_name,
    Address: row.address,
    Phone: row.phone,
    GSTIN: row.gstin,
    DueAmount: parseFloat(row.due_amount) || 0,
    LastUpdated: row.last_updated
  };
}

function mapClientToDb(c) {
  return {
    client_id: c.ClientID,
    client_name: c.ClientName,
    address: c.Address,
    phone: c.Phone,
    gstin: c.GSTIN,
    due_amount: parseFloat(c.DueAmount) || 0,
    last_updated: new Date().toISOString()
  };
}

function mapDbToHistory(r) {
  return {
    UniqueID: r.unique_id,
    uniqueId: r.unique_id,
    InvoiceNumber: r.invoice_number,
    invoiceNumber: r.invoice_number,
    InvoiceType: r.invoice_type,
    DocumentType: r.document_type,
    Date: r.date,
    date: r.date,
    DueDate: r.due_date,
    dueDate: r.due_date,
    ClientName: r.client_name,
    customerName: r.client_name,
    clientName: r.client_name,
    ClientAddress: r.client_address,
    ClientPhone: r.client_phone,
    Phone: r.client_phone,
    mobile: r.client_phone,
    ClientGSTIN: r.client_gstin,
    GSTIN: r.client_gstin,
    ClientState: r.client_state,
    ClientStateCode: r.client_state_code,
    PlaceOfSupply: r.place_of_supply,
    Subtotal: parseFloat(r.subtotal) || 0,
    TaxableAmount: parseFloat(r.taxable_amount) || 0,
    Tax: parseFloat(r.tax) || 0,
    CGST: parseFloat(r.cgst) || 0,
    SGST: parseFloat(r.sgst) || 0,
    IGST: parseFloat(r.igst) || 0,
    TotalTax: parseFloat(r.total_tax) || 0,
    GrandTotal: parseFloat(r.grand_total) || 0,
    totalAmount: parseFloat(r.grand_total) || 0,
    DueAmount: parseFloat(r.due_amount) || 0,
    dueAmount: parseFloat(r.due_amount) || 0,
    NonGstTaxType: r.non_gst_tax_type,
    CompanyName: r.company_name,
    FromAddress: r.from_address,
    FromPhone: r.from_phone,
    FromEmail: r.from_email,
    FromGSTIN: r.from_gstin,
    Signatory: r.signatory,
    BankName: r.bank_name,
    BankAcc: r.bank_acc,
    BankIFSC: r.bank_ifsc,
    UPI: r.upi,
    Intro: r.intro,
    Terms: r.terms,
    ItemsJSON: JSON.stringify(r.items_json),
    items_json: r.items_json,
    LastUpdated: r.last_updated
  };
}

function cleanDate(d) {
  if (!d) return null;
  const s = String(d).trim();
  if (s === '' || s === '—' || s.toLowerCase() === 'null') return null;
  const match = s.match(/^\d{4}-\d{2}-\d{2}/);
  return match ? match[0] : null;
}

function mapHistoryToDb(h) {
  return {
    unique_id: h.UniqueID || h.meta?.uniqueId || '',
    invoice_number: h.InvoiceNumber || h.meta?.invoiceNumber || '',
    invoice_type: h.InvoiceType || '',
    document_type: h.DocumentType || '',
    date: cleanDate(h.Date || h.date),
    due_date: cleanDate(h.DueDate || h.dueDate),
    client_name: h.ClientName || h.customerName || h.clientName || '',
    client_address: h.ClientAddress || '',
    client_phone: h.ClientPhone || '',
    client_gstin: h.ClientGSTIN || h.GSTIN || '',
    client_state: h.ClientState || '',
    client_state_code: h.ClientStateCode || '',
    place_of_supply: h.PlaceOfSupply || '',
    subtotal: parseFloat(h.Subtotal) || 0,
    taxable_amount: parseFloat(h.TaxableAmount) || 0,
    tax: parseFloat(h.Tax) || 0,
    cgst: parseFloat(h.CGST) || 0,
    sgst: parseFloat(h.SGST) || 0,
    igst: parseFloat(h.IGST) || 0,
    total_tax: parseFloat(h.TotalTax) || 0,
    grand_total: parseFloat(h.GrandTotal) || 0,
    due_amount: parseFloat(h.DueAmount || h.dueAmount) || 0,
    non_gst_tax_type: h.NonGstTaxType || '',
    company_name: h.CompanyName || '',
    from_address: h.FromAddress || '',
    from_phone: h.FromPhone || '',
    from_email: h.FromEmail || '',
    from_gstin: h.FromGSTIN || '',
    signatory: h.Signatory || '',
    bank_name: h.BankName || '',
    bank_acc: h.BankAcc || '',
    bank_ifsc: h.bank_ifsc || h.BankIFSC || '',
    upi: h.UPI || '',
    intro: h.Intro || '',
    terms: h.Terms || '',
    items_json: h.ItemsJSON ? (typeof h.ItemsJSON === 'string' ? JSON.parse(h.ItemsJSON) : h.ItemsJSON) : h,
    last_updated: new Date().toISOString()
  };
}

// ─── PRODUCT API ─────────────────────────────────────────
async function getProducts() {
  try {
    const res = await _supabaseFetch('/products?select=*');
    return { success: true, data: res.map(mapDbToProduct) };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

async function addProduct(product) {
  try {
    const payload = mapProductToDb(product);
    await _supabaseFetch('/products', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
    return { success: true };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

async function updateProduct(product) {
  try {
    const payload = mapProductToDb(product);
    await _supabaseFetch(`/products?product_id=eq.${encodeURIComponent(product.ProductID)}`, {
      method: 'PATCH',
      body: JSON.stringify(payload)
    });
    return { success: true };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

async function deleteProduct(product) {
  try {
    const id = product.ProductID;
    await _supabaseFetch(`/products?product_id=eq.${encodeURIComponent(id)}`, {
      method: 'DELETE'
    });
    return { success: true };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

async function searchProduct(query) {
  try {
    const res = await _supabaseFetch(`/products?product_name=ilike.*${encodeURIComponent(query)}*`);
    return { success: true, data: res.map(mapDbToProduct) };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

// ─── CLIENT API ──────────────────────────────────────────
async function getClients() {
  try {
    const res = await _supabaseFetch('/clients?select=*');
    return { success: true, data: res.map(mapDbToClient) };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

async function addClient(client) {
  try {
    const payload = mapClientToDb(client);
    await _supabaseFetch('/clients', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
    return { success: true };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

async function updateClient(client) {
  try {
    const payload = mapClientToDb(client);
    await _supabaseFetch(`/clients?client_id=eq.${encodeURIComponent(client.ClientID)}`, {
      method: 'PATCH',
      body: JSON.stringify(payload)
    });
    return { success: true };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

async function deleteClient(client) {
  try {
    const id = client.ClientID;
    await _supabaseFetch(`/clients?client_id=eq.${encodeURIComponent(id)}`, {
      method: 'DELETE'
    });
    return { success: true };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

async function searchClient(query) {
  try {
    const res = await _supabaseFetch(`/clients?client_name=ilike.*${encodeURIComponent(query)}*`);
    return { success: true, data: res.map(mapDbToClient) };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

// ─── INVOICE / HISTORY API ─────────────────────────────────────────────────────
async function apiGetInvoices(filters = {}) {
  const res = await _supabaseFetch('/history?select=*&order=last_updated.desc');
  return res.map(mapDbToHistory);
}

async function apiGetInvoice(uniqueId) {
  if (!uniqueId) throw new Error('Invoice ID is required.');
  const idStr = String(uniqueId).trim();
  const res = await _supabaseFetch(`/history?or=(unique_id.eq.${encodeURIComponent(idStr)},invoice_number.eq.${encodeURIComponent(idStr)})&limit=1`);
  if (!res || res.length === 0) {
    throw new Error(`Invoice '${uniqueId}' not found`);
  }
  
  const mapped = mapDbToHistory(res[0]);
  return mapped.items_json || mapped;
}

async function apiSaveInvoice(invoiceData) {
  _validateInvoicePayload(invoiceData);
  const payload = mapHistoryToDb(invoiceData);
  
  // Check if invoice already exists
  const existing = await _supabaseFetch(`/history?unique_id=eq.${encodeURIComponent(payload.unique_id)}&limit=1`);
  
  if (existing && existing.length > 0) {
    await _supabaseFetch(`/history?unique_id=eq.${encodeURIComponent(payload.unique_id)}`, {
      method: 'PATCH',
      body: JSON.stringify(payload)
    });
    return {
      success: true,
      message: 'Invoice updated',
      uniqueId: payload.unique_id,
      invoiceNumber: payload.invoice_number,
      action: 'updated'
    };
  } else {
    await _supabaseFetch('/history', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
    return {
      success: true,
      message: 'Invoice created',
      uniqueId: payload.unique_id,
      invoiceNumber: payload.invoice_number,
      action: 'created'
    };
  }
}

async function apiUpdateInvoice(invoiceData) {
  return await apiSaveInvoice(invoiceData);
}

async function apiDeleteInvoice(uniqueId) {
  if (!uniqueId) throw new Error('Invoice ID is required for deletion.');
  const idStr = String(uniqueId).trim();
  await _supabaseFetch(`/history?or=(unique_id.eq.${encodeURIComponent(idStr)},invoice_number.eq.${encodeURIComponent(idStr)})`, {
    method: 'DELETE'
  });
  return { success: true, message: 'Deleted successfully' };
}

async function apiUpdateClientDue(clientName, dueAmount) {
  if (!clientName) return;
  try {
    const nameStr = clientName.trim();
    // Update the client record matching the name
    await _supabaseFetch(`/clients?client_name=ilike.${encodeURIComponent(nameStr)}`, {
      method: 'PATCH',
      body: JSON.stringify({
        due_amount: parseFloat(dueAmount) || 0,
        last_updated: new Date().toISOString()
      })
    });
    return { success: true };
  } catch (err) {
    console.warn('updateClientDue failed (non-critical):', err.message);
  }
}

async function apiGetNextInvoiceNumber() {
  try {
    const res = await _supabaseFetch('/history?select=invoice_number');
    const nums = res.map(i => parseInt(String(i.invoice_number || 0).replace(/[^0-9]/g, ''), 10) || 0);
    const max = Math.max(99, ...nums);
    return String(max + 1).padStart(3, '0');
  } catch (err) {
    console.warn('apiGetNextInvoiceNumber failed, using fallback:', err.message);
    const cached = safeStorage.getItem('invoice_history_cache');
    if (cached) {
      const list = JSON.parse(cached);
      const nums = list.map(i => parseInt(String(i.invoiceNumber || 0).replace(/[^0-9]/g, ''), 10) || 0);
      const max = Math.max(99, ...nums);
      return String(max + 1).padStart(3, '0');
    }
    return '100';
  }
}

// Export API
const api = {
  login,
  getProducts,
  addProduct,
  updateProduct,
  deleteProduct,
  searchProduct,
  getClients,
  addClient,
  updateClient,
  deleteClient,
  searchClient,
  apiGetInvoices,
  apiGetInvoice,
  apiSaveInvoice,
  apiUpdateInvoice,
  apiDeleteInvoice,
  apiGetNextInvoiceNumber,
};



// ─── PRIVATE VALIDATION ───────────────────────────────────────────────────────
function _validateInvoicePayload(data) {
  if (!data || typeof data !== 'object') throw new Error('Invalid invoice payload.');
  if (!data.meta) throw new Error('Invoice is missing meta block.');
  if (!data.customer) throw new Error('Invoice is missing customer block.');
  if (!Array.isArray(data.rows) || data.rows.length === 0) throw new Error('Invoice must have at least one product row.');
}

// ─── SHARED UI HELPERS (Theme & Profile) ──────────────────────────────────────
function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  safeStorage.setItem('theme', theme);
  const icon = document.getElementById('theme-icon');
  if (icon) icon.textContent = theme === 'dark' ? 'dark_mode' : 'light_mode';
}

function toggleTheme() {
  const current = safeStorage.getItem('theme') || 'dark';
  applyTheme(current === 'light' ? 'dark' : 'light');
}

function showProfileSymbol() {
  const auth = safeStorage.getItem('inv_auth');
  if (!auth) return;
  const tr = document.getElementById('toolbar-right');
  if (!tr || document.getElementById('profile-symbol')) return;

  const p = document.createElement('div');
  p.id = 'profile-symbol';
  p.className = 'profile-circle';
  p.textContent = auth.charAt(0).toUpperCase();
  const mobile = safeStorage.getItem('inv_user_mobile');
  if (mobile) p.title = `Logged in • ${mobile}`;
  tr.appendChild(p);
}

// Global initialization for all pages
window.addEventListener('DOMContentLoaded', () => {
  applyTheme(safeStorage.getItem('theme') || 'dark');
  showProfileSymbol();
  const btn = document.getElementById('theme-toggle');
  if (btn) btn.onclick = toggleTheme;

  // ─── GLOBAL TEXT FORMATTING ───────────────────────────────────────────────
  // Apply special formatting to all text-like inputs site-wide
  const handleFormatting = (e) => {
    const el = e.target;
    if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') {
      const skipTypes = ['password', 'date', 'checkbox', 'radio', 'file', 'email'];
      if (skipTypes.includes(el.type)) return;

      // Check if it's a phone field
      const isPhone = el.id.toLowerCase().includes('phone') || (el.placeholder && el.placeholder.toLowerCase().includes('phone'));

      if (el.value) {
        const start = el.selectionStart;
        const end = el.selectionEnd;
        const originalVal = el.value;

        let formatted = originalVal;

        if (isPhone) {
          formatted = formatPhone(originalVal);
          // Prevent cursor jump on phone replace
          if (originalVal !== formatted) {
            el.value = formatted;
            return; // Let user type naturally, phone formatting handles ends
          }
        } else {
          if (el.type !== 'number' && el.type !== 'tel') {
            formatted = formatText(originalVal);
          }
        }

        if (originalVal !== formatted && !isPhone) {
          el.value = formatted;
          // Restore cursor position for 'input' event to prevent jumping
          if (e.type === 'input') {
            try { el.setSelectionRange(start, end); } catch (ex) { }
          }
        }
      }
    }
  };

  document.addEventListener('input', handleFormatting, true);
  document.addEventListener('blur', handleFormatting, true);
  document.addEventListener('change', handleFormatting, true);
});

/**
 * Custom text formatter:
 * 1. Title Case everything BEFORE the '%' character.
 * 2. Force uppercase for specific units (LTR, ML, KG, GM).
 * 3. UPPERCASE everything AFTER the '%' character.
 * Example: "1 ltr water%batch123" -> "1 LTR Water%BATCH123"
 */
function formatText(str) {
  if (!str && str !== 0) return '';
  str = String(str);

  const parts = str.split('%');

  // Step 1: Processing the first part
  let firstPart = parts[0].toLowerCase().split(' ').map(word => {
    if (!word) return '';

    // Default Title Case
    let res = word.charAt(0).toUpperCase() + word.slice(1);

    // If the word IS exactly one of our units (case-insensitive)
    const specialUnits = ['LTR', 'ML', 'KG', 'GM'];
    if (specialUnits.includes(word.toUpperCase())) {
      return word.toUpperCase();
    }

    // Also catch units attached to numbers (e.g., "500ml" or "1ltr")
    // This regex looks for digits followed by one of our units
    const unitRegex = new RegExp('(\\d+)(ltr|ml|kg|gm)', 'i');
    res = res.replace(unitRegex, (match, num, unit) => {
      return num + unit.toUpperCase();
    });

    return res;
  }).join(' ');

  // Step 2: Processing the part after the '%' if it exists
  if (parts.length > 1) {
    const rest = parts.slice(1).join('%').toUpperCase();
    return firstPart + '%' + rest;
  }
  return firstPart;
}

/**
 * Formats a phone number as "99999 99999" taking only the first 10 digits.
 */
function formatPhone(str) {
  if (!str) return '';
  let digits = String(str).replace(/\D/g, '').slice(0, 10);
  if (digits.length > 5) {
    return digits.slice(0, 5) + ' ' + digits.slice(5);
  }
  return digits;
}

