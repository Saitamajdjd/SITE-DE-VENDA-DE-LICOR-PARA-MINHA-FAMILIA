// ============================================
// LOJA LICOR DOS PRIMOS (Versão Supabase)
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

let licores = [];
let estoque = {};
let produtoAtual = null;
let quantidade = 1;

// ============================================
// CARREGAR DADOS
// ============================================
async function carregarDados() {
    try {
        const responseLicores = await fetch(`${API_URL}/licores?select=*&order=id`, {
            headers: HEADERS
        });
        licores = await responseLicores.json();

        const responseEstoque = await fetch(`${API_URL}/estoque?select=*`, {
            headers: HEADERS
        });
        const dadosEstoque = await responseEstoque.json();

        dadosEstoque.forEach(e => {
            estoque[e.licor_id] = e.quantidade;
        });

        renderizarLicores();
    } catch (e) {
        console.error('Erro ao carregar:', e);
    }
}

// ============================================
// ATUALIZAR ESTOQUE
// ============================================
async function atualizarEstoqueAPI(licorId, quantidade) {
    await fetch(`${API_URL}/estoque?licor_id=eq.${licorId}`, {
        method: 'PATCH',
        headers: { ...HEADERS, 'Prefer': 'return=minimal' },
        body: JSON.stringify({ quantidade: quantidade, updated_at: new Date().toISOString() })
    });
}

// ============================================
// RENDERIZAR LICORES
// ============================================
function renderizarLicores() {
    const grid = document.getElementById('liquors-grid');
    if (!grid) return;

    grid.innerHTML = licores.map(l => {
        const qtd = estoque[l.id] !== undefined ? estoque[l.id] : 0;
        const esgotado = qtd <= 0;
        const imagem = l.foto ? `<img src="${l.foto}" class="liquor-img" alt="${l.nome}">` : `<div class="liquor-image">${l.emoji}</div>`;

        return `
            <div class="liquor-card">
                ${imagem}
                <div class="liquor-content">
                    <h3 class="liquor-name">${l.nome}</h3>
                    <p class="liquor-volume">${l.volume}</p>
                    <p class="liquor-description">${l.descricao}</p>
                    <p class="liquor-price">R$ ${parseFloat(l.preco).toFixed(2).replace('.', ',')} <span>/ unidade</span></p>
                    ${esgotado ? `
                        <button class="btn-comprar" style="background: #666; cursor: not-allowed;" disabled>
                            ❌ Esgotado
                        </button>
                    ` : `
                        <button class="btn-comprar" onclick="abrirModal(${l.id})">
                            🛒 Comprar
                        </button>
                    `}
                </div>
            </div>
        `;
    }).join('');
}

// ============================================
// MODAL
// ============================================
function abrirModal(id) {
    produtoAtual = licores.find(l => l.id === id);
    if (!produtoAtual) return;

    const qtd = estoque[produtoAtual.id] || 0;
    if (qtd <= 0) {
        alert('Este produto está esgotado!');
        return;
    }

    quantidade = 1;
    atualizarModal();
    document.getElementById('modal').classList.add('active');
}

function fecharModal() {
    document.getElementById('modal').classList.remove('active');
    produtoAtual = null;
}

function atualizarModal() {
    if (!produtoAtual) return;
    const qtdEstoque = estoque[produtoAtual.id] || 0;

    document.getElementById('modal-product-name').textContent = produtoAtual.nome;
    document.getElementById('modal-product-price').textContent = `R$ ${parseFloat(produtoAtual.preco).toFixed(2).replace('.', ',')}`;
    document.getElementById('quantity').value = quantidade;
    document.getElementById('quantity').max = qtdEstoque;
    document.getElementById('total-price').innerHTML = `Total: <strong>R$ ${(parseFloat(produtoAtual.preco) * quantidade).toFixed(2).replace('.', ',')}</strong>`;
}

function aumentarQuantidade() {
    const qtdEstoque = estoque[produtoAtual.id] || 0;
    if (quantidade < qtdEstoque) { quantidade++; atualizarModal(); }
}

function diminuirQuantidade() {
    if (quantidade > 1) { quantidade--; atualizarModal(); }
}

function alterarQuantidade(input) {
    const valor = parseInt(input.value);
    const qtdEstoque = estoque[produtoAtual.id] || 0;
    if (valor > 0 && valor <= qtdEstoque) {
        quantidade = valor;
        atualizarModal();
    } else if (valor > qtdEstoque) {
        quantidade = qtdEstoque;
        input.value = qtdEstoque;
    }
}

// ============================================
// FINALIZAR COMPRA
// ============================================
async function finalizarCompra() {
    if (!produtoAtual) return;

    const pagamento = document.querySelector('input[name="pagamento"]:checked').value;

    const telefone = "5575999510883";
    const mensagem = encodeURIComponent(
        `🍷 *PEDIDO DE LICOR*\n\n` +
        `📦 *Produto:* ${produtoAtual.nome}\n` +
        `📊 *Quantidade:* ${quantidade} un\n` +
        `💰 *Valor Unitário:* R$ ${parseFloat(produtoAtual.preco).toFixed(2).replace('.', ',')}\n` +
        `💵 *Total:* R$ ${(parseFloat(produtoAtual.preco) * quantidade).toFixed(2).replace('.', ',')}\n` +
        `💳 *Forma de Pagamento:* ${pagamento}\n\n` +
        `Aguardo confirmação do pedido! 🥃`
    );

    window.open(`https://wa.me/${telefone}?text=${mensagem}`, '_blank');

    estoque[produtoAtual.id] = Math.max(0, estoque[produtoAtual.id] - quantidade);
    await atualizarEstoqueAPI(produtoAtual.id, estoque[produtoAtual.id]);

    renderizarLicores();
    fecharModal();
}

// ============================================
// EVENT LISTENERS
// ============================================
document.addEventListener('click', (e) => {
    if (e.target.classList.contains('modal-overlay')) fecharModal();
});

document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') fecharModal();
});

document.addEventListener('DOMContentLoaded', carregarDados);