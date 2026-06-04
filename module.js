(function() {
  'use strict';

  function lunioCcfInit() {
    var state = {
      budget: null,
      platform: null, platformCtaName: null, platformContextName: null, platformRate: null,
      industry: null, industryRate: null,
      cpc: null, cpcAutoFilled: false
    };

    function $(id) { return document.getElementById(id); }
    function $$(selector, parent) { return (parent || document).querySelectorAll(selector); }
    function formatInt(n) { return Math.round(n).toLocaleString('en-US'); }
    function formatCurrency(n) { return '$' + Math.round(n).toLocaleString('en-US'); }

    function formatCurrencyCompact(n) {
      if (n >= 1000000) return '$' + (n / 1000000).toFixed(n >= 10000000 ? 0 : 1).replace(/\.0$/, '') + 'M';
      if (n >= 1000) return '$' + Math.round(n / 1000) + 'k';
      return '$' + Math.round(n);
    }

    function pushDataLayer(event, data) {
      if (typeof window !== 'undefined' && window.dataLayer) {
        window.dataLayer.push(Object.assign({ event: event, calculatorType: 'click_fraud_cost' }, data || {}));
      }
    }

    function goToStep(stepNumber) {
      $$('.lunio-ccf-step').forEach(function(s) { s.classList.remove('lunio-ccf-step-active'); });
      document.querySelector('.lunio-ccf-step[data-step="' + stepNumber + '"]').classList.add('lunio-ccf-step-active');
      $$('.lunio-ccf-progress-segment').forEach(function(seg) {
        var segNum = parseInt(seg.getAttribute('data-segment'), 10);
        seg.classList.remove('lunio-ccf-active', 'lunio-ccf-completed');
        if (segNum < stepNumber) seg.classList.add('lunio-ccf-completed');
        if (segNum === stepNumber) seg.classList.add('lunio-ccf-active');
      });

      var intro = document.getElementById('lunio-ccf-intro');
      if (intro) {
        if (stepNumber === 1) intro.classList.remove('lunio-ccf-intro-collapsed');
        else intro.classList.add('lunio-ccf-intro-collapsed');
      }

      document.getElementById('lunio-ccf-calculator').scrollIntoView({ behavior: 'smooth', block: 'start' });
    }

    // ---------- STEP 1 ----------
    var budgetInput = $('lunio-ccf-budget');
    var budgetLabel = $('lunio-ccf-budget-label');
    var platformGrid = $('lunio-ccf-platform-grid');
    var next1 = $('lunio-ccf-next-1');
    if (!budgetInput || !platformGrid || !next1) return; // Guard: HTML module not loaded

    function validateStep1() { next1.disabled = !(state.budget && state.budget > 0 && state.platform); }

    budgetInput.addEventListener('input', function(e) {
      state.budget = parseFloat(e.target.value) || null;
      validateStep1();
    });

    platformGrid.addEventListener('click', function(e) {
      var card = e.target.closest('.lunio-ccf-card');
      if (!card) return;
      $$('.lunio-ccf-card', platformGrid).forEach(function(c) { c.classList.remove('lunio-ccf-selected'); });
      card.classList.add('lunio-ccf-selected');
      state.platform = card.getAttribute('data-platform');
      state.platformCtaName = card.getAttribute('data-cta-name');
      state.platformContextName = card.getAttribute('data-context-name');
      state.platformRate = parseFloat(card.getAttribute('data-rate'));
      if (budgetLabel) {
        budgetLabel.textContent = 'Monthly ad spend on ' + state.platformCtaName;
      }
      validateStep1();
    });

    next1.addEventListener('click', function() {
      pushDataLayer('calculator_step_complete', { step: 1, budget: state.budget, platform: state.platform });
      goToStep(2);
    });

    // ---------- STEP 2 ----------
    var industryGrid = $('lunio-ccf-industry-grid');
    var cpcInput = $('lunio-ccf-cpc');
    var next2 = $('lunio-ccf-next-2');
    var back2 = $('lunio-ccf-back-2');

    function validateStep2() { next2.disabled = !(state.industry && state.cpc && state.cpc > 0); }

    industryGrid.addEventListener('click', function(e) {
      var card = e.target.closest('.lunio-ccf-card');
      if (!card) return;
      $$('.lunio-ccf-card', industryGrid).forEach(function(c) { c.classList.remove('lunio-ccf-selected'); });
      card.classList.add('lunio-ccf-selected');
      state.industry = card.getAttribute('data-industry');
      state.industryRate = parseFloat(card.getAttribute('data-rate'));

      var suggestedCpc = parseFloat(card.getAttribute('data-cpc'));
      if (!cpcInput.value || state.cpcAutoFilled) {
        cpcInput.value = suggestedCpc.toFixed(2);
        state.cpc = suggestedCpc;
        state.cpcAutoFilled = true;
      }
      validateStep2();
    });

    cpcInput.addEventListener('input', function(e) {
      state.cpc = parseFloat(e.target.value) || null;
      state.cpcAutoFilled = false;
      validateStep2();
    });

    back2.addEventListener('click', function() { goToStep(1); });

    next2.addEventListener('click', function() {
      pushDataLayer('calculator_step_complete', { step: 2, industry: state.industry, cpc: state.cpc });
      calculate();
      goToStep(3);
    });

    // ---------- STEP 3: CALCULATE & RENDER ----------
    function calculate() {
      var combinedIvt = (state.platformRate + state.industryRate) / 2;
      var combinedIvtDecimal = combinedIvt / 100;

      var monthlyClicks = state.budget / state.cpc;
      var monthlyInvalidClicks = monthlyClicks * combinedIvtDecimal;
      var annualInvalidClicks = monthlyInvalidClicks * 12;

      var monthlyWaste = state.budget * combinedIvtDecimal;
      var annualWaste = monthlyWaste * 12;

      var roasMultiplier = 3;
      var annualLostRevenue = annualWaste * roasMultiplier;
      var monthlyLostRevenue = annualLostRevenue / 12;
      var dailyLostRevenue = annualLostRevenue / 365;

      var annualSpend = state.budget * 12;

      var tempDiv = document.createElement('div');
      tempDiv.innerHTML = state.industry;
      var industryClean = tempDiv.textContent || tempDiv.innerText || state.industry;

      $('lunio-ccf-ctx-industry').textContent = industryClean;
      $('lunio-ccf-ctx-platform').textContent = state.platformContextName;
      $('lunio-ccf-ctx-spend').textContent = formatCurrencyCompact(annualSpend);

      $('lunio-ccf-hero-loss').textContent = formatCurrency(annualLostRevenue);
      $('lunio-ccf-monthly-loss').textContent = formatCurrency(monthlyLostRevenue) + ' every month';
      $('lunio-ccf-daily-loss').textContent = formatCurrency(dailyLostRevenue) + ' every day';

      $('lunio-ccf-stat-clicks').textContent = formatInt(annualInvalidClicks);
      $('lunio-ccf-stat-spend').textContent = formatCurrency(annualWaste);
      $('lunio-ccf-stat-ivt').textContent = combinedIvt.toFixed(2) + '%';

      $('lunio-ccf-cta-platform').textContent = state.platformCtaName;

      pushDataLayer('calculator_result', {
        budget: state.budget,
        platform: state.platform,
        industry: industryClean,
        cpc: state.cpc,
        combined_ivt_rate: combinedIvt,
        annual_waste: Math.round(annualWaste),
        annual_lost_revenue: Math.round(annualLostRevenue),
        annual_invalid_clicks: Math.round(annualInvalidClicks)
      });
    }

    $('lunio-ccf-cta-audit').addEventListener('click', function() {
      pushDataLayer('calculator_cta_click', {
        cta: 'start_free_audit',
        annual_waste: $('lunio-ccf-stat-spend').textContent,
        annual_lost_revenue: $('lunio-ccf-hero-loss').textContent
      });
    });

    $('lunio-ccf-restart').addEventListener('click', function() {
      state = {
        budget: null,
        platform: null, platformCtaName: null, platformContextName: null, platformRate: null,
        industry: null, industryRate: null,
        cpc: null, cpcAutoFilled: false
      };
      budgetInput.value = '';
      cpcInput.value = '';
      if (budgetLabel) budgetLabel.textContent = 'Monthly ad spend on this platform';
      $$('.lunio-ccf-card').forEach(function(c) { c.classList.remove('lunio-ccf-selected'); });
      next1.disabled = true;
      next2.disabled = true;
      pushDataLayer('calculator_restart');
      goToStep(1);
    });
  }

  // HubSpot modules may load the JS before the HTML — wait for DOM if needed.
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', lunioCcfInit);
  } else {
    lunioCcfInit();
  }
})();
