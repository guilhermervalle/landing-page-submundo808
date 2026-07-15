/* ============================================================
   Submundo 808 — dados dos produtos + carrinho (localStorage)
   Compartilhado por loja.html, produto.html e sacola.html
   ============================================================ */
(function () {
    'use strict';

    // --- Catálogo (imagens em assets/img/loja/) ---
    // imgs   = [FRENTE, VERSO]  -> aparecem na home da loja (grid) E como 1ª/2ª foto do produto.
    //          arquivos: <id>-1.webp (frente) e <id>-2.webp (verso).
    // galeria= [fotos extras]   -> aparecem SOMENTE na página do produto, depois da frente/verso.
    //          arquivos: <id>-3.webp, <id>-4.webp, ...  (omita o campo se o produto só tem 2 fotos).
    // Ajuste os PREÇOS conforme o real.
    const PRODUTOS = [
        {
            id: 'camiseta-preta', nome: 'Camiseta Preta', preco: 89.90, categoria: 'Vestuário',
            desc: 'Camiseta preta em algodão pesado com a estampa do Submundo 808. Feita para a pista e para a rua.',
            tamanhos: ['P', 'M', 'G', 'GG'],
            imgs: ['assets/img/loja/camiseta-preta-1.webp', 'assets/img/loja/camiseta-preta-2.webp'],
            // Exemplo de fotos extras (só na página do produto). Apague se não usar:
            galeria: ['assets/img/loja/camiseta-preta-3.webp']
        },
        {
            id: 'camiseta-branca', nome: 'Camiseta Branca', preco: 89.90, categoria: 'Vestuário',
            desc: 'Camiseta branca em algodão pesado com estampa do Submundo 808. Corte reto e macio.',
            tamanhos: ['P', 'M', 'G', 'GG'],
            imgs: ['assets/img/loja/camiseta-branca-1.webp', 'assets/img/loja/camiseta-branca-2.webp'],
            galeria: ['assets/img/loja/camiseta-branca-3.webp']
        },
        {
            id: 'moletom-preto', nome: 'Moletom Careca Preto', preco: 179.90, categoria: 'Vestuário',
            desc: 'Moletom careca (crewneck) preto, felpa interna e caimento amplo. A peça das noites frias do underground.',
            tamanhos: ['P', 'M', 'G', 'GG'],
            imgs: ['assets/img/loja/moletom-preto-1.webp', 'assets/img/loja/moletom-preto-2.webp']
        },
        {
            id: 'bone-preto', nome: 'Boné Preto', preco: 69.90, categoria: 'Acessório',
            desc: 'Boné preto com bordado do logo SM808 e ajuste traseiro.',
            tamanhos: ['Único'],
            imgs: ['assets/img/loja/bone-preto-1.webp', 'assets/img/loja/bone-preto-2.webp']
        },
        {
            id: 'toca-offwhite', nome: 'Toca Offwhite', preco: 59.90, categoria: 'Acessório',
            desc: 'Toca (gorro) offwhite em tricô, com etiqueta do Submundo 808. Aquece com estilo.',
            tamanhos: ['Único'],
            imgs: ['assets/img/loja/toca-offwhite-1.webp', 'assets/img/loja/toca-offwhite-2.webp']
        },
        {
            id: 'mochila-couro', nome: 'Bolsa de Couro', preco: 199.90, categoria: 'Acessório',
            desc: 'Mochila/bolsa de couro com acabamento premium e o selo do Submundo 808.',
            tamanhos: ['Único'],
            imgs: ['assets/img/loja/mochila-couro-1.webp', 'assets/img/loja/mochila-couro-2.webp']
        },
        {
            id: 'chaveiro', nome: 'Chaveiro', preco: 19.90, categoria: 'Acessório',
            desc: 'Chaveiro oficial do Submundo 808. Leve a cena no bolso.',
            tamanhos: ['Único'],
            imgs: ['assets/img/loja/chaveiro-1.webp', 'assets/img/loja/chaveiro-2.webp']
        },
        {
            id: 'copo-festa', nome: 'Copo de Festa', preco: 29.90, categoria: 'Acessório',
            desc: 'Copo de festa reutilizável com o logo do Submundo. Lembrança oficial da noite.',
            tamanhos: ['Único'],
            imgs: ['assets/img/loja/copo-festa-1.webp', 'assets/img/loja/copo-festa-2.webp']
        }
    ];

    // --- Utilidades ---
    const BRL = (v) => 'R$ ' + v.toFixed(2).replace('.', ',');
    const getProduto = (id) => PRODUTOS.find((p) => p.id === id);

    // --- Carrinho (localStorage) ---
    const CART_KEY = 'sm808_cart';

    function getCart() {
        try { return JSON.parse(localStorage.getItem(CART_KEY)) || []; }
        catch (e) { return []; }
    }
    function saveCart(cart) {
        localStorage.setItem(CART_KEY, JSON.stringify(cart));
        updateCartCount();
    }
    function cartCount() {
        return getCart().reduce((n, i) => n + i.qty, 0);
    }
    function cartTotal() {
        return getCart().reduce((s, i) => s + i.preco * i.qty, 0);
    }
    function addToCart(id, tamanho, qty) {
        const p = getProduto(id);
        if (!p) return;
        const cart = getCart();
        const found = cart.find((i) => i.id === id && i.tamanho === tamanho);
        if (found) { found.qty += qty; }
        else { cart.push({ id, nome: p.nome, preco: p.preco, tamanho, qty, img: p.imgs[0] }); }
        saveCart(cart);
    }
    function setQty(id, tamanho, qty) {
        let cart = getCart();
        const item = cart.find((i) => i.id === id && i.tamanho === tamanho);
        if (!item) return;
        item.qty = qty;
        if (item.qty <= 0) cart = cart.filter((i) => !(i.id === id && i.tamanho === tamanho));
        saveCart(cart);
    }
    function removeItem(id, tamanho) {
        saveCart(getCart().filter((i) => !(i.id === id && i.tamanho === tamanho)));
    }
    function updateCartCount() {
        document.querySelectorAll('[data-cart-count]').forEach((el) => { el.textContent = cartCount(); });
    }

    // --- Render: grid da loja ---
    function renderLojaGrid() {
        const grid = document.getElementById('lojaGrid');
        if (!grid) return;
        grid.innerHTML = PRODUTOS.map((p) => `
            <a class="produto" href="produto.html?id=${p.id}">
                <div class="produto-img">
                    <img class="front" src="${p.imgs[0]}" alt="${p.nome}" loading="lazy">
                    <img class="back" src="${p.imgs[1]}" alt="${p.nome} — verso" loading="lazy">
                </div>
                <div class="produto-info">
                    <p>${p.nome}</p>
                    <p class="produto-preco">${BRL(p.preco)}</p>
                </div>
                <div class="produto-tag"><span class="dot"></span> ${p.categoria}</div>
            </a>`).join('');

        if (window.gsap) {
            gsap.from('#lojaGrid .produto', {
                opacity: 0, y: 30, duration: 0.8, ease: 'power3.out', stagger: 0.08
            });
        }
    }

    // --- Render: página de produto ---
    function renderProduto() {
        const root = document.querySelector('[data-produto-page]');
        if (!root) return;
        const id = new URLSearchParams(location.search).get('id');
        const p = getProduto(id) || PRODUTOS[0];

        let tamanhoSel = p.tamanhos.length === 1 ? p.tamanhos[0] : null;
        let qtd = 1;

        // Galeria da página do produto = as 2 do grid (frente/verso) + fotos extras opcionais
        const galeria = [p.imgs[0], p.imgs[1]].concat(p.galeria || []);

        root.innerHTML = `
            <div class="produto-detalhe">
                <div class="produto-galeria">
                    ${galeria.map((src, i) => `<img src="${src}" alt="${p.nome}${i ? ' — foto ' + (i + 1) : ''}">`).join('')}
                </div>
                <div class="produto-lado">
                    <a class="voltar-loja" href="loja.html">
                        <svg width="18" height="16" viewBox="0 0 22 19" fill="none"><path d="M21.27 7.96H4.96L12.86.05 9.24.08 0 9.31l9.22 9.22h3.64l-7.88-7.88H21.29z" fill="currentColor"/></svg>
                        Voltar para a loja
                    </a>
                    <h1>${p.nome}</h1>
                    <p class="preco">${BRL(p.preco)}</p>
                    <p class="desc">${p.desc}</p>

                    <div class="opcao-linha">
                        <span class="label">Tamanho</span>
                        <div class="tamanhos" id="tamanhos">
                            ${p.tamanhos.map((t) => `<button class="tamanho-btn${p.tamanhos.length === 1 ? ' active' : ''}" data-tam="${t}">${t}</button>`).join('')}
                        </div>
                    </div>

                    <div class="opcao-linha">
                        <span class="label">Quantidade</span>
                        <div class="qtd">
                            <button id="qtdMenos" aria-label="Diminuir">−</button>
                            <span id="qtdVal">1</span>
                            <button id="qtdMais" aria-label="Aumentar">+</button>
                        </div>
                    </div>

                    <button class="add-bag" id="addBag">
                        <div class="add-bag-inner">
                            <span class="arrow arrow-left">
                                <svg width="1em" height="1em" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="square" stroke-linejoin="miter">
                                    <line x1="6" y1="18" x2="18" y2="6" />
                                    <polyline points="8 6 18 6 18 16" />
                                </svg>
                            </span>
                            <span class="text">Adicionar à sacola</span>
                            <span class="arrow arrow-right">
                                <svg width="1em" height="1em" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="square" stroke-linejoin="miter">
                                    <line x1="6" y1="18" x2="18" y2="6" />
                                    <polyline points="8 6 18 6 18 16" />
                                </svg>
                            </span>
                        </div>
                    </button>
                    <div id="loadingSpinner" style="display: none; justify-content: center; align-items: center; margin-top: 15px; margin-bottom: 15px;">
                        <svg class="spinner-svg" width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
                            <line x1="12" y1="2" x2="12" y2="6"></line>
                            <line x1="12" y1="18" x2="12" y2="22"></line>
                            <line x1="4.93" y1="4.93" x2="7.76" y2="7.76"></line>
                            <line x1="16.24" y1="16.24" x2="19.07" y2="19.07"></line>
                            <line x1="2" y1="12" x2="6" y2="12"></line>
                            <line x1="18" y1="12" x2="22" y2="12"></line>
                            <line x1="4.93" y1="19.07" x2="7.76" y2="16.24"></line>
                            <line x1="16.24" y1="7.76" x2="19.07" y2="4.93"></line>
                        </svg>
                    </div>
                    <p class="add-feedback" id="addFeedback"></p>
                </div>
            </div>`;

        document.title = p.nome + ' | SUBMUNDO 808';

        // size selection
        root.querySelectorAll('.tamanho-btn').forEach((btn) => {
            btn.addEventListener('click', () => {
                root.querySelectorAll('.tamanho-btn').forEach((b) => b.classList.remove('active'));
                btn.classList.add('active');
                tamanhoSel = btn.dataset.tam;
                feedback('');
            });
        });

        // quantity
        const qtdVal = root.querySelector('#qtdVal');
        root.querySelector('#qtdMenos').addEventListener('click', () => { qtd = Math.max(1, qtd - 1); qtdVal.textContent = qtd; });
        root.querySelector('#qtdMais').addEventListener('click', () => { qtd += 1; qtdVal.textContent = qtd; });

        // add to bag
        let feedbackTimeout;
        function feedback(msg, duration = 0) { 
            root.querySelector('#addFeedback').textContent = msg; 
            clearTimeout(feedbackTimeout);
            if (duration > 0 && msg !== '') {
                feedbackTimeout = setTimeout(() => {
                    root.querySelector('#addFeedback').textContent = '';
                }, duration);
            }
        }
        root.querySelector('#addBag').addEventListener('click', () => {
            if (!tamanhoSel) { feedback('Selecione um tamanho.', 8000); return; }
            
            const btn = root.querySelector('#addBag');
            const spinner = root.querySelector('#loadingSpinner');
            
            btn.style.display = 'none';
            spinner.style.display = 'flex';
            feedback('');
            
            setTimeout(() => {
                spinner.style.display = 'none';
                btn.style.display = '';
                addToCart(p.id, tamanhoSel, qtd);
                feedback(`Adicionado à sacola — ${qtd}× ${p.nome} (${tamanhoSel}).`, 8000);
            }, 3000);
        });
    }

    // --- Render: sacola ---
    function renderSacola() {
        const root = document.querySelector('[data-sacola-page]');
        if (!root) return;

        function draw() {
            const cart = getCart();
            if (!cart.length) {
                root.innerHTML = `
                    <div class="sacola-vazia">
                        <p>Sua sacola está vazia.</p>
                        <a class="btn btn-outline mt-2" href="loja.html">Ver produtos</a>
                    </div>`;
                return;
            }
            root.innerHTML = `
                <div class="sacola-lista">
                    ${cart.map((i) => `
                        <div class="sacola-item" data-id="${i.id}" data-tam="${i.tamanho}">
                            <a href="produto.html?id=${i.id}">
                                <img src="${i.img}" alt="${i.nome}">
                            </a>
                            <div class="sacola-item-info">
                                <a href="produto.html?id=${i.id}" style="text-decoration: none; color: inherit;">
                                    <p class="nome">${i.nome}</p>
                                </a>
                                <p class="meta">Tamanho: ${i.tamanho}</p>
                                <button class="remover" data-remove>Remover</button>
                            </div>
                            <div class="sacola-item-dir">
                                <div class="qtd">
                                    <button data-menos aria-label="Diminuir">−</button>
                                    <span>${i.qty}</span>
                                    <button data-mais aria-label="Aumentar">+</button>
                                </div>
                                <p class="linha-preco">${BRL(i.preco * i.qty)}</p>
                            </div>
                        </div>`).join('')}
                </div>
                <div class="sacola-resumo">
                    <div class="linha-total"><span>Total</span><span>${BRL(cartTotal())}</span></div>
                    <a class="btn-ticket sacola-checkout" href="#" id="checkout">Finalizar pedido</a>
                    <p class="sacola-obs">Frete e pagamento combinados no checkout.</p>
                </div>`;

            root.querySelectorAll('.sacola-item').forEach((el) => {
                const id = el.dataset.id, tam = el.dataset.tam;
                const item = getCart().find((i) => i.id === id && i.tamanho === tam);
                el.querySelector('[data-menos]').addEventListener('click', () => { setQty(id, tam, item.qty - 1); draw(); });
                el.querySelector('[data-mais]').addEventListener('click', () => { setQty(id, tam, item.qty + 1); draw(); });
                el.querySelector('[data-remove]').addEventListener('click', () => { removeItem(id, tam); draw(); });
            });

            const checkout = root.querySelector('#checkout');
            if (checkout) checkout.addEventListener('click', (e) => {
                e.preventDefault();
                alert('Checkout de demonstração — integre aqui seu meio de pagamento (WhatsApp, Shopify, Mercado Pago, etc.).');
            });
        }
        draw();
    }

    // expose (optional)
    window.SM808Store = { PRODUTOS, getProduto, addToCart, getCart, BRL };

    // init (script sits at end of body → DOM is ready)
    updateCartCount();
    renderLojaGrid();
    renderProduto();
    renderSacola();
})();
