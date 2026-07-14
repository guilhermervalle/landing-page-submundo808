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

    // 5. Video Slider Logic (Center card + 2 side cards, circular)
    const videoCards = Array.from(document.querySelectorAll('.slider_slide'));
    const rulerItems = document.querySelectorAll('.slider-video_pagination-item');
    const track = document.getElementById('videoSliderTrack');
    const eventosBg = document.getElementById('eventosBg');
    const prevBtn = document.getElementById('sliderPrev');
    const nextBtn = document.getElementById('sliderNext');

    if (videoCards.length > 0 && track) {
        const total = videoCards.length;
        // Horizontal offset of the side cards from the center (responsive)
        function getSideOffset() {
            return Math.min(780, Math.max(300, window.innerWidth * 0.46));
        }
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

        function updateSlider(activeIndex) {
            currentIndex = (parseInt(activeIndex) + total) % total;

            videoCards.forEach((card, index) => {
                // Circular position relative to the active card: 0 = center, 1 = right, -1 = left
                let rel = (index - currentIndex + total) % total;
                let pos = rel;
                if (rel > total / 2) pos = rel - total; // wrap: last item goes to the left (-1)

                card.style.transform = `translate(calc(-50% + ${pos * getSideOffset()}px), -50%)`;
                card.classList.toggle('active', index === currentIndex);
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

        // Click a side card to bring it to the center
        videoCards.forEach((card, index) => {
            card.addEventListener('click', () => {
                if (index !== currentIndex) updateSlider(index);
            });
        });

        rulerItems.forEach((ruler) => {
            ruler.addEventListener('click', () => updateSlider(ruler.dataset.index));
        });

        if (prevBtn) prevBtn.addEventListener('click', () => updateSlider(currentIndex - 1));
        if (nextBtn) nextBtn.addEventListener('click', () => updateSlider(currentIndex + 1));

        // Keyboard navigation
        document.addEventListener('keydown', (e) => {
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

    // 6. Hero animations — same stack as the reference (GSAP ScrollTrigger + Lenis)
    const heroSection = document.querySelector('.hero-clean');
    const heroBg = document.querySelector('.midiaBackground');
    const heroTitle = document.querySelector('.hero-giant');
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

        // Background parallax — the footage drifts down 50vh across the hero scroll,
        // exactly like the reference: gsap.to(target, { y:'50vh', scrub:true }).
        if (heroBg && heroSection) {
            // Layer is 150% tall with 50% headroom above; 33% of its height ≈ 49.5vh
            // of downward drift — stays within the headroom so no gap can appear.
            gsap.to(heroBg, {
                yPercent: 33,
                ease: 'none',
                scrollTrigger: {
                    trigger: heroSection,
                    start: 'top top',
                    end: 'bottom top',
                    scrub: true,
                },
            });
        }

        // Title mask reveal is handled by the CSS keyframe (`.reveal-up-text`) —
        // reliable and visually identical, and it can never get stuck hidden.

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
        if (heroBg && heroSection) {
            let ticking = false;
            const updateHeroParallax = () => {
                const scrolled = window.scrollY || window.pageYOffset;
                if (scrolled <= heroSection.offsetHeight) {
                    // 0.33 factor to match the GSAP path and stay within the headroom
                    heroBg.style.transform = `translate3d(0, ${scrolled * 0.33}px, 0)`;
                }
                ticking = false;
            };
            window.addEventListener('scroll', () => {
                if (!ticking) { requestAnimationFrame(updateHeroParallax); ticking = true; }
            }, { passive: true });
            updateHeroParallax();
        }
        // CSS keyframe handles the title reveal in this fallback path.
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
