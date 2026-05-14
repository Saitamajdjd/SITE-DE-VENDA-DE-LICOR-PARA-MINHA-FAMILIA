
const SUPABASE_URL = 'https://hvnzxpemqbhkkyuelvlk.supabase.co';
const SUPABASE_KEY = 'sb_publishable_qXyAOhevajGeHAHNW5IBAA_GZ8XrCco';

const API_URL = `${SUPABASE_URL}/rest/v1`;

// ============================================
// SUPABASE AUTH
// ============================================
async function loginSupabase(email, password) {
    try {
        const response = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
            method: 'POST',
            headers: {
                'apikey': SUPABASE_KEY,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ email, password })
        });

        if (!response.ok) {
            throw new Error('Login falhou');
        }

        const data = await response.json();
        localStorage.setItem('supabase_token', data.access_token);
        localStorage.setItem('supabase_user', JSON.stringify(data.user));
        return data;
    } catch (e) {
        console.error('Erro no login:', e);
        return null;
    }
}

function logoutSupabase() {
    localStorage.removeItem('supabase_token');
    localStorage.removeItem('supabase_user');
    sessionStorage.removeItem('adminLoggedIn');
    window.location.reload();
}

function getAuthHeaders() {
    const token = localStorage.getItem('supabase_token');
    return {
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=representation'
    };
}

function isLoggedIn() {
    return localStorage.getItem('supabase_token') && localStorage.getItem('supabase_user');
}


// VARIaVEIS GLOBAIS

let licores = [];
let estoque = {};
let editando = false;
let fotoBase64 = '';


// API FUNCTIONS

async function buscarLicores() {
    try {
        const responseLicores = await fetch(`${API_URL}/licores?select=*&order=id`, {
            headers: getAuthHeaders()
        });

        if (responseLicores.status === 401 || responseLicores.status === 403) {
            alert('Sessao expirada. Faca login novamente.');
            logoutSupabase();
            return;
        }

        licores = await responseLicores.json();

        const responseEstoque = await fetch(`${API_URL}/estoque?select=*`, {
            headers: getAuthHeaders()
        });
        const dadosEstoque = await responseEstoque.json();

        estoque = {};
        dadosEstoque.forEach(e => {
            estoque[e.licor_id] = e.quantidade;
        });

        renderizarEstoque();
    } catch (e) {
        console.error('Erro ao buscar licores:', e);
        alert('Erro ao conectar com o banco.');
    }
}

async function criarLicor(data) {
    const response = await fetch(`${API_URL}/licores`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
            nome: data.nome,
            volume: data.volume,
            descricao: data.descricao,
            preco: data.preco,
            emoji: data.emoji,
            foto: data.foto
        })
    });
    const novoLicor = await response.json();

    await fetch(`${API_URL}/estoque`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
            licor_id: novoLicor[0].id,
            quantidade: data.quantidade
        })
    });

    return novoLicor;
}

async function atualizarLicor(id, data) {
    await fetch(`${API_URL}/licores?id=eq.${id}`, {
        method: 'PATCH',
        headers: getAuthHeaders(),
        body: JSON.stringify({
            nome: data.nome,
            volume: data.volume,
            descricao: data.descricao,
            preco: data.preco,
            emoji: data.emoji,
            foto: data.foto
        })
    });

    await fetch(`${API_URL}/estoque?licor_id=eq.${id}`, {
        method: 'PATCH',
        headers: getAuthHeaders(),
        body: JSON.stringify({
            quantidade: data.quantidade,
            updated_at: new Date().toISOString()
        })
    });
}

async function excluirLicorAPI(id) {
    await fetch(`${API_URL}/licores?id=eq.${id}`, {
        method: 'DELETE',
        headers: getAuthHeaders()
    });
}

async function atualizarEstoqueItem(id, quantidade) {
    await fetch(`${API_URL}/estoque?licor_id=eq.${id}`, {
        method: 'PATCH',
        headers: getAuthHeaders(),
        body: JSON.stringify({
            quantidade: quantidade,
            updated_at: new Date().toISOString()
        })
    });
}


