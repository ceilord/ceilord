(() => {
  const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const headlineExperiment = {
    id: "hero-headline-2026-09-30-v2",
    storageKey: "ceilord.hero-headline-2026-09-30-v2",
    variants: {
      A: "Undetectable AI that doesn't need a humanizer.",
      B: "Writing built from real document structure.",
      C: "Long-form writing, learned from how humans write.",
    },
  };

  const layoutExperiment = {
    id: "hero-layout-2026-09-29-v1",
    storageKey: "ceilord.hero-layout-2026-09-29-v1",
    variants: ["A", "B"],
  };

  const demoTasks = [
    {
      title: "Write an essay about the Great Depression.",
      audience: "high school students",
      length: "1,200 words",
      tone: "clear, analytical",
      mustCover: "causes · New Deal · recovery · lasting impact",
    },
    {
      title: "Write a direct response sales letter for my brand.",
      audience: "qualified prospects",
      length: "700 words",
      tone: "persuasive, specific",
      mustCover: "problem · mechanism · proof · offer · CTA",
    },
    {
      title: "Write a product launch article for our new reporting workspace.",
      audience: "existing customers",
      length: "900 words",
      tone: "direct, clear",
      mustCover: "setup · reporting · handoff · use cases",
    },
    {
      title: "Write a founder story for my homepage.",
      audience: "prospective customers",
      length: "800 words",
      tone: "personal, credible",
      mustCover: "origin · tension · insight · product shift",
    },
  ];

  function stableVariant(storageKey, variants, forcedParam) {
    const forced = new URLSearchParams(window.location.search).get(forcedParam)?.toUpperCase();
    if (forced && variants.includes(forced)) return forced;

    try {
      const stored = window.localStorage.getItem(storageKey);
      if (stored && variants.includes(stored)) return stored;
    } catch {
      // Storage can be unavailable in private/restricted browsing.
    }

    const assigned = variants[Math.floor(Math.random() * variants.length)];
    try {
      window.localStorage.setItem(storageKey, assigned);
    } catch {
      // The assigned variant still applies for this page view.
    }
    return assigned;
  }

  function headlineVariant() {
    const forced = new URLSearchParams(window.location.search).get("headline")?.toUpperCase();
    if (forced && Object.hasOwn(headlineExperiment.variants, forced)) return forced;

    try {
      const stored = window.localStorage.getItem(headlineExperiment.storageKey);
      if (stored && Object.hasOwn(headlineExperiment.variants, stored)) return stored;
    } catch {
      // Storage can be unavailable in private/restricted browsing. Fall through to assignment.
    }

    // A gets half of visitors, B and C a quarter each.
    const weights = { A: 50, B: 25, C: 25 };
    let roll = Math.random() * 100;
    let assigned = "A";
    for (const [key, weight] of Object.entries(weights)) {
      if (roll < weight) { assigned = key; break; }
      roll -= weight;
    }
    try {
      window.localStorage.setItem(headlineExperiment.storageKey, assigned);
    } catch {
      // The assigned variant still applies for this page view when storage is unavailable.
    }
    return assigned;
  }

  const activeHeadlineVariant = headlineVariant();
  const activeLayoutVariant = stableVariant(
    layoutExperiment.storageKey,
    layoutExperiment.variants,
    "layout",
  );
  const headline = document.querySelector("[data-headline-test]");
  if (headline) headline.textContent = headlineExperiment.variants[activeHeadlineVariant];
  document.documentElement.dataset.headlineExperiment = headlineExperiment.id;
  document.documentElement.dataset.headlineVariant = activeHeadlineVariant;
  document.documentElement.dataset.layoutExperiment = layoutExperiment.id;
  document.documentElement.dataset.layoutVariant = activeLayoutVariant;

  async function recordExperimentExposure(experiment, variant, forcedParam) {
    const params = new URLSearchParams(window.location.search);
    if (params.has("headline") || params.has("layout") || params.has(forcedParam)) return;

    const exposureKey = experiment.storageKey + ".exposed";
    try {
      if (window.localStorage.getItem(exposureKey) === variant) return;
    } catch {
      // Continue with an anonymous aggregate count if storage is unavailable.
    }

    try {
      const response = await fetch("/api/experiment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          experiment: experiment.id,
          variant,
          metric: "exposure",
        }),
        keepalive: true,
      });
      if (response.ok) {
        try {
          window.localStorage.setItem(exposureKey, variant);
        } catch {
          // No persistent marker available; the page still works normally.
        }
      }
    } catch {
      // Experiment telemetry must never block the landing page.
    }
  }

  void recordExperimentExposure(headlineExperiment, activeHeadlineVariant, "headline");
  void recordExperimentExposure(layoutExperiment, activeLayoutVariant, "layout");

  const taskContent = document.querySelector("[data-job-task-content]");
  const taskTitleContent = document.querySelector("[data-job-title-content]");
  const taskTitleCursor = document.querySelector("[data-job-title-cursor]");
  const taskAudience = document.querySelector("[data-job-audience]");
  const taskLength = document.querySelector("[data-job-length]");
  const taskTone = document.querySelector("[data-job-tone]");
  const taskMustCover = document.querySelector("[data-job-must-cover]");
  let activeTaskIndex = 0;

  const textTypeOptions = {
    typingSpeed: 18,
    pauseDuration: 2500,
    deletingSpeed: 12,
    cursorBlinkDuration: 0.5,
  };

  function taskFields() {
    return [
      [taskTitleContent, "title"],
      [taskAudience, "audience"],
      [taskLength, "length"],
      [taskTone, "tone"],
      [taskMustCover, "mustCover"],
    ];
  }

  function applyTask(task) {
    if (!taskTitleContent || !taskAudience || !taskLength || !taskTone || !taskMustCover) return;
    taskFields().forEach(([element, key]) => {
      element.textContent = task[key];
    });
  }

  function wait(ms) {
    return new Promise((resolve) => window.setTimeout(resolve, ms));
  }

  async function typeTextType(element, text, speed) {
    if (!element) return;
    element.textContent = "";
    for (let index = 0; index < text.length; index += 1) {
      await wait(speed);
      element.textContent += text[index];
    }
  }

  async function deleteTextType(element, speed) {
    if (!element) return;
    while (element.textContent.length > 0) {
      await wait(speed);
      element.textContent = element.textContent.slice(0, -1);
    }
  }

  async function typeTask(task) {
    await Promise.all(
      taskFields().map(([element, key]) =>
        typeTextType(element, task[key], textTypeOptions.typingSpeed),
      ),
    );
  }

  async function deleteTask() {
    await Promise.all(
      taskFields().map(([element]) =>
        deleteTextType(element, textTypeOptions.deletingSpeed),
      ),
    );
  }

  let taskRotationStarted = false;
  async function startTaskRotation() {
    if (taskRotationStarted || !taskContent || demoTasks.length < 2) return;
    taskRotationStarted = true;

    if (reduceMotion) {
      applyTask(demoTasks[0]);
      return;
    }

    while (taskRotationStarted) {
      // React Bits TextType semantics: full text -> pause -> character deletion ->
      // advance to the next string -> character typing.
      await wait(textTypeOptions.pauseDuration);
      await deleteTask();
      activeTaskIndex = (activeTaskIndex + 1) % demoTasks.length;
      await typeTask(demoTasks[activeTaskIndex]);
    }
  }

  const GSAP = window.gsap;
  const ScrollTrigger = window.ScrollTrigger;
  const LenisCtor = window.Lenis;

  if (GSAP && ScrollTrigger) {
    GSAP.registerPlugin(ScrollTrigger);
  }

  if (GSAP && taskTitleCursor && !reduceMotion) {
    GSAP.set(taskTitleCursor, { opacity: 1 });
    GSAP.to(taskTitleCursor, {
      opacity: 0,
      duration: textTypeOptions.cursorBlinkDuration,
      repeat: -1,
      yoyo: true,
      ease: "power2.inOut",
    });
  }

  let lenis = null;
  if (!reduceMotion && GSAP && ScrollTrigger && LenisCtor) {
    lenis = new LenisCtor({
      lerp: 0.085,
      smoothWheel: true,
      syncTouch: false,
      wheelMultiplier: 0.9,
      touchMultiplier: 1.0,
    });

    lenis.on("scroll", ScrollTrigger.update);
    GSAP.ticker.add((time) => lenis.raf(time * 1000));
    GSAP.ticker.lagSmoothing(0);
  }

  document.querySelectorAll('a[href^="#"]').forEach((link) => {
    link.addEventListener("click", (event) => {
      const selector = link.getAttribute("href");
      if (!selector || selector === "#") return;
      const target = document.querySelector(selector);
      if (!target) return;

      if (lenis) {
        event.preventDefault();
        lenis.scrollTo(target, { offset: -42, duration: 1.0 });
      }
    });
  });

  // Port of the local AnimatedBeam pattern for the static Ceilord landing page.
  // The line itself has meaning: it connects the four real stages shown in the UI.
  const jobPanel = document.querySelector("[data-job-panel]");
  const jobStatus = document.querySelector("[data-job-status]");
  const pipeline = document.querySelector("[data-pipeline]");
  const beamBase = document.querySelector("[data-beam-path]");
  const beamActive = document.querySelector("[data-beam-active]");
  const pipelineSteps = Array.from(document.querySelectorAll("[data-pipeline-step]"));

  function updateBeamPath() {
    if (!pipeline || !beamBase || !beamActive || pipelineSteps.length < 2) return;

    const containerRect = pipeline.getBoundingClientRect();
    const firstDot = pipelineSteps[0].querySelector(".step-dot").getBoundingClientRect();
    const lastDot = pipelineSteps[pipelineSteps.length - 1].querySelector(".step-dot").getBoundingClientRect();

    const startX = firstDot.left - containerRect.left + firstDot.width / 2;
    const startY = firstDot.top - containerRect.top + firstDot.height / 2;
    const endX = lastDot.left - containerRect.left + lastDot.width / 2;
    const endY = lastDot.top - containerRect.top + lastDot.height / 2;
    const d = `M ${startX} ${startY} L ${endX} ${endY}`;

    beamBase.setAttribute("d", d);
    beamActive.setAttribute("d", d);
    beamBase.setAttribute("pathLength", "1");
    beamActive.setAttribute("pathLength", "1");
  }

  updateBeamPath();
  if (pipeline && "ResizeObserver" in window) {
    new ResizeObserver(updateBeamPath).observe(pipeline);
  } else {
    window.addEventListener("resize", updateBeamPath);
  }

  if (GSAP && !reduceMotion) {
    const heroTimeline = GSAP.timeline();

    if (activeLayoutVariant === "B" && jobPanel) {
      const panelRect = jobPanel.getBoundingClientRect();
      const startY = Math.max(window.innerHeight - panelRect.top + 48, 240);
      GSAP.set(jobPanel, { y: startY });
      if (jobStatus) jobStatus.textContent = "live demo";
    }

    heroTimeline.to("[data-mask-reveal]", {
      clipPath: "inset(0 0% 0 0)",
      duration: 0.78,
      ease: "power3.inOut",
    });

    if (activeLayoutVariant === "B" && jobPanel) {
      heroTimeline.to({}, { duration: 0.16 });
      heroTimeline.to(jobPanel, {
        y: 0,
        duration: 1,
        ease: "power3.out",
      });
      heroTimeline.call(() => void startTaskRotation());
    } else {
      heroTimeline.call(() => void startTaskRotation());
    }

    if (beamActive && activeLayoutVariant !== "B") {
      GSAP.set(beamActive, { strokeDasharray: "0.14 0.86", strokeDashoffset: 0 });
      GSAP.to(beamActive, {
        strokeDashoffset: -1,
        duration: 2.6,
        repeat: -1,
        ease: "none",
      });
    }

    const qaRows = Array.from(document.querySelectorAll("[data-qa-row]"));
    if (activeLayoutVariant !== "B") {
      GSAP.set(qaRows, { clipPath: "inset(0 100% 0 0)" });
    }

    const jobTimeline = GSAP.timeline({ delay: 0.35, paused: activeLayoutVariant === "B" });

    pipelineSteps.forEach((step, index) => {
      if (index === 0) {
        jobTimeline.call(() => step.classList.add("is-complete"), null, 0);
        return;
      }

      const at = 0.4 + index * 0.48;
      jobTimeline.call(() => {
        pipelineSteps.forEach((node, nodeIndex) => {
          node.classList.toggle("is-complete", nodeIndex < index);
          node.classList.toggle("is-current", nodeIndex === index);
        });

        if (index === 2 && jobStatus) jobStatus.textContent = "checking";
        if (index === 3 && jobStatus) jobStatus.textContent = "checked";
      }, null, at);
    });

    jobTimeline.to(qaRows, {
      clipPath: "inset(0 0% 0 0)",
      duration: 0.38,
      stagger: 0.09,
      ease: "power2.inOut",
    }, 1.35);

    const compare = document.querySelector("[data-workflow-compare]");
    const workflowFill = document.querySelector("[data-workflow-fill]");
    const newSteps = Array.from(document.querySelectorAll("[data-new-step]"));

    if (compare && workflowFill && ScrollTrigger) {
      const workflowTrack = workflowFill.parentElement;

      const updateWorkflowTrack = () => {
        if (!workflowTrack || newSteps.length < 2) return;
        const parent = workflowTrack.offsetParent;
        if (!parent) return;

        const parentRect = parent.getBoundingClientRect();
        const firstDot = newSteps[0].getBoundingClientRect();
        const lastDot = newSteps[newSteps.length - 1].getBoundingClientRect();

        const firstCenter = firstDot.top - parentRect.top + firstDot.height / 2;
        const lastCenter = lastDot.top - parentRect.top + lastDot.height / 2;

        workflowTrack.style.top = `${firstCenter}px`;
        workflowTrack.style.height = `${Math.max(0, lastCenter - firstCenter)}px`;
      };

      updateWorkflowTrack();
      if ("ResizeObserver" in window) {
        new ResizeObserver(updateWorkflowTrack).observe(compare);
      } else {
        window.addEventListener("resize", updateWorkflowTrack);
      }

      ScrollTrigger.create({
        trigger: compare,
        start: "top 72%",
        end: "bottom 42%",
        scrub: true,
        onUpdate: (self) => {
          workflowFill.style.height = `${Math.min(100, Math.max(0, self.progress * 100))}%`;
          const activeCount = Math.max(1, Math.ceil(self.progress * newSteps.length));
          newSteps.forEach((step, index) => step.classList.toggle("is-active", index < activeCount));
        },
      });
    }

    const stickyFooter = document.querySelector("[data-sticky-footer]");
    const footerInner = document.querySelector("[data-footer-inner]");
    const footerWordmark = document.querySelector("[data-footer-wordmark]");
    const mainSurface = document.querySelector("main");

    if (stickyFooter && footerInner && mainSurface && ScrollTrigger) {
      ScrollTrigger.create({
        trigger: stickyFooter,
        start: "top bottom",
        end: "top 48%",
        invalidateOnRefresh: true,
      });
    }

    const proofChecks = Array.from(document.querySelectorAll("[data-proof-check] i"));
    if (proofChecks.length && ScrollTrigger) {
      GSAP.set(proofChecks, { scale: 0 });
      ScrollTrigger.create({
        trigger: "[data-proof-workbench]",
        start: "top 70%",
        once: true,
        onEnter: () => {
          GSAP.to(proofChecks, {
            scale: 1,
            duration: 0.28,
            stagger: 0.08,
            ease: "back.out(1.7)",
          });
        },
      });
    }

  } else {
    document.querySelectorAll("[data-mask-reveal]").forEach((el) => {
      el.style.clipPath = "none";
    });
    if (activeLayoutVariant === "B" && jobStatus) jobStatus.textContent = "live demo";
    void startTaskRotation();
    pipelineSteps.forEach((step, index) => {
      step.classList.toggle("is-complete", index < pipelineSteps.length - 1);
      step.classList.toggle("is-current", index === pipelineSteps.length - 1);
    });
    document.querySelectorAll("[data-new-step]").forEach((step) => step.classList.add("is-active"));
  }

  document.querySelectorAll("[data-beta-form]").forEach((form) => {
    form.addEventListener("submit", async (event) => {
      event.preventDefault();

      const input = form.querySelector('input[name="email"]');
      const honey = form.querySelector('input[name="company"]');
      const consent = form.querySelector('input[name="consent"]');
      const button = form.querySelector('button[type="submit"]');
      const note = form.querySelector("[data-form-note]");
      const email = input.value.trim().toLowerCase();

      note.classList.remove("success", "error");

      if (!emailRe.test(email)) {
        note.textContent = "Enter a valid email address.";
        note.classList.add("error");
        input.focus();
        return;
      }

      if (!consent || !consent.checked) {
        note.textContent = "Please agree to the Terms and beta email notice to continue.";
        note.classList.add("error");
        consent?.focus();
        return;
      }

      const original = button.textContent;
      button.disabled = true;
      button.textContent = "Requesting...";

      try {
        const response = await fetch("/api/beta", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email,
            company: honey ? honey.value : "",
            headlineExperiment: headlineExperiment.id,
            headlineVariant: activeHeadlineVariant,
            layoutExperiment: layoutExperiment.id,
            layoutVariant: activeLayoutVariant,
            consent: consent.checked,
            noticeVersion: "2026-09-30-v2",
          }),
        });

        const data = await response.json().catch(() => ({}));

        if (!response.ok) {
          throw new Error(data.error || "Could not add you right now.");
        }

        document.querySelectorAll("[data-beta-form]").forEach((betaForm) => {
          const betaInput = betaForm.querySelector('input[name="email"]');
          const betaButton = betaForm.querySelector('button[type="submit"]');
          const betaConsent = betaForm.querySelector('input[name="consent"]');
          const betaNote = betaForm.querySelector("[data-form-note]");

          betaInput.value = email;
          betaInput.disabled = true;
          betaButton.disabled = true;
          betaConsent.disabled = true;
          betaButton.textContent = "Access requested ✓";
          betaNote.textContent = "Request received. We will email you when your beta place opens.";
          betaNote.classList.remove("error");
          betaNote.classList.add("success");
        });
        showSuccess(email);
      } catch (error) {
        note.textContent = error.message || "Could not reach the server. Try again.";
        note.classList.add("error");
        button.disabled = false;
        button.textContent = original;
      }
    });
  });
})();


