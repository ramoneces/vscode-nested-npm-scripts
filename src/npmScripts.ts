import * as fs from 'fs';
import * as path from 'path';
import * as vscode from 'vscode';
import {
  Event,
  EventEmitter,
  FileSystemWatcher,
  TreeDataProvider,
  TreeItem,
  TreeItemCollapsibleState,
  WorkspaceFolder,
  workspace,
} from 'vscode';
import { ScriptTreeItem } from './ScriptTreeItem';
import { WorkspaceTreeItem } from './WorkspaceTreeItem';
import { MaybeScript, ScriptEventEmitter } from './types';

function getPackageJson(root: string): string {
  return path.join(root, 'package.json');
}

export class NpmScriptsNodeProvider
  implements TreeDataProvider<ScriptTreeItem | WorkspaceTreeItem>
{
  private readonly _onDidChangeTreeData: ScriptEventEmitter =
    new EventEmitter();
  public readonly onDidChangeTreeData: Event<MaybeScript> =
    this._onDidChangeTreeData.event;
  private fileWatcher!: FileSystemWatcher;

  constructor(private readonly workspaceRoot: string) {
    workspace.workspaceFolders!.forEach((folder) => {
      const pattern: string = getPackageJson(folder.uri.path);
      this.fileWatcher = workspace.createFileSystemWatcher(pattern);
      this.fileWatcher.onDidChange(() => this.refresh());
    });
  }

  refresh(): void {
    this._onDidChangeTreeData.fire(undefined);
  }

  getTreeItem(element: ScriptTreeItem | WorkspaceTreeItem): TreeItem {
    return element;
  }

  getChildren(
    element?: ScriptTreeItem | WorkspaceTreeItem
  ): Thenable<ScriptTreeItem[] | WorkspaceTreeItem[]> {
    return new Promise((resolve: Function) => {
      const folders = workspace.workspaceFolders!;
      if (element) {
        // Workspace render scripts
        const folder = folders.find((o) => o.name === element.label)!;
        const packageJsonPath: string = path.join(
          folder.uri.fsPath,
          'package.json'
        );
        this.renderSingleWorkspace(resolve, packageJsonPath);
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
      packageJsonPath = getPackageJson(this.workspaceRoot);
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
      const packageJsonPath: string = getPackageJson(workspaceRoot);
      const name = folder.name;
      if (this.pathExists(packageJsonPath)) {
        treeItems.push(
          new WorkspaceTreeItem(
            name,
            TreeItemCollapsibleState.Collapsed,
            `${name} Workspace Folder`
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
   * @returns {ScriptTreeItem[]}
   * @memberof ScriptNodeProvider
   */
  private mkTreeItemsFromPackageScripts(
    packageJsonPath: string
  ): ScriptTreeItem[] {
    const treeItems: ScriptTreeItem[] = [];
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));
    const workspaceDir: string = path.dirname(packageJsonPath);
    const toScript = (
      scriptName: string,
      scriptCommand: string
    ): ScriptTreeItem => {
      const cmdObject = {
        title: 'Run Script',
        command: 'npmScripts.executeCommand',
        arguments: [scriptName, workspaceDir],
      };

      return new ScriptTreeItem(
        scriptName,
        TreeItemCollapsibleState.None,
        scriptCommand,
        cmdObject
      );
    };

    if (packageJson.scripts) {
      Object.keys(packageJson.scripts).forEach((key) => {
        treeItems.push(toScript(key, packageJson.scripts[key]));
      });
    }
    return treeItems;
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
}