function initAdmin() {
    if (isLoggedIn()) {
        buscarLicores();
    }
}

if (isLoggedIn()) {
    document.getElementById('login-form').classList.add('hidden');
    document.getElementById('admin-panel').classList.remove('hidden');
    initAdmin();
}


// LOGIN

async function fazerLogin() {
    const email = document.getElementById('admin-email').value.trim();
    const senha = document.getElementById('admin-password').value.trim();
    const errorMsg = document.getElementById('login-error');

    const result = await loginSupabase(email, senha);

    if (result && result.access_token) {
        sessionStorage.setItem('adminLoggedIn', 'true');
        document.getElementById('login-form').classList.add('hidden');
        document.getElementById('admin-panel').classList.remove('hidden');
        errorMsg.style.display = 'none';
        initAdmin();
    } else {
        errorMsg.style.display = 'block';
    }
}

function fazerLogout() {
    logoutSupabase();
}


// RENDERIZAÇÃO

function renderizarEstoque() {
    const grid = document.getElementById('stock-grid');
    grid.innerHTML = licores.map(l => {
        const qtd = estoque[l.id] !== undefined ? estoque[l.id] : 0;
        const statusClass = qtd > 0 ? 'available' : 'sold-out';
        const statusText = qtd > 0 ? `Disponivel (${qtd} un)` : 'Esgotado';
        const imagem = l.foto ? `<img src="${l.foto}" class="liquor-preview" alt="${l.nome}">` : `<div class="liquor-preview">${l.emoji || '🍷'}</div>`;

        return `
            <div class="stock-item">
                <button class="btn-excluir" onclick="excluirLicor(${l.id})" title="Excluir">X</button>
                <button class="btn-editar" onclick="editarLicor(${l.id})" title="Editar">E</button>
                ${imagem}
                <h3>${l.nome}</h3>
                <p class="preco">R$ ${parseFloat(l.preco).toFixed(2).replace('.', ',')}</p>
                <label>Estoque:</label>
                <input type="number" id="estoque-${l.id}" value="${qtd}" min="0" onchange="atualizarStatus(${l.id})">
                <div class="stock-status ${statusClass}" id="status-${l.id}">${statusText}</div>
            </div>
        `;
    }).join('');
}

function atualizarStatus(id) {
    const qtd = parseInt(document.getElementById(`estoque-${id}`).value);
    const statusEl = document.getElementById(`status-${id}`);
    statusEl.className = qtd > 0 ? 'stock-status available' : 'stock-status sold-out';
    statusEl.textContent = qtd > 0 ? `Disponivel (${qtd} un)` : 'Esgotado';
}

async function salvarEstoque() {
    try {
        for (const licor of licores) {
            const qtd = parseInt(document.getElementById(`estoque-${licor.id}`).value) || 0;
            estoque[licor.id] = qtd;
            await atualizarEstoqueItem(licor.id, qtd);
        }
        document.getElementById('save-success').style.display = 'block';
        setTimeout(() => document.getElementById('save-success').style.display = 'none', 3000);
    } catch (e) {
        alert('Erro ao salvar estoque');
    }
}


// MODAL DE ADIÇÃO

function abrirModalAdicionar() {
    editando = false;
    fotoBase64 = '';
    document.getElementById('modal-titulo').textContent = '+ Adicionar Licor';
    document.getElementById('edit-id').value = '';
    document.getElementById('input-nome').value = '';
    document.getElementById('input-volume').value = '500ml';
    document.getElementById('input-preco').value = '';
    document.getElementById('input-descricao').value = '';
    document.getElementById('input-foto').value = '';
    document.getElementById('input-emoji').value = '';
    document.getElementById('input-quantidade').value = '10';
    document.getElementById('image-preview').innerHTML = `<div class="placeholder"><span>📷</span><p>Clique ou toque para adicionar foto</p></div>`;
    document.getElementById('modal-form').classList.add('active');
}

