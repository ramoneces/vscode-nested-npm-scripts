import * as fs from 'fs';
import * as path from 'path';
import * as vscode from 'vscode';
import { Terminal, TerminalOptions, workspace } from 'vscode';
import { ITerminalMap } from './types';
import { makeTerminalPrettyName } from './utils';

function resolveAutoPackageManager() {
  const rootPath: string =
    vscode.workspace.workspaceFolders?.[0]?.uri?.fsPath ?? '.';

  if (fs.existsSync(path.join(rootPath, 'package-lock.json'))) {
    return 'npm';
  }

  if (fs.existsSync(path.join(rootPath, 'pnpm-lock.yaml'))) {
    return 'pnpm';
  }

  if (fs.existsSync(path.join(rootPath, 'yarn-lock.json'))) {
    return 'yarn';
  }

  return 'npm';
}

export function executeCommand(terminalMapping: ITerminalMap) {
  return function (task: string, cwd: string) {
    let packageManager: string =
      workspace.getConfiguration('npm').get('packageManager') || 'npm';

    if (packageManager === 'auto') {
      packageManager = resolveAutoPackageManager();
    }

    const command: string = `${packageManager} run ${task}`;

    const name: string = makeTerminalPrettyName(cwd, task);
    let terminal: Terminal;

    if (terminalMapping.has(name)) {
      terminal = terminalMapping.get(name)!;
    } else {
      const terminalOptions: TerminalOptions = { cwd, name };
      terminal = vscode.window.createTerminal(terminalOptions);
      terminalMapping.set(name, terminal);
    }

    terminal.show();
    terminal.sendText(command);
  };
}
