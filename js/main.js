document.addEventListener('DOMContentLoaded', () => {

    // Smooth scroll (Lenis) — shared across the page, same as the reference
    let lenis = null;
    if (window.Lenis) {
        lenis = new Lenis({ duration: 1.1, smoothWheel: true });
    }

    // 1. Custom Cursor
    const cursor = document.querySelector('.custom-cursor');

    // Zones that use the native OS cursor instead of the custom dot (e.g. the
    // Spotify player) — a cross-origin iframe captures the mouse and would freeze
    // the custom cursor at its edge, so we simply disable it over the whole section.
    let nativeCursorZone = false;

    document.addEventListener('mousemove', (e) => {
        cursor.style.left = e.clientX + 'px';
        cursor.style.top = e.clientY + 'px';
        cursor.style.opacity = nativeCursorZone ? '0' : '1';
    });

    document.querySelectorAll('.native-cursor').forEach((zone) => {
        zone.addEventListener('mouseenter', () => {
            nativeCursorZone = true;
            cursor.style.opacity = '0';
        });
        zone.addEventListener('mouseleave', () => {
            nativeCursorZone = false;
        });
    });

    // Add hover effect to interactive elements
    const interactiveElements = document.querySelectorAll('a, button, .hover-dim-item');
    interactiveElements.forEach(el => {
        el.addEventListener('mouseenter', () => cursor.classList.add('hover'));
        el.addEventListener('mouseleave', () => cursor.classList.remove('hover'));
    });

    // 2. Fullscreen Menu Overlay
    const menuToggle = document.getElementById('menuToggle');
    const menuOverlay = document.getElementById('menuOverlay');
    const menuLinks = document.querySelectorAll('.menu-link.menu-close');

    menuToggle.addEventListener('click', () => {
        menuToggle.classList.toggle('active');
        menuOverlay.classList.toggle('active');
        const open = menuOverlay.classList.contains('active');
        document.body.style.overflow = open ? 'hidden' : '';
        if (lenis) { open ? lenis.stop() : lenis.start(); }
    });

    // Close menu when clicking anchor links
    menuLinks.forEach(link => {
        link.addEventListener('click', () => {
            menuToggle.classList.remove('active');
            menuOverlay.classList.remove('active');
            document.body.style.overflow = '';
            if (lenis) lenis.start();
        });
    });

    // 3. Scroll Reveal Animations (IntersectionObserver)
    const revealOptions = {
        threshold: 0.1,
        rootMargin: "0px 0px -50px 0px"
    };

    const revealObserver = new IntersectionObserver((entries, observer) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('active');
                observer.unobserve(entry.target);
            }
        });
    }, revealOptions);

    // Observe clip-path images
    document.querySelectorAll('.reveal-clip').forEach(el => {
        revealObserver.observe(el);
    });

    // Observe fade-up texts
    document.querySelectorAll('.reveal').forEach(el => {
        // Just defining .reveal css
        el.style.opacity = '0';
        el.style.transform = 'translateY(30px)';
        el.style.transition = 'all 0.8s ease';
        revealObserver.observe(el);
    });

    // Special logic for .reveal class to actually animate
    const revealTextObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if(entry.isIntersecting) {
                entry.target.style.opacity = '1';
                entry.target.style.transform = 'translateY(0)';
            }
        });
    }, revealOptions);

    document.querySelectorAll('.reveal').forEach(el => {
        revealTextObserver.observe(el);
    });

    // 3b. Reveal dos TÍTULOS — GATILHO por IntersectionObserver (confiável em todo
    //     navegador, incl. Edge), ANIMAÇÃO pelo GSAP (bonita, linha a linha com
    //     máscara). NÃO usa ScrollTrigger (era o que não disparava no Edge do user).
    //     Cobre .section-title E o título da loja (.loja-teaser-title).
    const gsapOK  = !!window.gsap;
    const splitOK = !!window.SplitText;
    if (gsapOK && splitOK) { try { gsap.registerPlugin(SplitText); } catch (e) {} }

    // Toca o reveal QUANDO o título entra na tela. O SplitText roda AQUI (lazy):
    // a essa altura o usuário já rolou até o título, então as fontes já carregaram
    // (divisão em linhas correta), sem depender de document.fonts.ready.
    // Detecta título com gradiente (background-clip:text + fill transparente).
    const isGradientText = (title) => {
        const cs = getComputedStyle(title);
        const fill = cs.webkitTextFillColor || cs.getPropertyValue('-webkit-text-fill-color');
        return cs.backgroundImage && cs.backgroundImage !== 'none'
            && (fill === 'transparent' || fill === 'rgba(0, 0, 0, 0)');
    };

    const revealTitle = (title) => {
        // TODOS os títulos usam o MESMO efeito da loja: quebra em linhas com máscara
        // e sobe cada linha com stagger. Para títulos com gradiente, corrige o
        // "fantasma" do Edge (ver abaixo).
        if (gsapOK && splitOK) {
            try {
                const grad = isGradientText(title);
                const gradImg = grad ? getComputedStyle(title).backgroundImage : null;

                const split = new SplitText(title, { type: 'lines', mask: 'lines', linesClass: 'st-line' });
                if (split.lines && split.lines.length) {
                    if (grad) {
                        // Título com gradiente: aplica o gradiente em cada LINHA...
                        split.lines.forEach((line) => {
                            line.style.backgroundImage = gradImg;
                            line.style.webkitBackgroundClip = 'text';
                            line.style.backgroundClip = 'text';
                            line.style.webkitTextFillColor = 'transparent';
                            line.style.color = 'transparent';
                        });
                        // ...e MATA o gradiente/clip do PAI, senão o Edge pinta uma
                        // cópia estática do texto por trás das linhas = "fantasma".
                        title.style.backgroundImage = 'none';
                        title.style.webkitBackgroundClip = 'border-box';
                        title.style.backgroundClip = 'border-box';
                        title.style.webkitTextFillColor = 'transparent';
                        title.style.color = 'transparent';
                    }
                    gsap.set(split.lines, { yPercent: 120 });  // esconde as linhas (atrás da máscara) PRIMEIRO
                    gsap.set(title, { autoAlpha: 1 });          // só então mostra o container
                    gsap.to(split.lines, { yPercent: 0, duration: 1.1, ease: 'expo.out', stagger: 0.12 });
                    return;
                }
            } catch (e) { /* cai nos fallbacks abaixo */ }
        }
        // Fallback com GSAP (sem split): fade + subida do título inteiro
        if (gsapOK) {
            gsap.fromTo(title, { autoAlpha: 0, y: 44 },
                { autoAlpha: 1, y: 0, duration: 1, ease: 'power3.out' });
            return;
        }
        // Fallback puro CSS (sem GSAP)
        title.style.transition = 'opacity 0.9s cubic-bezier(0.16,1,0.3,1), transform 0.9s cubic-bezier(0.16,1,0.3,1)';
        title.style.opacity = '1';
        title.style.transform = 'translateY(0)';
    };

    const titleObserver2 = new IntersectionObserver((entries, obs) => {
        entries.forEach(entry => {
            if (!entry.isIntersecting) return;
            const el = entry.target;
            obs.unobserve(el);
            // Revela só com as FONTES prontas: evita o "pisca" de troca de fonte e o
            // split em métricas erradas. É instantâneo se as fontes já carregaram.
            if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => revealTitle(el));
            else revealTitle(el);
        });
    }, { threshold: 0.2, rootMargin: '0px 0px -60px 0px' });

    // Esconde os títulos e liga o observer IMEDIATAMENTE (sem esperar fontes),
    // para nenhum título "escapar" do observer. O split/animação é feito no reveal.
    document.querySelectorAll('.section-title, .loja-teaser-title').forEach((title) => {
        if (title.dataset.rev) return;   // não prepara duas vezes
        title.dataset.rev = '1';
        if (gsapOK) gsap.set(title, { autoAlpha: 0 });
        else { title.style.opacity = '0'; title.style.transform = 'translateY(44px)'; }
        titleObserver2.observe(title);
    });

    // 4. FAQ Accordion
    const accordionItems = document.querySelectorAll('.accordion-item');
    
    accordionItems.forEach(item => {
        const header = item.querySelector('.accordion-header');
        header.addEventListener('click', () => {
            const isActive = item.classList.contains('active');
            
            // Close all
            accordionItems.forEach(acc => acc.classList.remove('active'));
            
            // Open clicked if it wasn't active
            if (!isActive) {
                item.classList.add('active');
            }
        });
    });

    // 5. Video Slider (card central + laterais, circular).
    //    Escopado por componente porque a página tem DOIS: EVENTOS e VÍDEOS.
    document.querySelectorAll('[data-video-slider-component]').forEach(initVideoSlider);

    function initVideoSlider(root) {
        const section = root.closest('section') || root;
        const videoCards = Array.from(root.querySelectorAll('.slider_slide'));
        const rulerItems = root.querySelectorAll('.slider-video_pagination-item');
        const track = root.querySelector('[data-slide-wrapper]');
        const eventosBg = section.querySelector('.eventos-bg');
        const prevBtn = root.querySelector('[data-slider-prev]');
        const nextBtn = root.querySelector('[data-slider-next]');

        if (!videoCards.length || !track) return;

        const total = videoCards.length;
        // Laterais nas extremidades (parcialmente fora da tela)
        function getSideOffset() {
            return Math.min(760, Math.max(300, window.innerWidth * 0.47));
        }
        const SIDE_SCALE = 0.6;   // escala dos cards laterais (estado inativo)
        let currentIndex = 0;

        // Two stacked layers to crossfade the blurred background image
        const bgLayers = eventosBg ? eventosBg.querySelectorAll('.eventos-bg-layer') : [];
        let bgActiveLayer = 0;

        function setBackground(imgSrc) {
            if (bgLayers.length < 2 || !imgSrc) return;
            const incoming = bgLayers[1 - bgActiveLayer];
            const outgoing = bgLayers[bgActiveLayer];
            incoming.style.backgroundImage = `url('${imgSrc}')`;
            incoming.classList.add('is-active');
            outgoing.classList.remove('is-active');
            bgActiveLayer = 1 - bgActiveLayer;
        }

        // YouTube: o iframe só é montado no clique — 7 embeds de uma vez pesariam demais —
        // e é destruído ao sair do centro, senão o áudio continua tocando fora de vista.
        function stopVideo(card) {
            const embed = card.querySelector('.slider_video-embed');
            if (embed) embed.remove();
            card.classList.remove('is-playing');
        }

        function playVideo(card) {
            const id = card.dataset.ytId;
            if (!id || card.querySelector('.slider_video-embed')) return;
            const embed = document.createElement('div');
            embed.className = 'slider_video-embed';
            const iframe = document.createElement('iframe');
            iframe.src = 'https://www.youtube-nocookie.com/embed/' + id +
                '?autoplay=1&rel=0&modestbranding=1&playsinline=1';
            const label = card.querySelector('h3');
            iframe.title = label ? label.textContent.trim() : 'Vídeo Submundo 808';
            iframe.setAttribute('allow',
                'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share');
            iframe.allowFullscreen = true;
            embed.appendChild(iframe);
            card.appendChild(embed);
            card.classList.add('is-playing');
        }

        // Navegação por botões FIXOS nas laterais (fora dos cards): não precisam ser
        // escondidos durante o slide, pois não se movem.
        function updateSlider(activeIndex) {
            currentIndex = (parseInt(activeIndex) + total) % total;

            videoCards.forEach((card, index) => {
                if (index !== currentIndex) stopVideo(card);

                let rel = (index - currentIndex + total) % total;
                let pos = rel;
                if (rel > total / 2) pos = rel - total; // wrap: last item goes to the left (-1)

                // Slide horizontal + scale (sem rotação 3D): central grande e reto no
                // centro; laterais menores nas extremidades. Tudo anima junto via CSS.
                const sc = pos === 0 ? 1 : SIDE_SCALE;
                card.style.transform =
                    `translate(calc(-50% + ${pos * getSideOffset()}px), -50%) scale(${sc})`;
                card.classList.toggle('active', index === currentIndex);
                
                if (pos < 0) {
                    card.classList.add('is-left');
                    card.classList.remove('is-right');
                } else if (pos > 0) {
                    card.classList.add('is-right');
                    card.classList.remove('is-left');
                } else {
                    card.classList.remove('is-left', 'is-right');
                }

                // Center card sits on top; side cards behind
                card.style.zIndex = index === currentIndex ? 10 : 5 - Math.abs(pos);
            });

            rulerItems.forEach((ruler, index) => {
                ruler.classList.toggle('active', index === currentIndex);
            });

            // Update blurred background with the active card's image
            const activeImg = videoCards[currentIndex].querySelector('img');
            if (activeImg) setBackground(activeImg.currentSrc || activeImg.src);
        }

        // Clique: card lateral vem para o centro; card central que tenha vídeo, toca.
        videoCards.forEach((card, index) => {
            card.addEventListener('click', () => {
                if (index !== currentIndex) { updateSlider(index); return; }
                if (card.dataset.ytId) playVideo(card);
            });
        });

        rulerItems.forEach((ruler) => {
            ruler.addEventListener('click', () => updateSlider(ruler.dataset.index));
        });

        if (prevBtn) prevBtn.addEventListener('click', () => updateSlider(currentIndex - 1));
        if (nextBtn) nextBtn.addEventListener('click', () => updateSlider(currentIndex + 1));

        // Setas do teclado só agem no slider que está na tela — senão os dois andariam juntos
        let inView = false;
        if ('IntersectionObserver' in window) {
            new IntersectionObserver((entries) => {
                inView = entries[0].isIntersecting;
            }, { threshold: 0.35 }).observe(section);
        }
        document.addEventListener('keydown', (e) => {
            if (!inView) return;
            if (e.key === 'ArrowLeft') updateSlider(currentIndex - 1);
            if (e.key === 'ArrowRight') updateSlider(currentIndex + 1);
        });

        // Recompute side offset on resize
        let resizeRaf;
        window.addEventListener('resize', () => {
            cancelAnimationFrame(resizeRaf);
            resizeRaf = requestAnimationFrame(() => updateSlider(currentIndex));
        });

        // Initialize
        updateSlider(0);
    }

    // 6. Animações de scroll (GSAP ScrollTrigger + Lenis)
    const hasGSAP = window.gsap && window.ScrollTrigger;

    if (hasGSAP) {
        const hasSplit = !!window.SplitText;
        gsap.registerPlugin(ScrollTrigger);
        if (hasSplit) gsap.registerPlugin(SplitText);

        // Keep ScrollTrigger synced with Lenis. Drive Lenis with the NATIVE
        // requestAnimationFrame timestamp (a monotonic clock) rather than gsap.ticker
        // time. This is what fixes the "animation stops after the page sits idle / the
        // tab is backgrounded" bug: rAF pauses while idle, and on resume the previous
        // approach passed one giant time jump straight to Lenis, which froze its scroll
        // (and the scroll-driven parallax with it). With the native timestamp Lenis
        // simply snaps once and keeps going. GSAP's own ticker still drives the scrubbed
        // animations and stays in sync via the scroll event.
        if (lenis) {
            lenis.on('scroll', ScrollTrigger.update);
            const lenisRaf = (time) => { lenis.raf(time); requestAnimationFrame(lenisRaf); };
            requestAnimationFrame(lenisRaf);
            gsap.ticker.lagSmoothing(0);

            // Re-sync when returning to the tab after it was hidden for a while.
            document.addEventListener('visibilitychange', () => {
                if (!document.hidden) ScrollTrigger.update();
            });
        }

        // Scroll-linked text reveal: letters brighten from dim to white as the
        // paragraph scrolls through the viewport (reference [data-p-animation]).
        document.querySelectorAll('[data-p-animation]').forEach((item) => {
            const build = () => {
                const targets = hasSplit
                    ? new SplitText(item, { type: 'words, chars', charsClass: 's-char' }).chars
                    : [item];
                gsap.fromTo(targets,
                    { opacity: 0.12 },
                    {
                        opacity: 1,
                        stagger: 0.04,
                        ease: 'none',
                        scrollTrigger: {
                            trigger: item,
                            start: 'top 80%',
                            end: 'bottom 60%',
                            scrub: true,
                        },
                    });
            };
            if (document.fonts && document.fonts.ready) {
                document.fonts.ready.then(build);
            } else { build(); }
        });

        // Image animation (reference [data-img-parallax] inside [data-img-parallax-trigger]):
        //  1) staggered entrance (fade + zoom) when the section comes into view;
        //  2) as you scroll, each image drifts DOWN (varied depth) and rotates slightly,
        //     continuing behind the text until the text-reveal animation finishes.
        document.querySelectorAll('[data-img-parallax-trigger]').forEach((trigger) => {
            const items = Array.from(trigger.querySelectorAll('[data-img-parallax]'));
            const textEl = trigger.querySelector('[data-p-animation]');

            // 1) Entrance — only touches opacity + scale so it won't clash with the
            //    descend tween (which owns yPercent + rotation on the same element).
            gsap.from(items, {
                opacity: 0,
                scale: 0.9,
                duration: 1,
                ease: 'power3.out',
                stagger: 0.1,
                scrollTrigger: { trigger: trigger, start: 'top 80%' },
            });

            // 2) Descend behind the text, ending when the text finishes brightening.
            //    Bigger travel since the pile now starts glued under the title.
            items.forEach((item, index) => {
                const dir = index % 2 === 0 ? 1 : -1;
                gsap.fromTo(item,
                    { yPercent: -14, rotation: -5 * dir },
                    {
                        yPercent: 65 + index * 18,   // large, varied descent
                        rotation: 5 * dir,
                        ease: 'none',
                        scrollTrigger: {
                            trigger: trigger,
                            start: 'top 82%',
                            endTrigger: textEl || trigger,
                            end: 'bottom 40%',
                            scrub: 1.1,
                        },
                    });
            });
        });

        // ------------------------------------------------------------
        // 6b. Text-reveal nos títulos de seção (.section-title)
        //     Cada título é quebrado em linhas com máscara (overflow hidden) e as
        //     linhas sobem de baixo, com stagger, ao entrar na tela. Roda uma vez.
        //     O título da LOJA (.loja-teaser-title) e o do HERO (.reveal-up-text)
        //     não são .section-title, então ficam de fora (o da loja segue estático).
        // ------------------------------------------------------------
        // (O reveal dos títulos de seção agora é feito por IntersectionObserver na
        //  parte 3b — independente do GSAP/fontes, mais robusto entre navegadores.)
        // Recalcula posições dos gatilhos GSAP quando as fontes terminam de carregar
        // (evita gatilhos defasados por reflow tardio das fontes).
        if (document.fonts && document.fonts.ready) {
            document.fonts.ready.then(() => ScrollTrigger.refresh());
        }

        // ============================================================
        // 7. Loja teaser — animação scroll-driven (pin + montagem), estilo "About"
        //    do hellohello.is. A seção fica PINADA e, conforme o scroll:
        //      - as imagens crescem "do nada" no rodapé e sobem montando a pilha,
        //        uma após a outra (staggered);
        //      - o texto da esquerda revela linha a linha;
        //      - o texto da direita e o CTA aparecem no fim.
        //    Tudo atrelado ao scroll (scrub). refreshPriority garante que o pin seja
        //    calculado ANTES das seções seguintes (não quebra a "Nossa Essência").
        // ============================================================
        const lojaSection = document.querySelector('#loja');
        if (lojaSection) {
            const lojaImgs = gsap.utils.toArray('#loja .lt-img');
            const lojaTitle = lojaSection.querySelector('.loja-teaser-title');
            const leftText = lojaSection.querySelector('.loja-teaser-left');
            const rightText = lojaSection.querySelector('.loja-teaser-right');
            const lojaCta = lojaSection.querySelector('.loja-teaser-cta');

            // O título NÃO anima: aparece já pronto e fica por cima das imagens
            // (z-index definido no CSS) — as fotos passam ATRÁS das letras.

            const mm = gsap.matchMedia();

            // >>> DESKTOP: seção pinada + montagem passo a passo (atrelada ao scroll) <<<
            mm.add('(min-width: 1001px)', () => {
                // divide os dois textos laterais em linhas para revelar uma a uma
                const leftSplit  = (hasSplit && leftText)  ? new SplitText(leftText,  { type: 'lines', linesClass: 'lt-line' }) : null;
                const rightSplit = (hasSplit && rightText) ? new SplitText(rightText, { type: 'lines', linesClass: 'lt-line' }) : null;
                const leftLines  = leftSplit  ? leftSplit.lines  : (leftText  ? [leftText]  : []);
                const rightLines = rightSplit ? rightSplit.lines : (rightText ? [rightText] : []);

                const tl = gsap.timeline({
                    defaults: { ease: 'none' },
                    scrollTrigger: {
                        trigger: lojaSection,
                        start: 'top top',        // pina quando o topo encosta no topo
                        end: '+=400%',           // <<< ÚNICO botão de RITMO: aumente p/ mais lento
                        scrub: 1,                // atrela o timeline ao scroll
                        pin: true,
                        anticipatePin: 1,
                        refreshPriority: 1,      // calcula este pin antes das próximas seções
                        invalidateOnRefresh: true,
                    },
                });

                // Helper: entrada de uma imagem — cresce do rodapé e sobe até o lugar.
                // A ESCALA termina antes do DESLOCAMENTO: a imagem chega ao tamanho
                // máximo e ainda sobe mais um pouco (o topo entra atrás do título).
                const enterImg = (img, at, fromScale, scaleDur, fromY, yDur) => {
                    if (!img) return;
                    tl.fromTo(img, { opacity: 0 },                                    { opacity: 1, duration: 0.8, ease: 'power1.out' }, at);
                    tl.fromTo(img, { scale: fromScale, transformOrigin: '50% 100%' }, { scale: 1,   duration: scaleDur, ease: 'power2.out' }, at);
                    tl.fromTo(img, { yPercent: fromY },                               { yPercent: 0, duration: yDur,   ease: 'power1.out' }, at);
                };

                // ---- PRÉ-ENTRADA (fora do pin) ----
                // A 1ª imagem já começa a subir ENQUANTO a seção entra na tela (a seção
                // anterior ainda aparece). Vai do fundo até o estado inicial do pin
                // (yPercent 135 / scale 0.22), onde o timeline pinado assume sem salto.
                if (lojaImgs[0]) {
                    gsap.fromTo(lojaImgs[0],
                        { yPercent: 130, scale: 0.15, opacity: 0, transformOrigin: '50% 100%' },
                        { yPercent: 25, scale: 0.3, opacity: 1, ease: 'none',
                          scrollTrigger: {
                              trigger: lojaSection,
                              start: 'top bottom',   // topo da seção surge por baixo
                              end: 'top top',        // até encostar no topo (início do pin)
                              scrub: true,
                          }});
                }

                // ---- Sequência em "beats" (~1 scrollada cada) ----
                // 1ª imagem: CONTINUA de onde a pré-entrada parou (25/0.3) até o lugar
                // final. O "subir" vem sobretudo do CRESCIMENTO (origem embaixo empurra
                // o topo pra cima). immediateRender:false p/ não sobrescrever no load.
                tl.fromTo(lojaImgs[0], { scale: 0.3, transformOrigin: '50% 100%' },
                    { scale: 1,   duration: 4.5, ease: 'power2.out', immediateRender: false }, 0);
                tl.fromTo(lojaImgs[0], { yPercent: 25 },
                    { yPercent: 0, duration: 6,   ease: 'power1.out', immediateRender: false }, 0);

                // texto da esquerda revela linha a linha, acompanhando as imagens
                if (leftLines.length)
                    tl.from(leftLines, { yPercent: 120, opacity: 0, stagger: 0.9, duration: 1.2, ease: 'power2.out' }, 3.5);

                enterImg(lojaImgs[1], 3.5, 0.30, 3.5, 135, 5);   // 2ª imagem: sobe sobrepondo a 1ª
                enterImg(lojaImgs[2], 8,   0.32, 3,   135, 5);   // 3ª imagem: sobe sobrepondo as anteriores

                // texto da direita só no fim (revela linha a linha)
                if (rightLines.length)
                    tl.from(rightLines, { yPercent: 120, opacity: 0, stagger: 0.6, duration: 1, ease: 'power2.out' }, 12);

                if (lojaCta) tl.from(lojaCta, { opacity: 0, y: 30, duration: 1, ease: 'power2.out' }, 13.5);

                // respiro final antes de "despinar"
                tl.to({}, { duration: 1 }, 14.5);

                // limpeza ao trocar de breakpoint
                return () => {
                    if (tl.scrollTrigger) tl.scrollTrigger.kill();
                    tl.kill();
                    if (leftSplit)  leftSplit.revert();
                    if (rightSplit) rightSplit.revert();
                };
            });

            // >>> MOBILE: sem pin — apenas fade-in simples ao entrar em tela <<<
            mm.add('(max-width: 1000px)', () => {
                const els = [leftText, rightText, lojaCta].filter(Boolean).concat(lojaImgs);
                els.forEach((el, i) => gsap.from(el, {
                    opacity: 0, y: 40, duration: 0.9, ease: 'power3.out', delay: (i % 4) * 0.08,
                    scrollTrigger: { trigger: lojaSection, start: 'top 75%' },
                }));
            });
        }
    } else {
        // Fallback (libs failed to load): keep a plain rAF loop for Lenis + manual parallax.
        if (lenis) {
            const raf = (t) => { lenis.raf(t); requestAnimationFrame(raf); };
            requestAnimationFrame(raf);
        }
    }

    // Smooth-scroll for in-page anchor links via Lenis
    if (lenis) {
        document.querySelectorAll('a[href^="#"]').forEach((a) => {
            const id = a.getAttribute('href');
            if (id && id.length > 1) {
                a.addEventListener('click', (e) => {
                    const target = document.querySelector(id);
                    if (target) { e.preventDefault(); lenis.scrollTo(target); }
                });
            }
        });
    }
});

