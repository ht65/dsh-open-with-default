# Default app chooser

Choose which application DSH uses by default for each file type. This is a DSH-level override: it **does not** change the Windows default-app association, so Explorer and other programs keep their own setting.

## Install

This repository is a local DSH bundle (not an npm package). Requirements: DSH Desktop `0.2.2-rc.5` or newer on Windows, Git, and pnpm.

```sh
git clone https://github.com/ht65/dsh-open-with-default.git
cd dsh-open-with-default
pnpm install --prod --ignore-scripts
```

Then open **插件 / Plugins** in DSH, choose **添加插件 / Add plugin**, and select this directory. Restart DSH if the sidebar entry does not appear immediately after a first install.

## Use it

### Left sidebar: 打开方式 / Open with

Click **打开方式** in the left sidebar navigation to open the settings panel. It lists image, document, code, archive, and media extensions with their current DSH default. Each row can choose an application or follow the system default, and **Add another extension** accepts any simple extension for other DSH-supported file types.

### File preview and right-click

1. Open any file in the DSH document preview. A **设置默认 / Set default** pill appears in the preview header next to the native open split button. After the first read it shows the current DSH default (for example **默认：WorkBuddy / Default: WorkBuddy**, or **默认：系统 / Default: System**).
2. Click it, choose an application, and save. The pill changes immediately, a toast confirms the save, and the native open split button refreshes its own label and icon in the background. Every later DSH open of that extension in any workspace starts that application.
3. You can also right-click a workspace file and choose **设置 DSH 默认打开方式… / Set DSH default app…**.

## Scope and limits

- The override is keyed by the file extension, or by the exact name for files without an extension.
- It only affects DSH's own open-in-app control, file context menu, and the **打开方式** settings panel; it never writes Windows `UserChoice` or other system associations.
- If the chosen application is later uninstalled, DSH falls back to the operating-system default and the dialog marks the stale choice.
- Available applications come from the Windows Shell handler list for the selected file, so the list matches the normal **Open with** menu.
- Chat delivery cards keep the label they resolved when they mounted; returning to the conversation or reopening the card re-reads the new default.
- Built and verified against DSH `0.2.2-rc.5` Desktop on Windows; the plugin hooks DSH's existing Session workspace-path query, so a future change to that internal API may require an update.
