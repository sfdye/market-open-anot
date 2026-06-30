(function () {
  'use strict';

  var STORAGE_KEY = 'moa_install_dismissed';
  var deferredPrompt = null;

  function isStandalone() {
    return window.matchMedia('(display-mode: standalone)').matches ||
      navigator.standalone === true;
  }

  function isIOS() {
    return /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
  }

  function isAndroid() {
    return /Android/.test(navigator.userAgent);
  }

  function getPlatform() {
    if (isIOS()) return 'ios';
    return 'android';
  }

  function wasDismissed() {
    return localStorage.getItem(STORAGE_KEY) === 'true';
  }

  function dismiss() {
    localStorage.setItem(STORAGE_KEY, 'true');
    hide();
  }

  function hide() {
    document.getElementById('install-prompt').classList.add('hidden');
  }

  function show() {
    document.getElementById('install-prompt').classList.remove('hidden');
  }

  function getLang() {
    return localStorage.getItem('moa_lang') || 'en';
  }

  function renderSteps(container, steps) {
    for (var i = 0; i < steps.length; i++) {
      var step = document.createElement('div');
      step.className = 'install-step';
      step.innerHTML = '<span class="install-step-num">' + (i + 1) + '</span><span>' + steps[i] + '</span>';
      container.appendChild(step);
    }
  }

  function render() {
    var lang = getLang();
    var platform = getPlatform();
    var promptEl = document.getElementById('install-prompt');
    var titleEl = document.getElementById('install-title');
    var descEl = document.getElementById('install-desc');
    var stepsEl = document.getElementById('install-steps');
    var actionBtn = document.getElementById('install-action-btn');
    var dismissBtn = document.getElementById('install-dismiss-btn');

    promptEl.className = 'install-prompt install-' + platform;

    if (lang === 'zh') {
      titleEl.textContent = '添加到主屏幕';
      descEl.textContent = '安装此应用，快速访问并获得全屏体验。';
      dismissBtn.textContent = '以后再说';
    } else {
      titleEl.textContent = 'Add to Home Screen';
      descEl.textContent = 'Install this app for quick access and a full-screen experience.';
      dismissBtn.textContent = 'Not now';
    }

    stepsEl.innerHTML = '';

    if (deferredPrompt) {
      actionBtn.textContent = lang === 'zh' ? '安装' : 'Install';
      actionBtn.classList.remove('hidden');
    } else if (platform === 'ios') {
      actionBtn.classList.add('hidden');
      var shareIcon = '<svg style="display:inline-block;vertical-align:middle;width:1em;height:1em" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 12v7a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-7"/><polyline points="16 6 12 2 8 6"/><line x1="12" y1="2" x2="12" y2="15"/></svg>';
      var iosSteps = lang === 'zh'
        ? ['点击底部的「分享」按钮 ' + shareIcon, '向下滑动，点击「添加到主屏幕」']
        : ['Tap the Share button ' + shareIcon + ' at the bottom', 'Scroll down and tap "Add to Home Screen"'];
      renderSteps(stepsEl, iosSteps);
    } else {
      actionBtn.textContent = lang === 'zh' ? '安装' : 'Install';
      actionBtn.classList.remove('hidden');
      var androidSteps = lang === 'zh'
        ? ['点击浏览器菜单 ⋮', '选择「添加到主屏幕」']
        : ['Tap the browser menu ⋮', 'Select "Add to Home screen"'];
      renderSteps(stepsEl, androidSteps);
    }
  }

  function shouldShowPrompt() {
    return !isStandalone() && !wasDismissed();
  }

  function showInstallPrompt() {
    if (!shouldShowPrompt()) return;
    render();
    show();
  }

  // Capture Chrome/Edge install prompt
  window.addEventListener('beforeinstallprompt', function (e) {
    e.preventDefault();
    deferredPrompt = e;
  });

  // Wire up buttons once DOM is ready
  function init() {
    document.getElementById('install-action-btn').addEventListener('click', function () {
      if (deferredPrompt) {
        deferredPrompt.prompt();
        deferredPrompt.userChoice.then(function () {
          deferredPrompt = null;
          dismiss();
        });
      } else {
        dismiss();
      }
    });

    document.getElementById('install-dismiss-btn').addEventListener('click', dismiss);
    document.querySelector('.install-backdrop').addEventListener('click', dismiss);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  window.InstallPrompt = {
    show: showInstallPrompt,
  };
})();