function editarLicor(id) {
    const licor = licores.find(l => l.id === id);
    if (!licor) return;

    editando = true;
    fotoBase64 = '';
    document.getElementById('modal-titulo').textContent = '✎ Editar Licor';
    document.getElementById('edit-id').value = id;
    document.getElementById('input-nome').value = licor.nome;
    document.getElementById('input-volume').value = licor.volume;
    document.getElementById('input-preco').value = licor.preco;
    document.getElementById('input-descricao').value = licor.descricao;
    document.getElementById('input-foto').value = '';
    document.getElementById('input-emoji').value = licor.emoji || '';
    document.getElementById('input-quantidade').value = estoque[id] || 0;

    const preview = document.getElementById('image-preview');
    preview.innerHTML = licor.foto ? `<img src="${licor.foto}" alt="Preview">` : `<div class="placeholder"><span>📷</span><p>Clique ou toque para adicionar foto</p></div>`;
    document.getElementById('modal-form').classList.add('active');
}

async function salvarLicor() {
    const nome = document.getElementById('input-nome').value.trim();
    const volume = document.getElementById('input-volume').value.trim();
    const preco = parseFloat(document.getElementById('input-preco').value);
    const descricao = document.getElementById('input-descricao').value.trim();
    const emoji = document.getElementById('input-emoji').value.trim();
    const quantidade = parseInt(document.getElementById('input-quantidade').value) || 10;

    if (!nome || isNaN(preco) || preco <= 0) {
        alert('Preencha o nome e o preco corretamente!');
        return;
    }

    const data = { nome, volume, descricao, preco, emoji, foto: fotoBase64, quantidade };
    const idEdit = document.getElementById('edit-id').value;

    try {
        if (idEdit) {
            await atualizarLicor(idEdit, { ...data, quantidade: parseInt(document.getElementById('input-quantidade').value) || 0 });
        } else {
            await criarLicor(data);
        }
        await buscarLicores();
        fecharModalForm();
        mostrarNotificacao('Licor salvo com sucesso!');
    } catch (e) {
        alert('Erro ao salvar licor');
    }
}

async function excluirLicor(id) {
    if (!confirm('Tem certeza que deseja excluir este licor?')) return;
    try {
        await excluirLicorAPI(id);
        await buscarLicores();
        mostrarNotificacao('Licor excluido!');
    } catch (e) {
        alert('Erro ao excluir licor');
    }
}

function fecharModalForm() {
    document.getElementById('modal-form').classList.remove('active');
}

function fecharModalFormOnClick(event) {
    if (event.target.id === 'modal-form') fecharModalForm();
}

function limparFoto() {
    document.getElementById('input-foto').value = '';
    fotoBase64 = '';
    document.getElementById('image-preview').innerHTML = `<div class="placeholder"><span>📷</span><p>Clique ou toque para adicionar foto</p></div>`;
}

function mostrarNotificacao(mensagem) {
    const toast = document.createElement('div');
    toast.className = 'toast-notificacao';
    toast.innerHTML = `<span>✅</span><span>${mensagem}</span>`;
    document.body.appendChild(toast);
    setTimeout(() => toast.classList.add('show'), 100);
    setTimeout(() => { toast.classList.remove('show'); setTimeout(() => toast.remove(), 300); }, 3000);
}



document.getElementById('admin-password').addEventListener('keypress', function(e) {
    if (e.key === 'Enter') fazerLogin();
});

document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') {
        const modal = document.getElementById('modal-form');
        if (modal.classList.contains('active')) fecharModalForm();
    }
});

document.getElementById('image-preview').addEventListener('click', function() {
    document.getElementById('input-foto').click();
});

document.getElementById('input-foto').addEventListener('change', function(e) {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = function(event) {
        document.getElementById('image-preview').innerHTML = `<img src="${event.target.result}" alt="Preview">`;
        fotoBase64 = event.target.result;
    };
    reader.readAsDataURL(file);
});
