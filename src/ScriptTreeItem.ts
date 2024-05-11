import {
  Command,
  ThemeColor,
  ThemeIcon,
  TreeItem,
  TreeItemCollapsibleState,
} from 'vscode';

export class ScriptTreeItem extends TreeItem {
  constructor(
    public readonly label: string,
    public readonly collapsibleState: TreeItemCollapsibleState,
    public readonly tooltip: string,
    public readonly command?: Command
  ) {
    super(label, collapsibleState);
  }

  iconPath = new ThemeIcon('run', new ThemeColor('terminal.ansiGreen'));

  contextValue = 'script';
}
