(async () => {
  "use strict";

  let data;
  try {
    const response = await fetch("data/catalog.json", { headers: { "Accept": "application/json" }, cache: "no-cache" });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    data = await response.json();
  } catch (error) {
    console.error(error);
    document.body.innerHTML = '<main style="padding:40px;font-family:system-ui,sans-serif"><h1>产品数据载入失败</h1><p>请确认 GitHub Pages 已完成构建，或在本地通过“本地预览”脚本访问。</p></main>';
    return;
  }
  if (!data || !Array.isArray(data.products)) {
    document.body.innerHTML = '<main style="padding:40px;font-family:system-ui,sans-serif"><h1>产品数据格式错误</h1><p>请联系管理员检查产品数据库。</p></main>';
    return;
  }

  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => Array.from(root.querySelectorAll(selector));
  const products = data.products;
  const productMap = new Map(products.map(product => [product.uid, product]));
  const state = {
    search: "",
    category: "",
    tier: "",
    type: "",
    price: "",
    stock: "",
    sort: "default",
    favoritesOnly: false,
    visible: 24,
    favorites: new Set(readStorage("haihongFavorites")),
    compare: new Set(readStorage("haihongCompare")),
    pricesVisible: localStorage.getItem("haihongPricesVisible") === "true",
  };
  let filteredProducts = products.slice();
  let toastTimer = null;
  let lastFocusedElement = null;

  const els = {
    statProducts: $("#statProducts"),
    statCategories: $("#statCategories"),
    statNames: $("#statNames"),
    sourceDate: $("#sourceDate"),
    categoryCards: $("#categoryCards"),
    productGrid: $("#productGrid"),
    resultSummary: $("#resultSummary"),
    loadMoreButton: $("#loadMoreButton"),
    emptyState: $("#emptyState"),
    searchInput: $("#searchInput"),
    categorySelect: $("#categorySelect"),
    tierSelect: $("#tierSelect"),
    typeSelect: $("#typeSelect"),
    priceSelect: $("#priceSelect"),
    stockSelect: $("#stockSelect"),
    sortSelect: $("#sortSelect"),
    activeFilters: $("#activeFilters"),
    priceToggle: $("#priceToggle"),
    heroPriceToggle: $("#heroPriceToggle"),
    footerPriceToggle: $("#footerPriceToggle"),
    favoriteFilterButton: $("#favoriteFilterButton"),
    filterToggle: $("#filterToggle"),
    filterPanel: $("#filterPanel"),
    compareCount: $("#compareCount"),
    compareOpenButton: $("#compareOpenButton"),
    compareBar: $("#compareBar"),
    compareBarCount: $("#compareBarCount"),
    productModal: $("#productModal"),
    productModalContent: $("#productModalContent"),
    compareModal: $("#compareModal"),
    compareTableWrap: $("#compareTableWrap"),
    imageLightbox: $("#imageLightbox"),
    imageLightboxImage: $("#imageLightboxImage"),
    imageLightboxCaption: $("#imageLightboxCaption"),
    toast: $("#toast"),
  };

  initialize();

  function initialize() {
    els.statProducts.textContent = formatNumber(data.meta.productCount);
    els.statCategories.textContent = data.meta.categoryCount;
    els.statNames.textContent = data.meta.productNameCount;
    els.sourceDate.textContent = data.meta.sourceDate || "—";

    fillSelect(els.categorySelect, data.meta.categories);
    fillSelect(els.tierSelect, data.meta.tiers);
    fillSelect(els.typeSelect, data.meta.salesToolTypes);
    renderCategoryCards();
    sanitizeStoredSelections();
    setPriceVisibility(state.pricesVisible, false);
    bindEvents();
    applyFilters();
    openProductFromHash();
  }

  function bindEvents() {
    let searchTimer;
    els.searchInput.addEventListener("input", event => {
      clearTimeout(searchTimer);
      searchTimer = setTimeout(() => {
        state.search = event.target.value.trim();
        state.visible = 24;
        applyFilters();
      }, 130);
    });

    [
      [els.categorySelect, "category"],
      [els.tierSelect, "tier"],
      [els.typeSelect, "type"],
      [els.priceSelect, "price"],
      [els.stockSelect, "stock"],
      [els.sortSelect, "sort"],
    ].forEach(([element, key]) => {
      element.addEventListener("change", event => {
        state[key] = event.target.value;
        state.visible = 24;
        applyFilters();
        closeFilters();
      });
    });

    $("#clearSearchButton").addEventListener("click", () => {
      els.searchInput.value = "";
      state.search = "";
      applyFilters();
      els.searchInput.focus();
    });
    $("#resetButton").addEventListener("click", resetFilters);
    $("#emptyResetButton").addEventListener("click", resetFilters);
    $("#clearCategoryButton").addEventListener("click", () => setCategory(""));
    els.loadMoreButton.addEventListener("click", () => {
      state.visible += 24;
      renderProducts();
    });

    [els.priceToggle, els.heroPriceToggle, els.footerPriceToggle].forEach(button => {
      button.addEventListener("click", () => setPriceVisibility(!state.pricesVisible));
    });

    els.favoriteFilterButton.addEventListener("click", () => {
      state.favoritesOnly = !state.favoritesOnly;
      state.visible = 24;
      els.favoriteFilterButton.setAttribute("aria-pressed", String(state.favoritesOnly));
      applyFilters();
    });

    els.filterToggle.addEventListener("click", () => {
      const open = !document.body.classList.contains("filter-open");
      document.body.classList.toggle("filter-open", open);
      els.filterToggle.setAttribute("aria-expanded", String(open));
    });
    $("#closeFilterButton").addEventListener("click", closeFilters);
    document.addEventListener("click", event => {
      if (document.body.classList.contains("filter-open") && event.target === document.body) closeFilters();
    });

    els.productGrid.addEventListener("click", handleProductGridClick);
    els.productGrid.addEventListener("change", handleProductGridChange);
    els.productGrid.addEventListener("keydown", event => {
      if ((event.key === "Enter" || event.key === " ") && event.target.matches("[data-open-product]")) {
        event.preventDefault();
        openProduct(event.target.dataset.openProduct);
      }
    });
    els.activeFilters.addEventListener("click", handleActiveFilterClick);
    els.categoryCards.addEventListener("click", event => {
      const card = event.target.closest("[data-category]");
      if (card) setCategory(card.dataset.category || "");
    });

    $$('[data-close-modal]').forEach(node => node.addEventListener("click", closeProductModal));
    $$('[data-close-compare]').forEach(node => node.addEventListener("click", closeCompareModal));
    $$('[data-close-image-lightbox]').forEach(node => node.addEventListener("click", closeImageLightbox));
    els.imageLightboxImage?.addEventListener("click", () => {
      els.imageLightbox.classList.toggle("zoomed");
    });
    $("#compareBarOpenButton").addEventListener("click", openCompareModal);
    els.compareOpenButton.addEventListener("click", openCompareModal);
    $("#clearCompareButton").addEventListener("click", clearCompare);
    els.compareTableWrap.addEventListener("click", event => {
      const removeButton = event.target.closest("[data-remove-compare]");
      if (removeButton) {
        toggleCompare(removeButton.dataset.removeCompare, false);
        renderCompareTable();
      }
    });

    document.addEventListener("keydown", event => {
      if (event.key === "Escape") {
        if (!els.imageLightbox.hidden) closeImageLightbox();
        else if (!els.productModal.hidden) closeProductModal();
        else if (!els.compareModal.hidden) closeCompareModal();
        else closeFilters();
      }
    });
    window.addEventListener("hashchange", openProductFromHash);
  }

  function fillSelect(select, entries) {
    entries.forEach(entry => {
      const option = document.createElement("option");
      option.value = entry.name;
      option.textContent = `${entry.name}（${entry.count}）`;
      select.append(option);
    });
  }

  function renderCategoryCards() {
    els.categoryCards.innerHTML = data.meta.categories.map((entry, index) => `
      <button class="category-card" type="button" role="listitem" data-category="${escapeAttr(entry.name)}" data-texture="${index % 8}">
        <b aria-hidden="true">↗</b>
        <h3>${escapeHtml(entry.name)}</h3>
        <span>${formatNumber(entry.count)} 款在售产品</span>
      </button>
    `).join("");
  }

  function applyFilters() {
    const searchTokens = normalize(state.search).split(/\s+/).filter(Boolean);
    filteredProducts = products.filter(product => {
      if (state.category && product.category !== state.category) return false;
      if (state.tier && product.tier !== state.tier) return false;
      if (state.type && product.salesToolType !== state.type) return false;
      if (state.stock === "yes" && !product.hasStock) return false;
      if (state.stock === "no" && product.hasStock) return false;
      if (state.favoritesOnly && !state.favorites.has(product.uid)) return false;
      if (state.price && !matchesPrice(product.foreignPrice, state.price)) return false;
      if (searchTokens.length) {
        const haystack = normalize([
          product.code, product.name, product.salesNameCn, product.salesNameEn,
          product.category, product.tier, product.greyCommonName, product.greyName,
          product.backing1, product.patternCode, product.colorMethod,
          product.recommendedMarkets, product.sellingPoints,
        ].filter(Boolean).join(" "));
        if (!searchTokens.every(token => haystack.includes(token))) return false;
      }
      return true;
    });

    sortProducts(filteredProducts, state.sort);
    renderActiveFilters();
    renderProducts();
  }

  function renderProducts() {
    const visibleProducts = filteredProducts.slice(0, state.visible);
    els.productGrid.innerHTML = visibleProducts.map(renderProductCard).join("");
    els.resultSummary.textContent = `共找到 ${formatNumber(filteredProducts.length)} 款产品，当前显示 ${formatNumber(visibleProducts.length)} 款`;
    els.emptyState.hidden = filteredProducts.length !== 0;
    els.loadMoreButton.hidden = visibleProducts.length >= filteredProducts.length || filteredProducts.length === 0;
    updateCompareUI();
  }

  function renderProductCard(product) {
    const isFavorite = state.favorites.has(product.uid);
    const isCompared = state.compare.has(product.uid);
    const title = product.salesNameCn && product.salesNameCn !== "/" ? product.salesNameCn : product.name;
    const subtitle = product.salesNameEn && product.salesNameEn !== "/" ? product.salesNameEn : product.greyCommonName || product.greyName || "—";
    return `
      <article class="product-card" data-uid="${escapeAttr(product.uid)}">
        <div class="card-media" data-open-product="${escapeAttr(product.uid)}" tabindex="0" role="button" aria-label="查看 ${escapeAttr(title)} 详情">
          ${renderMedia(product)}
          <div class="media-badges">
            <span class="badge">${escapeHtml(product.category)}</span>
            ${product.hasStock ? '<span class="badge stock">有现货</span>' : ''}
          </div>
          <div class="card-actions-top">
            <button class="card-circle-button ${isFavorite ? "active" : ""}" type="button" data-favorite="${escapeAttr(product.uid)}" aria-label="${isFavorite ? "取消收藏" : "收藏"}" aria-pressed="${isFavorite}">${isFavorite ? "♥" : "♡"}</button>
          </div>
        </div>
        <div class="card-body">
          <div class="card-meta"><span>${escapeHtml(product.code)}</span><span>${escapeHtml(product.tier)}</span></div>
          <h3>${escapeHtml(title)}</h3>
          <p class="card-subtitle" title="${escapeAttr(subtitle)}">${escapeHtml(subtitle)}</p>
          <div class="card-specs">
            <div><span>克重</span><strong>${formatSpec(product.weight, "g/㎡")}</strong></div>
            <div><span>门幅</span><strong>${formatSpec(product.width, "cm")}</strong></div>
            <div><span>上色</span><strong title="${escapeAttr(product.colorMethod || "—")}">${escapeHtml(product.colorMethod || "—")}</strong></div>
            <div><span>底布1</span><strong title="${escapeAttr(product.backing1 || "—")}">${escapeHtml(product.backing1 || "—")}</strong></div>
          </div>
          <div class="price-row">
            <div class="price-block">
              <small>参考外贸价 / 米</small>
              <strong>${formatUsd(product.foreignPrice)}</strong>
              <span class="price-mask">••••</span>
            </div>
            <div class="price-block">
              <small>参考内贸价 / 米</small>
              <strong>${formatCny(product.domesticPrice)}</strong>
              <span class="price-mask">••••</span>
            </div>
            <button class="details-button" type="button" data-open-product="${escapeAttr(product.uid)}">查看详情 →</button>
          </div>
          <label class="compare-check"><input type="checkbox" data-compare="${escapeAttr(product.uid)}" ${isCompared ? "checked" : ""}>加入产品对比</label>
        </div>
      </article>
    `;
  }

  function renderMedia(product, detail = false) {
    if (product.image) {
      const imageAlt = `${product.code} 产品实拍图`;
      if (detail) {
        return `<button class="detail-image-button" type="button" data-open-image-viewer data-image-src="${escapeAttr(product.image)}" data-image-alt="${escapeAttr(imageAlt)}" aria-label="点击查看 ${escapeAttr(product.code)} 产品大图">
          <img src="${escapeAttr(product.image)}" alt="${escapeAttr(imageAlt)}" loading="lazy">
          <span class="detail-image-hint" aria-hidden="true">⌕ 点击查看大图</span>
        </button>`;
      }
      return `<img src="${escapeAttr(product.image)}" alt="${escapeAttr(imageAlt)}" loading="lazy">`;
    }
    const hue = (product.textureIndex * 29 + 18) % 360;
    return `<div class="texture" data-pattern="${product.textureIndex}" style="--hue:${hue}"></div>`;
  }

  function handleProductGridClick(event) {
    const favoriteButton = event.target.closest("[data-favorite]");
    if (favoriteButton) {
      event.stopPropagation();
      toggleFavorite(favoriteButton.dataset.favorite);
      return;
    }
    const openButton = event.target.closest("[data-open-product]");
    if (openButton) openProduct(openButton.dataset.openProduct);
  }

  function handleProductGridChange(event) {
    const checkbox = event.target.closest("[data-compare]");
    if (checkbox) toggleCompare(checkbox.dataset.compare, checkbox.checked);
  }

  function toggleFavorite(uid) {
    if (state.favorites.has(uid)) {
      state.favorites.delete(uid);
      showToast("已取消收藏");
    } else {
      state.favorites.add(uid);
      showToast("已加入收藏");
    }
    writeStorage("haihongFavorites", state.favorites);
    applyFilters();
  }

  function toggleCompare(uid, force) {
    const shouldAdd = typeof force === "boolean" ? force : !state.compare.has(uid);
    if (shouldAdd && !state.compare.has(uid)) {
      if (state.compare.size >= 4) {
        showToast("最多同时对比 4 款产品");
        renderProducts();
        return;
      }
      state.compare.add(uid);
      showToast("已加入产品对比");
    } else if (!shouldAdd) {
      state.compare.delete(uid);
    }
    writeStorage("haihongCompare", state.compare);
    updateCompareUI();
    $$("[data-compare]").forEach(input => input.checked = state.compare.has(input.dataset.compare));
  }

  function updateCompareUI() {
    const count = state.compare.size;
    els.compareCount.textContent = count;
    els.compareBarCount.textContent = count;
    els.compareOpenButton.disabled = count < 2;
    els.compareBar.hidden = count === 0;
  }

  function clearCompare() {
    state.compare.clear();
    writeStorage("haihongCompare", state.compare);
    updateCompareUI();
    renderProducts();
    if (!els.compareModal.hidden) closeCompareModal();
  }

  function openProduct(uid, updateHash = true) {
    const product = productMap.get(uid);
    if (!product) return;
    lastFocusedElement = document.activeElement;
    els.productModalContent.innerHTML = renderProductDetail(product);
    els.productModal.hidden = false;
    document.body.classList.add("modal-open");
    if (updateHash) history.replaceState(null, "", `#product=${encodeURIComponent(uid)}`);
    const closeButton = $("[data-close-modal]", els.productModal);
    closeButton?.focus();

    $("[data-detail-favorite]", els.productModal)?.addEventListener("click", () => {
      toggleFavorite(uid);
      els.productModalContent.innerHTML = renderProductDetail(product);
      openProduct(uid, false);
    }, { once: true });
    $("[data-detail-compare]", els.productModal)?.addEventListener("click", () => {
      toggleCompare(uid);
      els.productModalContent.innerHTML = renderProductDetail(product);
      openProduct(uid, false);
    }, { once: true });
    $("[data-print-product]", els.productModal)?.addEventListener("click", () => window.print());
    $("[data-open-image-viewer]", els.productModal)?.addEventListener("click", event => {
      const button = event.currentTarget;
      openImageLightbox(button.dataset.imageSrc, button.dataset.imageAlt);
    });
  }

  function renderProductDetail(product) {
    const title = product.salesNameCn && product.salesNameCn !== "/" ? product.salesNameCn : product.name;
    const favorite = state.favorites.has(product.uid);
    const compared = state.compare.has(product.uid);

    // 详情页固定展示全部字段；空值统一显示“-”，不再隐藏字段。
    const specs = [
      ["产品编码", detailValue(product.code)],
      ["产品品种", detailValue(product.name)],
      ["中文销售名称", detailValue(product.salesNameCn)],
      ["英文销售名称", detailValue(product.salesNameEn)],
      ["销售工具类型", detailValue(product.salesToolType)],
      ["一级系列", detailValue(product.category)],
      ["品质定位", detailValue(product.tier)],
      ["花型对应编号", detailValue(product.patternCode)],
      ["产品克重", detailSpec(product.weight, "g/㎡")],
      ["产品门幅", detailSpec(product.width, "cm")],
      ["色坯俗称", detailValue(product.greyCommonName)],
      ["色坯品种", detailValue(product.greyName)],
      ["色坯克重", detailSpec(product.greyWeight, "g/㎡")],
      ["色坯门幅", detailSpec(product.greyWidth, "cm")],
      ["底布材料 1", detailValue(product.backing1)],
      ["底布材料 2", detailValue(product.backing2)],
      ["其他底布推荐", detailValue(product.alternativeBacking)],
      ["后整理制程", detailValue(product.finishing)],
      ["后整理明细", detailValue(product.finishingDetail)],
      ["产品质量标准", detailValue(product.qualityStandard)],
      ["色坯质量等级", detailValue(product.greyQuality)],
      ["染整特殊处理", detailValue(product.specialTreatment)],
      ["卷长", detailMeters(product.rollMeters)],
      ["开发时间", detailValue(product.developmentDate)],
      ["产品 MOQ", detailMeters(product.moq)],
      ["颜色 MCQ", detailMeters(product.mcq)],
      ["颜色 SCQ", detailMeters(product.scq)],
      ["现货 / 备货", product.hasStock ? "是" : "否"],
      ["现货状态", detailValue(product.stockStatus)],
      ["项目类型", detailValue(product.projectType)],
      ["上色方式", detailValue(product.colorMethod)],
    ];

    const sellingFields = [
      ["产品卖点", detailValue(product.sellingPoints)],
      ["色坯卖点", detailValue(product.greySellingPoints)],
      ["推荐销售市场", detailValue(product.recommendedMarkets)],
      ["限制销售市场", detailValue(product.restrictedMarkets)],
      ["热销颜色", detailValue(product.hotColors)],
      ["趋势颜色", detailValue(product.trendColors)],
    ];

    return `
      <div class="product-detail-hero">
        <div class="detail-media">${renderMedia(product, true)}</div>
        <div class="detail-main">
          <p class="eyebrow">${escapeHtml(product.categoryRaw)}</p>
          <h2 id="productModalTitle">${escapeHtml(title)}</h2>
          <p class="detail-code">${escapeHtml(product.code)} · ${escapeHtml(product.name)}</p>
          <div class="detail-tags">
            <span>${escapeHtml(product.tier)}</span>
            <span>${escapeHtml(product.salesToolType)}</span>
            ${product.hasStock ? '<span>有现货/备货</span>' : ''}
            ${product.imageIsReal ? '<span>含实拍图</span>' : '<span>暂无实拍图</span>'}
          </div>
          <div class="detail-price">
            <small>参考价格（以最终报价为准）</small>
            <strong>${formatUsd(product.foreignPrice)} / m · ${formatCny(product.domesticPrice)} / m</strong>
            <span class="price-mask">••••••••</span>
          </div>
          <div class="detail-metrics">
            <div><span>产品克重</span><strong>${formatSpec(product.weight, "g/㎡")}</strong></div>
            <div><span>产品门幅</span><strong>${formatSpec(product.width, "cm")}</strong></div>
            <div><span>色坯克重</span><strong>${formatSpec(product.greyWeight, "g/㎡")}</strong></div>
            <div><span>色坯门幅</span><strong>${formatSpec(product.greyWidth, "cm")}</strong></div>
          </div>
          <div class="detail-actions">
            <button class="primary-button compact" type="button" data-detail-favorite>${favorite ? "取消收藏" : "加入收藏"}</button>
            <button class="outline-button" type="button" data-detail-compare>${compared ? "移出对比" : "加入对比"}</button>
            <button class="outline-button" type="button" data-print-product>打印 / 保存 PDF</button>
          </div>
        </div>
      </div>
      <div class="detail-sections">
        <section class="detail-section">
          <h3>产品规格与工艺</h3>
          <dl class="spec-grid">${renderDetailGrid(specs)}</dl>
        </section>
        <section class="detail-section">
          <h3>产品卖点</h3>
          <dl class="spec-grid selling-point-grid">${renderDetailGrid(sellingFields)}</dl>
        </section>
      </div>
    `;
  }

  function detailValue(value) {
    if (value === null || value === undefined) return "-";
    const text = String(value).trim();
    return !text || text === "/" || text === "—" ? "-" : text;
  }

  function detailSpec(value, unit) {
    const text = detailValue(value);
    return text === "-" ? "-" : `${text}${unit}`;
  }

  function detailMeters(value) {
    const text = detailValue(value);
    if (text === "-") return "-";
    return /(?:米|m)/i.test(text) ? text : `${text} m`;
  }

  function renderDetailGrid(rows) {
    return rows.map(([label, value]) => `<div class="spec-item"><dt>${escapeHtml(label)}</dt><dd>${escapeHtml(detailValue(value))}</dd></div>`).join("");
  }

  function renderLongDetailSection(title, value) {
    if (!value) return "";
    return `<section class="detail-section"><h3>${escapeHtml(title)}</h3><p class="long-copy">${escapeHtml(value)}</p></section>`;
  }

  function openImageLightbox(src, alt) {
    if (!src || !els.imageLightbox) return;
    els.imageLightboxImage.src = src;
    els.imageLightboxImage.alt = alt || "产品图片大图";
    els.imageLightboxCaption.textContent = alt || "产品图片大图";
    els.imageLightbox.classList.remove("zoomed");
    els.imageLightbox.hidden = false;
    els.imageLightbox.setAttribute("aria-hidden", "false");
    $("[data-close-image-lightbox]", els.imageLightbox)?.focus();
  }

  function closeImageLightbox() {
    if (!els.imageLightbox || els.imageLightbox.hidden) return;
    els.imageLightbox.hidden = true;
    els.imageLightbox.setAttribute("aria-hidden", "true");
    els.imageLightbox.classList.remove("zoomed");
    els.imageLightboxImage.removeAttribute("src");
  }

  function closeProductModal() {
    if (!els.imageLightbox.hidden) closeImageLightbox();
    if (els.productModal.hidden) return;
    els.productModal.hidden = true;
    document.body.classList.remove("modal-open");
    if (location.hash.startsWith("#product=")) {
      try { history.replaceState(null, "", location.href.split("#")[0]); } catch { /* 非标准预览环境可忽略 */ }
    }
    lastFocusedElement?.focus?.();
  }

  function openProductFromHash() {
    const match = location.hash.match(/^#product=(.+)$/);
    if (!match) return;
    const uid = decodeURIComponent(match[1]);
    if (productMap.has(uid)) openProduct(uid, false);
  }

  function openCompareModal() {
    if (state.compare.size < 2) {
      showToast("请至少选择 2 款产品");
      return;
    }
    lastFocusedElement = document.activeElement;
    renderCompareTable();
    els.compareModal.hidden = false;
    document.body.classList.add("modal-open");
    $("[data-close-compare]", els.compareModal)?.focus();
  }

  function renderCompareTable() {
    const selected = [...state.compare].map(uid => productMap.get(uid)).filter(Boolean);
    if (selected.length < 2) {
      closeCompareModal();
      return;
    }
    const rows = [
      ["产品编码", p => p.code], ["产品品种", p => p.name], ["一级系列", p => p.category], ["品质定位", p => p.tier],
      ["销售工具", p => p.salesToolType], ["产品克重", p => formatSpec(p.weight, "g/㎡")], ["产品门幅", p => formatSpec(p.width, "cm")],
      ["色坯品种", p => p.greyName || "—"], ["色坯克重", p => formatSpec(p.greyWeight, "g/㎡")], ["色坯门幅", p => formatSpec(p.greyWidth, "cm")],
      ["底布材料", p => p.backing1 || "—"], ["上色方式", p => p.colorMethod || "—"],
      ["产品 MOQ", p => p.moq ? `${p.moq} m` : "—"], ["颜色 MCQ", p => p.mcq ? `${p.mcq} m` : "—"],
      ["参考外贸价", p => state.pricesVisible ? formatUsd(p.foreignPrice) : "••••"], ["参考内贸价", p => state.pricesVisible ? formatCny(p.domesticPrice) : "••••"],
      ["现货状态", p => p.stockStatus || "未标记"], ["推荐市场", p => p.recommendedMarkets || "—"],
    ];
    els.compareTableWrap.innerHTML = `
      <table class="compare-table">
        <thead><tr><th>对比项目</th>${selected.map(product => `<th><div class="compare-product-title"><strong>${escapeHtml(product.salesNameCn || product.name)}</strong><span>${escapeHtml(product.code)}</span><button class="compare-remove" type="button" data-remove-compare="${escapeAttr(product.uid)}">移除此产品</button></div></th>`).join("")}</tr></thead>
        <tbody>${rows.map(([label, getter]) => `<tr><td>${escapeHtml(label)}</td>${selected.map(product => `<td>${escapeHtml(String(getter(product)))}</td>`).join("")}</tr>`).join("")}</tbody>
      </table>`;
  }

  function closeCompareModal() {
    if (els.compareModal.hidden) return;
    els.compareModal.hidden = true;
    document.body.classList.remove("modal-open");
    lastFocusedElement?.focus?.();
  }

  function renderActiveFilters() {
    const filters = [];
    if (state.search) filters.push(["search", `搜索：${state.search}`]);
    if (state.category) filters.push(["category", state.category]);
    if (state.tier) filters.push(["tier", state.tier]);
    if (state.type) filters.push(["type", state.type]);
    if (state.price) filters.push(["price", `价格：${els.priceSelect.selectedOptions[0].textContent}`]);
    if (state.stock) filters.push(["stock", els.stockSelect.selectedOptions[0].textContent]);
    if (state.favoritesOnly) filters.push(["favoritesOnly", `收藏产品（${state.favorites.size}）`]);
    els.activeFilters.innerHTML = filters.map(([key, label]) => `<span class="filter-chip">${escapeHtml(label)}<button type="button" data-clear-filter="${key}" aria-label="移除此筛选">×</button></span>`).join("");
  }

  function handleActiveFilterClick(event) {
    const button = event.target.closest("[data-clear-filter]");
    if (!button) return;
    const key = button.dataset.clearFilter;
    if (key === "search") {
      state.search = "";
      els.searchInput.value = "";
    } else if (key === "favoritesOnly") {
      state.favoritesOnly = false;
      els.favoriteFilterButton.setAttribute("aria-pressed", "false");
    } else {
      state[key] = "";
      const select = ({ category: els.categorySelect, tier: els.tierSelect, type: els.typeSelect, price: els.priceSelect, stock: els.stockSelect })[key];
      if (select) select.value = "";
    }
    state.visible = 24;
    applyFilters();
  }

  function setCategory(category) {
    state.category = category;
    els.categorySelect.value = category;
    state.visible = 24;
    applyFilters();
    document.querySelector("#catalog")?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function resetFilters() {
    Object.assign(state, { search: "", category: "", tier: "", type: "", price: "", stock: "", sort: "default", favoritesOnly: false, visible: 24 });
    els.searchInput.value = "";
    [els.categorySelect, els.tierSelect, els.typeSelect, els.priceSelect, els.stockSelect].forEach(select => select.value = "");
    els.sortSelect.value = "default";
    els.favoriteFilterButton.setAttribute("aria-pressed", "false");
    applyFilters();
    closeFilters();
  }

  function closeFilters() {
    document.body.classList.remove("filter-open");
    els.filterToggle.setAttribute("aria-expanded", "false");
  }

  function setPriceVisibility(visible, notify = true) {
    state.pricesVisible = visible;
    document.body.classList.toggle("show-prices", visible);
    els.priceToggle.setAttribute("aria-pressed", String(visible));
    els.priceToggle.querySelector("span:last-child").textContent = visible ? "隐藏参考价" : "显示参考价";
    els.heroPriceToggle.textContent = visible ? "隐藏参考价格" : "查看参考价格";
    localStorage.setItem("haihongPricesVisible", String(visible));
    if (!els.compareModal.hidden) renderCompareTable();
    if (notify) showToast(visible ? "参考价格已显示" : "参考价格已隐藏");
  }

  function matchesPrice(price, range) {
    if (price == null) return false;
    const [min, max] = range.split("-").map(Number);
    if (range === "0-1") return price <= 1;
    if (range === "2.5-999") return price >= 2.5;
    return price > min && price <= max;
  }

  function sortProducts(list, mode) {
    const textSort = (a, b) => String(a || "").localeCompare(String(b || ""), "zh-CN", { numeric: true });
    if (mode === "code-asc") list.sort((a, b) => textSort(a.code, b.code));
    if (mode === "price-asc") list.sort((a, b) => (a.foreignPrice ?? Infinity) - (b.foreignPrice ?? Infinity));
    if (mode === "price-desc") list.sort((a, b) => (b.foreignPrice ?? -Infinity) - (a.foreignPrice ?? -Infinity));
    if (mode === "weight-desc") list.sort((a, b) => (b.weight ?? -Infinity) - (a.weight ?? -Infinity));
    if (mode === "newest") list.sort((a, b) => String(b.developmentDate || "").localeCompare(String(a.developmentDate || "")));
  }

  function sanitizeStoredSelections() {
    state.favorites = new Set([...state.favorites].filter(uid => productMap.has(uid)));
    state.compare = new Set([...state.compare].filter(uid => productMap.has(uid)).slice(0, 4));
    writeStorage("haihongFavorites", state.favorites);
    writeStorage("haihongCompare", state.compare);
  }

  function readStorage(key) {
    try {
      const value = JSON.parse(localStorage.getItem(key) || "[]");
      return Array.isArray(value) ? value : [];
    } catch {
      return [];
    }
  }

  function writeStorage(key, set) {
    localStorage.setItem(key, JSON.stringify([...set]));
  }

  function showToast(message) {
    els.toast.textContent = message;
    els.toast.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => els.toast.classList.remove("show"), 1800);
  }

  function formatNumber(value) {
    return new Intl.NumberFormat("zh-CN").format(value ?? 0);
  }

  function formatUsd(value) {
    return value == null ? "面议" : new Intl.NumberFormat("zh-CN", { style: "currency", currency: "USD", minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value);
  }

  function formatCny(value) {
    return value == null ? "面议" : new Intl.NumberFormat("zh-CN", { style: "currency", currency: "CNY", minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value);
  }

  function formatSpec(value, unit) {
    return value == null ? "—" : `${value}${unit}`;
  }

  function normalize(value) {
    return String(value || "").toLowerCase().replace(/[，、,;；/\\()（）\-]+/g, " ").replace(/\s+/g, " ").trim();
  }

  function escapeHtml(value) {
    return String(value ?? "").replace(/[&<>'"]/g, character => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" })[character]);
  }

  function escapeAttr(value) {
    return escapeHtml(value).replace(/`/g, "&#96;");
  }
})();
