// ============================================
// ADMIN - LICOR DOS PRIMOS (Versão Supabase)
// ============================================

const SUPABASE_URL = 'https://hvnzxpemqbhkkyuelvlk.supabase.co';
const SUPABASE_KEY = 'sb_publishable_qXyAOhevajGeHAHNW5IBAA_GZ8XrCco';

const API_URL = `${SUPABASE_URL}/rest/v1`;
const HEADERS = {
    'apikey': SUPABASE_KEY,
    'Authorization': `Bearer ${SUPABASE_KEY}`,
    'Content-Type': 'application/json',
    'Prefer': 'return=representation'
};

// Credenciais do Admin
const ADMIN_EMAIL = "teste@teste.com";
const ADMIN_PASSWORD = "teste123";
const MY_SECURITY_KEY = "LICOR123SECRET";

// Variáveis globais
let licores = [];
let estoque = {};
let editando = false;
let fotoBase64 = '';

// ============================================
// API FUNCTIONS
// ============================================
async function buscarLicores() {
    try {
        // Buscar licores
        const responseLicores = await fetch(`${API_URL}/licores?select=*&order=id`, {
            headers: HEADERS
        });
        licores = await responseLicores.json();

        // Buscar estoque
        const responseEstoque = await fetch(`${API_URL}/estoque?select=*`, {
            headers: HEADERS
        });
        const dadosEstoque = await responseEstoque.json();

        // Montar objeto de estoque
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
    // Criar licor
    const response = await fetch(`${API_URL}/licores`, {
        method: 'POST',
        headers: HEADERS,
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

    // Criar estoque
    await fetch(`${API_URL}/estoque`, {
        method: 'POST',
        headers: HEADERS,
        body: JSON.stringify({
            licor_id: novoLicor[0].id,
            quantidade: data.quantidade
        })
    });

    return novoLicor;
}

async function atualizarLicor(id, data) {
    // Atualizar licor
    await fetch(`${API_URL}/licores?id=eq.${id}`, {
        method: 'PATCH',
        headers: HEADERS,
        body: JSON.stringify({
            nome: data.nome,
            volume: data.volume,
            descricao: data.descricao,
            preco: data.preco,
            emoji: data.emoji,
            foto: data.foto
        })
    });

    // Atualizar estoque
    await fetch(`${API_URL}/estoque?licor_id=eq.${id}`, {
        method: 'PATCH',
        headers: HEADERS,
        body: JSON.stringify({
            quantidade: data.quantidade,
            updated_at: new Date().toISOString()
        })
    });
}

async function excluirLicorAPI(id) {
    // Exclui automaticamente o estoque por CASCADE
    await fetch(`${API_URL}/licores?id=eq.${id}`, {
        method: 'DELETE',
        headers: HEADERS
    });
}

async function atualizarEstoqueItem(id, quantidade) {
    await fetch(`${API_URL}/estoque?licor_id=eq.${id}`, {
        method: 'PATCH',
        headers: HEADERS,
        body: JSON.stringify({
            quantidade: quantidade,
            updated_at: new Date().toISOString()
        })
    });
}

// ============================================
// INICIALIZAÇÃO
// ============================================
function initAdmin() {
    buscarLicores();
}

if (sessionStorage.getItem('adminLoggedIn') === 'true') {
    document.getElementById('login-form').classList.add('hidden');
    document.getElementById('admin-panel').classList.remove('hidden');
    initAdmin();
}

// ============================================
// LOGIN
// ============================================
function fazerLogin() {
    const email = document.getElementById('admin-email').value.trim();
    const senha = document.getElementById('admin-password').value.trim();
    const securityKey = document.getElementById('security-key').value.trim();
    const errorMsg = document.getElementById('login-error');

    if (email === ADMIN_EMAIL && senha === ADMIN_PASSWORD && securityKey === MY_SECURITY_KEY) {
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
    sessionStorage.removeItem('adminLoggedIn');
    window.location.reload();
}

// ============================================
// RENDERIZAR LISTA DE LICORES
// ============================================
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
    if (qtd > 0) {
        statusEl.className = 'stock-status available';
        statusEl.textContent = `Disponivel (${qtd} un)`;
    } else {
        statusEl.className = 'stock-status sold-out';
        statusEl.textContent = 'Esgotado';
    }
}

// ============================================
// SALVAR ESTOQUE
// ============================================
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

// ============================================
// MODAL ADICIONAR/EDITAR
// ============================================
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

    document.getElementById('image-preview').innerHTML = `
        <div class="placeholder">
            <span>📷</span>
            <p>Clique ou toque para adicionar foto</p>
        </div>
    `;
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
    if (licor.foto) {
        preview.innerHTML = `<img src="${licor.foto}" alt="Preview">`;
    } else {
        preview.innerHTML = `
            <div class="placeholder">
                <span>📷</span>
                <p>Clique ou toque para adicionar foto</p>
            </div>
        `;
    }

    document.getElementById('modal-form').classList.add('active');
}

// ============================================
// SALVAR LICOR
// ============================================
async function salvarLicor() {
    const nome = document.getElementById('input-nome').value.trim();
    const volume = document.getElementById('input-volume').value.trim();
    const preco = parseFloat(document.getElementById('input-preco').value);
    const descricao = document.getElementById('input-descricao').value.trim();
    const emoji = document.getElementById('input-emoji').value.trim();
    const quantidade = parseInt(document.getElementById('input-quantidade').value) || 10;

    if (!nome || isNaN(preco) || preco <= 0) {
        alert('Preencha o nome e o preço corretamente!');
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

// ============================================
// EXCLUIR LICOR
// ============================================
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

// ============================================
// FECHAR MODAL
// ============================================
function fecharModalForm() {
    document.getElementById('modal-form').classList.remove('active');
}

function fecharModalFormOnClick(event) {
    if (event.target.id === 'modal-form') {
        fecharModalForm();
    }
}

function limparFoto() {
    document.getElementById('input-foto').value = '';
    fotoBase64 = '';
    document.getElementById('image-preview').innerHTML = `
        <div class="placeholder">
            <span>📷</span>
            <p>Clique ou toque para adicionar foto</p>
        </div>
    `;
}

// ============================================
// NOTIFICAÇÃO TOAST
// ============================================
function mostrarNotificacao(mensagem) {
    const toast = document.createElement('div');
    toast.className = 'toast-notificacao';
    toast.innerHTML = `<span>✅</span><span>${mensagem}</span>`;
    document.body.appendChild(toast);

    setTimeout(() => toast.classList.add('show'), 100);
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// ============================================
// EVENT LISTENERS
// ============================================
function toggleSecurityKey() {
    const input = document.getElementById('security-key');
    input.type = input.type === 'password' ? 'text' : 'password';
}

document.getElementById('security-key').addEventListener('keypress', function(e) {
    if (e.key === 'Enter') fazerLogin();
});

document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') {
        const modal = document.getElementById('modal-form');
        if (modal.classList.contains('active')) {
            fecharModalForm();
        }
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
        const preview = document.getElementById('image-preview');
        preview.innerHTML = `<img src="${event.target.result}" alt="Preview">`;
        fotoBase64 = event.target.result;
    };
    reader.readAsDataURL(file);
});