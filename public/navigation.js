/* dashboard-cards.js
 * Controla a visibilidade dos cards do dashboard.
 * Os cards só ficam visíveis quando a seção ativa for o Dashboard.
 * Nas demais seções (Cadastros, Movimentação, Ficha do Funcionário, Baixa de Estoque)
 * os cards são ocultados.
 */

(function () {
  'use strict';

  // Seção considerada como Dashboard (mostra os cards)
  const DASHBOARD_SECTION = 'dashboard';

  // Seções onde os cards devem ficar ocultos
  const HIDDEN_SECTIONS = [
    'cadastros',
    'movimentacao',
    'ficha-funcionario',
    'baixa-estoque'
  ];

  // Classe aplicada aos cards do dashboard
  const CARDS_CLASS = 'dashboard-cards';
  const CARDS_HIDDEN_CLASS = 'dashboard-cards--hidden';

  /**
   * Retorna o container de cards do dashboard.
   * @returns {HTMLElement|null}
   */
  function getCardsContainer() {
    return document.querySelector('.' + CARDS_CLASS);
  }

  /**
   * Mostra os cards do dashboard.
   */
  function showCards() {
    const container = getCardsContainer();
    if (!container) return;

    container.classList.remove(CARDS_HIDDEN_CLASS);
    container.setAttribute('aria-hidden', 'false');
    container.style.display = '';
  }

  /**
   * Esconde os cards do dashboard.
   */
  function hideCards() {
    const container = getCardsContainer();
    if (!container) return;

    container.classList.add(CARDS_HIDDEN_CLASS);
    container.setAttribute('aria-hidden', 'true');
    container.style.display = 'none';
  }

  /**
   * Normaliza o identificador da seção.
   * @param {string} section
   * @returns {string}
   */
  function normalizeSection(section) {
    return String(section || '')
      .trim()
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/\s+/g, '-');
  }

  /**
   * Atualiza a visibilidade dos cards com base na seção ativa.
   * @param {string} section
   */
  function updateCardsVisibility(section) {
    const normalized = normalizeSection(section);

    if (normalized === normalizeSection(DASHBOARD_SECTION)) {
      showCards();
      return;
    }

    if (HIDDEN_SECTIONS.some((item) => normalizeSection(item) === normalized)) {
      hideCards();
      return;
    }

    // Padrão seguro: esconde quando a seção não for o Dashboard
    hideCards();
  }

  /**
   * Identifica a seção ativa a partir de um elemento de navegação.
   * @param {HTMLElement} element
   * @returns {string}
   */
  function getSectionFromElement(element) {
    return (
      element.getAttribute('data-section') ||
      element.getAttribute('href') ||
      element.dataset.section ||
      element.textContent ||
      ''
    );
  }

  /**
   * Extrai apenas o identificador da seção a partir de uma string.
   * Aceita "#cadastros", "cadastros", "Cadastros", etc.
   * @param {string} value
   * @returns {string}
   */
  function extractSection(value) {
    return String(value || '')
      .replace(/^#/, '')
      .trim();
  }

  /**
   * Manipula cliques nos itens de navegação.
   * @param {Event} event
   */
  function handleNavigationClick(event) {
    const target = event.target.closest('[data-section], .nav-item, .menu-item, a[href]');
    if (!target) return;

    const section = extractSection(getSectionFromElement(target));
    if (!section) return;

    updateCardsVisibility(section);
  }

  /**
   * Observa mudanças de seção via hash da URL.
   */
  function handleHashChange() {
    const section = extractSection(window.location.hash);
    if (section) {
      updateCardsVisibility(section);
    }
  }

  /**
   * API pública para alternar a seção manualmente.
   * @param {string} section
   */
  function navigateToSection(section) {
    updateCardsVisibility(section);
  }

  /**
   * Inicializa o controle de visibilidade dos cards.
   */
  function initDashboardCards() {
    document.addEventListener('click', handleNavigationClick);
    window.addEventListener('hashchange', handleHashChange);

    // Estado inicial baseado no hash atual ou no Dashboard por padrão
    const initialSection = extractSection(window.location.hash) || DASHBOARD_SECTION;
    updateCardsVisibility(initialSection);
  }

  // Expõe a API pública
  window.DashboardCards = {
    show: showCards,
    hide: hideCards,
    update: updateCardsVisibility,
    navigate: navigateToSection,
    init: initDashboardCards
  };

  // Inicializa automaticamente quando o DOM estiver pronto
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initDashboardCards);
  } else {
    initDashboardCards();
  }
})();