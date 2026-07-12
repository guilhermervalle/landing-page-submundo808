document.addEventListener('DOMContentLoaded', () => {

    // Smooth scroll (Lenis) — shared across the page, same as the reference
    let lenis = null;
    if (window.Lenis) {
        lenis = new Lenis({ duration: 1.1, smoothWheel: true });
    }

    // 1. Custom Cursor
    const cursor = document.querySelector('.custom-cursor');
    
    document.addEventListener('mousemove', (e) => {
        cursor.style.left = e.clientX + 'px';
        cursor.style.top = e.clientY + 'px';
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

        // Drive Lenis through GSAP's ticker so scroll + ScrollTrigger stay in sync
        if (lenis) {
            lenis.on('scroll', ScrollTrigger.update);
            gsap.ticker.add((time) => lenis.raf(time * 1000));
            gsap.ticker.lagSmoothing(0);
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
