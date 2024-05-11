// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import { executeCommand } from './executeCommand';
import { NpmScriptsNodeProvider } from './npmScripts';
import { ITerminalMap } from './types';

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {
  const rootPath: string = vscode.workspace.rootPath || '.';

  const terminals: ITerminalMap = new Map<string, vscode.Terminal>();
  const nodeProvider: NpmScriptsNodeProvider = new NpmScriptsNodeProvider(
    rootPath
  );

  vscode.window.registerTreeDataProvider('nestedNpmScripts', nodeProvider);
  vscode.window.onDidCloseTerminal((term) => terminals.delete(term.name));

  vscode.commands.registerCommand(
    'npmScripts.executeCommand',
    executeCommand(terminals)
  );
}

// This method is called when your extension is deactivated
export function deactivate() {}
