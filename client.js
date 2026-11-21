/**
 * Default-app chooser Client half: a document-header control, a file context
 * menu action, and one shell-overlay dialog backed by the Host preference
 * routes. The existing native open button reads the preference through the
 * patched Session query and therefore needs no replacement here.
 */
window.__ModuleLoader__.load({
  id: '@local/dsh-open-with-default',
  factory(require) {
    const React = require('react')
    const h = React.createElement
    const { useEffect, useRef, useState, useSyncExternalStore } = React

    const NS = 'open-with-default'
    const PANEL_ID = 'open-with-default'
    const STATE_ROUTE = '/open-with-default/state'
    const SET_ROUTE = '/open-with-default/set'
    const EXT_APPS_ROUTE = '/open-with-default/apps'
    const EXT_SET_ROUTE = '/open-with-default/set-ext'
    const DELETE_ROUTE = '/open-with-default/delete'
    const LIBRARY_ROUTE = '/open-with-default/library'

    const zh = {
      'meta.title': '默认应用选择',
      'meta.description': '在 DSH 内为每种文件类型选择默认打开的应用，不修改 Windows 系统关联。',
      'button.label': '设置默认',
      'button.tooltip': '选择 DSH 打开此类型文件时使用的默认应用',
      'button.current': '默认：{app}',
      'button.system': '默认：系统',
      'button.loading': '默认：…',
      'button.tooltipCurrent': 'DSH 当前默认：{app}。点击更改',
      'button.tooltipSystem': 'DSH 当前跟随 Windows 系统默认。点击更改',
      'panel.label': '打开方式',
      'settings.title': '打开方式',
      'settings.subtitle': '为 DSH 支持的文件类型预设默认应用。只影响 DSH，不修改 Windows 系统关联。',
      'settings.refreshHint': '文件预览的默认按钮会立即刷新；对话中的文件卡片会在重新进入对话后读取新设置。',
      'settings.loading': '正在读取设置…',
      'settings.error': '设置读取失败',
      'settings.retry': '重试',
      'settings.current': 'DSH 打开偏好',
      'settings.system': '跟随系统默认',
      'settings.change': '更改',
      'settings.choose': '选择应用',
      'settings.clear': '取消设置',
      'settings.clearRule': '取消 {ext} 的默认设置',
      'settings.clearRuleName': '取消 {name} 的默认设置',
      'settings.group.image': '图片',
      'settings.group.document': '文档',
      'settings.group.code': '代码',
      'settings.group.archive': '压缩包',
      'settings.group.media': '音视频',
      'settings.other': '其他已设置的类型',
      'settings.nameScoped': '按文件名',
      'settings.nameHint': '这类规则来自无扩展名文件；取消后该文件将跟随系统默认。',
      'settings.customTitle': '添加其他扩展名',
      'settings.customHint': '输入扩展名，例如 heic 或 avif，然后选择应用。',
      'settings.customPlaceholder': '例如 heic',
      'settings.add': '添加',
      'settings.invalidExtension': '请输入简单扩展名（字母或数字，最多 12 位）',
      'settings.clearError': '取消默认失败，请重试',
      'settings.empty': '还没有预设任何默认应用。',
      'settings.openPicker': '选择 {ext} 的默认应用',
      'menu.setDefault': '设置 DSH 默认打开方式…',
      'picker.title': 'DSH 默认打开方式',
      'picker.subtitle': '文件类型：{ext}',
      'picker.subtitleName': '文件名：{name}',
      'picker.system': '跟随系统默认',
      'picker.systemHint': '不覆盖 Windows 的文件关联',
      'picker.loading': '正在读取可用应用…',
      'picker.loadError': '读取应用列表失败',
      'picker.retry': '重试',
      'picker.empty': '没有找到可用的应用',
      'picker.missing': '之前选择的应用「{app}」当前不可用',
      'picker.noteExt': '保存后，DSH 对所有工作区的 {ext} 文件都会优先使用所选应用；Windows 自身的默认应用不会被更改。',
      'picker.noteFile': '保存后，DSH 打开此文件时会优先使用所选应用；Windows 自身的默认应用不会被更改。',
      'picker.cancel': '取消',
      'picker.save': '保存',
      'picker.saving': '正在保存…',
      'picker.saveError': '保存失败，请重试',
      'picker.close': '关闭',
      'picker.current': '当前',
      'picker.dshDefault': 'DSH 默认',
      'picker.systemDefault': '系统默认',
      'picker.unchanged': '尚未更改',
      'picker.saved': '已保存：{app}',
      'picker.restored': '已恢复系统默认',
    }

    const en = {
      'meta.title': 'Default app chooser',
      'meta.description': 'Choose the application DSH uses by default for each file type without changing Windows associations.',
      'button.label': 'Set default',
      'button.tooltip': 'Choose the default app DSH uses for this file type',
      'button.current': 'Default: {app}',
      'button.system': 'Default: System',
      'button.loading': 'Default: …',
      'button.tooltipCurrent': 'DSH currently uses {app} by default. Click to change.',
      'button.tooltipSystem': 'DSH currently follows the Windows default. Click to change.',
      'panel.label': 'Open with',
      'settings.title': 'Open with',
      'settings.subtitle': 'Preset the default application for the file types DSH supports. Only DSH is affected; Windows associations are untouched.',
      'settings.refreshHint': 'The file-preview default updates immediately; file cards in the conversation read the new setting when the conversation is reopened.',
      'settings.loading': 'Reading settings…',
      'settings.error': 'Could not read the settings',
      'settings.retry': 'Retry',
      'settings.current': 'DSH preference',
      'settings.system': 'Follow system default',
      'settings.change': 'Change',
      'settings.choose': 'Choose app',
      'settings.clear': 'Clear',
      'settings.clearRule': 'Clear the default for {ext}',
      'settings.clearRuleName': 'Clear the default for {name}',
      'settings.group.image': 'Images',
      'settings.group.document': 'Documents',
      'settings.group.code': 'Code',
      'settings.group.archive': 'Archives',
      'settings.group.media': 'Audio and video',
      'settings.other': 'Other configured types',
      'settings.nameScoped': 'By file name',
      'settings.nameHint': 'These rules come from files without an extension; clearing one makes that file follow the system default.',
      'settings.customTitle': 'Add another extension',
      'settings.customHint': 'Enter a simple extension such as heic or avif, then choose an application.',
      'settings.customPlaceholder': 'e.g. heic',
      'settings.add': 'Add',
      'settings.invalidExtension': 'Enter a simple extension (letters or digits, up to 12 characters)',
      'settings.clearError': 'Could not remove the default; please retry',
      'settings.empty': 'No application defaults have been set yet.',
      'settings.openPicker': 'Choose the default app for {ext}',
      'menu.setDefault': 'Set DSH default app…',
      'picker.title': 'DSH default app',
      'picker.subtitle': 'File type: {ext}',
      'picker.subtitleName': 'File: {name}',
      'picker.system': 'Follow system default',
      'picker.systemHint': 'Do not override the Windows association',
      'picker.loading': 'Reading available applications…',
      'picker.loadError': 'Could not read the application list',
      'picker.retry': 'Retry',
      'picker.empty': 'No available applications were found',
      'picker.missing': 'The previously chosen application “{app}” is unavailable',
      'picker.noteExt': 'After saving, DSH prefers the selected application for every {ext} file in all workspaces. Your Windows default is not changed.',
      'picker.noteFile': 'After saving, DSH prefers the selected application for this file. Your Windows default is not changed.',
      'picker.cancel': 'Cancel',
      'picker.save': 'Save',
      'picker.saving': 'Saving…',
      'picker.saveError': 'Could not save; please retry',
      'picker.close': 'Close',
      'picker.current': 'Current',
      'picker.dshDefault': 'DSH default',
      'picker.systemDefault': 'System default',
      'picker.unchanged': 'No changes yet',
      'picker.saved': 'Saved: {app}',
      'picker.restored': 'Restored the system default',
    }

    const CSS = `
.owd-overlay{position:fixed;inset:0;z-index:1000;display:flex;align-items:center;justify-content:center;padding:16px;box-sizing:border-box;background:var(--dsw-alias-bg-mask-1);backdrop-filter:var(--dsw-mask-blur)}
.owd-dialog{width:min(440px,100%);max-height:min(76vh,620px);display:flex;flex-direction:column;overflow:hidden;border:0.5px solid var(--dsw-alias-border-l2);border-radius:var(--dsw-radius-panel);background:var(--dsw-alias-bg-layer-2);box-shadow:var(--dsw-elevation-prominent);color:var(--dsw-alias-label-primary);font-family:var(--dsw-font-family);outline:none}
.owd-head{display:flex;align-items:flex-start;gap:12px;padding:18px 18px 12px;border-bottom:0.5px solid var(--dsw-alias-border-l1)}
.owd-headText{min-width:0;flex:1}
.owd-title{margin:0;font-size:16px;line-height:24px;font-weight:600}
.owd-sub{margin:3px 0 0;color:var(--dsw-alias-label-secondary);font-size:12px;line-height:18px;overflow-wrap:anywhere}
.owd-close{flex:none;width:28px;height:28px;display:inline-flex;align-items:center;justify-content:center;border:0;border-radius:var(--dsw-radius-md);background:transparent;color:var(--dsw-alias-label-secondary);font-size:20px;line-height:1;cursor:pointer}
.owd-close:hover{background:var(--dsw-alias-interactive-bg-hover)}
.owd-body{padding:8px;overflow-y:auto;min-height:120px}
.owd-option{display:flex;align-items:center;gap:10px;padding:10px 12px;border-radius:var(--dsw-radius-md);cursor:pointer;box-sizing:border-box}
.owd-option:hover{background:var(--dsw-alias-interactive-bg-hover)}
.owd-option input{flex:none;margin:0;accent-color:var(--dsw-alias-brand-primary)}
.owd-optionText{min-width:0;flex:1;display:flex;flex-direction:column;gap:2px}
.owd-optionName{display:flex;align-items:center;gap:6px;flex-wrap:wrap;font-size:13px;line-height:20px;overflow-wrap:anywhere}
.owd-optionHint{font-size:12px;line-height:18px;color:var(--dsw-alias-label-tertiary)}
.owd-badge{flex:none;font-size:11px;line-height:18px;padding:0 6px;border-radius:999px;background:var(--dsw-alias-interactive-bg-hover);color:var(--dsw-alias-label-secondary)}
.owd-appicon{flex:none;width:24px;height:24px;display:inline-flex;align-items:center;justify-content:center;overflow:hidden;border-radius:5px;color:var(--dsw-alias-label-secondary)}
.owd-appicon img{width:24px;height:24px;object-fit:contain}
.owd-letter{width:24px;height:24px;display:inline-flex;align-items:center;justify-content:center;border-radius:5px;background:var(--dsw-alias-interactive-bg-hover);font-size:12px;font-weight:600;color:var(--dsw-alias-label-secondary);text-transform:uppercase}
.owd-notice{margin:6px 12px 10px;padding:8px 10px;border-radius:var(--dsw-radius-md);background:var(--dsw-alias-bg-layer-3);color:var(--dsw-alias-state-warn-label);font-size:12px;line-height:18px}
.owd-error{color:var(--dsw-alias-state-error-primary)}
.owd-state{padding:28px 16px;text-align:center;color:var(--dsw-alias-label-secondary);font-size:13px;line-height:20px}
.owd-stateActions{margin-top:10px}
.owd-foot{display:flex;align-items:center;gap:12px;padding:12px 18px 16px;border-top:0.5px solid var(--dsw-alias-border-l1)}
.owd-note{flex:1;min-width:0;color:var(--dsw-alias-label-tertiary);font-size:12px;line-height:18px}
.owd-buttons{flex:none;display:flex;align-items:center;gap:8px}
.owd-unchanged{font-size:12px;line-height:18px;color:var(--dsw-alias-label-tertiary);white-space:nowrap}
.owd-toast{position:fixed;left:50%;bottom:calc(24px + env(safe-area-inset-bottom,0px));z-index:1000;transform:translateX(-50%);max-width:min(560px,calc(100vw - 32px));padding:9px 14px;border:0.5px solid var(--dsw-alias-border-l2);border-radius:var(--dsw-radius-md);background:var(--dsw-alias-bg-layer-2);box-shadow:var(--dsw-elevation-prominent);color:var(--dsw-alias-label-primary);font-family:var(--dsw-font-family);font-size:13px;line-height:20px;pointer-events:none;text-align:center}
.owd-pill{transition:background-color .12s ease}
.owd-pill:hover{background:var(--dsw-alias-interactive-bg-hover)}
.owd-pill:focus-visible{outline:2px solid var(--dsw-alias-brand-primary);outline-offset:1px}
.owd-btn{height:32px;padding:0 14px;border:0.5px solid var(--dsw-alias-border-l2);border-radius:var(--dsw-radius-md);background:transparent;color:var(--dsw-alias-label-primary);font-family:inherit;font-size:13px;line-height:30px;cursor:pointer;white-space:nowrap}
.owd-btn:hover:not(:disabled){background:var(--dsw-alias-interactive-bg-hover)}
.owd-btn:disabled{opacity:.5;cursor:default}
.owd-primary{border-color:transparent;background:var(--dsw-alias-button-primary-fill);color:var(--dsw-alias-label-primary-foreground)}
.owd-primary:hover:not(:disabled){background:var(--dsw-alias-button-primary-hover)}
@media (max-width:480px){.owd-foot{align-items:flex-end;flex-direction:column}.owd-buttons{width:100%;justify-content:flex-end}}
`

    const SETTINGS_CSS = `
.owd-page{height:100%;overflow-y:auto;box-sizing:border-box;padding:32px clamp(20px,4vw,48px) 48px;color:var(--dsw-alias-label-primary);font-family:var(--dsw-font-family)}
.owd-pageInner{width:100%;max-width:760px;margin:0 auto;display:flex;flex-direction:column;gap:26px}
.owd-pageHead{display:flex;flex-direction:column;gap:6px}
.owd-pageTitle{margin:0;font-size:22px;line-height:30px;font-weight:600}
.owd-pageSub{margin:0;color:var(--dsw-alias-label-secondary);font-size:13px;line-height:20px}
.owd-pageHint{margin:2px 0 0;color:var(--dsw-alias-label-tertiary);font-size:12px;line-height:18px}
.owd-group{display:flex;flex-direction:column;gap:9px}
.owd-groupTitle{margin:0;color:var(--dsw-alias-label-tertiary);font-size:12px;line-height:18px;font-weight:600}
.owd-card{overflow:hidden;border:0.5px solid var(--dsw-alias-border-l2);border-radius:var(--dsw-radius-md);background:var(--dsw-alias-bg-layer-1)}
.owd-row{display:flex;align-items:center;gap:12px;min-height:52px;padding:9px 14px;box-sizing:border-box;border-top:0.5px solid var(--dsw-alias-border-l1)}
.owd-row:first-child{border-top:0}
.owd-ext{flex:none;min-width:58px;padding:2px 8px;box-sizing:border-box;border-radius:var(--dsw-radius-sm);background:var(--dsw-alias-interactive-bg-hover);color:var(--dsw-alias-label-primary);font-family:var(--ds-font-family-code);font-size:12px;line-height:20px;text-align:center;overflow-wrap:anywhere}
.owd-rowMain{flex:1;min-width:0;display:flex;flex-direction:column;gap:1px}
.owd-rowName{font-size:13px;line-height:20px;overflow-wrap:anywhere}
.owd-rowMeta{color:var(--dsw-alias-label-tertiary);font-size:12px;line-height:18px}
.owd-actions{flex:none;display:flex;align-items:center;gap:6px;flex-wrap:wrap;justify-content:flex-end}
.owd-small{height:28px;padding:0 10px;border:0.5px solid var(--dsw-alias-border-l2);border-radius:var(--dsw-radius-sm);background:none;color:var(--dsw-alias-label-primary);font-family:inherit;font-size:12px;line-height:26px;cursor:pointer;white-space:nowrap}
.owd-small:hover:not(:disabled){background:var(--dsw-alias-interactive-bg-hover)}
.owd-small:disabled{opacity:.5;cursor:default}
.owd-small.primary{border-color:transparent;background:var(--dsw-alias-button-primary-fill);color:var(--dsw-alias-label-primary-foreground)}
.owd-small.primary:hover:not(:disabled){background:var(--dsw-alias-button-primary-hover)}
.owd-pageState{padding:40px 16px;text-align:center;color:var(--dsw-alias-label-secondary);font-size:13px;line-height:20px}
.owd-pageError{color:var(--dsw-alias-state-error-primary)}
.owd-custom{display:flex;align-items:center;gap:8px;flex-wrap:wrap}
.owd-input{height:32px;min-width:180px;padding:0 10px;box-sizing:border-box;border:0.5px solid var(--dsw-alias-border-l2);border-radius:var(--dsw-radius-sm);background:var(--dsw-alias-bg-layer-1);color:var(--dsw-alias-label-primary);font-family:inherit;font-size:13px;outline:none}
.owd-input:focus{border-color:var(--dsw-alias-brand-primary)}
.owd-message{margin-top:4px;color:var(--dsw-alias-state-error-primary);font-size:12px;line-height:18px}
.owd-customHint{margin:0;color:var(--dsw-alias-label-tertiary);font-size:12px;line-height:18px}
.owd-empty{padding:28px 16px;text-align:center;color:var(--dsw-alias-label-secondary);font-size:13px;line-height:20px}
@media (max-width:520px){.owd-row{align-items:flex-start;flex-wrap:wrap}.owd-actions{width:100%;justify-content:flex-start;padding-left:70px}.owd-ext{min-width:52px}}
`

    /** Tiny sliders glyph shared by the header control, settings panel, and context-menu icon. */
    function SlidersIcon({ size = 14 }) {
      return h('svg', {
        viewBox: '0 0 16 16', width: size, height: size, 'aria-hidden': true,
        fill: 'none', stroke: 'currentColor', strokeWidth: 1.4, strokeLinecap: 'round',
        style: { display: 'block', flex: 'none' },
      },
      h('path', { d: 'M2 4h12M2 8h12M2 12h12' }),
      h('circle', { cx: 5, cy: 4, r: 1.6, fill: 'currentColor' }),
      h('circle', { cx: 11, cy: 8, r: 1.6, fill: 'currentColor' }),
      h('circle', { cx: 6, cy: 12, r: 1.6, fill: 'currentColor' }))
    }

    function MonitorIcon() {
      return h('svg', {
        viewBox: '0 0 24 24', width: 20, height: 20, 'aria-hidden': true,
        fill: 'none', stroke: 'currentColor', strokeWidth: 1.4, strokeLinecap: 'round', strokeLinejoin: 'round',
      },
      h('rect', { x: 3, y: 4, width: 18, height: 12, rx: 2 }),
      h('path', { d: 'M8 20h8M12 16v4' }))
    }

    function AppIcon({ app }) {
      const [failed, setFailed] = useState(false)
      if (app.icon === null || app.icon === undefined || failed) {
        return h('span', { className: 'owd-letter', 'aria-hidden': true }, (app.name || '?').slice(0, 1))
      }
      return h('span', { className: 'owd-appicon' },
        h('img', { src: app.icon, alt: '', draggable: false, onError: () => { setFailed(true) } }))
    }

    function Picker({ t, close, retry, save }) {
      const state = useSyncExternalStore(subscribe, snapshot, snapshot)
      const dialog = useRef(null)
      useEffect(() => {
        if (!state.open) return
        const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null
        const onKey = (event) => {
          if (event.key === 'Escape') {
            event.preventDefault()
            close()
            return
          }
          if (event.key !== 'Tab') return
          const root = dialog.current
          if (root === null) return
          const focusable = Array.from(root.querySelectorAll('button:not(:disabled), input:not(:disabled), [tabindex]:not([tabindex="-1"])'))
            .filter(element => element.getClientRects().length > 0)
          if (focusable.length === 0) {
            event.preventDefault()
            return
          }
          const first = focusable[0]
          const last = focusable[focusable.length - 1]
          if (event.shiftKey && document.activeElement === first) {
            event.preventDefault()
            last.focus()
          } else if (!event.shiftKey && document.activeElement === last) {
            event.preventDefault()
            first.focus()
          }
        }
        document.addEventListener('keydown', onKey)
        const previousOverflow = document.body.style.overflow
        document.body.style.overflow = 'hidden'
        const timer = window.setTimeout(() => { dialog.current?.focus() }, 0)
        return () => {
          document.removeEventListener('keydown', onKey)
          document.body.style.overflow = previousOverflow
          window.clearTimeout(timer)
          opener?.focus()
        }
      }, [state.open, close])
      if (!state.open) {
        if (state.notice === null) return null
        return h(React.Fragment, null,
          h('style', null, CSS),
          h('div', { className: 'owd-toast', role: 'status' }, state.notice))
      }
      const apps = state.apps ?? []
      const canSave = !state.loading && !state.saving && state.error !== true && state.currentId !== state.initialId
      const unchanged = !state.loading && !state.saving && state.error !== true && state.currentId === state.initialId
      const choose = (id) => { setState({ currentId: id }) }
      const extensionLabel = state.extension !== ''
        ? t('picker.subtitle', { ext: state.extension })
        : t('picker.subtitleName', { name: state.name })
      const note = state.scope === 'file'
        ? t('picker.noteFile', { name: state.name })
        : t('picker.noteExt', { ext: state.extension })
      const badge = (label) => h('span', { className: 'owd-badge' }, label)
      return h('div', {
        className: 'owd-overlay',
        onMouseDown: (event) => { if (event.target === event.currentTarget) close() },
      },
      h('style', null, CSS),
      h('div', {
        className: 'owd-dialog', role: 'dialog', 'aria-modal': 'true', 'aria-labelledby': 'owd-title',
        tabIndex: -1, ref: dialog,
      },
      h('div', { className: 'owd-head' },
        h('div', { className: 'owd-headText' },
          h('h2', { className: 'owd-title', id: 'owd-title' }, t('picker.title')),
          h('p', { className: 'owd-sub' }, extensionLabel)),
        h('button', { type: 'button', className: 'owd-close', 'aria-label': t('picker.close'), onClick: close }, '×')),
      h('div', { className: 'owd-body' },
        state.loading ? h('div', { className: 'owd-state' }, t('picker.loading'))
          : state.error === true ? h('div', { className: 'owd-state owd-error' },
            h('div', null, t('picker.loadError')),
            h('div', { className: 'owd-stateActions' },
              h('button', { type: 'button', className: 'owd-btn', onClick: retry }, t('picker.retry'))))
            : h('div', { role: 'radiogroup', 'aria-labelledby': 'owd-title' },
              h('label', { className: 'owd-option' },
                h('input', {
                  type: 'radio', name: 'owd-app', checked: state.currentId === null,
                  onChange: () => { choose(null) },
                }),
                h('span', { className: 'owd-appicon' }, h(MonitorIcon)),
                h('span', { className: 'owd-optionText' },
                  h('span', { className: 'owd-optionName' },
                    h('span', null, t('picker.system')),
                    state.currentId === null ? badge(t('picker.current')) : null),
                  h('span', { className: 'owd-optionHint' }, t('picker.systemHint')))),
              apps.map((app) => h('label', { className: 'owd-option', key: app.id },
                h('input', {
                  type: 'radio', name: 'owd-app', checked: state.currentId === app.id,
                  onChange: () => { choose(app.id) },
                }),
                h(AppIcon, { app }),
                h('span', { className: 'owd-optionText' },
                  h('span', { className: 'owd-optionName' },
                    h('span', null, app.name),
                    app.default && state.currentId === app.id ? badge(t('picker.dshDefault')) : null,
                    app.systemDefault ? badge(t('picker.systemDefault')) : null)))),
              apps.length === 0 ? h('div', { className: 'owd-state' }, t('picker.empty')) : null,
              state.missingName !== null
                ? h('div', { className: 'owd-notice' }, t('picker.missing', { app: state.missingName }))
                : null,
              state.saveError === true
                ? h('div', { className: 'owd-notice owd-error' }, t('picker.saveError'))
                : null)),
      h('div', { className: 'owd-foot' },
        h('div', { className: 'owd-note' }, note),
        h('div', { className: 'owd-buttons' },
          unchanged ? h('span', { className: 'owd-unchanged' }, t('picker.unchanged')) : null,
          h('button', { type: 'button', className: 'owd-btn', onClick: close, disabled: state.saving }, t('picker.cancel')),
          h('button', { type: 'button', className: 'owd-btn owd-primary', onClick: save, disabled: !canSave }, state.saving ? t('picker.saving') : t('picker.save'))))))
    }

    function OpenWithSettings({ t }) {
      const [library, setLibrary] = useState({ loading: true, error: false, items: [] })
      const [custom, setCustom] = useState('')
      const [customError, setCustomError] = useState(false)
      const [clearError, setClearError] = useState(false)
      const load = async (showLoading) => {
        if (showLoading) setLibrary((current) => ({ ...current, loading: true, error: false }))
        try {
          const response = await fetch(LIBRARY_ROUTE, { headers: { accept: 'application/json' } })
          if (!response.ok) throw new Error(`library failed: HTTP ${String(response.status)}`)
          const payload = await response.json()
          setLibrary({
            loading: false,
            error: false,
            items: Array.isArray(payload.preferences) ? payload.preferences : [],
          })
        } catch (_error) {
          setLibrary((current) => ({ ...current, loading: false, error: true }))
        }
      }
      useEffect(() => {
        void load(true)
        const changed = () => { void load(false) }
        settingsEvents.addEventListener('changed', changed)
        return () => { settingsEvents.removeEventListener('changed', changed) }
      }, [])
      const groups = [
        { key: 'image', label: t('settings.group.image'), extensions: ['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg', 'bmp'] },
        { key: 'document', label: t('settings.group.document'), extensions: ['pdf', 'md', 'txt', 'docx', 'xlsx', 'pptx'] },
        { key: 'code', label: t('settings.group.code'), extensions: ['json', 'js', 'ts', 'tsx', 'jsx', 'py', 'html', 'css', 'yaml', 'yml'] },
        { key: 'archive', label: t('settings.group.archive'), extensions: ['zip', '7z', 'rar'] },
        { key: 'media', label: t('settings.group.media'), extensions: ['mp3', 'mp4', 'mov', 'wav'] },
      ]
      const byExtension = new Map()
      const fileRules = []
      for (const item of library.items) {
        if (item.scope === 'extension') byExtension.set(item.extension.toLowerCase(), item)
        else fileRules.push(item)
      }
      const curated = new Set(groups.flatMap((group) => group.extensions.map((extension) => `.${extension}`)))
      const extraExtensions = library.items.filter((item) => item.scope === 'extension' && !curated.has(item.extension.toLowerCase()))
      const clear = async (key) => {
        setClearError(false)
        try {
          await settingsRuntime.clearRule(key)
        } catch (_error) {
          setClearError(true)
        }
      }
      const addCustom = () => {
        const value = custom.trim().replace(/^\.+/, '').toLowerCase()
        if (!/^[a-z0-9]{1,12}$/.test(value)) {
          setCustomError(true)
          return
        }
        setCustomError(false)
        setCustom('')
        settingsRuntime.openExtensionPicker(value)
      }
      const extensionRow = (extension, rule) => h('div', { className: 'owd-row', key: extension },
        h('span', { className: 'owd-ext' }, `.${extension}`),
        h('div', { className: 'owd-rowMain' },
          h('span', { className: 'owd-rowName' }, rule === undefined ? t('settings.system') : rule.applicationName),
          rule === undefined ? null : h('span', { className: 'owd-rowMeta' }, t('settings.current'))),
        h('div', { className: 'owd-actions' },
          h('button', {
            type: 'button', className: 'owd-small',
            'aria-label': t('settings.openPicker', { ext: `.${extension}` }),
            onClick: () => { settingsRuntime.openExtensionPicker(extension) },
          }, rule === undefined ? t('settings.choose') : t('settings.change')),
          rule === undefined ? null : h('button', {
            type: 'button', className: 'owd-small',
            'aria-label': t('settings.clearRule', { ext: `.${extension}` }),
            onClick: () => { void clear(rule.key) },
          }, t('settings.clear'))))
      const fileRow = (rule) => h('div', { className: 'owd-row', key: rule.key },
        h('span', { className: 'owd-ext' }, t('settings.nameScoped')),
        h('div', { className: 'owd-rowMain' },
          h('span', { className: 'owd-rowName' }, rule.name),
          h('span', { className: 'owd-rowMeta' }, rule.applicationName)),
        h('div', { className: 'owd-actions' },
          h('button', {
            type: 'button', className: 'owd-small',
            'aria-label': t('settings.clearRuleName', { name: rule.name }),
            onClick: () => { void clear(rule.key) },
          }, t('settings.clear'))))
      return h('div', { className: 'owd-page' },
        h('style', null, SETTINGS_CSS),
        h('div', { className: 'owd-pageInner' },
          h('div', { className: 'owd-pageHead' },
            h('h1', { className: 'owd-pageTitle' }, t('settings.title')),
            h('p', { className: 'owd-pageSub' }, t('settings.subtitle')),
            h('p', { className: 'owd-pageHint' }, t('settings.refreshHint'))),
          library.loading
            ? h('div', { className: 'owd-pageState' }, t('settings.loading'))
            : library.error
              ? h('div', { className: 'owd-pageState owd-pageError' },
                h('div', null, t('settings.error')),
                h('div', { style: { marginTop: 10 } },
                  h('button', { type: 'button', className: 'owd-small', onClick: () => { void load(true) } }, t('settings.retry'))))
              : h(React.Fragment, null,
                groups.map((group) => h('div', { className: 'owd-group', key: group.key },
                  h('h2', { className: 'owd-groupTitle' }, group.label),
                  h('div', { className: 'owd-card' },
                    group.extensions.map((extension) => extensionRow(extension, byExtension.get(`.${extension}`))))),
                extraExtensions.length === 0 && fileRules.length === 0 ? null : h('div', { className: 'owd-group' },
                  h('h2', { className: 'owd-groupTitle' }, t('settings.other')),
                  h('div', { className: 'owd-card' },
                    extraExtensions.map((item) => extensionRow(item.extension.slice(1).toLowerCase(), item)),
                    fileRules.map(fileRow))),
                h('div', { className: 'owd-group' },
                  h('h2', { className: 'owd-groupTitle' }, t('settings.customTitle')),
                  h('p', { className: 'owd-customHint' }, t('settings.customHint')),
                  h('div', { className: 'owd-custom' },
                    h('input', {
                      className: 'owd-input', value: custom, placeholder: t('settings.customPlaceholder'),
                      onChange: (event) => { setCustom(event.target.value); setCustomError(false) },
                      onKeyDown: (event) => { if (event.key === 'Enter') addCustom() },
                    }),
                    h('button', { type: 'button', className: 'owd-small primary', onClick: addCustom }, t('settings.add'))),
                  customError ? h('p', { className: 'owd-message' }, t('settings.invalidExtension')) : null),
                clearError ? h('p', { className: 'owd-message' }, t('settings.clearError')) : null,
                fileRules.length === 0 ? null : h('p', { className: 'owd-customHint' }, t('settings.nameHint'))))))
    }

    const initial = {
      open: false,
      target: 'file',
      path: '',
      name: '',
      extension: '',
      scope: 'extension',
      apps: null,
      loading: false,
      error: false,
      saving: false,
      saveError: false,
      currentId: null,
      initialId: null,
      missingName: null,
      notice: null,
    }
    let state = initial
    let noticeTimer = null
    const summaryEvents = new EventTarget()
    const settingsEvents = new EventTarget()
    const settingsRuntime = { openExtensionPicker: () => {}, clearRule: async () => {} }
    const listeners = new Set()
    function snapshot() { return state }
    function subscribe(listener) {
      listeners.add(listener)
      return () => { listeners.delete(listener) }
    }
    function setState(patch) {
      state = { ...state, ...patch }
      for (const listener of listeners) listener()
    }
    function reset() {
      if (noticeTimer !== null) {
        window.clearTimeout(noticeTimer)
        noticeTimer = null
      }
      state = initial
      for (const listener of listeners) listener()
    }

    function DefaultAppButton({ absolutePath, t, openPicker }) {
      const [summary, setSummary] = useState({ loading: true, name: null })
      useEffect(() => {
        let active = true
        const fileName = absolutePath.slice(Math.max(absolutePath.lastIndexOf('/'), absolutePath.lastIndexOf('\\')) + 1)
        const dot = fileName.lastIndexOf('.')
        const extension = dot > 0 && dot < fileName.length - 1 ? fileName.slice(dot).toLowerCase() : ''
        const onSummary = (event) => {
          const sameFile = event.detail?.path === absolutePath
          const sameType = extension !== '' && event.detail?.extension === extension
          if (!sameFile && !sameType) return
          setSummary({ loading: false, name: typeof event.detail.name === 'string' ? event.detail.name : null })
        }
        summaryEvents.addEventListener('summary', onSummary)
        void fetch(`${STATE_ROUTE}?path=${encodeURIComponent(absolutePath)}`, { headers: { accept: 'application/json' } })
          .then((response) => response.ok ? response.json() : null)
          .then((payload) => {
            if (!active) return
            const name = payload?.preference?.applicationName
            setSummary({ loading: false, name: typeof name === 'string' && name.length > 0 ? name : null })
          })
          .catch(() => { if (active) setSummary({ loading: false, name: null }) })
        return () => {
          active = false
          summaryEvents.removeEventListener('summary', onSummary)
        }
      }, [absolutePath])
      const label = summary.loading
        ? t('button.loading')
        : summary.name === null ? t('button.system') : t('button.current', { app: summary.name })
      const tooltip = summary.name === null ? t('button.tooltipSystem') : t('button.tooltipCurrent', { app: summary.name })
      return h(React.Fragment, null,
        h('style', null, CSS),
        h('button', {
          type: 'button',
          className: 'owd-pill',
          title: tooltip,
          'aria-label': `${label}：${tooltip}`,
          onClick: () => { openPicker(absolutePath) },
          style: {
            display: 'inline-flex', alignItems: 'center', gap: 4, height: 24, maxWidth: 190,
            padding: '3px 7px', boxSizing: 'border-box', border: '0.5px solid var(--dsw-alias-border-l4)',
            borderRadius: 'var(--dsw-radius-sm)', background: 'none', color: 'var(--dsw-alias-label-primary)',
            fontFamily: 'var(--dsw-font-family)', fontSize: 11, lineHeight: '16px', cursor: 'pointer', whiteSpace: 'nowrap',
          },
        }, h(SlidersIcon, { size: 12 }),
        h('span', { style: { overflow: 'hidden', textOverflow: 'ellipsis' } }, label)))
    }

    function ContextIcon() {
      return h(SlidersIcon, { size: 14 })
    }

    function OpenWithPanelIcon({ size }) {
      return h(SlidersIcon, { size })
    }

    return {
      inject: ['contextMenus', 'slots', 'locale', 'remote', 'remote.session', 'remote.workspaceFiles', 'sidebarRight'],
      apply(ctx) {
        ctx.effect(() => ctx.locale.register(NS, { zh, en }), 'open-with-default: dictionaries')
        const t = ctx.locale.bind(NS)

        const readState = async (path) => {
          const response = await fetch(`${STATE_ROUTE}?path=${encodeURIComponent(path)}`, {
            headers: { accept: 'application/json' },
          })
          if (!response.ok) throw new Error(`state read failed: HTTP ${String(response.status)}`)
          return await response.json()
        }

        const loadFile = async (path) => {
          const name = path.slice(Math.max(path.lastIndexOf('/'), path.lastIndexOf('\\')) + 1)
          const dot = name.lastIndexOf('.')
          const extension = dot > 0 && dot < name.length - 1 ? name.slice(dot) : ''
          if (noticeTimer !== null) {
            window.clearTimeout(noticeTimer)
            noticeTimer = null
          }
          setState({
            open: true, target: 'file', path, name, extension, scope: extension !== '' ? 'extension' : 'file',
            apps: null, loading: true, error: false, saving: false, saveError: false,
            currentId: null, initialId: null, missingName: null, notice: null,
          })
          try {
            const [applicationsResult, preference] = await Promise.all([
              ctx.remote.session.workspacePathApplications({ path }),
              readState(path),
            ])
            if (!applicationsResult.ok) throw new Error('application query failed')
            const apps = applicationsResult.value ?? []
            const saved = preference.preference
            const selectedApp = saved === null
              ? undefined
              : apps.find((app) => app.id === saved.applicationId)
                ?? apps.find((app) => saved.applicationName !== undefined && app.name === saved.applicationName)
            if (!state.open || state.target !== 'file' || state.path !== path) return
            setState({
              apps,
              loading: false,
              scope: preference.scope === 'file' ? 'file' : 'extension',
              currentId: selectedApp?.id ?? null,
              initialId: selectedApp?.id ?? saved?.applicationId ?? null,
              missingName: saved !== null && selectedApp === undefined
                ? (saved.applicationName ?? saved.applicationId)
                : null,
            })
          } catch (_error) {
            if (!state.open || state.target !== 'file' || state.path !== path) return
            setState({ loading: false, error: true })
          }
        }

        const loadExtension = async (extension) => {
          const ext = String(extension ?? '').trim().toLowerCase().replace(/^\.+/, '')
          if (!/^[a-z0-9]{1,12}$/.test(ext)) return
          if (noticeTimer !== null) {
            window.clearTimeout(noticeTimer)
            noticeTimer = null
          }
          setState({
            open: true, target: 'extension', path: '', name: '', extension: `.${ext}`, scope: 'extension',
            apps: null, loading: true, error: false, saving: false, saveError: false,
            currentId: null, initialId: null, missingName: null, notice: null,
          })
          try {
            const response = await fetch(`${EXT_APPS_ROUTE}?ext=${encodeURIComponent(ext)}`, {
              headers: { accept: 'application/json' },
            })
            if (!response.ok) throw new Error(`extension apps failed: HTTP ${String(response.status)}`)
            const payload = await response.json()
            const apps = Array.isArray(payload.apps) ? payload.apps : []
            const saved = payload.preference ?? null
            const selectedApp = saved === null
              ? undefined
              : apps.find((app) => app.id === saved.applicationId)
                ?? apps.find((app) => saved.applicationName !== undefined && app.name === saved.applicationName)
            if (!state.open || state.target !== 'extension' || state.extension !== `.${ext}`) return
            setState({
              apps,
              loading: false,
              currentId: selectedApp?.id ?? null,
              initialId: selectedApp?.id ?? saved?.applicationId ?? null,
              missingName: saved !== null && selectedApp === undefined
                ? (saved.applicationName ?? saved.applicationId)
                : null,
            })
          } catch (_error) {
            if (!state.open || state.target !== 'extension' || state.extension !== `.${ext}`) return
            setState({ loading: false, error: true })
          }
        }

        const openPicker = (path) => {
          if (typeof path !== 'string' || path.length === 0) return
          void loadFile(path)
        }

        const openExtensionPicker = (extension) => {
          void loadExtension(extension)
        }

        const close = () => { if (!state.saving) setState({ open: false }) }
        const retry = () => {
          if (state.target === 'extension') void loadExtension(state.extension.replace(/^\./, ''))
          else if (state.path !== '') void loadFile(state.path)
        }
        const remountOpenFileTab = (extension) => {
          try {
            const target = ctx.sidebarRight.commandTarget()
            const active = ctx.sidebarRight.active()
            if (target?.tabId === undefined || active === undefined
              || active.id !== target.tabId
              || typeof active.contentId !== 'string'
              || !active.contentId.startsWith('dsh-resource://file/')) return
            const addressName = active.contentId.slice(active.contentId.lastIndexOf('/') + 1)
            const dot = addressName.lastIndexOf('.')
            const activeExtension = dot > 0 && dot < addressName.length - 1
              ? addressName.slice(dot).toLowerCase()
              : ''
            if (extension !== undefined && extension !== '' && activeExtension !== extension.toLowerCase()) return
            // Replacing the tab closes and reopens the same content in one
            // commit, so the native control re-queries its association instead
            // of showing the label cached before this save.
            ctx.sidebarRight.openResourceIn(target.sessionId, active.contentId, {
              replaceTab: active.id,
              revealIfOpened: false,
            })
          } catch (_error) {
            // A changed tab, floating surface, or closing session is not an
            // error: the next natural remount still picks up the preference.
          }
        }
        const showNotice = (text) => {
          if (noticeTimer !== null) window.clearTimeout(noticeTimer)
          noticeTimer = window.setTimeout(() => {
            noticeTimer = null
            setState({ notice: null })
          }, 3200)
          setState({ notice: text })
        }
        const save = async () => {
          if (state.saving || state.loading || state.error === true) return
          const isExtension = state.target === 'extension'
          const extension = state.extension.toLowerCase()
          const path = state.path
          const applicationId = state.currentId
          const selectedApp = applicationId === null
            ? null
            : (state.apps ?? []).find((app) => app.id === applicationId)
          setState({ saving: true, saveError: false })
          try {
            const response = await fetch(isExtension ? EXT_SET_ROUTE : SET_ROUTE, {
              method: 'POST',
              headers: { 'content-type': 'application/json' },
              body: JSON.stringify({
                ...(isExtension ? { extension: extension.replace(/^\./, '') } : { path }),
                applicationId,
                ...(selectedApp === undefined || selectedApp === null ? {} : { applicationName: selectedApp.name }),
              }),
            })
            if (!response.ok) throw new Error(`save failed: HTTP ${String(response.status)}`)
            const payload = await response.json()
            const savedApp = applicationId === null
              ? null
              : payload?.preference?.applicationName ?? selectedApp?.name ?? applicationId
            const notice = savedApp === null
              ? t('picker.restored')
              : t('picker.saved', { app: savedApp })
            summaryEvents.dispatchEvent(new CustomEvent('summary', {
              detail: { path: isExtension ? '' : path, extension, name: savedApp },
            }))
            settingsEvents.dispatchEvent(new Event('changed'))
            setState({ saving: false, open: false })
            showNotice(notice)
            window.setTimeout(() => { remountOpenFileTab(extension) }, 40)
          } catch (_error) {
            setState({ saving: false, saveError: true })
          }
        }

        const clearRule = async (key) => {
          const response = await fetch(DELETE_ROUTE, {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ key }),
          })
          if (!response.ok) throw new Error(`delete failed: HTTP ${String(response.status)}`)
          if (key.startsWith('ext:')) {
            const extension = `.${key.slice(4)}`.toLowerCase()
            summaryEvents.dispatchEvent(new CustomEvent('summary', {
              detail: { path: '', extension, name: null },
            }))
            window.setTimeout(() => { remountOpenFileTab(extension) }, 40)
          }
          settingsEvents.dispatchEvent(new Event('changed'))
          showNotice(t('picker.restored'))
        }

        settingsRuntime.openExtensionPicker = openExtensionPicker
        settingsRuntime.clearRule = clearRule

        ctx.effect(() => () => { reset() }, 'open-with-default: picker state')

        ctx.slots.inject('contextMenu.icon', function* () {
          yield ctx.slots.register({ name: 'contextMenu.icon', key: 'open-with-default.icon' }, ContextIcon)
        })

        ctx.slots.inject('shell.overlay', () => ctx.slots.register({
          name: 'shell.overlay', id: 'open-with-default.picker', locale: NS,
          inject: () => ({ close, retry, save }),
        }, Picker))

        ctx.slots.inject('main', () => ctx.slots.register({
          name: 'main', key: PANEL_ID, locale: NS,
        }, OpenWithSettings))

        ctx.slots.inject('sidebar.panellist', () => ctx.slots.register({
          name: 'sidebar.panellist', id: PANEL_ID, order: 15, locale: NS,
          label: () => t('panel.label'),
        }, OpenWithPanelIcon))

        ctx.effect(() => ctx.contextMenus.register({
          id: 'open-with-default.file', target: 'file', order: 110,
          observe: () => [ctx.locale],
          resolve: async (target, signal) => {
            try {
              if (typeof target.sessionId !== 'string' || typeof target.path !== 'string') return []
              const result = await ctx.remote.workspaceFiles.stat(target.sessionId, target.path, signal)
              if (!result.ok) return []
              const absolutePath = result.value.absolutePath
              if (typeof absolutePath !== 'string' || absolutePath.length === 0) return []
              return [{
                id: 'openWithDefault',
                icon: { key: 'open-with-default.icon' },
                label: t('menu.setDefault'),
                run: () => { openPicker(absolutePath) },
              }]
            } catch (_error) {
              signal.throwIfAborted()
              return []
            }
          },
        }), 'open-with-default: file context menu')

        const injected = () => ({ openPicker })
        ctx.slots.inject('sidebar.right.tab.document.actions', () => ctx.slots.register({
          name: 'sidebar.right.tab.document.actions', id: 'open-with-default', locale: NS, inject: injected,
        }, DefaultAppButton))
        ctx.slots.inject('sidebar.right.tab.document.unpreviewable', () => ctx.slots.register({
          name: 'sidebar.right.tab.document.unpreviewable', id: 'open-with-default', locale: NS, inject: injected,
        }, DefaultAppButton))
      },
    }
  },
})
