/* ============================================================
   Submundo 808 — dados dos produtos + carrinho (localStorage)
   Compartilhado por loja.html, produto.html e sacola.html
   ============================================================ */
(function () {
    'use strict';

    // --- Catálogo (troque as imagens em assets/img/loja/ pelas fotos reais) ---
    const PRODUTOS = [
        {
            id: 'camiseta-submundo', nome: 'Camiseta Submundo 808', preco: 89.90, categoria: 'Vestuário',
            desc: 'Camiseta oversized em algodão pesado com a estampa clássica do Submundo 808. Feita para a pista e para a rua.',
            tamanhos: ['P', 'M', 'G', 'GG'],
            imgs: ['assets/img/loja/produto-01-a.webp', 'assets/img/loja/produto-01-b.webp']
        },
        {
            id: 'moletom-underground', nome: 'Moletom Underground', preco: 179.90, categoria: 'Vestuário',
            desc: 'Moletom com capuz, felpa interna e caimento amplo. A peça definitiva para as noites frias do underground.',
            tamanhos: ['P', 'M', 'G', 'GG'],
            imgs: ['assets/img/loja/produto-02-a.webp', 'assets/img/loja/produto-02-b.webp']
        },
        {
            id: 'bone-sm808', nome: 'Boné SM808', preco: 69.90, categoria: 'Acessório',
            desc: 'Boné de aba curva com bordado do logo SM808. Ajuste traseiro para caber em qualquer cabeça.',
            tamanhos: ['Único'],
            imgs: ['assets/img/loja/produto-03-a.webp', 'assets/img/loja/produto-03-b.webp']
        },
        {
            id: 'camiseta-baile', nome: 'Camiseta Baile', preco: 89.90, categoria: 'Vestuário',
            desc: 'Estampa exclusiva inspirada na energia crua dos bailes. Algodão macio, corte reto.',
            tamanhos: ['P', 'M', 'G', 'GG'],
            imgs: ['assets/img/loja/produto-04-a.webp', 'assets/img/loja/produto-04-b.webp']
        },
        {
            id: 'regata-808', nome: 'Regata 808', preco: 79.90, categoria: 'Vestuário',
            desc: 'Regata leve para os dias quentes de pista. Estampa 808 na frente e assinatura nas costas.',
            tamanhos: ['P', 'M', 'G', 'GG'],
            imgs: ['assets/img/loja/produto-05-a.webp', 'assets/img/loja/produto-05-b.webp']
        },
        {
            id: 'leque-oficial', nome: 'Leque Oficial', preco: 39.90, categoria: 'Acessório',
            desc: 'Leque oficial do Submundo 808. Refresca a pista e faz barulho na hora do drop.',
            tamanhos: ['Único'],
            imgs: ['assets/img/loja/produto-06-a.webp', 'assets/img/loja/produto-06-b.webp']
        },
        {
            id: 'copo-oficial', nome: 'Copo Oficial', preco: 29.90, categoria: 'Acessório',
            desc: 'Copo reutilizável com o logo do Submundo. Leve pra casa como lembrança da noite.',
            tamanhos: ['Único'],
            imgs: ['assets/img/loja/produto-07-a.webp', 'assets/img/loja/produto-07-b.webp']
        },
        {
            id: 'moletom-dark', nome: 'Moletom Dark', preco: 189.90, categoria: 'Vestuário',
            desc: 'Versão all black do moletom Submundo. Estética dark, conforto absoluto.',
            tamanhos: ['P', 'M', 'G', 'GG'],
            imgs: ['assets/img/loja/produto-08-a.webp', 'assets/img/loja/produto-08-b.webp']
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

        root.innerHTML = `
            <div class="produto-detalhe">
                <div class="produto-galeria">
                    <img src="${p.imgs[0]}" alt="${p.nome}">
                    <img src="${p.imgs[1]}" alt="${p.nome} — verso">
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
        function feedback(msg) { root.querySelector('#addFeedback').textContent = msg; }
        root.querySelector('#addBag').addEventListener('click', () => {
            if (!tamanhoSel) { feedback('Selecione um tamanho.'); return; }
            addToCart(p.id, tamanhoSel, qtd);
            feedback(`Adicionado à sacola — ${qtd}× ${p.nome} (${tamanhoSel}).`);
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
                            <img src="${i.img}" alt="${i.nome}">
                            <div class="sacola-item-info">
                                <p class="nome">${i.nome}</p>
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
                    <a class="btn btn-primary sacola-checkout" href="#" id="checkout">Finalizar pedido</a>
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
