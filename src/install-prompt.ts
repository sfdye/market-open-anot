import { el } from './dom.ts';

/** The Chromium-only install prompt event, still absent from the DOM lib. */
interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

const STORAGE_KEY = 'moa_install_dismissed';
let deferredPrompt: BeforeInstallPromptEvent | null = null;

function isStandalone(): boolean {
  return window.matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
}

function isIOS(): boolean {
  return /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
}

function getPlatform(): 'ios' | 'android' {
  if (isIOS()) return 'ios';
  return 'android';
}

function wasDismissed(): boolean {
  return localStorage.getItem(STORAGE_KEY) === 'true';
}

function dismiss(): void {
  localStorage.setItem(STORAGE_KEY, 'true');
  hide();
}

function hide(): void {
  el('install-prompt').classList.add('hidden');
}

function show(): void {
  el('install-prompt').classList.remove('hidden');
}

function getLang(): string {
  return localStorage.getItem('moa_lang') || 'en';
}

function renderSteps(container: HTMLElement, steps: string[]): void {
  steps.forEach((text, i) => {
    const step = document.createElement('div');
    step.className = 'install-step';
    step.innerHTML = `<span class="install-step-num">${i + 1}</span><span>${text}</span>`;
    container.appendChild(step);
  });
}

function render(): void {
  const lang = getLang();
  const platform = getPlatform();
  const promptEl = el('install-prompt');
  const titleEl = el('install-title');
  const descEl = el('install-desc');
  const stepsEl = el('install-steps');
  const actionBtn = el('install-action-btn');
  const dismissBtn = el('install-dismiss-btn');

  promptEl.className = `install-prompt install-${platform}`;

  if (lang === 'zh') {
    titleEl.textContent = '添加到主屏幕';
    descEl.textContent = '安装此应用，即可快速访问、获得全屏体验，并开启休市提醒（实验功能）。';
    dismissBtn.textContent = '以后再说';
  } else {
    titleEl.textContent = 'Add to Home Screen';
    descEl.textContent =
      'Install this app for quick access, a full-screen experience, and closure reminders (experimental).';
    dismissBtn.textContent = 'Not now';
  }

  stepsEl.innerHTML = '';

  if (deferredPrompt) {
    actionBtn.textContent = lang === 'zh' ? '安装' : 'Install';
    actionBtn.classList.remove('hidden');
  } else if (platform === 'ios') {
    actionBtn.classList.add('hidden');
    const shareIcon =
      '<svg style="display:inline-block;vertical-align:middle;width:1em;height:1em" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 12v7a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-7"/><polyline points="16 6 12 2 8 6"/><line x1="12" y1="2" x2="12" y2="15"/></svg>';
    const iosSteps =
      lang === 'zh'
        ? [`点击底部的「分享」按钮 ${shareIcon}`, '向下滑动，点击「添加到主屏幕」']
        : [`Tap the Share button ${shareIcon} at the bottom`, 'Scroll down and tap "Add to Home Screen"'];
    renderSteps(stepsEl, iosSteps);
  } else {
    actionBtn.textContent = lang === 'zh' ? '安装' : 'Install';
    actionBtn.classList.remove('hidden');
    const androidSteps =
      lang === 'zh'
        ? ['点击浏览器菜单 ⋮', '选择「添加到主屏幕」']
        : ['Tap the browser menu ⋮', 'Select "Add to Home screen"'];
    renderSteps(stepsEl, androidSteps);
  }
}

function shouldShowPrompt(): boolean {
  return !isStandalone() && !wasDismissed();
}

export function showInstallPrompt(): void {
  if (!shouldShowPrompt()) return;
  render();
  show();
}

// Capture Chrome/Edge install prompt
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferredPrompt = e as BeforeInstallPromptEvent;
});

// Wire up buttons once DOM is ready
function init(): void {
  el('install-action-btn').addEventListener('click', () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      deferredPrompt.userChoice.then(() => {
        deferredPrompt = null;
        dismiss();
      });
    } else {
      dismiss();
    }
  });

  el('install-dismiss-btn').addEventListener('click', dismiss);
  document.querySelector('.install-backdrop')?.addEventListener('click', dismiss);
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