/* --- Loja Deep Parallax Hero --- */
if (document.querySelector('#lojaParallax')) {
    // Forçar overscroll-behavior none no JS para evitar problemas de cache do CSS
    document.documentElement.style.overscrollBehavior = 'none';
    document.body.style.overscrollBehavior = 'none';
    
    const lojaParallaxTl = gsap.timeline({
        scrollTrigger: {
            trigger: '#lojaParallax',
            start: 1, // Começa apenas 1px depois do topo para evitar bugs matemáticos em progressão negativa
            end: '+=1500',
            scrub: 1,
            pin: true,
            anticipatePin: 1
        }
    });

    // Fade and scale down foreground elements
    lojaParallaxTl.fromTo('.fg-models, .fg-subtitle, .fg-action', {
        y: 0,
        scale: 1,
        opacity: 1
    }, {
        y: -100,
        scale: 0.9,
        opacity: 0,
        duration: 1
    }, 0)
    
    // Scale up and reveal background store
    .fromTo('.parallax-bg-store', {
        z: -800,
        scale: 1.5,
        opacity: 0.2,
        filter: 'blur(15px)'
    }, {
        z: 0,
        scale: 1,
        opacity: 1,
        filter: 'blur(0px)',
        duration: 1.5
    }, 0)
    
    // Transform 'LOJA' into neon sign
    .fromTo('.neon-target', {
        y: 0,
        scale: 1,
        color: '#dedede',
        textShadow: '0 10px 30px rgba(0,0,0,0.8)'
    }, {
        y: '-15vh',
        scale: 0.8,
        color: '#fff',
        textShadow: '0 0 10px #fff, 0 0 20px #fff, 0 0 30px #e50000, 0 0 50px #e50000, 0 0 80px #e50000',
        duration: 1.5
    }, 0);
}
