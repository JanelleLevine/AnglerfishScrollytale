    const singleSvg = d3.select("#single-chart");
    const singleRemakeSvg = d3.select("#single-remake-chart");
    const multiSvg = d3.select("#multi-chart");
    const weightBubbleSvg = d3.select("#weight-bubble-chart");
    const seabedMiningSvg = d3.select("#seabed-mining-chart");
    const seabedMiningWeeklySvg = d3.select("#seabed-mining-weekly-chart");
    const kendrickAnglerSvg = d3.select("#kendrick-angler-chart");
    const singleTooltip = d3.select("#single-tooltip");
    const singleRemakeTooltip = d3.select("#single-remake-tooltip");
    const multiTooltip = d3.select("#multi-tooltip");
    const weightBubbleTooltip = d3.select("#weight-bubble-tooltip");
    const seabedMiningTooltip = d3.select("#seabed-mining-tooltip");
    const seabedMiningWeeklyTooltip = d3.select("#seabed-mining-weekly-tooltip");
    const avgDailyBody = d3.select("#avg-daily-body");
    const status = d3.select("#status");
    const seabedStatus = d3.select("#seabed-status");
    const kendrickAnglerStatus = d3.select("#kendrick-angler-status");
    const resetFocusButton = d3.select("#reset-focus");
    const seabedScaleLinearButton = d3.select("#seabed-scale-linear");
    const seabedScaleLogButton = d3.select("#seabed-scale-log");
    const kendrickPoll = document.getElementById("kendrick-correlation-poll");
    const lowercaseNecklaceCard = document.getElementById("lowercase-a-necklace-card");

    const CHART_WIDTH = 960;
    const CHART_HEIGHT = 520;
    const parseDate = d3.timeParse("%Y-%m-%d");
    const formatDate = d3.timeFormat("%b %d, %Y");
    const formatShortDate = d3.timeFormat("%b '%y");
    const formatValue = d3.format(",");
    const csvPath = "data/pageviews-20230101-20260219.csv";
    const taylorCsvCandidates = ["data/TaylorSwift_Angler.csv", "TaylorSwift_Angler.csv"];
    const seabedCsvCandidates = [
      "data/SeabedMining_Anglerfish.csv",
      "data/SeabedMining_Anglerfish",
      "SeabedMining_Anglerfish.csv",
      "SeabedMining_Anglerfish",
      "../AnglerFishViz/SeabedMining_Anglerfish.csv",
      "../AnglerFishViz/data/SeabedMining_Anglerfish.csv",
      "data/seabedmining_anglerfish.csv",
      "data/seabedmining_anglerfish",
      "seabedmining_anglerfish.csv",
      "seabedmining_anglerfish"
    ];
    const kendrickCsvCandidates = [
      "data/kendrick)angler.csv",
      "data/kendrick)angler",
      "kendrick)angler.csv",
      "kendrick)angler",
      "data/Kendrick_Angler.csv",
      "Kendrick_Angler.csv"
    ];
    const fishImagePath = "jo.png";
    const braceletImagePath = "mic_bracelet.png";
    const finalBraceletImagePath = "AnglerBracelet.png";
    const ANGLERFISH_COLOR = "#53e8ff";
    const SEABED_MINING_COLOR = "#4ed9c5";
    const TAYLOR_SWIFT_COLOR = "#ff8fae";
    const SPECIES_THEME_COLORS = new Map([
      ["Anglerfish", ANGLERFISH_COLOR],
      ["Blue whale", "#6f86ff"],
      ["Great white shark", "#4ed9c5"],
      ["Polar bear", "#a8ccff"]
    ]);
    const FALLBACK_SERIES_COLORS = ["#79d3ff", "#8de8d8", "#8ea9ff", "#9ad5ff", "#67c9f4", "#a4ddff"];
    const SPECIES_WEIGHTS = [
      { name: "Blue whale", weightLb: 400000, weightLabel: "400,000 lbs", color: SPECIES_THEME_COLORS.get("Blue whale") },
      { name: "Great white shark", weightLb: 5501, weightLabel: "5,501 lbs", color: SPECIES_THEME_COLORS.get("Great white shark") },
      { name: "Polar bear", weightLb: 1760, weightLabel: "1,760 lbs", color: SPECIES_THEME_COLORS.get("Polar bear") },
      { name: "Anglerfish", weightLb: 2, weightLabel: "2 lbs", color: SPECIES_THEME_COLORS.get("Anglerfish") }
    ];
    const speciesWeightByName = new Map(SPECIES_WEIGHTS.map(d => [d.name, d]));
    let remakeScrollCleanup = null;
    let weightBubbleScrollCleanup = null;
    let seabedRevealCleanup = null;
    let seabedWeeklyRevealCleanup = null;
    let kendrickRevealCleanup = null;
    let multiRevealCleanup = null;
    const KENDRICK_POLL_RESULTS_KEY = "anglerfish-kendrick-poll-results-v1";
    const KENDRICK_POLL_VOTE_KEY = "anglerfish-kendrick-poll-vote-v1";
    const csvPromiseCache = new Map();
    const csvResolvedPathByLabel = new Map();

    function scheduleIdleTask(callback, timeout = 1200) {
      if (typeof callback !== "function") return;
      if (typeof window.requestIdleCallback === "function") {
        window.requestIdleCallback(() => callback(), { timeout });
        return;
      }
      window.setTimeout(callback, 220);
    }

    function prefetchCsvCandidates(paths, label) {
      scheduleIdleTask(() => {
        loadFirstAvailableCsv(paths, label).catch(() => {});
      });
    }

    function runOnceWhenVisible(target, callback, options = {}) {
      const node = typeof target === "string" ? document.querySelector(target) : target;
      if (!node || typeof callback !== "function") return;
      if (typeof IntersectionObserver !== "function") {
        callback();
        return;
      }

      let hasRun = false;
      const observer = new IntersectionObserver(entries => {
        if (hasRun) return;
        entries.forEach(entry => {
          if (!hasRun && (entry.isIntersecting || entry.intersectionRatio > 0)) {
            hasRun = true;
            observer.disconnect();
            callback();
          }
        });
      }, {
        root: null,
        rootMargin: options.rootMargin || "320px 0px",
        threshold: Number.isFinite(options.threshold) ? options.threshold : 0.01
      });

      observer.observe(node);
    }

    runOnceWhenVisible("#kendrick-correlation-poll", () => initKendrickPoll(), { rootMargin: "220px 0px" });
    runOnceWhenVisible("#lowercase-a-necklace-card", () => initLowercaseNecklaceReveal(), { rootMargin: "220px 0px" });

    Promise.all([
      loadFirstAvailableCsv([csvPath], "main trends CSV"),
      loadFirstAvailableCsv(taylorCsvCandidates, "Taylor Swift comparison CSV")
    ]).then(([rawData, rawTaylorData]) => {
      const metricNames = rawData.columns.filter(name => name !== "Date");
      const parsedRows = rawData
        .map(row => {
          const date = parseDate(row.Date);
          if (!date) {
            return null;
          }

          const values = {};
          metricNames.forEach(name => {
            values[name] = Number(row[name]);
          });

          return { date, ...values };
        })
        .filter(Boolean);

      const anglerfishData = parsedRows
        .map(row => ({ date: row.date, views: row.Anglerfish }))
        .filter(row => Number.isFinite(row.views));

      if (anglerfishData.length === 0) {
        throw new Error("CSV loaded, but no valid Date/Anglerfish rows were found.");
      }

      const anglerColumn = rawTaylorData.columns.find(name => name.toLowerCase().replace(/\s+/g, "") === "anglerfish");
      const taylorColumn = rawTaylorData.columns.find(name => name.toLowerCase().replace(/\s+/g, "") === "taylorswift");

      if (!anglerColumn || !taylorColumn) {
        throw new Error("TaylorSwift_Angler.csv must include Date, Anglerfish, and Taylor Swift columns.");
      }

      const headToHeadData = rawTaylorData
        .map(row => ({
          date: parseDate(row.Date),
          anglerfish: Number(row[anglerColumn]),
          taylorSwift: Number(row[taylorColumn])
        }))
        .filter(row => row.date && Number.isFinite(row.anglerfish) && Number.isFinite(row.taylorSwift));

      drawAnglerfishChart(anglerfishData);
      runOnceWhenVisible("#single-remake-chart", () => drawAnglerfishRemakeChart(anglerfishData, headToHeadData));
      runOnceWhenVisible("#multi-chart", () => drawComparisonChart(parsedRows, metricNames));
      runOnceWhenVisible("#weight-bubble-chart", () => drawWeightBubbleChart(parsedRows));
      renderAverageDailyTable(parsedRows, metricNames);
      prefetchCsvCandidates(seabedCsvCandidates, "seabed mining CSV");
      prefetchCsvCandidates(kendrickCsvCandidates, "Kendrick vs Angler CSV");

      status.text(`Loaded ${anglerfishData.length} daily points from ${formatDate(d3.min(anglerfishData, d => d.date))} to ${formatDate(d3.max(anglerfishData, d => d.date))}.`);
    }).catch(error => {
      status.style("color", "#ffb4a2").text(`Failed to load data: ${error.message}`);
    });

    runOnceWhenVisible("#seabed-mining-chart", () => {
      loadFirstAvailableCsv(seabedCsvCandidates, "seabed mining CSV")
        .then(rawSeabedData => {
          const seabedColumn = rawSeabedData.columns.find(name => name.toLowerCase().replace(/\s+/g, "") === "seabedmining");
          const anglerColumn = rawSeabedData.columns.find(name => name.toLowerCase().replace(/\s+/g, "") === "anglerfish");

          if (!seabedColumn || !anglerColumn) {
            throw new Error("SeabedMining_Anglerfish.csv must include Date, Seabed mining, and Anglerfish columns.");
          }

          const seabedData = rawSeabedData
            .map(row => ({
              date: parseDate(row.Date),
              seabedMining: Number(row[seabedColumn]),
              anglerfish: Number(row[anglerColumn])
            }))
            .filter(row => row.date && (Number.isFinite(row.seabedMining) || Number.isFinite(row.anglerfish)))
            .sort((a, b) => a.date - b.date);

          if (seabedData.length === 0) {
            throw new Error("No valid Date/Seabed mining/Anglerfish rows were found.");
          }

          drawSeabedMiningChart(seabedData);
          drawSeabedMiningWeeklyLogChart(seabedData);

          if (!seabedStatus.empty()) {
            seabedStatus
              .style("color", "var(--text-soft)")
              .text(`Loaded ${seabedData.length} points from ${formatDate(d3.min(seabedData, d => d.date))} to ${formatDate(d3.max(seabedData, d => d.date))}.`);
          }
        })
        .catch(error => {
          if (!seabedStatus.empty()) {
            seabedStatus
              .style("color", "#ffb4a2")
              .text(`Seabed chart unavailable: ${error.message}`);
          }
        });
    });

    runOnceWhenVisible("#kendrick-angler-chart", () => {
      loadFirstAvailableCsv(kendrickCsvCandidates, "Kendrick vs Angler CSV")
        .then(rawKendrickData => {
          const kendrickColumn = rawKendrickData.columns.find(name => name.toLowerCase().replace(/\s+/g, "") === "kendricklamar");
          const anglerColumn = rawKendrickData.columns.find(name => name.toLowerCase().replace(/\s+/g, "") === "anglerfish");

          if (!kendrickColumn || !anglerColumn) {
            throw new Error("kendrick)angler CSV must include Date, Kendrick Lamar, and Anglerfish columns.");
          }

          const kendrickData = rawKendrickData
            .map(row => ({
              date: parseDate(row.Date),
              kendrickLamar: Number(row[kendrickColumn]),
              anglerfish: Number(row[anglerColumn])
            }))
            .filter(row => row.date && (Number.isFinite(row.kendrickLamar) || Number.isFinite(row.anglerfish)))
            .sort((a, b) => a.date - b.date);

          if (kendrickData.length === 0) {
            throw new Error("No valid Date/Kendrick Lamar/Anglerfish rows were found.");
          }

          drawKendrickAnglerLogChart(kendrickData);

          if (!kendrickAnglerStatus.empty()) {
            kendrickAnglerStatus
              .style("color", "var(--text-soft)")
              .text(`Loaded ${kendrickData.length} points from ${formatDate(d3.min(kendrickData, d => d.date))} to ${formatDate(d3.max(kendrickData, d => d.date))}.`);
          }
        })
        .catch(error => {
          if (!kendrickAnglerStatus.empty()) {
            kendrickAnglerStatus
              .style("color", "#ffb4a2")
              .text(`Kendrick chart unavailable: ${error.message}`);
          }
        });
    });

    function initKendrickPoll() {
      if (!kendrickPoll || kendrickPoll.hidden || kendrickPoll.closest("[hidden]") || kendrickPoll.classList.contains("poll-staged")) return;

      const lockTargetNode = kendrickPoll.closest(".game-poll-layout") || kendrickPoll;
      const pollPanel = document.getElementById("kendrick-poll-panel");
      const pollButtons = Array.from(kendrickPoll.querySelectorAll("[data-poll-choice]"));
      const resultsContainer = document.getElementById("kendrick-poll-results");
      const message = document.getElementById("kendrick-poll-message");
      const yesFill = document.getElementById("kendrick-poll-yes-fill");
      const noFill = document.getElementById("kendrick-poll-no-fill");
      const yesLabel = document.getElementById("kendrick-poll-yes-label");
      const noLabel = document.getElementById("kendrick-poll-no-label");
      let hasAnswered = false;
      let revealProgress = 0;
      let targetRevealProgress = 0;
      let gateLocked = false;
      let lockScrollY = 0;
      let lockDirection = 0;
      let touchY = null;
      let revealRafId = 0;
      let lastScrollY = window.scrollY;
      let lockCooldownUntil = 0;

      if (!pollPanel || !pollButtons.length || !resultsContainer || !message || !yesFill || !noFill || !yesLabel || !noLabel) return;

      message.textContent = "Thanks for answering! The blue line is still Wikipedia pageviews for our angler. The second line is Wikipedia pageviews for Kendrick Lamar. It was right around his Superbowl appearance, and there was also a surge of interest in him. Did you get it right? I sure didn't. It seems like maybe just a lot of people were online that day, and I'm just desperate to get after some meaning that isn't there. If just viewing the raw data, I would have sworn there was something there.\nScience can be humbling sometimes";

      const existingVote = readStoredChoice(KENDRICK_POLL_VOTE_KEY);
      const initialTallies = readStoredTallies();

      function clamp01(value) {
        return Math.max(0, Math.min(1, value));
      }

      const renderTallies = tallies => {
        const yesCount = Number.isFinite(tallies.yes) ? tallies.yes : 0;
        const noCount = Number.isFinite(tallies.no) ? tallies.no : 0;
        const total = yesCount + noCount;
        const yesPercent = total > 0 ? Math.round((yesCount / total) * 100) : 0;
        const noPercent = total > 0 ? 100 - yesPercent : 0;

        yesFill.style.width = `${yesPercent}%`;
        noFill.style.width = `${noPercent}%`;
        yesLabel.textContent = `${yesPercent}%`;
        noLabel.textContent = `${noPercent}%`;
      };

      const renderSwap = progressRaw => {
        revealProgress = clamp01(progressRaw);
        const eased = d3.easeCubicInOut(revealProgress);

        if (!hasAnswered) {
          kendrickPoll.classList.remove("is-text-mode");
          pollPanel.style.opacity = "1";
          pollPanel.style.transform = "translateY(0px)";
          pollPanel.style.pointerEvents = "auto";
          message.hidden = true;
          message.style.opacity = "0";
          message.style.transform = "translateY(18px)";
          return;
        }

        message.hidden = false;
        pollPanel.style.opacity = `${1 - eased}`;
        pollPanel.style.transform = `translateY(${-58 * eased}px)`;
        pollPanel.style.pointerEvents = eased > 0.8 ? "none" : "auto";
        message.style.opacity = `${eased}`;
        message.style.transform = `translateY(${18 * (1 - eased)}px)`;
        kendrickPoll.classList.toggle("is-text-mode", eased > 0.55);
      };

      function getLockMetrics() {
        if (!lockTargetNode) return null;
        const rect = lockTargetNode.getBoundingClientRect();
        const vh = window.innerHeight || document.documentElement.clientHeight || 1;
        const desiredTop = Math.max(24, (vh - rect.height) / 2);
        const lockY = Math.max(0, window.scrollY + rect.top - desiredTop);
        const visibleHeight = Math.max(0, Math.min(rect.bottom, vh) - Math.max(rect.top, 0));
        return { rect, vh, lockY, visibleHeight };
      }

      function canRevealForDelta(delta) {
        if (!hasAnswered || delta === 0) return false;
        if (revealProgress <= 0.001) {
          return delta < 0;
        }
        if (revealProgress >= 0.999) {
          return delta > 0;
        }
        return true;
      }

      function shouldLockForDelta(delta) {
        if (gateLocked || !canRevealForDelta(delta)) return false;
        if (performance.now() < lockCooldownUntil) return false;
        const metrics = getLockMetrics();
        if (!metrics) return false;
        const enoughVisible = metrics.visibleHeight >= Math.max(140, Math.min(metrics.rect.height * 0.28, metrics.vh * 0.58));
        return enoughVisible;
      }

      function lockToPanel(direction) {
        if (gateLocked || !direction) return;
        if (!canRevealForDelta(direction)) return;
        const metrics = getLockMetrics();
        if (!metrics) return;
        const currentY = window.scrollY;

        gateLocked = true;
        lockDirection = direction > 0 ? 1 : -1;
        lockScrollY = metrics.lockY;
        if (Math.abs(currentY - lockScrollY) > 0.5) {
          window.scrollTo(0, lockScrollY);
        }
        lastScrollY = lockScrollY;
        const scrollbarGap = Math.max(0, window.innerWidth - document.documentElement.clientWidth);
        document.body.style.setProperty("--kendrick-lock-top", `${-lockScrollY}px`);
        document.body.style.setProperty("--kendrick-scrollbar-gap", `${scrollbarGap}px`);
        document.documentElement.classList.add("kendrick-scroll-locked");
        document.body.classList.add("kendrick-scroll-locked");
      }

      function unlockFromPanel() {
        const wasLocked = gateLocked;
        gateLocked = false;
        lockDirection = 0;
        document.documentElement.classList.remove("kendrick-scroll-locked");
        document.body.classList.remove("kendrick-scroll-locked");
        document.body.style.removeProperty("--kendrick-lock-top");
        document.body.style.removeProperty("--kendrick-scrollbar-gap");
        if (wasLocked) {
          window.scrollTo(0, lockScrollY);
          lastScrollY = lockScrollY;
          lockCooldownUntil = performance.now() + 120;
        }
      }

      function maybeUnlockAtBoundary() {
        if (!gateLocked) return;
        if (revealProgress >= 0.999) {
          targetRevealProgress = 1;
          renderSwap(1);
          unlockFromPanel();
          return;
        }
        if (revealProgress <= 0.001) {
          targetRevealProgress = 0;
          renderSwap(0);
          unlockFromPanel();
        }
      }

      function runRevealFrame() {
        revealRafId = 0;
        const diff = targetRevealProgress - revealProgress;
        if (Math.abs(diff) <= 0.0008) {
          renderSwap(targetRevealProgress);
          maybeUnlockAtBoundary();
          return;
        }
        renderSwap(revealProgress + (diff * 0.22));
        maybeUnlockAtBoundary();
        if (gateLocked || Math.abs(targetRevealProgress - revealProgress) > 0.0008) {
          revealRafId = requestAnimationFrame(runRevealFrame);
        }
      }

      function scheduleRevealFrame() {
        if (!revealRafId) {
          revealRafId = requestAnimationFrame(runRevealFrame);
        }
      }

      function advanceReveal(rawDelta) {
        if (!gateLocked || !rawDelta) return;
        lockDirection = rawDelta > 0 ? 1 : -1;
        targetRevealProgress = clamp01(targetRevealProgress + ((-rawDelta) / 950));
        scheduleRevealFrame();
      }

      const revealAnswerState = choice => {
        hasAnswered = true;
        pollButtons.forEach(button => {
          const isSelected = button.dataset.pollChoice === choice;
          button.classList.toggle("is-selected", isSelected);
          button.disabled = true;
        });
        resultsContainer.hidden = false;
        renderSwap(revealProgress);
      };

      const submitChoice = choice => {
        const normalizedChoice = choice === "yes" ? "yes" : "no";
        const priorChoice = readStoredChoice(KENDRICK_POLL_VOTE_KEY);

        if (priorChoice === "yes" || priorChoice === "no") {
          revealAnswerState(priorChoice);
          renderTallies(readStoredTallies());
          return;
        }

        const tallies = readStoredTallies();
        tallies[normalizedChoice] += 1;
        writeStoredTallies(tallies);
        writeStoredChoice(KENDRICK_POLL_VOTE_KEY, normalizedChoice);
        revealAnswerState(normalizedChoice);
        renderTallies(tallies);
      };

      pollButtons.forEach(button => {
        button.addEventListener("click", () => submitChoice(button.dataset.pollChoice));
      });

      const onWheel = event => {
        if (shouldLockForDelta(event.deltaY)) {
          lockToPanel(event.deltaY);
        }
        if (!gateLocked) return;
        event.preventDefault();
        advanceReveal(event.deltaY);
      };

      const onTouchStart = event => {
        touchY = event.touches && event.touches.length ? event.touches[0].clientY : null;
      };

      const onTouchMove = event => {
        const currentY = event.touches && event.touches.length ? event.touches[0].clientY : null;
        if (touchY == null || currentY == null) return;
        const delta = touchY - currentY;
        touchY = currentY;
        if (shouldLockForDelta(delta)) {
          lockToPanel(delta);
        }
        if (!gateLocked) return;
        event.preventDefault();
        advanceReveal(delta);
      };

      const onKeyDown = event => {
        let delta = 0;
        if (event.key === "ArrowDown" || event.key === "PageDown" || event.key === " ") {
          delta = 120;
        }
        if (event.key === "ArrowUp" || event.key === "PageUp") {
          delta = -120;
        }
        if (!delta) return;
        if (shouldLockForDelta(delta)) {
          lockToPanel(delta);
        }
        if (!gateLocked) return;
        event.preventDefault();
        advanceReveal(delta);
      };

      const onScrollMonitor = () => {
        if (gateLocked) return;
        const currentY = window.scrollY;
        const delta = currentY - lastScrollY;
        lastScrollY = currentY;
        if (!delta) return;
        if (!canRevealForDelta(delta)) return;
        if (performance.now() < lockCooldownUntil) return;
        const metrics = getLockMetrics();
        if (!metrics) return;
        const enoughVisible = metrics.visibleHeight >= Math.max(140, Math.min(metrics.rect.height * 0.28, metrics.vh * 0.58));
        if (enoughVisible) {
          lockToPanel(delta);
        }
      };

      renderTallies(initialTallies);
      if (existingVote === "yes" || existingVote === "no") {
        revealAnswerState(existingVote);
      }
      renderSwap(0);
      targetRevealProgress = 0;

      window.addEventListener("wheel", onWheel, { passive: false });
      window.addEventListener("touchstart", onTouchStart, { passive: true });
      window.addEventListener("touchmove", onTouchMove, { passive: false });
      window.addEventListener("keydown", onKeyDown);
      window.addEventListener("scroll", onScrollMonitor, { passive: true });
    }

    function initLowercaseNecklaceReveal() {
      if (!lowercaseNecklaceCard || lowercaseNecklaceCard.hidden || lowercaseNecklaceCard.closest("[hidden]")) return;
      const activate = () => lowercaseNecklaceCard.classList.add("is-visible");

      if (!("IntersectionObserver" in window)) {
        activate();
        return;
      }

      const revealObserver = new IntersectionObserver(entries => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            activate();
            revealObserver.disconnect();
          }
        });
      }, { threshold: 0.38 });

      revealObserver.observe(lowercaseNecklaceCard);
    }

    function updateKendrickPollStage(progressRaw) {
      if (!kendrickPoll) return;
      const revealStart = 0.58;
      const revealEnd = 0.98;
      const t = Math.max(0, Math.min(1, (progressRaw - revealStart) / Math.max(0.001, revealEnd - revealStart)));
      const eased = d3.easeCubicInOut(t);
      kendrickPoll.style.opacity = `${eased}`;
      kendrickPoll.style.transform = "translateY(0px)";
      kendrickPoll.style.pointerEvents = eased >= 0.995 ? "auto" : "none";
      kendrickPoll.style.visibility = eased <= 0.001 ? "hidden" : "visible";
    }

    function readStoredTallies() {
      const fallback = { yes: 0, no: 0 };
      try {
        const raw = window.localStorage.getItem(KENDRICK_POLL_RESULTS_KEY);
        if (!raw) return fallback;
        const parsed = JSON.parse(raw);
        const yes = Number(parsed.yes);
        const no = Number(parsed.no);
        return {
          yes: Number.isFinite(yes) && yes >= 0 ? yes : 0,
          no: Number.isFinite(no) && no >= 0 ? no : 0
        };
      } catch (error) {
        return fallback;
      }
    }

    function writeStoredTallies(tallies) {
      try {
        window.localStorage.setItem(KENDRICK_POLL_RESULTS_KEY, JSON.stringify({
          yes: tallies.yes,
          no: tallies.no
        }));
      } catch (error) {
        // Ignore storage issues; poll still works for this session.
      }
    }

    function readStoredChoice(storageKey) {
      try {
        return window.localStorage.getItem(storageKey);
      } catch (error) {
        return null;
      }
    }

    function writeStoredChoice(storageKey, choice) {
      try {
        window.localStorage.setItem(storageKey, choice);
      } catch (error) {
        // Ignore storage issues; poll still works for this session.
      }
    }

    function styleAxis(group) {
      group.attr("class", "axis");
      group.selectAll(".domain").attr("stroke", "rgba(180, 206, 221, 0.48)");
      group.selectAll(".tick line").attr("stroke", "rgba(180, 206, 221, 0.48)");
      group.selectAll(".tick text").attr("fill", "rgba(216, 235, 245, 0.86)");
    }

    function addYGrid(container, yScale, innerWidth) {
      container.append("g")
        .attr("class", "grid")
        .call(
          d3.axisLeft(yScale)
            .ticks(6)
            .tickSize(-innerWidth)
            .tickFormat("")
        )
        .call(group => group.select(".domain").remove());
    }

    function animateStroke(pathSelection, duration = 1300, delay = 0) {
      pathSelection.each(function() {
        const totalLength = this.getTotalLength();
        d3.select(this)
          .attr("stroke-dasharray", `${totalLength} ${totalLength}`)
          .attr("stroke-dashoffset", totalLength)
          .transition()
          .delay(delay)
          .duration(duration)
          .ease(d3.easeCubicOut)
          .attr("stroke-dashoffset", 0)
          .on("end", function() {
            d3.select(this)
              .attr("stroke-dasharray", null)
              .attr("stroke-dashoffset", null);
          });
      });
    }

    function createScrollRevealAnimator(targetNode, onFrame, options = {}) {
      if (!targetNode || typeof onFrame !== "function" || typeof IntersectionObserver !== "function") {
        onFrame(1);
        return () => {};
      }

      const minRatio = Number.isFinite(options.minRatio) ? options.minRatio : 0.1;
      const maxRatio = Number.isFinite(options.maxRatio) ? options.maxRatio : 0.78;
      const smoothing = Number.isFinite(options.smoothing) ? options.smoothing : 0.18;
      const keepMax = options.keepMax !== false;
      let value = 0;
      let target = 0;
      let peakTarget = 0;
      let rafId = 0;

      const clamp01 = n => Math.max(0, Math.min(1, n));
      const ratioToTarget = ratio => clamp01((ratio - minRatio) / Math.max(0.001, maxRatio - minRatio));

      const runFrame = () => {
        rafId = 0;
        value += (target - value) * smoothing;
        if (Math.abs(target - value) <= 0.0012) {
          value = target;
        }
        onFrame(value);
        if (Math.abs(target - value) > 0.0012) {
          rafId = requestAnimationFrame(runFrame);
        }
      };

      const schedule = () => {
        if (!rafId) {
          rafId = requestAnimationFrame(runFrame);
        }
      };

      const thresholds = Array.from({ length: 31 }, (_, i) => i / 30);
      const observer = new IntersectionObserver(entries => {
        const entry = entries[entries.length - 1];
        if (!entry) return;
        const nextTarget = ratioToTarget(entry.intersectionRatio);
        if (keepMax) {
          peakTarget = Math.max(peakTarget, nextTarget);
          target = peakTarget;
        } else {
          target = nextTarget;
        }
        schedule();
      }, { threshold: thresholds });

      observer.observe(targetNode);
      onFrame(value);

      return () => {
        observer.disconnect();
        if (rafId) {
          cancelAnimationFrame(rafId);
          rafId = 0;
        }
      };
    }

    function createCenterLockRevealAnimator(targetNode, onFrame, options = {}) {
      if (!targetNode || typeof onFrame !== "function") {
        onFrame(1);
        return () => {};
      }

      const minVisiblePx = Number.isFinite(options.minVisiblePx) ? options.minVisiblePx : 170;
      const minVisibleRatio = Number.isFinite(options.minVisibleRatio) ? options.minVisibleRatio : 0.34;
      const maxVisibleRatio = Number.isFinite(options.maxVisibleRatio) ? options.maxVisibleRatio : 0.66;
      const centerTolerancePx = Number.isFinite(options.centerTolerancePx) ? options.centerTolerancePx : 16;
      const centerToleranceRatio = Number.isFinite(options.centerToleranceRatio) ? options.centerToleranceRatio : 0.028;
      const deltaDivisor = Number.isFinite(options.deltaDivisor) ? options.deltaDivisor : 900;
      const smoothing = Number.isFinite(options.smoothing) ? options.smoothing : 0.22;
      const lockClass = typeof options.lockClass === "string" && options.lockClass ? options.lockClass : "kendrick";

      let progress = 0;
      let targetProgress = 0;
      let gateLocked = false;
      let lockScrollY = 0;
      let touchY = null;
      let rafId = 0;
      let lastWindowScrollY = window.scrollY;
      let lockCooldownUntil = 0;

      const htmlLockClass = `${lockClass}-scroll-locked`;
      const lockTopVar = `--${lockClass}-lock-top`;
      const scrollbarGapVar = `--${lockClass}-scrollbar-gap`;
      const clamp01 = value => Math.max(0, Math.min(1, value));

      function getLockMetrics() {
        if (!targetNode) return null;
        const rect = targetNode.getBoundingClientRect();
        const vh = window.innerHeight || document.documentElement.clientHeight || 1;
        const desiredTop = Math.max(24, (vh - rect.height) / 2);
        const lockY = Math.max(0, window.scrollY + rect.top - desiredTop);
        const visibleHeight = Math.max(0, Math.min(rect.bottom, vh) - Math.max(rect.top, 0));
        return { rect, vh, lockY, visibleHeight };
      }

      function canRevealForDelta(delta) {
        if (delta === 0) return false;
        if (progress <= 0.001) return delta > 0;
        if (progress >= 0.999) return delta < 0;
        return true;
      }

      function shouldLockForDelta(delta) {
        if (gateLocked || !canRevealForDelta(delta)) return false;
        if (performance.now() < lockCooldownUntil) return false;
        const metrics = getLockMetrics();
        if (!metrics) return false;
        const enoughVisible = metrics.visibleHeight >= Math.max(
          minVisiblePx,
          Math.min(metrics.rect.height * minVisibleRatio, metrics.vh * maxVisibleRatio)
        );
        const nearCenter = Math.abs(window.scrollY - metrics.lockY) <= Math.max(centerTolerancePx, metrics.vh * centerToleranceRatio);
        return enoughVisible && nearCenter;
      }

      function lockToSection(direction) {
        if (gateLocked || !direction) return;
        if (!canRevealForDelta(direction)) return;
        const metrics = getLockMetrics();
        if (!metrics) return;
        gateLocked = true;
        lockScrollY = metrics.lockY;
        if (Math.abs(window.scrollY - lockScrollY) > 0.5) {
          window.scrollTo(0, lockScrollY);
        }
        lastWindowScrollY = lockScrollY;
        const scrollbarGap = Math.max(0, window.innerWidth - document.documentElement.clientWidth);
        document.body.style.setProperty(lockTopVar, `${-lockScrollY}px`);
        document.body.style.setProperty(scrollbarGapVar, `${scrollbarGap}px`);
        document.documentElement.classList.add(htmlLockClass);
        document.body.classList.add(htmlLockClass);
      }

      function unlockFromSection() {
        const wasLocked = gateLocked;
        gateLocked = false;
        document.documentElement.classList.remove(htmlLockClass);
        document.body.classList.remove(htmlLockClass);
        document.body.style.removeProperty(lockTopVar);
        document.body.style.removeProperty(scrollbarGapVar);
        if (wasLocked) {
          window.scrollTo(0, lockScrollY);
          lastWindowScrollY = lockScrollY;
          lockCooldownUntil = performance.now() + 120;
        }
      }

      function maybeUnlockAtBoundary() {
        if (!gateLocked) return;
        if (progress >= 0.999) {
          targetProgress = 1;
          onFrame(1);
          unlockFromSection();
          return;
        }
        if (progress <= 0.001) {
          targetProgress = 0;
          onFrame(0);
          unlockFromSection();
        }
      }

      function runFrame() {
        rafId = 0;
        const diff = targetProgress - progress;
        if (Math.abs(diff) <= 0.0008) {
          progress = targetProgress;
          onFrame(progress);
          maybeUnlockAtBoundary();
          return;
        }
        progress += (diff * smoothing);
        onFrame(progress);
        maybeUnlockAtBoundary();
        if (gateLocked || Math.abs(targetProgress - progress) > 0.0008) {
          rafId = requestAnimationFrame(runFrame);
        }
      }

      function scheduleFrame() {
        if (!rafId) {
          rafId = requestAnimationFrame(runFrame);
        }
      }

      function advanceReveal(rawDelta) {
        if (!gateLocked || !rawDelta) return;
        targetProgress = clamp01(targetProgress + (rawDelta / deltaDivisor));
        scheduleFrame();
      }

      const onWheel = event => {
        if (shouldLockForDelta(event.deltaY)) {
          lockToSection(event.deltaY);
        }
        if (!gateLocked) return;
        event.preventDefault();
        advanceReveal(event.deltaY);
      };

      const onTouchStart = event => {
        touchY = event.touches && event.touches.length ? event.touches[0].clientY : null;
      };

      const onTouchMove = event => {
        const currentY = event.touches && event.touches.length ? event.touches[0].clientY : null;
        if (touchY == null || currentY == null) return;
        const delta = touchY - currentY;
        touchY = currentY;
        if (shouldLockForDelta(delta)) {
          lockToSection(delta);
        }
        if (!gateLocked) return;
        event.preventDefault();
        advanceReveal(delta);
      };

      const onKeyDown = event => {
        let delta = 0;
        if (event.key === "ArrowDown" || event.key === "PageDown" || event.key === " ") {
          delta = 120;
        }
        if (event.key === "ArrowUp" || event.key === "PageUp") {
          delta = -120;
        }
        if (!delta) return;
        if (shouldLockForDelta(delta)) {
          lockToSection(delta);
        }
        if (!gateLocked) return;
        event.preventDefault();
        advanceReveal(delta);
      };

      const onScrollMonitor = () => {
        if (gateLocked) return;
        const currentY = window.scrollY;
        const delta = currentY - lastWindowScrollY;
        lastWindowScrollY = currentY;
        if (!delta) return;
        if (!canRevealForDelta(delta)) return;
        if (performance.now() < lockCooldownUntil) return;
        const metrics = getLockMetrics();
        if (!metrics) return;
        const enoughVisible = metrics.visibleHeight >= Math.max(
          minVisiblePx,
          Math.min(metrics.rect.height * minVisibleRatio, metrics.vh * maxVisibleRatio)
        );
        const nearCenter = Math.abs(currentY - metrics.lockY) <= Math.max(centerTolerancePx, metrics.vh * centerToleranceRatio);
        if (enoughVisible && nearCenter) {
          lockToSection(delta);
        }
      };

      window.addEventListener("wheel", onWheel, { passive: false });
      window.addEventListener("touchstart", onTouchStart, { passive: true });
      window.addEventListener("touchmove", onTouchMove, { passive: false });
      window.addEventListener("keydown", onKeyDown);
      window.addEventListener("scroll", onScrollMonitor, { passive: true });
      onFrame(0);
      targetProgress = 0;

      return () => {
        window.removeEventListener("wheel", onWheel);
        window.removeEventListener("touchstart", onTouchStart);
        window.removeEventListener("touchmove", onTouchMove);
        window.removeEventListener("keydown", onKeyDown);
        window.removeEventListener("scroll", onScrollMonitor);
        if (rafId) {
          cancelAnimationFrame(rafId);
          rafId = 0;
        }
        unlockFromSection();
      };
    }

    async function loadCsvWithCache(path) {
      const cacheKey = String(path);
      if (!csvPromiseCache.has(cacheKey)) {
        csvPromiseCache.set(cacheKey, d3.csv(cacheKey).catch(error => {
          csvPromiseCache.delete(cacheKey);
          throw error;
        }));
      }
      return csvPromiseCache.get(cacheKey);
    }

    async function loadFirstAvailableCsv(paths, label) {
      let lastError = null;
      const preferredPath = label && csvResolvedPathByLabel.has(label)
        ? csvResolvedPathByLabel.get(label)
        : null;
      const orderedPaths = preferredPath
        ? [preferredPath, ...paths.filter(path => path !== preferredPath)]
        : paths;

      for (const path of orderedPaths) {
        try {
          const data = await loadCsvWithCache(path);
          if (label) {
            csvResolvedPathByLabel.set(label, path);
          }
          return data;
        } catch (error) {
          lastError = error;
        }
      }
      throw new Error(`${label} not found. Tried: ${paths.join(", ")}${lastError ? ` (${lastError.message})` : ""}`);
    }

    function renderAverageDailyTable(parsedRows, metricNames) {
      if (avgDailyBody.empty()) return;

      const avgFormat = d3.format(",.2f");
      const lbFormat = d3.format(",d");
      const rows = metricNames
        .map(name => {
          const values = parsedRows
            .map(row => Number(row[name]))
            .filter(Number.isFinite);
          const weightMeta = speciesWeightByName.get(name);
          return {
            name,
            average: d3.mean(values) || 0,
            days: values.length,
            weightLb: weightMeta ? weightMeta.weightLb : Number.NEGATIVE_INFINITY,
            weightLabel: weightMeta ? `${lbFormat(weightMeta.weightLb)} lbs` : "N/A"
          };
        })
        .sort((a, b) => {
          if (a.weightLb !== b.weightLb) return b.weightLb - a.weightLb;
          return b.average - a.average;
        });

      const tr = avgDailyBody.selectAll("tr")
        .data(rows, d => d.name)
        .join("tr");

      tr.html(d => `
        <td>${d.name}</td>
        <td>${d.weightLabel}</td>
        <td>${avgFormat(d.average)}</td>
        <td>${formatValue(d.days)}</td>
      `);
    }

    function drawAnglerfishChart(data) {
      drawAnglerfishTrendChart(singleSvg, singleTooltip, data);
    }

    function drawAnglerfishRemakeChart(data, headToHeadData) {
      if (typeof remakeScrollCleanup === "function") {
        remakeScrollCleanup();
        remakeScrollCleanup = null;
      }

      const revealSeries = (headToHeadData || [])
        .map(row => ({ date: row.date, taylorSwift: row.taylorSwift }))
        .filter(row => row.date && Number.isFinite(row.taylorSwift))
        .sort((a, b) => a.date - b.date);

      remakeScrollCleanup = drawAnglerfishTrendChart(
        singleRemakeSvg,
        singleRemakeTooltip,
        data,
        { revealSeries }
      );
    }

    function drawAnglerfishTrendChart(targetSvg, targetTooltip, data, options = {}) {
      targetSvg.selectAll("*").remove();
      targetTooltip.style("opacity", 0);

      const revealSeries = Array.isArray(options.revealSeries) ? options.revealSeries : [];
      const revealEnabled = revealSeries.length > 1;
      const isPrimarySingleChart = targetSvg.attr("id") === "single-chart";
      const taylorByDate = new Map(revealSeries.map(d => [+d.date, d.taylorSwift]));
      const STORY_MAX_PROGRESS = 4;
      let storyProgress = 0;
      let taylorRevealFactor = 0;

      function clamp01(value) {
        return Math.max(0, Math.min(1, value));
      }

      function getStoryPhase(progressRaw) {
        const p = Math.max(0, Math.min(STORY_MAX_PROGRESS, progressRaw));
        const p1 = clamp01(p);
        const p2 = clamp01(p - 1);
        const p3 = clamp01(p - 2);
        const p4 = clamp01(p - 3);
        return {
          p,
          p1,
          p2,
          p3,
          p4,
          e1: d3.easeCubicInOut(p1),
          e2: d3.easeCubicInOut(p2),
          e3: d3.easeCubicInOut(p3),
          e4: d3.easeCubicInOut(p4)
        };
      }

      const margin = { top: 30, right: 44, bottom: 58, left: 68 };
      const innerWidth = CHART_WIDTH - margin.left - margin.right;
      const innerHeight = CHART_HEIGHT - margin.top - margin.bottom;
      const g = targetSvg.append("g")
        .attr("transform", `translate(${margin.left},${margin.top})`);

      const globalXDomain = d3.extent(data, d => d.date);
      const x = d3.scaleTime()
        .domain(globalXDomain)
        .range([0, innerWidth]);

      const anglerMax = d3.max(data, d => d.views) || 1;
      const fullTaylorMax = revealEnabled ? (d3.max(revealSeries, d => d.taylorSwift) || 0) : 0;
      const finalComparableMax = Math.max(anglerMax, fullTaylorMax);
      const y = d3.scaleLinear()
        .domain([0, anglerMax * 1.05])
        .nice()
        .range([innerHeight, 0]);

      const yGrid = g.append("g")
        .attr("class", "grid");

      const xAxis = g.append("g")
        .attr("transform", `translate(0,${innerHeight})`)
        .call(d3.axisBottom(x).ticks(8).tickFormat(formatShortDate));

      const yAxis = g.append("g");

      function redrawYGuides() {
        yGrid
          .call(
            d3.axisLeft(y)
              .ticks(6)
              .tickSize(-innerWidth)
              .tickFormat("")
          )
          .call(group => group.select(".domain").remove());
        yAxis.call(d3.axisLeft(y).ticks(6).tickFormat(d3.format(",d")));
        styleAxis(yAxis);
      }

      styleAxis(xAxis);
      redrawYGuides();

      g.append("text")
        .attr("class", "axis-label")
        .attr("x", innerWidth / 2)
        .attr("y", innerHeight + 46)
        .attr("text-anchor", "middle")
        .text("Date");

      g.append("text")
        .attr("class", "axis-label")
        .attr("x", -innerHeight / 2)
        .attr("y", -48)
        .attr("transform", "rotate(-90)")
        .attr("text-anchor", "middle")
        .text("Search interest");

      const fishWidth = 300;
      const fishHeight = 300;
      const fishX = ((innerWidth - fishWidth) / 2) - 30;
      const fishY = ((innerHeight - fishHeight) / 2) + 20;
      const fishCenterX = fishX + (fishWidth / 2);
      const fishCenterY = fishY + (fishHeight / 2);
      const braceletShiftX = 44;
      const braceletMaxOpacity = 0.62;
      const braceletScale = 0.84;
      const braceletWidth = fishWidth * braceletScale;
      const braceletHeight = fishHeight * braceletScale;
      const braceletX = fishX + braceletShiftX + ((fishWidth - braceletWidth) / 2);
      const braceletY = fishY + ((fishHeight - braceletHeight) / 2);

      const fishImage = g.append("image")
        .attr("href", fishImagePath)
        .attr("x", fishX)
        .attr("y", fishY)
        .attr("width", fishWidth)
        .attr("height", fishHeight)
        .attr("opacity", 0.72)
        .attr("transform", `rotate(-20 ${fishCenterX} ${fishCenterY})`)
        .attr("preserveAspectRatio", "xMidYMid meet")
        .style("pointer-events", "none");

      fishImage.on("error", () => fishImage.attr("href", "Jo.png"));

      const braceletImage = revealEnabled
        ? g.append("image")
          .attr("href", braceletImagePath)
          .attr("x", braceletX)
          .attr("y", braceletY)
          .attr("width", braceletWidth)
          .attr("height", braceletHeight)
          .attr("opacity", 0)
          .attr("preserveAspectRatio", "xMidYMid meet")
          .style("pointer-events", "none")
        : null;

      const finaleBraceletImage = revealEnabled
        ? g.append("image")
          .attr("href", finalBraceletImagePath)
          .attr("x", innerWidth - 321)
          .attr("y", 2)
          .attr("width", 315)
          .attr("height", 315)
          .attr("transform", `rotate(-20 ${innerWidth - 163.5} ${159.5})`)
          .attr("opacity", 0)
          .attr("preserveAspectRatio", "xMidYMid meet")
          .style("pointer-events", "none")
        : null;

      if (finaleBraceletImage) {
        finaleBraceletImage.on("error", () => finaleBraceletImage.attr("href", "anglerbracelet.png"));
      }

      const anglerLine = d3.line()
        .curve(d3.curveMonotoneX)
        .x(d => x(d.date))
        .y(d => y(d.views));

      let trendGlowPath = null;
      if (isPrimarySingleChart) {
        const defs = targetSvg.append("defs");
        const neon = defs.append("filter")
          .attr("id", "single-chart-neon")
          .attr("x", "-25%")
          .attr("y", "-25%")
          .attr("width", "150%")
          .attr("height", "150%");
        neon.append("feGaussianBlur")
          .attr("stdDeviation", 3.4)
          .attr("result", "glow");
        neon.append("feMerge")
          .selectAll("feMergeNode")
          .data(["glow", "SourceGraphic"])
          .enter()
          .append("feMergeNode")
          .attr("in", d => d);

        trendGlowPath = g.append("path")
          .datum(data)
          .attr("fill", "none")
          .attr("stroke", "rgba(83, 232, 255, 0.62)")
          .attr("stroke-width", 8.6)
          .attr("stroke-linecap", "round")
          .attr("stroke-linejoin", "round")
          .attr("opacity", 0.9)
          .attr("d", anglerLine);
      }

      const trendPath = g.append("path")
        .datum(data)
        .attr("fill", "none")
        .attr("stroke", isPrimarySingleChart ? "rgba(248, 254, 255, 0.99)" : ANGLERFISH_COLOR)
        .attr("stroke-width", isPrimarySingleChart ? 2.5 : 3)
        .attr("stroke-linecap", "round")
        .attr("stroke-linejoin", "round")
        .attr("filter", isPrimarySingleChart ? "url(#single-chart-neon)" : null)
        .attr("d", anglerLine);

      if (trendGlowPath) {
        animateStroke(trendGlowPath, 1550, 100);
      }
      animateStroke(trendPath, 1550, 100);

      const peak = d3.greatest(data, d => d.views);
      let peakGroup = null;
      let peakCircle = null;
      let peakConnector = null;
      let peakLabel = null;
      let positionPeakAnnotation = null;
      let defaultPeakLabelText = "";
      let showdownPeakLabelText = "";
      let focusXStart = globalXDomain[0];
      let focusXEnd = globalXDomain[1];
      let focusYMax = Math.max(1, anglerMax) * 1.05;
      if (peak) {
        peakGroup = g.append("g");
        const peakLabelOffset = 14;

        const focusStartRaw = d3.timeDay.offset(peak.date, -22);
        const focusEndRaw = d3.timeDay.offset(peak.date, 22);
        focusXStart = focusStartRaw < globalXDomain[0] ? globalXDomain[0] : focusStartRaw;
        focusXEnd = focusEndRaw > globalXDomain[1] ? globalXDomain[1] : focusEndRaw;
        const zoomCeil = peak.views + Math.max(900, peak.views * 0.16);
        focusYMax = zoomCeil;
        defaultPeakLabelText = `Peak: ${formatValue(peak.views)} (${formatDate(peak.date)})`;

        const taylorAtPeak = taylorByDate.get(+peak.date);
        if (Number.isFinite(taylorAtPeak)) {
          const peakGap = Math.round(peak.views - taylorAtPeak);
          if (peakGap >= 0) {
            showdownPeakLabelText = `Anglerfish +${formatValue(peakGap)} vs Taylor`;
          } else {
            showdownPeakLabelText = `Taylor +${formatValue(Math.abs(peakGap))} at peak`;
          }
        } else {
          showdownPeakLabelText = defaultPeakLabelText;
        }

        peakCircle = peakGroup.append("circle")
          .attr("r", 4.8)
          .attr("fill", ANGLERFISH_COLOR)
          .attr("stroke", "#033544")
          .attr("stroke-width", 1.4);

        peakConnector = peakGroup.append("line")
          .attr("stroke", "rgba(208, 236, 250, 0.9)")
          .attr("stroke-width", 1.2)
          .attr("stroke-dasharray", "2 2");

        peakLabel = peakGroup.append("text")
          .attr("fill", "rgba(231, 248, 255, 0.96)")
          .attr("font-size", 11)
          .attr("font-weight", 600)
          .text(defaultPeakLabelText);

        positionPeakAnnotation = () => {
          const peakX = x(peak.date);
          const peakLabelX = Math.max(12, Math.min(innerWidth - 220, peakX + peakLabelOffset));
          const peakY = y(peak.views);
          peakCircle
            .attr("cx", peakX)
            .attr("cy", peakY);
          peakConnector
            .attr("x1", peakX)
            .attr("x2", peakLabelX - 6)
            .attr("y1", peakY)
            .attr("y2", Math.max(18, peakY - 26));
          peakLabel
            .attr("x", peakLabelX)
            .attr("y", Math.max(15, peakY - 28));
        };
        positionPeakAnnotation();
      }

      const hoverLine = g.append("line")
        .attr("y1", 0)
        .attr("y2", innerHeight)
        .attr("stroke", "rgba(179, 223, 243, 0.7)")
        .attr("stroke-width", 1)
        .attr("stroke-dasharray", "4 4")
        .attr("opacity", 0);

      const hoverDot = g.append("circle")
        .attr("r", 5)
        .attr("fill", ANGLERFISH_COLOR)
        .attr("stroke", "#063242")
        .attr("stroke-width", 1.5)
        .attr("opacity", 0);

      let taylorPath = null;
      let comparisonLegend = null;
      let revealHint = null;
      let taylorLine = null;

      if (revealEnabled) {
        taylorLine = d3.line()
          .curve(d3.curveMonotoneX)
          .x(d => x(d.date))
          .y(d => y(d.value));

        taylorPath = g.append("path")
          .datum(revealSeries.map(d => ({ date: d.date, value: 0 })))
          .attr("fill", "none")
          .attr("stroke", TAYLOR_SWIFT_COLOR)
          .attr("stroke-width", 2.8)
          .attr("opacity", 0.08)
          .attr("d", taylorLine);

        comparisonLegend = g.append("g")
          .attr("class", "legend")
          .attr("transform", `translate(${Math.max(12, innerWidth - 184)}, 16)`)
          .attr("opacity", 0);

        const legendItems = comparisonLegend.selectAll(".legend-item")
          .data([
            { name: "Anglerfish", color: ANGLERFISH_COLOR },
            { name: "Taylor Swift", color: TAYLOR_SWIFT_COLOR }
          ])
          .enter()
          .append("g")
          .attr("class", "legend-item")
          .attr("transform", (_, i) => `translate(0, ${i * 26})`);

        legendItems.append("rect")
          .attr("x", 0)
          .attr("y", -5)
          .attr("width", 16)
          .attr("height", 10)
          .attr("rx", 2)
          .attr("fill", d => d.color)
          .attr("opacity", 0.95);

        legendItems.append("text")
          .attr("x", 24)
          .attr("y", 0)
          .attr("dominant-baseline", "middle")
          .text(d => d.name);

        revealHint = g.append("text")
          .attr("x", 12)
          .attr("y", 62)
          .attr("fill", "rgba(217, 241, 252, 0.9)")
          .attr("font-size", 11)
          .text("Scroll to reveal Taylor Swift");
      }

      const bisectDate = d3.bisector(d => d.date).left;
      g.append("rect")
        .attr("width", innerWidth)
        .attr("height", innerHeight)
        .attr("fill", "transparent")
        .on("mousemove", event => {
          const [mouseX] = d3.pointer(event);
          const hoveredDate = x.invert(mouseX);
          const idx = Math.min(
            data.length - 1,
            Math.max(1, bisectDate(data, hoveredDate, 1))
          );
          const d0 = data[idx - 1];
          const d1 = data[idx];
          const point = hoveredDate - d0.date > d1.date - hoveredDate ? d1 : d0;

          const px = x(point.date);
          const py = y(point.views);
          const tipX = Math.max(12, Math.min(CHART_WIDTH - 190, px + margin.left + 14));
          const tipY = Math.max(12, py + margin.top - 58);

          hoverLine.attr("x1", px).attr("x2", px).attr("opacity", 1);
          hoverDot.attr("cx", px).attr("cy", py).attr("opacity", 1);

          if (revealEnabled) {
            const taylorRaw = taylorByDate.get(+point.date);
            if (Number.isFinite(taylorRaw) && taylorRevealFactor > 0.06) {
              const shownTaylor = Math.round(taylorRaw * taylorRevealFactor);
              const diff = point.views - shownTaylor;
              const verdict = diff >= 0
                ? `Anglerfish leads by ${formatValue(diff)}`
                : `Taylor Swift leads by ${formatValue(Math.abs(diff))}`;
              targetTooltip
                .style("opacity", 1)
                .style("left", `${tipX}px`)
                .style("top", `${tipY}px`)
                .html(`
                  <div class="tip-title">${formatDate(point.date)}</div>
                  <div class="tip-row"><span class="tip-dot" style="background:${ANGLERFISH_COLOR};"></span><span>Anglerfish: ${formatValue(point.views)}</span></div>
                  <div class="tip-row"><span class="tip-dot" style="background:${TAYLOR_SWIFT_COLOR};"></span><span>Taylor Swift: ${formatValue(shownTaylor)}</span></div>
                  <div class="tip-value" style="margin-top:6px;">${verdict}</div>
                `);
              return;
            }
          }

          targetTooltip
            .style("opacity", 1)
            .style("left", `${tipX}px`)
            .style("top", `${tipY}px`)
            .html(`
              <div class="tip-title">${formatDate(point.date)}</div>
              <div class="tip-value">${formatValue(point.views)} searches</div>
            `);
        })
        .on("mouseleave", () => {
          hoverLine.attr("opacity", 0);
          hoverDot.attr("opacity", 0);
          targetTooltip.style("opacity", 0);
        });

      if (!revealEnabled) {
        return null;
      }

      function renderReveal(progressRaw) {
        const phase = getStoryPhase(progressRaw);
        storyProgress = phase.p;
        taylorRevealFactor = phase.e1;

        const dynamicMax = anglerMax + ((finalComparableMax - anglerMax) * phase.e1);
        const startYMax = Math.max(1, dynamicMax) * 1.05;
        const currentYMax = startYMax + ((focusYMax - startYMax) * phase.e3);
        y.domain([0, Math.max(1, currentYMax)]).nice();

        const currentXDomain = [
          new Date(+globalXDomain[0] + ((+focusXStart - +globalXDomain[0]) * phase.e3)),
          new Date(+globalXDomain[1] + ((+focusXEnd - +globalXDomain[1]) * phase.e3))
        ];
        x.domain(currentXDomain);
        xAxis.call(d3.axisBottom(x).ticks(8).tickFormat(formatShortDate));
        styleAxis(xAxis);

        redrawYGuides();
        if (trendGlowPath) {
          trendGlowPath.attr("d", anglerLine);
        }
        trendPath.attr("d", anglerLine);
        if (positionPeakAnnotation) {
          positionPeakAnnotation();
        }

        const revealedTaylor = revealSeries.map(d => ({
          date: d.date,
          value: d.taylorSwift * phase.e1
        }));

        taylorPath
          .datum(revealedTaylor)
          .attr("d", taylorLine)
          .attr("opacity", (0.08 + (phase.e1 * 0.8)) * (1 - (phase.e2 * 0.55)) * (1 - (phase.e3 * 0.45)));

        comparisonLegend.attr("opacity", Math.min(1, phase.e1 * 1.2) * (1 - (phase.e3 * 0.35)));
        fishImage.attr("opacity", 0.72 * (1 - phase.e1));
        if (braceletImage) {
          braceletImage.attr("opacity", phase.e1 * (1 - phase.e2) * braceletMaxOpacity);
        }
        if (finaleBraceletImage) {
          finaleBraceletImage.attr("opacity", phase.e4 * 0.5);
        }
        if (peakGroup) {
          const dimmedPeak = Math.max(0.18, 1 - (phase.e1 * 0.68));
          peakGroup.attr("opacity", dimmedPeak + ((1 - dimmedPeak) * phase.e3 * (1 - (phase.e4 * 0.2))));
        }
        if (peakCircle) {
          peakCircle.attr("r", 4.8 + (phase.e3 * 2.1));
        }
        if (peakLabel) {
          peakLabel.attr("font-size", 11 + (phase.e3 * 1.6));
          if (phase.e3 >= 0.85) {
            peakLabel.text(showdownPeakLabelText || defaultPeakLabelText);
          } else {
            peakLabel.text(defaultPeakLabelText);
          }
        }
        if (revealHint) {
          const hintText = phase.p >= (STORY_MAX_PROGRESS - 0.01)
            ? "Bracelet revealed. Scroll up to rewind."
            : phase.p4 > 0.001
              ? `Final reveal (${Math.round(phase.e4 * 100)}%)`
            : phase.p3 > 0.001
              ? `Zooming into Anglerfish peak (${Math.round(phase.e3 * 100)}%)`
              : phase.p2 > 0.001
                ? `Mic fading out (${Math.round(phase.e2 * 100)}%)`
                : `Scroll to animate Taylor Swift (${Math.round(phase.e1 * 100)}%)`;
          revealHint
            .attr("opacity", Math.max(0.24, 1 - (phase.e3 * 0.55)))
            .text(hintText);
        }
      }

      function getLockMetrics() {
        const node = targetSvg.node();
        if (!node) return null;
        const chartCard = node.closest(".chart-card") || node;
        const rect = chartCard.getBoundingClientRect();
        const vh = window.innerHeight || document.documentElement.clientHeight || 1;
        const desiredTop = Math.max(24, (vh - rect.height) / 2);
        const lockY = Math.max(0, window.scrollY + rect.top - desiredTop);
        const visibleHeight = Math.max(0, Math.min(rect.bottom, vh) - Math.max(rect.top, 0));
        return { node, chartCard, rect, vh, desiredTop, lockY, visibleHeight };
      }

      let gateLocked = false;
      let lockScrollY = 0;
      let touchY = null;
      let lockDirection = 0;
      let targetRevealProgress = 0;
      let revealRafId = 0;
      let lastWindowScrollY = window.scrollY;
      let lockCooldownUntil = 0;

      function canRevealForDelta(delta) {
        if (delta > 0) {
          return storyProgress < (STORY_MAX_PROGRESS - 0.001);
        }
        return storyProgress > 0.001;
      }

      function shouldLockForDelta(delta) {
        if (gateLocked || delta === 0) {
          return false;
        }
        if (!canRevealForDelta(delta)) {
          return false;
        }
        if (performance.now() < lockCooldownUntil) {
          return false;
        }
        const metrics = getLockMetrics();
        if (!metrics) {
          return false;
        }
        const enoughVisible = metrics.visibleHeight >= Math.max(180, Math.min(metrics.rect.height * 0.34, metrics.vh * 0.62));
        const nearCenter = Math.abs(window.scrollY - metrics.lockY) <= Math.max(12, metrics.vh * 0.025);
        return enoughVisible && nearCenter;
      }

      function lockToChart(direction) {
        if (gateLocked || !direction) {
          return;
        }
        if (!canRevealForDelta(direction)) {
          return;
        }
        const metrics = getLockMetrics();
        if (!metrics) return;
        const currentY = window.scrollY;
        const nearCenter = Math.abs(currentY - metrics.lockY) <= Math.max(12, metrics.vh * 0.025);
        if (!nearCenter) {
          return;
        }
        gateLocked = true;
        lockDirection = direction > 0 ? 1 : -1;
        lockScrollY = metrics.lockY;
        if (Math.abs(currentY - lockScrollY) > 0.5) {
          window.scrollTo(0, lockScrollY);
        }
        lastWindowScrollY = lockScrollY;
        const scrollbarGap = Math.max(0, window.innerWidth - document.documentElement.clientWidth);
        document.body.style.setProperty("--remake-lock-top", `${-lockScrollY}px`);
        document.body.style.setProperty("--remake-scrollbar-gap", `${scrollbarGap}px`);
        document.documentElement.classList.add("remake-scroll-locked");
        document.body.classList.add("remake-scroll-locked");
      }

      function unlockFromChart() {
        const wasLocked = gateLocked;
        gateLocked = false;
        lockDirection = 0;
        document.documentElement.classList.remove("remake-scroll-locked");
        document.body.classList.remove("remake-scroll-locked");
        document.body.style.removeProperty("--remake-lock-top");
        document.body.style.removeProperty("--remake-scrollbar-gap");
        if (wasLocked) {
          window.scrollTo(0, lockScrollY);
          lastWindowScrollY = lockScrollY;
          lockCooldownUntil = performance.now() + 120;
        }
      }

      function maybeUnlockAtBoundary() {
        if (!gateLocked) {
          return;
        }
        if (lockDirection > 0 && storyProgress >= (STORY_MAX_PROGRESS - 0.001)) {
          targetRevealProgress = STORY_MAX_PROGRESS;
          renderReveal(STORY_MAX_PROGRESS);
          unlockFromChart();
          return;
        }
        if (lockDirection < 0 && storyProgress <= 0.001) {
          targetRevealProgress = 0;
          renderReveal(0);
          unlockFromChart();
        }
      }

      function runRevealFrame() {
        revealRafId = 0;
        const diff = targetRevealProgress - storyProgress;
        if (Math.abs(diff) <= 0.0008) {
          renderReveal(targetRevealProgress);
          maybeUnlockAtBoundary();
          return;
        }
        renderReveal(storyProgress + (diff * 0.16));
        maybeUnlockAtBoundary();
        if (gateLocked || Math.abs(targetRevealProgress - storyProgress) > 0.0008) {
          revealRafId = requestAnimationFrame(runRevealFrame);
        }
      }

      function scheduleRevealFrame() {
        if (!revealRafId) {
          revealRafId = requestAnimationFrame(runRevealFrame);
        }
      }

      function advanceReveal(rawDelta) {
        if (!gateLocked) {
          return;
        }
        if (!rawDelta) {
          return;
        }
        lockDirection = rawDelta > 0 ? 1 : -1;
        targetRevealProgress = Math.max(0, Math.min(STORY_MAX_PROGRESS, targetRevealProgress + (rawDelta / 1400)));
        scheduleRevealFrame();
      }

      const onWheel = event => {
        if (shouldLockForDelta(event.deltaY)) {
          lockToChart(event.deltaY);
        }
        if (!gateLocked) {
          return;
        }
        event.preventDefault();
        advanceReveal(event.deltaY);
      };

      const onTouchStart = event => {
        touchY = event.touches && event.touches.length ? event.touches[0].clientY : null;
      };

      const onTouchMove = event => {
        const currentY = event.touches && event.touches.length ? event.touches[0].clientY : null;
        if (touchY == null || currentY == null) {
          return;
        }
        const delta = touchY - currentY;
        touchY = currentY;
        if (shouldLockForDelta(delta)) {
          lockToChart(delta);
        }
        if (!gateLocked) {
          return;
        }
        event.preventDefault();
        advanceReveal(delta);
      };

      const onKeyDown = event => {
        let delta = 0;
        if (event.key === "ArrowDown" || event.key === "PageDown" || event.key === " ") {
          delta = 120;
        }
        if (event.key === "ArrowUp" || event.key === "PageUp") {
          delta = -120;
        }
        if (!delta) {
          return;
        }
        if (shouldLockForDelta(delta)) {
          lockToChart(delta);
        }
        if (!gateLocked) {
          return;
        }
        event.preventDefault();
        advanceReveal(delta);
      };

      const onScrollMonitor = () => {
        if (gateLocked) {
          return;
        }
        const currentY = window.scrollY;
        const delta = currentY - lastWindowScrollY;
        lastWindowScrollY = currentY;
        if (!delta) {
          return;
        }
        if (!canRevealForDelta(delta)) {
          return;
        }
        if (performance.now() < lockCooldownUntil) {
          return;
        }
        const metrics = getLockMetrics();
        if (!metrics) {
          return;
        }
        const enoughVisible = metrics.visibleHeight >= Math.max(180, Math.min(metrics.rect.height * 0.34, metrics.vh * 0.62));
        const nearCenter = Math.abs(currentY - metrics.lockY) <= Math.max(12, metrics.vh * 0.025);
        if (enoughVisible && nearCenter) {
          lockToChart(delta);
        }
      };

      window.addEventListener("wheel", onWheel, { passive: false });
      window.addEventListener("touchstart", onTouchStart, { passive: true });
      window.addEventListener("touchmove", onTouchMove, { passive: false });
      window.addEventListener("keydown", onKeyDown);
      window.addEventListener("scroll", onScrollMonitor, { passive: true });
      renderReveal(0);
      targetRevealProgress = 0;

      return () => {
        window.removeEventListener("wheel", onWheel);
        window.removeEventListener("touchstart", onTouchStart);
        window.removeEventListener("touchmove", onTouchMove);
        window.removeEventListener("keydown", onKeyDown);
        window.removeEventListener("scroll", onScrollMonitor);
        if (revealRafId) {
          cancelAnimationFrame(revealRafId);
          revealRafId = 0;
        }
        unlockFromChart();
      };
    }

    function drawWeightBubbleChart(parsedRows) {
      if (typeof weightBubbleScrollCleanup === "function") {
        weightBubbleScrollCleanup();
        weightBubbleScrollCleanup = null;
      }

      weightBubbleSvg.selectAll("*").remove();
      weightBubbleTooltip.style("opacity", 0);

      const speciesWeights = SPECIES_WEIGHTS;

      const rows = speciesWeights.map((d, i) => {
        const values = parsedRows
          .map(row => Number(row[d.name]))
          .filter(Number.isFinite);
        const avgDaily = d3.mean(values) || 0;
        const punchPerLb = avgDaily / d.weightLb;
        return {
          ...d,
          id: `weight-bubble-${i}`,
          avgDaily,
          punchPerLb,
          punchLabel: `${d3.format(",.2f")(punchPerLb)} views/lb`
        };
      });

      rows.sort((a, b) => b.weightLb - a.weightLb);

      const viewBoxParts = (weightBubbleSvg.attr("viewBox") || `0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`)
        .trim()
        .split(/\s+/)
        .map(Number);
      const bubbleWidth = viewBoxParts.length === 4 && Number.isFinite(viewBoxParts[2]) ? viewBoxParts[2] : CHART_WIDTH;
      const bubbleHeight = viewBoxParts.length === 4 && Number.isFinite(viewBoxParts[3]) ? viewBoxParts[3] : CHART_HEIGHT;

      const margin = { top: 58, right: 32, bottom: 72, left: 32 };
      const innerWidth = bubbleWidth - margin.left - margin.right;
      const innerHeight = bubbleHeight - margin.top - margin.bottom;
      const g = weightBubbleSvg.append("g")
        .attr("transform", `translate(${margin.left},${margin.top})`);

      const defs = weightBubbleSvg.append("defs");
      const glowFilter = defs.append("filter")
        .attr("id", "weight-bubble-glow")
        .attr("x", "-40%")
        .attr("y", "-40%")
        .attr("width", "180%")
        .attr("height", "180%");
      glowFilter.append("feGaussianBlur")
        .attr("stdDeviation", 4.8)
        .attr("result", "blur");
      glowFilter.append("feMerge")
        .selectAll("feMergeNode")
        .data(["blur", "SourceGraphic"])
        .enter()
        .append("feMergeNode")
        .attr("in", d => d);

      rows.forEach((d, i) => {
        const base = d3.color(d.color);
        const grad = defs.append("radialGradient")
          .attr("id", `weight-bubble-grad-${i}`)
          .attr("cx", "34%")
          .attr("cy", "30%")
          .attr("r", "72%");
        grad.append("stop")
          .attr("offset", "0%")
          .attr("stop-color", base ? base.brighter(0.85).formatRgb() : d.color);
        grad.append("stop")
          .attr("offset", "65%")
          .attr("stop-color", base ? base.formatRgb() : d.color);
        grad.append("stop")
          .attr("offset", "100%")
          .attr("stop-color", base ? base.darker(0.85).formatRgb() : d.color);
        d.fill = `url(#weight-bubble-grad-${i})`;
      });

      const progressTrack = g.append("rect")
        .attr("x", 0)
        .attr("y", -18)
        .attr("width", innerWidth)
        .attr("height", 8)
        .attr("rx", 4)
        .attr("fill", "rgba(100, 159, 189, 0.24)");

      const progressBar = g.append("rect")
        .attr("x", 0)
        .attr("y", -18)
        .attr("width", 0)
        .attr("height", 8)
        .attr("rx", 4)
        .attr("fill", "rgba(94, 235, 255, 0.86)");

      const phaseHint = g.append("text")
        .attr("x", 0)
        .attr("y", -26)
        .attr("fill", "rgba(227, 246, 255, 0.98)")
        .attr("font-size", 12.5)
        .text("Relative body size by weight");

      const centerX = innerWidth * 0.5;
      const centerY = innerHeight * 0.58;
      const minWeight = d3.min(rows, d => d.weightLb) || 1;
      const maxWeight = d3.max(rows, d => d.weightLb) || 1;
      const minPunch = d3.min(rows, d => d.punchPerLb) || 0;
      const maxPunch = d3.max(rows, d => d.punchPerLb) || 1;

      const weightRadiusScale = d3.scalePow().exponent(0.28)
        .domain([minWeight, maxWeight])
        .range([22, 148]);

      const punchRadiusScale = d3.scalePow().exponent(0.24)
        .domain([Math.max(0, minPunch), Math.max(1e-6, maxPunch)])
        .range([22, 148]);

      rows.forEach(d => {
        d.rWeight = weightRadiusScale(d.weightLb);
        d.rPunch = punchRadiusScale(d.punchPerLb);
      });

      const weightAnchorByName = new Map([
        ["Blue whale", { x: innerWidth * 0.36, y: innerHeight * 0.49 }],
        ["Great white shark", { x: innerWidth * 0.77, y: innerHeight * 0.22 }],
        ["Polar bear", { x: innerWidth * 0.73, y: innerHeight * 0.77 }],
        ["Anglerfish", { x: innerWidth * 0.87, y: innerHeight * 0.53 }]
      ]);

      const punchAnchorByName = new Map([
        ["Blue whale", { x: innerWidth * 0.32, y: innerHeight * 0.42 }],
        ["Great white shark", { x: innerWidth * 0.38, y: innerHeight * 0.18 }],
        ["Polar bear", { x: innerWidth * 0.32, y: innerHeight * 0.74 }],
        ["Anglerfish", { x: innerWidth * 0.69, y: innerHeight * 0.56 }]
      ]);

      function layoutAt(eased) {
        const bounds = {
          left: innerWidth * 0.04,
          right: innerWidth * 0.96,
          top: innerHeight * 0.09,
          bottom: innerHeight * 0.93
        };
        const sizeBoost = 1.56;
        const points = rows.map(d => {
          const startAnchor = weightAnchorByName.get(d.name) || { x: centerX, y: centerY };
          const endAnchor = punchAnchorByName.get(d.name) || startAnchor;
          const ax = startAnchor.x + ((endAnchor.x - startAnchor.x) * eased);
          const ay = startAnchor.y + ((endAnchor.y - startAnchor.y) * eased);
          return {
            d,
            r: Math.max(8, (d.rWeight + ((d.rPunch - d.rWeight) * eased)) * sizeBoost),
            ax,
            ay,
            x: ax,
            y: ay
          };
        });

        const availableArea = Math.max(1, (bounds.right - bounds.left) * (bounds.bottom - bounds.top));
        const circleArea = d3.sum(points, p => Math.PI * p.r * p.r);
        const fillTarget = 0.66;
        if (circleArea > (availableArea * fillTarget)) {
          const fit = Math.sqrt((availableArea * fillTarget) / circleArea);
          points.forEach(p => {
            p.r *= fit;
          });
        }

        points.forEach(p => {
          p.x = Math.max(bounds.left + p.r, Math.min(bounds.right - p.r, p.x));
          p.y = Math.max(bounds.top + p.r, Math.min(bounds.bottom - p.r, p.y));
        });

        const resolveCollisions = (padding, passes, anchorPull) => {
          for (let pass = 0; pass < passes; pass += 1) {
            let moved = false;

            points.forEach(p => {
              p.x += (p.ax - p.x) * anchorPull;
              p.y += (p.ay - p.y) * anchorPull;
            });

            for (let i = 0; i < points.length; i += 1) {
              for (let j = i + 1; j < points.length; j += 1) {
                const a = points[i];
                const b = points[j];
                const dx = b.x - a.x;
                const dy = b.y - a.y;
                const dist = Math.hypot(dx, dy) || 0.0001;
                const minDist = (a.r + b.r) + padding;
                if (dist < minDist) {
                  const push = (minDist - dist) * 0.52;
                  const ux = dx / dist;
                  const uy = dy / dist;
                  a.x -= ux * push;
                  a.y -= uy * push;
                  b.x += ux * push;
                  b.y += uy * push;
                  moved = true;
                }
              }
            }

            points.forEach(p => {
              p.x = Math.max(bounds.left + p.r, Math.min(bounds.right - p.r, p.x));
              p.y = Math.max(bounds.top + p.r, Math.min(bounds.bottom - p.r, p.y));
            });

            if (!moved && pass > 20) {
              break;
            }
          }
        };

        const collisionPadding = 7 + (3 * (1 - eased));
        resolveCollisions(collisionPadding, 120, 0.11);

        points.forEach(p => {
          p.cx = p.x;
          p.cy = p.y;
        });

        return points;
      }

      const bubbleLayer = g.append("g")
        .attr("class", "weight-bubble-layer");

      const labelLayer = g.append("g")
        .attr("class", "weight-label-layer")
        .style("pointer-events", "none");

      const nodes = bubbleLayer.selectAll(".weight-node")
        .data(rows, d => d.name)
        .enter()
        .append("g")
        .attr("class", "weight-node");

      const circles = nodes.append("circle")
        .attr("fill", d => d.fill)
        .attr("stroke", "rgba(216, 241, 252, 0.86)")
        .attr("stroke-width", 1.3)
        .attr("filter", "url(#weight-bubble-glow)");

      const labelNodes = labelLayer.selectAll(".weight-label-node")
        .data(rows, d => d.name)
        .enter()
        .append("g")
        .attr("class", "weight-label-node");

      const labelConnectors = labelNodes.append("line")
        .attr("stroke", "rgba(214, 238, 249, 0.62)")
        .attr("stroke-width", 1.1)
        .attr("stroke-dasharray", "2 2")
        .style("pointer-events", "none");

      const labelGroups = labelNodes.append("g")
        .attr("class", "weight-label")
        .style("pointer-events", "none");

      const labelBg = labelGroups.append("rect")
        .attr("rx", 9)
        .attr("ry", 9)
        .attr("fill", "rgba(4, 20, 30, 0.82)")
        .attr("stroke", "rgba(167, 216, 237, 0.42)")
        .attr("stroke-width", 1);

      const nameLabels = labelGroups.append("text")
        .attr("text-anchor", "middle")
        .attr("x", 0)
        .attr("y", -2)
        .attr("fill", "rgba(240, 251, 255, 0.99)")
        .attr("font-size", 12.5)
        .attr("font-weight", 700)
        .text(d => d.name);

      const valueLabels = labelGroups.append("text")
        .attr("text-anchor", "middle")
        .attr("x", 0)
        .attr("y", 13)
        .attr("fill", "rgba(208, 236, 249, 0.98)")
        .attr("font-size", 11.25)
        .attr("font-weight", 600);

      function updateLabelPills() {
        labelGroups.each(function() {
          const group = d3.select(this);
          const textNodes = group.selectAll("text").nodes();
          let minX = Infinity;
          let minY = Infinity;
          let maxX = -Infinity;
          let maxY = -Infinity;
          textNodes.forEach(node => {
            const box = node.getBBox();
            minX = Math.min(minX, box.x);
            minY = Math.min(minY, box.y);
            maxX = Math.max(maxX, box.x + box.width);
            maxY = Math.max(maxY, box.y + box.height);
          });
          if (!Number.isFinite(minX) || !Number.isFinite(minY)) return;
          group.select("rect")
            .attr("x", minX - 10)
            .attr("y", minY - 6)
            .attr("width", (maxX - minX) + 20)
            .attr("height", (maxY - minY) + 12);
        });
      }

      nodes
        .on("mousemove", function(event, d) {
          const [sx, sy] = d3.pointer(event, weightBubbleSvg.node());
          weightBubbleTooltip
            .style("opacity", 1)
            .style("left", `${Math.max(12, Math.min(bubbleWidth - 230, sx + 12))}px`)
            .style("top", `${Math.max(10, sy - 44)}px`)
            .html(`
              <div class="tip-title">${d.name}</div>
              <div class="tip-row"><span>Weight: ${d.weightLabel}</span></div>
              <div class="tip-row"><span>Avg daily views: ${formatValue(Math.round(d.avgDaily))}</span></div>
              <div class="tip-value">${d.punchLabel}</div>
            `);
        })
        .on("mouseleave", () => {
          weightBubbleTooltip.style("opacity", 0);
        });

      let progress = 0;
      let targetProgress = 0;
      let rafId = 0;
      let gateLocked = false;
      let lockScrollY = 0;
      let lockDirection = 0;
      let touchY = null;
      let lastWindowScrollY = window.scrollY;
      let lockCooldownUntil = 0;
      const finalLayoutHoldStart = 0.985;
      let finalLayoutHoldEased = null;

      function renderMorph(progressRaw) {
        progress = Math.max(0, Math.min(1, progressRaw));
        const eased = d3.easeCubicInOut(progress);
        if (eased >= finalLayoutHoldStart) {
          if (finalLayoutHoldEased == null) {
            finalLayoutHoldEased = eased;
          }
        } else {
          finalLayoutHoldEased = null;
        }
        const frame = layoutAt(finalLayoutHoldEased == null ? eased : finalLayoutHoldEased);
        const byName = new Map(frame.map(p => [p.d.name, p]));

        nodes.attr("transform", d => {
          const p = byName.get(d.name);
          return `translate(${p.cx},${p.cy})`;
        });

        labelNodes.attr("transform", d => {
          const p = byName.get(d.name);
          return `translate(${p.cx},${p.cy})`;
        });

        circles
          .attr("r", d => byName.get(d.name).r)
          .attr("stroke-width", d => {
            const r = byName.get(d.name).r;
            return r > 110 ? 1.8 : 1.3;
          });

        labelConnectors
          .attr("x1", 0)
          .attr("x2", 0)
          .attr("y1", d => -(byName.get(d.name).r - 2));

        const lerp = (from, to, t) => from + ((to - from) * t);
        const labelState = new Map();
        rows.forEach(d => {
          const bubble = byName.get(d.name);
          const valueText = eased < 0.5 ? d.weightLabel : d.punchLabel;
          const insideNameSize = Math.max(10.5, Math.min(15, (bubble.r * 0.17)));
          const insideValueSize = Math.max(9.2, Math.min(13.2, (bubble.r * 0.135)));
          const nameApproxWidth = d.name.length * insideNameSize * 0.58;
          const valueApproxWidth = valueText.length * insideValueSize * 0.54;
          const availableWidth = (bubble.r * 2) - 18;
          const widthRatio = Math.max(nameApproxWidth, valueApproxWidth) / Math.max(1, availableWidth);
          const widthBlend = Math.max(0, Math.min(1, (1.12 - widthRatio) / 0.22));
          const radiusBlend = Math.max(0, Math.min(1, (bubble.r - 30) / 12));
          const insideBlend = widthBlend * radiusBlend;
          const labelY = -(bubble.r + Math.max(22, Math.min(34, bubble.r * 0.24)));
          labelState.set(d.name, {
            valueText,
            insideBlend,
            labelY,
            insideNameSize,
            insideValueSize,
            outsideNameSize: 12.5,
            outsideValueSize: 11.25
          });
        });

        labelConnectors
          .attr("opacity", d => 1 - labelState.get(d.name).insideBlend)
          .attr("y2", d => {
            const state = labelState.get(d.name);
            return (state.labelY + 12) * (1 - state.insideBlend);
          });

        labelGroups.attr("transform", d => {
          const state = labelState.get(d.name);
          const y = state.labelY * (1 - state.insideBlend);
          return `translate(0,${y})`;
        });

        labelBg
          .attr("opacity", d => lerp(0.9, 0.76, labelState.get(d.name).insideBlend))
          .attr("fill", d => d3.interpolateRgb("rgba(4, 20, 30, 0.86)", "rgba(6, 22, 32, 0.66)")(labelState.get(d.name).insideBlend))
          .attr("stroke", d => d3.interpolateRgb("rgba(167, 216, 237, 0.42)", "rgba(160, 212, 236, 0.5)")(labelState.get(d.name).insideBlend));

        nameLabels
          .attr("font-size", d => {
            const state = labelState.get(d.name);
            return lerp(state.outsideNameSize, state.insideNameSize, state.insideBlend);
          })
          .attr("y", -2)
          .attr("fill", d => d3.interpolateRgb("rgba(240, 251, 255, 0.99)", "rgba(245, 253, 255, 0.99)")(labelState.get(d.name).insideBlend))
          .attr("stroke", d => {
            const blend = labelState.get(d.name).insideBlend;
            return `rgba(2, 18, 28, ${(0.88 * blend).toFixed(3)})`;
          })
          .attr("stroke-width", d => 2.7 * labelState.get(d.name).insideBlend)
          .attr("paint-order", "stroke fill");

        valueLabels
          .text(d => labelState.get(d.name).valueText)
          .attr("font-size", d => {
            const state = labelState.get(d.name);
            return lerp(state.outsideValueSize, state.insideValueSize, state.insideBlend);
          })
          .attr("y", d => lerp(13, 12.5, labelState.get(d.name).insideBlend))
          .attr("fill", d => d3.interpolateRgb("rgba(208, 236, 249, 0.98)", "rgba(219, 245, 255, 0.98)")(labelState.get(d.name).insideBlend))
          .attr("stroke", d => {
            const blend = labelState.get(d.name).insideBlend;
            return `rgba(2, 18, 28, ${(0.82 * blend).toFixed(3)})`;
          })
          .attr("stroke-width", d => 2.1 * labelState.get(d.name).insideBlend)
          .attr("paint-order", "stroke fill");

        updateLabelPills();

        progressTrack.attr("width", innerWidth);
        progressBar.attr("width", innerWidth * eased);

        phaseHint.text(
          eased < 0.5
            ? `Relative body size by weight (${Math.round(eased * 100)}%)`
            : `Morphing to pound-for-pound views (${Math.round(eased * 100)}%)`
        );
      }

      function canMorphForDelta(delta) {
        if (delta > 0) return progress < 0.999;
        return progress > 0.001;
      }

      function getLockMetrics() {
        const node = weightBubbleSvg.node();
        if (!node) return null;
        const lockFrame = node.closest(".chart-wrap") || node;
        const rect = lockFrame.getBoundingClientRect();
        const vh = window.innerHeight || document.documentElement.clientHeight || 1;
        const desiredTop = Math.max(16, (vh - rect.height) / 2);
        const lockY = Math.max(0, window.scrollY + rect.top - desiredTop);
        const visibleHeight = Math.max(0, Math.min(rect.bottom, vh) - Math.max(rect.top, 0));
        return { rect, vh, lockY, visibleHeight };
      }

      function shouldLockForDelta(delta) {
        if (gateLocked || delta === 0) return false;
        if (!canMorphForDelta(delta)) return false;
        if (performance.now() < lockCooldownUntil) return false;
        const metrics = getLockMetrics();
        if (!metrics) return false;
        const enoughVisible = metrics.visibleHeight >= Math.max(180, Math.min(metrics.rect.height * 0.34, metrics.vh * 0.62));
        const nearCenter = Math.abs(window.scrollY - metrics.lockY) <= Math.max(84, metrics.vh * 0.12);
        return enoughVisible && nearCenter;
      }

      function lockToChart(direction) {
        if (gateLocked || !direction) return;
        if (!canMorphForDelta(direction)) return;
        const metrics = getLockMetrics();
        if (!metrics) return;
        const chartMid = metrics.rect.top + (metrics.rect.height / 2);
        const bandTop = metrics.vh * 0.16;
        const bandBottom = metrics.vh * 0.86;
        if (chartMid < bandTop || chartMid > bandBottom) return;
        const currentY = window.scrollY;
        const nearCenter = Math.abs(currentY - metrics.lockY) <= Math.max(84, metrics.vh * 0.12);
        if (!nearCenter) return;
        gateLocked = true;
        lockDirection = direction > 0 ? 1 : -1;
        lockScrollY = metrics.lockY;
        if (Math.abs(currentY - lockScrollY) > 0.5) {
          window.scrollTo(0, lockScrollY);
        }
        lastWindowScrollY = lockScrollY;
        const scrollbarGap = Math.max(0, window.innerWidth - document.documentElement.clientWidth);
        document.body.style.setProperty("--bubble-lock-top", `${-lockScrollY}px`);
        document.body.style.setProperty("--bubble-scrollbar-gap", `${scrollbarGap}px`);
        document.documentElement.classList.add("bubble-scroll-locked");
        document.body.classList.add("bubble-scroll-locked");
      }

      function unlockFromChart() {
        const wasLocked = gateLocked;
        gateLocked = false;
        lockDirection = 0;
        document.documentElement.classList.remove("bubble-scroll-locked");
        document.body.classList.remove("bubble-scroll-locked");
        document.body.style.removeProperty("--bubble-lock-top");
        document.body.style.removeProperty("--bubble-scrollbar-gap");
        if (wasLocked) {
          window.scrollTo(0, lockScrollY);
          lastWindowScrollY = lockScrollY;
          lockCooldownUntil = performance.now() + 120;
        }
      }

      function maybeUnlockAtBoundary() {
        if (!gateLocked) return;
        if (lockDirection > 0 && progress >= 0.999) {
          targetProgress = 1;
          renderMorph(1);
          unlockFromChart();
          return;
        }
        if (lockDirection < 0 && progress <= 0.001) {
          targetProgress = 0;
          renderMorph(0);
          unlockFromChart();
        }
      }

      function runFrame() {
        rafId = 0;
        const diff = targetProgress - progress;
        if (Math.abs(diff) <= 0.0008) {
          renderMorph(targetProgress);
          maybeUnlockAtBoundary();
          return;
        }
        renderMorph(progress + (diff * 0.18));
        maybeUnlockAtBoundary();
        if (gateLocked || Math.abs(targetProgress - progress) > 0.0008) {
          rafId = requestAnimationFrame(runFrame);
        }
      }

      function scheduleFrame() {
        if (!rafId) {
          rafId = requestAnimationFrame(runFrame);
        }
      }

      function advanceMorph(rawDelta) {
        if (!gateLocked || !rawDelta) return;
        lockDirection = rawDelta > 0 ? 1 : -1;
        targetProgress = Math.max(0, Math.min(1, targetProgress + (rawDelta / 1500)));
        scheduleFrame();
      }

      const onWheel = event => {
        if (shouldLockForDelta(event.deltaY)) {
          lockToChart(event.deltaY);
        }
        if (!gateLocked) return;
        event.preventDefault();
        advanceMorph(event.deltaY);
      };

      const onTouchStart = event => {
        touchY = event.touches && event.touches.length ? event.touches[0].clientY : null;
      };

      const onTouchMove = event => {
        const currentY = event.touches && event.touches.length ? event.touches[0].clientY : null;
        if (touchY == null || currentY == null) return;
        const delta = touchY - currentY;
        touchY = currentY;
        if (shouldLockForDelta(delta)) {
          lockToChart(delta);
        }
        if (!gateLocked) return;
        event.preventDefault();
        advanceMorph(delta);
      };

      const onKeyDown = event => {
        let delta = 0;
        if (event.key === "ArrowDown" || event.key === "PageDown" || event.key === " ") delta = 120;
        if (event.key === "ArrowUp" || event.key === "PageUp") delta = -120;
        if (!delta) return;
        if (shouldLockForDelta(delta)) {
          lockToChart(delta);
        }
        if (!gateLocked) return;
        event.preventDefault();
        advanceMorph(delta);
      };

      const onScrollMonitor = () => {
        if (gateLocked) return;
        const currentY = window.scrollY;
        const delta = currentY - lastWindowScrollY;
        lastWindowScrollY = currentY;
        if (!delta) return;
        if (!canMorphForDelta(delta)) return;
        if (performance.now() < lockCooldownUntil) return;
        const metrics = getLockMetrics();
        if (!metrics) return;
        const enoughVisible = metrics.visibleHeight >= Math.max(180, Math.min(metrics.rect.height * 0.34, metrics.vh * 0.62));
        const nearCenter = Math.abs(currentY - metrics.lockY) <= Math.max(84, metrics.vh * 0.12);
        if (enoughVisible && nearCenter) {
          lockToChart(delta);
        }
      };

      window.addEventListener("wheel", onWheel, { passive: false });
      window.addEventListener("touchstart", onTouchStart, { passive: true });
      window.addEventListener("touchmove", onTouchMove, { passive: false });
      window.addEventListener("keydown", onKeyDown);
      window.addEventListener("scroll", onScrollMonitor, { passive: true });
      renderMorph(0);
      targetProgress = 0;

      weightBubbleScrollCleanup = () => {
        window.removeEventListener("wheel", onWheel);
        window.removeEventListener("touchstart", onTouchStart);
        window.removeEventListener("touchmove", onTouchMove);
        window.removeEventListener("keydown", onKeyDown);
        window.removeEventListener("scroll", onScrollMonitor);
        if (rafId) {
          cancelAnimationFrame(rafId);
          rafId = 0;
        }
        unlockFromChart();
      };
    }

    function drawSeabedMiningChart(data) {
      if (seabedMiningSvg.empty()) return;
      if (typeof seabedRevealCleanup === "function") {
        seabedRevealCleanup();
        seabedRevealCleanup = null;
      }

      seabedMiningSvg.selectAll("*").remove();
      seabedMiningTooltip.style("opacity", 0);

      const margin = { top: 30, right: 44, bottom: 58, left: 70 };
      const innerWidth = CHART_WIDTH - margin.left - margin.right;
      const innerHeight = CHART_HEIGHT - margin.top - margin.bottom;
      const g = seabedMiningSvg.append("g")
        .attr("transform", `translate(${margin.left},${margin.top})`);

      const series = [
        {
          name: "Anglerfish",
          color: ANGLERFISH_COLOR,
          values: data
            .map(d => ({ date: d.date, value: d.anglerfish }))
            .filter(d => Number.isFinite(d.value))
        },
        {
          name: "Seabed mining",
          color: SEABED_MINING_COLOR,
          values: data
            .map(d => ({ date: d.date, value: d.seabedMining }))
            .filter(d => Number.isFinite(d.value))
        }
      ].map(s => ({ ...s, byDate: new Map(s.values.map(v => [+v.date, v.value])) }));

      const allValues = series.flatMap(s => s.values.map(v => v.value)).filter(Number.isFinite);
      if (!allValues.length) {
        throw new Error("Seabed chart requires numeric values.");
      }

      const maxValue = d3.max(allValues) || 1;
      const linearMax = maxValue * 1.07;
      const logMaxValue = Math.max(1, linearMax);
      const logMin = 0;
      const logMax = Math.log10(logMaxValue + 1);
      const dateValues = data.map(d => d.date);

      const x = d3.scaleTime()
        .domain(d3.extent(dateValues))
        .range([0, innerWidth]);

      const yLinear = d3.scaleLinear()
        .domain([0, linearMax])
        .nice()
        .range([innerHeight, 0]);

      const yLogTransformed = d3.scaleLinear()
        .domain([logMin, logMax])
        .range([innerHeight, 0]);

      let scaleMode = "linear";
      let y = yLinear;
      let lastHoverDate = null;
      let revealFactor = 0;

      const yGrid = g.append("g").attr("class", "grid");
      const yAxis = g.append("g");
      const xAxis = g.append("g")
        .attr("transform", `translate(0,${innerHeight})`)
        .call(d3.axisBottom(x).ticks(8).tickFormat(formatShortDate));
      styleAxis(xAxis);

      g.append("text")
        .attr("class", "axis-label")
        .attr("x", innerWidth / 2)
        .attr("y", innerHeight + 46)
        .attr("text-anchor", "middle")
        .text("Date");

      g.append("text")
        .attr("class", "axis-label")
        .attr("x", -innerHeight / 2)
        .attr("y", -50)
        .attr("transform", "rotate(-90)")
        .attr("text-anchor", "middle")
        .text("Daily pageviews");

      function toLog(value) {
        return Math.log10(Math.max(0, value) + 1);
      }

      const displayedValue = rawValue => Math.max(0, rawValue * revealFactor);

      function buildLine() {
        return d3.line()
          .curve(d3.curveMonotoneX)
          .defined(d => scaleMode === "log"
            ? Number.isFinite(d.value) && d.value >= 0
            : Number.isFinite(d.value))
          .x(d => x(d.date))
          .y(d => {
            const value = displayedValue(d.value);
            return y(scaleMode === "log" ? toLog(value) : value);
          });
      }

      const lines = g.selectAll(".seabed-series-line")
        .data(series)
        .enter()
        .append("path")
        .attr("class", "series-line seabed-series-line")
        .attr("fill", "none")
        .attr("stroke", d => d.color)
        .attr("stroke-width", 2.4)
        .attr("opacity", 0.86)
        .attr("d", d => buildLine()(d.values));

      const legendX = Math.max(12, innerWidth - 190);
      const legend = g.append("g")
        .attr("class", "legend")
        .attr("transform", `translate(${legendX}, 16)`);

      const legendItems = legend.selectAll(".legend-item")
        .data(series)
        .enter()
        .append("g")
        .attr("class", "legend-item")
        .attr("transform", (_, i) => `translate(0, ${i * 26})`);

      legendItems.append("rect")
        .attr("x", 0)
        .attr("y", -5)
        .attr("width", 16)
        .attr("height", 10)
        .attr("rx", 2)
        .attr("fill", d => d.color)
        .attr("opacity", 0.95);

      legendItems.append("text")
        .attr("x", 24)
        .attr("y", 0)
        .attr("dominant-baseline", "middle")
        .text(d => d.name);

      const hoverGuide = g.append("line")
        .attr("y1", 0)
        .attr("y2", innerHeight)
        .attr("stroke", "rgba(176, 222, 242, 0.72)")
        .attr("stroke-width", 1)
        .attr("stroke-dasharray", "4 4")
        .attr("opacity", 0);

      const hoverDots = g.append("g")
        .selectAll("circle")
        .data(series)
        .enter()
        .append("circle")
        .attr("r", 4)
        .attr("fill", d => d.color)
        .attr("stroke", "#082533")
        .attr("stroke-width", 1.2)
        .attr("opacity", 0);

      const logTickRawValues = (() => {
        const ticks = [];
        const minPow = 0;
        const maxPow = Math.ceil(Math.log10(logMaxValue));
        ticks.push(0);
        for (let p = minPow; p <= maxPow; p += 1) {
          const base = Math.pow(10, p);
          [1, 2, 5].forEach(multiplier => {
            const value = base * multiplier;
            if (value >= 0 && value <= logMaxValue) {
              ticks.push(Number(value.toPrecision(12)));
            }
          });
        }
        ticks.push(Number(logMaxValue.toPrecision(12)));
        return Array.from(new Set(ticks)).sort((a, b) => a - b);
      })();

      function formatLogTick(rawValue) {
        if (rawValue >= 1000) return d3.format(",.0f")(rawValue);
        if (rawValue >= 10) return d3.format(".0f")(rawValue);
        if (rawValue >= 1) return d3.format(".1f")(rawValue).replace(/\.0$/, "");
        return d3.format(".2f")(rawValue);
      }

      function buildYAxis() {
        return scaleMode === "log"
          ? d3.axisLeft(y)
            .tickValues(logTickRawValues.map(toLog))
            .tickFormat(v => formatLogTick((Math.pow(10, v)) - 1))
          : d3.axisLeft(y).ticks(6).tickFormat(d3.format(",d"));
      }

      function buildGridAxis() {
        return (scaleMode === "log"
          ? d3.axisLeft(y).tickValues(logTickRawValues.map(toLog))
          : d3.axisLeft(y).ticks(6))
          .tickSize(-innerWidth)
          .tickFormat("");
      }

      function refreshScales(withTransition = false) {
        y = scaleMode === "log" ? yLogTransformed : yLinear;

        const yAxisSelection = withTransition
          ? yAxis.transition().duration(320)
          : yAxis;
        yAxisSelection.call(buildYAxis());
        styleAxis(yAxis);

        const yGridSelection = withTransition
          ? yGrid.transition().duration(320)
          : yGrid;
        yGridSelection.call(buildGridAxis()).call(group => group.select(".domain").remove());

        const linePath = buildLine();
        lines.attr("d", d => linePath(d.values));
        lines
          .attr("stroke-dasharray", null)
          .attr("stroke-dashoffset", null);
      }

      function renderHover(date) {
        const px = x(date);
        const valuesAtDate = series
          .map(s => ({
            name: s.name,
            value: s.byDate.get(+date),
            color: s.color
          }))
          .filter(v => Number.isFinite(v.value));

        if (!valuesAtDate.length) {
          hoverGuide.attr("opacity", 0);
          hoverDots.attr("opacity", 0);
          seabedMiningTooltip.style("opacity", 0);
          return;
        }

        hoverGuide.attr("x1", px).attr("x2", px).attr("opacity", 1);
        hoverDots
          .attr("cx", px)
          .attr("cy", d => {
            const found = valuesAtDate.find(v => v.name === d.name);
            if (!found) return -20;
            const value = displayedValue(found.value);
            return y(scaleMode === "log" ? toLog(value) : value);
          })
          .attr("opacity", d => valuesAtDate.some(v => v.name === d.name) ? 1 : 0);

        const rowsHtml = valuesAtDate
          .sort((a, b) => b.value - a.value)
          .map(v => `
            <div class="tip-row">
              <span class="tip-dot" style="background:${v.color};"></span>
              <span>${v.name}: ${formatValue(v.value)}</span>
            </div>
          `)
          .join("");

        const tipX = Math.max(12, Math.min(CHART_WIDTH - 240, px + margin.left + 14));
        seabedMiningTooltip
          .style("opacity", 1)
          .style("left", `${tipX}px`)
          .style("top", "12px")
          .html(`
            <div class="tip-title">${formatDate(date)}</div>
            ${rowsHtml}
          `);
      }

      const bisectDate = d3.bisector(d => d).left;
      g.append("rect")
        .attr("width", innerWidth)
        .attr("height", innerHeight)
        .attr("fill", "transparent")
        .on("mousemove", event => {
          const [mouseX] = d3.pointer(event);
          const hoveredDate = x.invert(mouseX);
          const idx = Math.min(
            dateValues.length - 1,
            Math.max(1, bisectDate(dateValues, hoveredDate, 1))
          );
          const d0 = dateValues[idx - 1];
          const d1 = dateValues[idx];
          const nearestDate = hoveredDate - d0 > d1 - hoveredDate ? d1 : d0;
          lastHoverDate = nearestDate;
          renderHover(nearestDate);
        })
        .on("mouseleave", () => {
          lastHoverDate = null;
          hoverGuide.attr("opacity", 0);
          hoverDots.attr("opacity", 0);
          seabedMiningTooltip.style("opacity", 0);
        });

      function setScale(nextScaleMode) {
        if (nextScaleMode === scaleMode) return;
        scaleMode = nextScaleMode;
        seabedScaleLinearButton.classed("is-active", scaleMode === "linear");
        seabedScaleLogButton.classed("is-active", scaleMode === "log");
        refreshScales(false);
        if (lastHoverDate) {
          renderHover(lastHoverDate);
        }
      }

      if (!seabedScaleLinearButton.empty()) {
        seabedScaleLinearButton
          .classed("is-active", true)
          .on("click", () => setScale("linear"));
      }
      if (!seabedScaleLogButton.empty()) {
        seabedScaleLogButton
          .classed("is-active", false)
          .on("click", () => setScale("log"));
      }

      refreshScales(false);
      const revealTargetNode = seabedMiningSvg.node()
        ? (seabedMiningSvg.node().closest(".chart-card") || seabedMiningSvg.node())
        : null;
      seabedRevealCleanup = createScrollRevealAnimator(
        revealTargetNode,
        nextReveal => {
          revealFactor = nextReveal;
          const linePath = buildLine();
          lines.attr("d", d => linePath(d.values));
          if (lastHoverDate) {
            renderHover(lastHoverDate);
          }
        },
        { minRatio: 0.12, maxRatio: 0.84, smoothing: 0.2, keepMax: true }
      );
    }

    function drawSeabedMiningWeeklyLogChart(data) {
      if (seabedMiningWeeklySvg.empty()) return;
      if (typeof seabedWeeklyRevealCleanup === "function") {
        seabedWeeklyRevealCleanup();
        seabedWeeklyRevealCleanup = null;
      }

      seabedMiningWeeklySvg.selectAll("*").remove();
      seabedMiningWeeklyTooltip.style("opacity", 0);

      const margin = { top: 30, right: 44, bottom: 58, left: 70 };
      const innerWidth = CHART_WIDTH - margin.left - margin.right;
      const innerHeight = CHART_HEIGHT - margin.top - margin.bottom;
      const g = seabedMiningWeeklySvg.append("g")
        .attr("transform", `translate(${margin.left},${margin.top})`);

      const weekRows = d3.rollups(
        data,
        values => {
          const seabedVals = values.map(d => d.seabedMining).filter(Number.isFinite);
          const anglerVals = values.map(d => d.anglerfish).filter(Number.isFinite);
          return {
            seabedMining: seabedVals.length ? d3.mean(seabedVals) : NaN,
            anglerfish: anglerVals.length ? d3.mean(anglerVals) : NaN
          };
        },
        d => +d3.timeMonday.floor(d.date)
      )
        .map(([weekTs, summary]) => ({
          date: new Date(Number(weekTs)),
          seabedMining: summary.seabedMining,
          anglerfish: summary.anglerfish
        }))
        .filter(d => Number.isFinite(d.seabedMining) || Number.isFinite(d.anglerfish))
        .sort((a, b) => a.date - b.date);

      if (!weekRows.length) {
        throw new Error("Weekly seabed chart requires valid data.");
      }

      const series = [
        {
          name: "Anglerfish",
          color: ANGLERFISH_COLOR,
          values: weekRows
            .map(d => ({ date: d.date, value: d.anglerfish }))
            .filter(d => Number.isFinite(d.value))
        },
        {
          name: "Seabed mining",
          color: SEABED_MINING_COLOR,
          values: weekRows
            .map(d => ({ date: d.date, value: d.seabedMining }))
            .filter(d => Number.isFinite(d.value))
        }
      ].map(s => ({ ...s, byDate: new Map(s.values.map(v => [+v.date, v.value])) }));

      const allValues = series.flatMap(s => s.values.map(v => v.value)).filter(Number.isFinite);
      if (!allValues.length) {
        throw new Error("Weekly seabed chart requires numeric values.");
      }

      const maxValue = d3.max(allValues) || 1;
      const logMaxValue = Math.max(1, maxValue * 1.07);
      const dateValues = weekRows.map(d => d.date);

      const x = d3.scaleTime()
        .domain(d3.extent(dateValues))
        .range([0, innerWidth]);

      const y = d3.scaleLinear()
        .domain([0, Math.log10(logMaxValue + 1)])
        .range([innerHeight, 0]);

      const toLog = value => Math.log10(Math.max(0, value) + 1);
      let revealFactor = 0;
      let lastHoverDate = null;

      const yGrid = g.append("g").attr("class", "grid");
      const yAxis = g.append("g");
      const xAxis = g.append("g")
        .attr("transform", `translate(0,${innerHeight})`)
        .call(d3.axisBottom(x).ticks(8).tickFormat(formatShortDate));
      styleAxis(xAxis);

      g.append("text")
        .attr("class", "axis-label")
        .attr("x", innerWidth / 2)
        .attr("y", innerHeight + 46)
        .attr("text-anchor", "middle")
        .text("Week");

      g.append("text")
        .attr("class", "axis-label")
        .attr("x", -innerHeight / 2)
        .attr("y", -50)
        .attr("transform", "rotate(-90)")
        .attr("text-anchor", "middle")
        .text("Average weekly pageviews (log)");

      const logTickRawValues = (() => {
        const ticks = [];
        const maxPow = Math.ceil(Math.log10(logMaxValue));
        ticks.push(0);
        for (let p = 0; p <= maxPow; p += 1) {
          const base = Math.pow(10, p);
          [1, 2, 5].forEach(multiplier => {
            const v = base * multiplier;
            if (v >= 0 && v <= logMaxValue) {
              ticks.push(Number(v.toPrecision(12)));
            }
          });
        }
        ticks.push(Number(logMaxValue.toPrecision(12)));
        return Array.from(new Set(ticks)).sort((a, b) => a - b);
      })();

      function formatLogTick(rawValue) {
        if (rawValue >= 1000) return d3.format(",.0f")(rawValue);
        if (rawValue >= 10) return d3.format(".0f")(rawValue);
        if (rawValue >= 1) return d3.format(".1f")(rawValue).replace(/\.0$/, "");
        return d3.format(".2f")(rawValue);
      }

      yAxis
        .call(
          d3.axisLeft(y)
            .tickValues(logTickRawValues.map(toLog))
            .tickFormat(v => formatLogTick((Math.pow(10, v)) - 1))
        );
      styleAxis(yAxis);

      yGrid
        .call(
          d3.axisLeft(y)
            .tickValues(logTickRawValues.map(toLog))
            .tickSize(-innerWidth)
            .tickFormat("")
        )
        .call(group => group.select(".domain").remove());

      const displayedValue = rawValue => Math.max(0, rawValue * revealFactor);
      const buildLine = () => d3.line()
        .curve(d3.curveMonotoneX)
        .defined(d => Number.isFinite(d.value) && d.value >= 0)
        .x(d => x(d.date))
        .y(d => y(toLog(displayedValue(d.value))));

      const lines = g.selectAll(".seabed-weekly-series-line")
        .data(series)
        .enter()
        .append("path")
        .attr("class", "series-line seabed-weekly-series-line")
        .attr("fill", "none")
        .attr("stroke", d => d.color)
        .attr("stroke-width", 2.4)
        .attr("opacity", 0.86)
        .attr("d", d => buildLine()(d.values));

      const legend = g.append("g")
        .attr("class", "legend")
        .attr("transform", `translate(${Math.max(12, innerWidth - 190)}, 16)`);

      const legendItems = legend.selectAll(".legend-item")
        .data(series)
        .enter()
        .append("g")
        .attr("class", "legend-item")
        .attr("transform", (_, i) => `translate(0, ${i * 26})`);

      legendItems.append("rect")
        .attr("x", 0)
        .attr("y", -5)
        .attr("width", 16)
        .attr("height", 10)
        .attr("rx", 2)
        .attr("fill", d => d.color)
        .attr("opacity", 0.95);

      legendItems.append("text")
        .attr("x", 24)
        .attr("y", 0)
        .attr("dominant-baseline", "middle")
        .text(d => d.name);

      const hoverGuide = g.append("line")
        .attr("y1", 0)
        .attr("y2", innerHeight)
        .attr("stroke", "rgba(176, 222, 242, 0.72)")
        .attr("stroke-width", 1)
        .attr("stroke-dasharray", "4 4")
        .attr("opacity", 0);

      const hoverDots = g.append("g")
        .selectAll("circle")
        .data(series)
        .enter()
        .append("circle")
        .attr("r", 4)
        .attr("fill", d => d.color)
        .attr("stroke", "#082533")
        .attr("stroke-width", 1.2)
        .attr("opacity", 0);

      const weeklyValueFormat = d3.format(",.1f");

      function renderHover(date) {
        const px = x(date);
        const valuesAtDate = series
          .map(s => ({
            name: s.name,
            value: s.byDate.get(+date),
            color: s.color
          }))
          .filter(v => Number.isFinite(v.value));

        if (!valuesAtDate.length) {
          hoverGuide.attr("opacity", 0);
          hoverDots.attr("opacity", 0);
          seabedMiningWeeklyTooltip.style("opacity", 0);
          return;
        }

        hoverGuide.attr("x1", px).attr("x2", px).attr("opacity", 1);
        hoverDots
          .attr("cx", px)
          .attr("cy", d => {
            const found = valuesAtDate.find(v => v.name === d.name);
            if (!found) return -20;
            return y(toLog(displayedValue(found.value)));
          })
          .attr("opacity", d => valuesAtDate.some(v => v.name === d.name) ? 1 : 0);

        const rowsHtml = valuesAtDate
          .sort((a, b) => b.value - a.value)
          .map(v => `
            <div class="tip-row">
              <span class="tip-dot" style="background:${v.color};"></span>
              <span>${v.name}: ${weeklyValueFormat(v.value)}</span>
            </div>
          `)
          .join("");

        const tipX = Math.max(12, Math.min(CHART_WIDTH - 240, px + margin.left + 14));
        seabedMiningWeeklyTooltip
          .style("opacity", 1)
          .style("left", `${tipX}px`)
          .style("top", "12px")
          .html(`
            <div class="tip-title">Week of ${formatDate(date)}</div>
            ${rowsHtml}
          `);
      }

      const bisectDate = d3.bisector(d => d).left;
      g.append("rect")
        .attr("width", innerWidth)
        .attr("height", innerHeight)
        .attr("fill", "transparent")
        .on("mousemove", event => {
          const [mouseX] = d3.pointer(event);
          const hoveredDate = x.invert(mouseX);
          const idx = Math.min(
            dateValues.length - 1,
            Math.max(1, bisectDate(dateValues, hoveredDate, 1))
          );
          const d0 = dateValues[idx - 1];
          const d1 = dateValues[idx];
          const nearestDate = hoveredDate - d0 > d1 - hoveredDate ? d1 : d0;
          lastHoverDate = nearestDate;
          renderHover(nearestDate);
        })
        .on("mouseleave", () => {
          lastHoverDate = null;
          hoverGuide.attr("opacity", 0);
          hoverDots.attr("opacity", 0);
          seabedMiningWeeklyTooltip.style("opacity", 0);
        });

      const revealTargetNode = seabedMiningWeeklySvg.node()
        ? (seabedMiningWeeklySvg.node().closest(".chart-card") || seabedMiningWeeklySvg.node())
        : null;
      seabedWeeklyRevealCleanup = createScrollRevealAnimator(
        revealTargetNode,
        nextReveal => {
          revealFactor = nextReveal;
          const linePath = buildLine();
          lines.attr("d", d => linePath(d.values));
          if (lastHoverDate) {
            renderHover(lastHoverDate);
          }
        },
        { minRatio: 0.12, maxRatio: 0.84, smoothing: 0.2, keepMax: true }
      );
    }

    function drawKendrickAnglerLogChart(data) {
      if (kendrickAnglerSvg.empty()) return;
      if (typeof kendrickRevealCleanup === "function") {
        kendrickRevealCleanup();
        kendrickRevealCleanup = null;
      }

      const kendrickNode = kendrickAnglerSvg.node();
      if (!kendrickNode || kendrickNode.closest("[hidden]")) return;

      kendrickAnglerSvg.selectAll("*").remove();

      const margin = { top: 30, right: 44, bottom: 58, left: 70 };
      const innerWidth = CHART_WIDTH - margin.left - margin.right;
      const innerHeight = CHART_HEIGHT - margin.top - margin.bottom;
      const g = kendrickAnglerSvg.append("g")
        .attr("transform", `translate(${margin.left},${margin.top})`)
        .attr("opacity", 0);

      const series = [
        {
          name: "Anglerfish",
          color: "#f6b73c",
          values: data
            .map(d => ({ date: d.date, value: d.anglerfish }))
            .filter(d => Number.isFinite(d.value))
        },
        {
          name: "Kendrick Lamar",
          color: "#c6a0ff",
          values: data
            .map(d => ({ date: d.date, value: d.kendrickLamar }))
            .filter(d => Number.isFinite(d.value))
        }
      ];

      const allValues = series.flatMap(s => s.values.map(v => v.value)).filter(Number.isFinite);
      if (!allValues.length) {
        throw new Error("Kendrick chart requires numeric values.");
      }

      const maxValue = d3.max(allValues) || 1;
      const logMinValue = 500;
      const logMaxValue = Math.max(logMinValue * 1.05, maxValue * 1.07);
      const dateValues = Array.from(new Set(series.flatMap(s => s.values.map(v => +v.date))))
        .sort((a, b) => a - b)
        .map(ts => new Date(ts));

      const x = d3.scaleTime()
        .domain(d3.extent(dateValues))
        .range([0, innerWidth]);

      const y = d3.scaleLinear()
        .domain([Math.log10(logMinValue + 1), Math.log10(logMaxValue + 1)])
        .range([innerHeight, 0]);

      const toLog = value => Math.log10(Math.max(0, value) + 1);

      const yGrid = g.append("g").attr("class", "grid");
      const yAxis = g.append("g");
      const xAxis = g.append("g")
        .attr("transform", `translate(0,${innerHeight})`)
        .call(d3.axisBottom(x).ticks(8).tickFormat(formatShortDate));
      styleAxis(xAxis);

      g.append("text")
        .attr("class", "axis-label")
        .attr("x", innerWidth / 2)
        .attr("y", innerHeight + 46)
        .attr("text-anchor", "middle")
        .text("Date");

      g.append("text")
        .attr("class", "axis-label")
        .attr("x", -innerHeight / 2)
        .attr("y", -50)
        .attr("transform", "rotate(-90)")
        .attr("text-anchor", "middle")
        .text("Pageviews (log)");

      const logTickRawValues = (() => {
        const ticks = [];
        const minPow = Math.floor(Math.log10(logMinValue));
        const maxPow = Math.ceil(Math.log10(logMaxValue));
        ticks.push(logMinValue);
        for (let p = minPow; p <= maxPow; p += 1) {
          const base = Math.pow(10, p);
          [1, 2, 5].forEach(multiplier => {
            const v = base * multiplier;
            if (v >= logMinValue && v <= logMaxValue) {
              ticks.push(Number(v.toPrecision(12)));
            }
          });
        }
        ticks.push(Number(logMaxValue.toPrecision(12)));
        return Array.from(new Set(ticks)).sort((a, b) => a - b);
      })();

      function formatLogTick(rawValue) {
        if (rawValue >= 1000) return d3.format(",.0f")(rawValue);
        if (rawValue >= 10) return d3.format(".0f")(rawValue);
        if (rawValue >= 1) return d3.format(".1f")(rawValue).replace(/\.0$/, "");
        return d3.format(".2f")(rawValue);
      }

      yAxis
        .call(
          d3.axisLeft(y)
            .tickValues(logTickRawValues.map(toLog))
            .tickFormat(v => formatLogTick((Math.pow(10, v)) - 1))
        );
      styleAxis(yAxis);

      yGrid
        .call(
          d3.axisLeft(y)
            .tickValues(logTickRawValues.map(toLog))
            .tickSize(-innerWidth)
            .tickFormat("")
        )
        .call(group => group.select(".domain").remove());

      const displayedValue = rawValue => Math.max(0, rawValue);
      const buildLine = () => d3.line()
        .curve(d3.curveMonotoneX)
        .defined(d => Number.isFinite(d.value) && d.value >= 0)
        .x(d => x(d.date))
        .y(d => y(toLog(displayedValue(d.value))));

      const lines = g.selectAll(".kendrick-series-line")
        .data(series)
        .enter()
        .append("path")
        .attr("class", "series-line kendrick-series-line")
        .attr("fill", "none")
        .attr("stroke", d => d.color)
        .attr("stroke-width", 2.4)
        .attr("opacity", 0.86)
        .attr("d", d => buildLine()(d.values));

      const revealTargetNode = kendrickAnglerSvg.node()
        ? (kendrickAnglerSvg.node().closest(".game-chart-card") || kendrickAnglerSvg.node())
        : null;
      updateKendrickPollStage(0);
      kendrickRevealCleanup = createCenterLockRevealAnimator(
        revealTargetNode,
        nextReveal => {
          const eased = d3.easeCubicInOut(nextReveal);
          g.attr("opacity", eased);
          updateKendrickPollStage(nextReveal);
        },
        {
          lockClass: "kendrick",
          minVisiblePx: 170,
          minVisibleRatio: 0.3,
          maxVisibleRatio: 0.62,
          centerTolerancePx: 64,
          centerToleranceRatio: 0.12,
          deltaDivisor: 920,
          smoothing: 0.22
        }
      );
    }

    function drawComparisonChart(parsedRows, metricNames) {
      if (typeof multiRevealCleanup === "function") {
        multiRevealCleanup();
        multiRevealCleanup = null;
      }

      multiSvg.selectAll("*").remove();
      multiTooltip.style("opacity", 0);

      const margin = { top: 30, right: 44, bottom: 58, left: 68 };
      const innerWidth = CHART_WIDTH - margin.left - margin.right;
      const innerHeight = CHART_HEIGHT - margin.top - margin.bottom;
      const g = multiSvg.append("g")
        .attr("transform", `translate(${margin.left},${margin.top})`);

      const series = metricNames
        .map(name => {
          const values = parsedRows
            .map(row => ({ date: row.date, value: row[name] }))
            .filter(row => Number.isFinite(row.value));

          return {
            name,
            values,
            byDate: new Map(values.map(v => [+v.date, v.value]))
          };
        })
        .filter(s => s.values.length > 0);

      if (series.length === 0) {
        throw new Error("No metric columns found in CSV.");
      }

      const dateValues = series[0].values.map(v => v.date);
      const maxValue = d3.max(series, s => d3.max(s.values, v => v.value));
      const x = d3.scaleTime()
        .domain(d3.extent(dateValues))
        .range([0, innerWidth]);
      const y = d3.scaleLinear()
        .domain([0, maxValue * 1.07])
        .nice()
        .range([innerHeight, 0]);

      const fallbackDomain = series
        .map(s => s.name)
        .filter(name => !SPECIES_THEME_COLORS.has(name));
      const fallbackColor = d3.scaleOrdinal()
        .domain(fallbackDomain)
        .range(FALLBACK_SERIES_COLORS);
      const color = name => SPECIES_THEME_COLORS.get(name) || fallbackColor(name);

      addYGrid(g, y, innerWidth);

      const xAxis = g.append("g")
        .attr("transform", `translate(0,${innerHeight})`)
        .call(d3.axisBottom(x).ticks(8).tickFormat(formatShortDate));
      const yAxis = g.append("g")
        .call(d3.axisLeft(y).ticks(6).tickFormat(d3.format(",d")));
      styleAxis(xAxis);
      styleAxis(yAxis);

      g.append("text")
        .attr("class", "axis-label")
        .attr("x", innerWidth / 2)
        .attr("y", innerHeight + 46)
        .attr("text-anchor", "middle")
        .text("Date");

      g.append("text")
        .attr("class", "axis-label")
        .attr("x", -innerHeight / 2)
        .attr("y", -48)
        .attr("transform", "rotate(-90)")
        .attr("text-anchor", "middle")
        .text("Search interest");

      const line = d3.line()
        .curve(d3.curveMonotoneX)
        .x(d => x(d.date))
        .y(d => y(displayedValue(d.value)));

      let revealFactor = 0;
      const displayedValue = rawValue => Math.max(0, rawValue * revealFactor);

      const lines = g.selectAll(".series-line")
        .data(series)
        .enter()
        .append("path")
        .attr("class", "series-line")
        .attr("fill", "none")
        .attr("stroke", d => color(d.name))
        .attr("stroke-width", 1.9)
        .attr("opacity", 0.6)
        .attr("d", d => line(d.values));

      const legend = g.append("g")
        .attr("class", "legend")
        .attr("transform", `translate(${Math.max(12, innerWidth - 190)}, 16)`);

      const legendItems = legend.selectAll(".legend-item")
        .data(series.map(s => s.name))
        .enter()
        .append("g")
        .attr("class", "legend-item")
        .attr("transform", (_, i) => `translate(0, ${i * 26})`);

      legendItems.append("rect")
        .attr("x", 0)
        .attr("y", -5)
        .attr("width", 16)
        .attr("height", 10)
        .attr("rx", 2)
        .attr("fill", d => color(d))
        .attr("opacity", 0.95);

      legendItems.append("text")
        .attr("x", 24)
        .attr("y", 0)
        .text(d => d);

      const peakPoint = d3.greatest(
        series.flatMap(s => s.values.map(v => ({ ...v, name: s.name }))),
        d => d.value
      );

      let peakMarker = null;
      let peakLabel = null;
      if (peakPoint) {
        const peakX = x(peakPoint.date);
        const peakY = y(displayedValue(peakPoint.value));
        peakMarker = g.append("circle")
          .attr("cx", peakX)
          .attr("cy", peakY)
          .attr("r", 4.4)
          .attr("fill", "#f4fdff")
          .attr("stroke", "#0a2b3b")
          .attr("stroke-width", 1.2);

        peakLabel = g.append("text")
          .attr("x", Math.min(innerWidth - 150, peakX + 10))
          .attr("y", Math.max(14, peakY - 10))
          .attr("fill", "rgba(239, 250, 255, 0.94)")
          .attr("font-size", 11)
          .text(`Highest point: ${peakPoint.name}`);
      }

      const mutedColor = "rgba(112, 139, 154, 0.64)";
      let activeMetric = null;

      function updateHighlight() {
        const hasActive = activeMetric !== null;

        lines
          .attr("stroke", d => {
            if (!hasActive) return color(d.name);
            return d.name === activeMetric ? color(d.name) : mutedColor;
          })
          .attr("stroke-width", d => {
            if (!hasActive) return 1.9;
            return d.name === activeMetric ? 4.2 : 1.4;
          })
          .attr("opacity", d => {
            if (!hasActive) return 0.6;
            return d.name === activeMetric ? 1 : 0.16;
          });

        legendItems.select("rect")
          .attr("fill", d => (!hasActive || d === activeMetric) ? color(d) : mutedColor)
          .attr("opacity", d => (!hasActive || d === activeMetric) ? 0.96 : 0.48);

        legendItems.select("text")
          .attr("opacity", d => (!hasActive || d === activeMetric) ? 1 : 0.5);
      }

      function setActiveMetric(metricName) {
        activeMetric = (activeMetric === metricName) ? null : metricName;
        updateHighlight();
      }

      lines.on("click", (event, d) => {
        event.stopPropagation();
        setActiveMetric(d.name);
      });

      legendItems.on("click", (event, d) => {
        event.stopPropagation();
        setActiveMetric(d);
      });

      multiSvg.on("click", () => {
        activeMetric = null;
        updateHighlight();
      });

      resetFocusButton.on("click", () => {
        activeMetric = null;
        updateHighlight();
      });

      const hoverGuide = g.append("line")
        .attr("y1", 0)
        .attr("y2", innerHeight)
        .attr("stroke", "rgba(176, 222, 242, 0.72)")
        .attr("stroke-width", 1)
        .attr("stroke-dasharray", "4 4")
        .attr("opacity", 0);

      const hoverDots = g.append("g")
        .selectAll("circle")
        .data(series)
        .enter()
        .append("circle")
        .attr("r", 4)
        .attr("fill", d => color(d.name))
        .attr("stroke", "#082533")
        .attr("stroke-width", 1.2)
        .attr("opacity", 0);

      const bisectDate = d3.bisector(d => d).left;
      g.append("rect")
        .attr("width", innerWidth)
        .attr("height", innerHeight)
        .attr("fill", "transparent")
        .on("mousemove", event => {
          const [mouseX] = d3.pointer(event);
          const hoveredDate = x.invert(mouseX);
          const idx = Math.min(
            dateValues.length - 1,
            Math.max(1, bisectDate(dateValues, hoveredDate, 1))
          );
          const d0 = dateValues[idx - 1];
          const d1 = dateValues[idx];
          const nearestDate = hoveredDate - d0 > d1 - hoveredDate ? d1 : d0;
          const px = x(nearestDate);

          const valuesAtDate = series
            .map(s => ({
              name: s.name,
              value: s.byDate.get(+nearestDate),
              color: color(s.name)
            }))
            .filter(v => Number.isFinite(v.value));

          const visibleValues = activeMetric
            ? valuesAtDate.filter(v => v.name === activeMetric)
            : valuesAtDate;

          const byName = new Map(visibleValues.map(v => [v.name, v]));

          hoverGuide.attr("x1", px).attr("x2", px).attr("opacity", 1);

          hoverDots
            .attr("cx", px)
            .attr("cy", d => {
              const v = byName.get(d.name);
              return v ? y(displayedValue(v.value)) : -20;
            })
            .attr("opacity", d => byName.has(d.name) ? 1 : 0);

          const sortedValues = visibleValues.sort((a, b) => b.value - a.value);
          const rowsHtml = sortedValues
            .map(v => `
              <div class="tip-row">
                <span class="tip-dot" style="background:${v.color};"></span>
                <span>${v.name}: ${formatValue(v.value)}</span>
              </div>
            `)
            .join("");

          const tipX = Math.max(12, Math.min(CHART_WIDTH - 210, px + margin.left + 14));
          const legendLeft = margin.left + legendX;
          const tooltipNearLegend = tipX >= (legendLeft - 180);
          const tipY = tooltipNearLegend ? "94px" : "12px";
          multiTooltip
            .style("opacity", 1)
            .style("left", `${tipX}px`)
            .style("top", tipY)
            .html(`
              <div class="tip-title">${formatDate(nearestDate)}</div>
              ${rowsHtml}
            `);
        })
        .on("mouseleave", () => {
          hoverGuide.attr("opacity", 0);
          hoverDots.attr("opacity", 0);
          multiTooltip.style("opacity", 0);
        });

      // Keep legend clickable by placing it above the hover-capture layer.
      legend.raise();

      const updateComparisonReveal = nextReveal => {
        revealFactor = nextReveal;
        lines.attr("d", d => line(d.values));
        if (peakPoint && peakMarker && peakLabel) {
          const peakY = y(displayedValue(peakPoint.value));
          const markerOpacity = 0.18 + (0.82 * revealFactor);
          peakMarker
            .attr("cy", peakY)
            .attr("opacity", markerOpacity);
          peakLabel
            .attr("y", Math.max(14, peakY - 10))
            .attr("opacity", markerOpacity);
        }
      };

      const revealTargetNode = multiSvg.node()
        ? (multiSvg.node().closest(".chart-card") || multiSvg.node())
        : null;
      multiRevealCleanup = createScrollRevealAnimator(
        revealTargetNode,
        updateComparisonReveal,
        { minRatio: 0.12, maxRatio: 0.84, smoothing: 0.2, keepMax: true }
      );

      updateHighlight();
    }
