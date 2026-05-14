const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json({ limit: '50mb' }));

// Conexão com Neon
const pool = new Pool({
    connectionString: "postgresql://authenticated@ep-round-water-acya86r6-pooler.sa-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require"
});

// ============================================
// ROTAS DA API
// ============================================

// GET - Buscar todos os licores com estoque
app.get('/api/licores', async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT l.*, COALESCE(e.quantidade, 0) as estoque
            FROM licores l
            LEFT JOIN estoque e ON l.id = e.licor_id
            ORDER BY l.id
        `);
        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ erro: err.message });
    }
});

// POST - Criar novo licor
app.post('/api/licores', async (req, res) => {
    try {
        const { nome, volume, descricao, preco, emoji, foto, quantidade } = req.body;

        const result = await pool.query(
            `INSERT INTO licores (nome, volume, descricao, preco, emoji, foto)
             VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
            [nome, volume, descricao, preco, emoji, foto]
        );

        const novoId = result.rows[0].id;

        // Criar estoque
        await pool.query(
            `INSERT INTO estoque (licor_id, quantidade) VALUES ($1, $2)`,
            [novoId, quantidade || 10]
        );

        res.json({ id: novoId, sucesso: true });
    } catch (err) {
        console.error(err);
        res.status(500).json({ erro: err.message });
    }
});

// PUT - Atualizar licor
app.put('/api/licores/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { nome, volume, descricao, preco, emoji, foto, quantidade } = req.body;

        await pool.query(
            `UPDATE licores SET nome=$1, volume=$2, descricao=$3, preco=$4, emoji=$5, foto=$6, updated_at=CURRENT_TIMESTAMP
             WHERE id=$7`,
            [nome, volume, descricao, preco, emoji, foto, id]
        );

        // Atualizar estoque
        await pool.query(
            `INSERT INTO estoque (licor_id, quantidade) VALUES ($1, $2)
             ON CONFLICT (licor_id) DO UPDATE SET quantidade=$2, updated_at=CURRENT_TIMESTAMP`,
            [id, quantidade]
        );

        res.json({ sucesso: true });
    } catch (err) {
        console.error(err);
        res.status(500).json({ erro: err.message });
    }
});

// DELETE - Excluir licor
app.delete('/api/licores/:id', async (req, res) => {
    try {
        const { id } = req.params;

        // Exclui automaticamente o estoque por CASCADE
        await pool.query(`DELETE FROM licores WHERE id = $1`, [id]);

        res.json({ sucesso: true });
    } catch (err) {
        console.error(err);
        res.status(500).json({ erro: err.message });
    }
});

// PUT - Atualizar estoque
app.put('/api/estoque/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { quantidade } = req.body;

        await pool.query(
            `INSERT INTO estoque (licor_id, quantidade) VALUES ($1, $2)
             ON CONFLICT (licor_id) DO UPDATE SET quantidade=$2, updated_at=CURRENT_TIMESTAMP`,
            [id, quantidade]
        );

        res.json({ sucesso: true });
    } catch (err) {
        console.error(err);
        res.status(500).json({ erro: err.message });
    }
});

// Iniciar servidor
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Servidor rodando na porta ${PORT}`);
});