// Success popup with confetti (inline canvas, no dependency; skipped under reduced motion).
function showSuccess(email) {
  const modal = document.querySelector("[data-success-modal]");
  if (!modal) return;
  modal.querySelector("[data-success-email]").textContent = email;
  modal.hidden = false;
  const close = modal.querySelector("[data-success-close]");
  close.focus();
  const hide = () => { modal.hidden = true; document.removeEventListener("keydown", onKey); };
  const onKey = (e) => { if (e.key === "Escape") hide(); };
  close.onclick = hide;
  modal.onclick = (e) => { if (e.target === modal) hide(); };
  document.addEventListener("keydown", onKey);

  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  const canvas = modal.querySelector("[data-confetti]");
  const ctx = canvas.getContext("2d");
  const dpr = window.devicePixelRatio || 1;
  canvas.width = innerWidth * dpr;
  canvas.height = innerHeight * dpr;
  ctx.scale(dpr, dpr);
  const colors = ["#5863ea", "#3f49d8", "#050505", "#a0a0a0", "#d9d9d9"];
  const bits = Array.from({ length: 140 }, () => ({
    x: innerWidth / 2, y: innerHeight / 2.4,
    vx: (Math.random() - .5) * 16, vy: -Math.random() * 15 - 3,
    w: 5 + Math.random() * 6, h: 3 + Math.random() * 5,
    r: Math.random() * 6, vr: (Math.random() - .5) * .3,
    c: colors[Math.floor(Math.random() * colors.length)],
  }));
  const end = performance.now() + 3200;
  (function frame(now) {
    ctx.clearRect(0, 0, innerWidth, innerHeight);
    for (const b of bits) {
      b.vy += .32; b.vx *= .992; b.x += b.vx; b.y += b.vy; b.r += b.vr;
      ctx.save(); ctx.translate(b.x, b.y); ctx.rotate(b.r);
      ctx.fillStyle = b.c; ctx.fillRect(-b.w / 2, -b.h / 2, b.w, b.h); ctx.restore();
    }
    if (now < end && !modal.hidden) requestAnimationFrame(frame);
    else ctx.clearRect(0, 0, innerWidth, innerHeight);
  })(performance.now());
}
