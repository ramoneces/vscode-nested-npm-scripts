import * as fs from 'fs';
import * as path from 'path';
import * as vscode from 'vscode';
import {
  Event,
  EventEmitter,
  TreeDataProvider,
  TreeItem,
  TreeItemCollapsibleState,
  WorkspaceFolder,
  workspace,
} from 'vscode';
import { ScriptGroupTreeItem } from './ScriptGroupTreeItem';
import { ScriptTreeItem } from './ScriptTreeItem';
import { WorkspaceTreeItem } from './WorkspaceTreeItem';
import { ConfigOptions, NESTED_NPM_SCRIPTS } from './constants';
import { MaybeScript, ScriptEventEmitter, ScriptNode } from './types';

export class NpmScriptsNodeProvider
  implements
    TreeDataProvider<ScriptTreeItem | ScriptGroupTreeItem | WorkspaceTreeItem>
{
  private readonly _onDidChangeTreeData: ScriptEventEmitter =
    new EventEmitter();
  public readonly onDidChangeTreeData: Event<MaybeScript> =
    this._onDidChangeTreeData.event;

  constructor(private readonly workspaceRoot: string) {}

  refresh(): void {
    this._onDidChangeTreeData.fire(undefined);
  }

  getTreeItem(
    element: ScriptTreeItem | ScriptGroupTreeItem | WorkspaceTreeItem
  ): TreeItem {
    return element;
  }

  getChildren(
    element?: ScriptTreeItem | WorkspaceTreeItem | ScriptGroupTreeItem
  ): Thenable<(ScriptTreeItem | WorkspaceTreeItem)[] | WorkspaceTreeItem[]> {
    return new Promise((resolve: Function) => {
      const folders = workspace.workspaceFolders!;
      if (element instanceof WorkspaceTreeItem) {
        // Workspace render scripts
        const folder = folders.find((o) => o.name === element.label)!;
        const packageJsonPath: string = path.join(
          folder.uri.fsPath,
          'package.json'
        );
        this.renderSingleWorkspace(resolve, packageJsonPath);
      } else if (element instanceof ScriptGroupTreeItem) {
        resolve(element.children);
      } else if (folders && folders.length > 1) {
        // Root render workspaces
        this.renderMultipleWorkspaces(resolve, folders);
      } else {
        // Root render scripts
        this.renderSingleWorkspace(resolve);
      }
    });
  }

  /**
   * Render tree items for multiple workspaces
   *
   * @private
   * @param {Function} resolve
   * @param {WorkspaceFolder[]} folders
   * @memberof ScriptNodeProvider
   */
  private renderMultipleWorkspaces(
    resolve: Function,
    folders: readonly WorkspaceFolder[]
  ): void {
    resolve(this.mkTreeItemsForWorkspace(folders));
  }

  /**
   * Render tree items for a single project workspace
   *
   * @private
   * @param {any} element
   * @param {any} resolve
   * @memberof ScriptNodeProvider
   */
  private renderSingleWorkspace(
    resolve: Function,
    packageJsonPath?: string
  ): void {
    if (!packageJsonPath) {
      packageJsonPath = this.getPackageJson(this.workspaceRoot);
    }
    if (this.pathExists(packageJsonPath)) {
      resolve(this.mkTreeItemsFromPackageScripts(packageJsonPath));
    } else {
      vscode.window.showInformationMessage('Workspace has no package.json');
      resolve([]);
    }
  }

  private mkTreeItemsForWorkspace(
    folders: readonly WorkspaceFolder[]
  ): WorkspaceTreeItem[] {
    const treeItems: WorkspaceTreeItem[] = [];
    folders.forEach((folder: WorkspaceFolder): void => {
      const workspaceRoot: string = folder.uri.fsPath;
      const packageJsonPath: string = this.getPackageJson(workspaceRoot);
      const name = folder.name;
      if (this.pathExists(packageJsonPath)) {
        const tooltip: vscode.MarkdownString = new vscode.MarkdownString();
        tooltip.appendMarkdown(`**${name}** workspace\n\n`);
        tooltip.appendMarkdown(`*${packageJsonPath}*`);
        treeItems.push(
          new WorkspaceTreeItem(
            name,
            TreeItemCollapsibleState.Expanded,
            tooltip
          )
        );
      }
    });
    return treeItems;
  }

  /**
   * Takes a path to project package.json, return a list of all keys
   * from the scripts section
   *
   * @private
   * @param {string} packageJsonPath
   * @returns {(ScriptTreeItem | ScriptGroupTreeItem)[]}
   * @memberof ScriptNodeProvider
   */
  private mkTreeItemsFromPackageScripts(
    packageJsonPath: string
  ): (ScriptTreeItem | ScriptGroupTreeItem)[] {
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));
    const workspaceDir: string = path.dirname(packageJsonPath);

    const nodes: ScriptNode[] = Object.entries(
      (packageJson.scripts ?? {}) as { [key: string]: string }
    ).map(([name, command]) => {
      return { groupNameRemainder: name, name, command };
    });

    const config: vscode.WorkspaceConfiguration =
      workspace.getConfiguration(NESTED_NPM_SCRIPTS);
    const separator = config[ConfigOptions.separatorCharacter] ?? ':';

    return this.getTreeItemsRecursive(nodes, workspaceDir, separator);
  }

  private getTreeItemsRecursive(
    packageJsonScripts: ScriptNode[],
    workspaceDir: string,
    separator: string
  ): (ScriptTreeItem | ScriptGroupTreeItem)[] {
    // Group scripts by their first word before the colon. If no colon it is a single script.
    const groupedScripts = packageJsonScripts.reduce((acc, item) => {
      const [groupName, ...scriptName] =
        item.groupNameRemainder.split(separator);
      const remainderGroupName = scriptName.join(separator);
      if (!acc[groupName]) {
        acc[groupName] = [];
      }

      acc[groupName].push({ ...item, groupNameRemainder: remainderGroupName });

      return acc;
    }, {} as { [key: string]: ScriptNode[] });

    const items: (ScriptTreeItem | ScriptGroupTreeItem)[] = [];
    for (const [groupName, scripts] of Object.entries(groupedScripts)) {
      // Items with no remainder are single scripts
      const singleScript = scripts.findIndex((s) => !s.groupNameRemainder);
      if (singleScript !== -1) {
        const script = scripts[singleScript];
        items.push(
          this.toScript(groupName, script.name, script.command, workspaceDir)
        );
        scripts.splice(singleScript, 1);
      }

      if (scripts.length === 1) {
        // Single script don't group
        const [script] = scripts;
        items.push(
          this.toScript(
            script.groupNameRemainder
              ? `${groupName}${separator}${script.groupNameRemainder}`
              : groupName,
            script.name,
            script.command,
            workspaceDir
          )
        );
      } else if (scripts.length > 1) {
        // Group scripts
        const children = this.getTreeItemsRecursive(
          scripts,
          workspaceDir,
          separator
        );
        items.push(
          new ScriptGroupTreeItem(
            groupName,
            TreeItemCollapsibleState.Collapsed,
            new vscode.MarkdownString(
              `${children.length} scripts under *${groupName}* group`
            ),
            children
          )
        );
      }
    }

    return items;
  }

  private toScript(
    label: string,
    scriptName: string,
    scriptCommand: string,
    workspaceDir: string
  ): ScriptTreeItem {
    const cmdObject = {
      title: 'Run Script',
      command: 'nestedNpmScripts.executeCommand',
      arguments: [scriptName, workspaceDir],
    };

    const tooltip: vscode.MarkdownString = new vscode.MarkdownString();
    tooltip.appendMarkdown(`Run **${scriptName}** script`);
    tooltip.appendCodeblock(scriptCommand, 'shell');
    return new ScriptTreeItem(
      label,
      scriptCommand,
      TreeItemCollapsibleState.None,
      tooltip,
      cmdObject
    );
  }

  /**
   * Safely determine if a path exists on disk. (Safely, ie: Doesn't throw)
   *
   * @private
   * @param {string} p
   * @returns {boolean}
   * @memberof ScriptNodeProvider
   */
  private pathExists(p: string): boolean {
    try {
      fs.accessSync(p);
    } catch (err) {
      return false;
    }

    return true;
  }

  private getPackageJson(root: string): string {
    return path.join(root, 'package.json');
  }
}
