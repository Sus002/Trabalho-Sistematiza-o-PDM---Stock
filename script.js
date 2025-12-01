// Variáveis Globais (DOM Elements)
const listaDeItens = document.getElementById('listaDeItens');
const itemForm = document.getElementById('itemForm');

// Verifica se a conexão com o Firebase existe
if (typeof db === 'undefined') {
    console.error("ERRO CRÍTICO: Variável 'db' do Firestore não está definida. Verifique a ordem de carregamento dos scripts no index.html!");
} else {
    console.log("Firebase Firestore conectado com sucesso!");
    // Inicia a observação dos dados (READ)
    iniciarObservacaoDeItens(); 
}

// ==========================================================
// 1. FUNÇÃO DE CRIAÇÃO (CREATE) - Lida com o envio do formulário
// ==========================================================
itemForm.addEventListener('submit', async (e) => {
    e.preventDefault(); // Impede o recarregamento da página

    const nomeInput = document.getElementById('nome').value;
    const validadeInput = document.getElementById('validade').value;

    if (!nomeInput || !validadeInput) {
        alert("Preencha todos os campos.");
        return;
    }
    
    // Converte a string de data para um objeto Date para o Firebase
    const dataValidade = new Date(validadeInput);

    try {
        // Tenta adicionar o documento
        await db.collection("itens_estoque").add({
            nome: nomeInput,
            validade: dataValidade, 
            criadoEm: firebase.firestore.FieldValue.serverTimestamp() 
        });

        itemForm.reset();
        alert("Item cadastrado com sucesso!");

    } catch (error) {
        console.error("Erro ao adicionar documento. Possível problema nas Regras do Firestore: ", error);
        alert("Erro ao cadastrar. Verifique se suas regras do Firebase permitem escrita.");
    }
});

// ==========================================================
// 2. FUNÇÃO DE LEITURA (READ) E ALERTA VISUAL
// ==========================================================
function iniciarObservacaoDeItens() {
    db.collection("itens_estoque")
      .orderBy("validade", "asc") // Ordena pelo mais perto de vencer
      .onSnapshot((snapshot) => {
        
        listaDeItens.innerHTML = '';
        
        if (snapshot.empty) {
            listaDeItens.innerHTML = '<li style="text-align: center; color: var(--text-secondary); padding: 20px;">Nenhum item em estoque. Adicione o primeiro para evitar o desperdício!</li>';
            return;
        }

        snapshot.forEach((doc) => {
            const item = doc.data();
            const itemId = doc.id; 
            const dataValidade = item.validade.toDate(); 

            // Cálculos para determinar o alerta visual (ODS 12)
            const hoje = new Date();
            const diferencaTempo = dataValidade.getTime() - hoje.getTime();
            const diferencaDias = Math.ceil(diferencaTempo / (1000 * 3600 * 24)); 

            let classeAlerta = '';
            let textoAlerta = '';

            if (diferencaDias < 0) {
                classeAlerta = 'alerta-vermelho';
                textoAlerta = 'VENCEU!';
            } else if (diferencaDias <= 3) {
                classeAlerta = 'alerta-vermelho';
                textoAlerta = `VENCE EM ${diferencaDias} DIA(S)`;
            } else if (diferencaDias <= 7) {
                classeAlerta = 'alerta-amarelo';
                textoAlerta = `VENCE EM ${diferencaDias} DIAS`;
            } else {
                textoAlerta = `Vence em ${diferencaDias} dias`;
            }
            
            // Cria o elemento da lista
            const li = document.createElement('li');
            li.classList.add(classeAlerta);
            
            const dataFormatada = dataValidade.toLocaleDateString('pt-BR');

            li.innerHTML = `
                <div>
                    <strong>${item.nome}</strong> 
                    <p>Validade: ${dataFormatada} <span class="alerta-texto">${textoAlerta}</span></p>
                </div>
                <button class="botao-deletar" data-id="${itemId}" aria-label="Remover item ${item.nome}">
                    <i class="fas fa-trash-alt"></i>
                </button>
            `;
            
            listaDeItens.appendChild(li);
        });
        
        // Adiciona o listener de evento para os botões de exclusão
        adicionarListenersDeExclusao();
    });
}

// ==========================================================
// 3. FUNÇÃO DE EXCLUSÃO (DELETE)
// ==========================================================
function adicionarListenersDeExclusao() {
    document.querySelectorAll('.botao-deletar').forEach(button => {
        button.addEventListener('click', async (e) => {
            const itemId = e.currentTarget.dataset.id; // Uso currentTarget para garantir que pega do botão
            
            // Note: Usando um modal de confirmação simples no lugar de window.confirm()
            if (confirm("Confirmar remoção? Esta ação é irreversível.")) { 
                try {
                    // Remove o item do Firestore
                    await db.collection("itens_estoque").doc(itemId).delete();
                    alert("Item removido com sucesso!");
                } catch (error) {
                    console.error("Erro ao remover documento: ", error);
                    alert("Erro ao remover item. Verifique as regras de segurança.");
                }
            }
        });
    });
}