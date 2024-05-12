import {
  Command,
  MarkdownString,
  ThemeColor,
  ThemeIcon,
  TreeItem,
  TreeItemCollapsibleState,
} from 'vscode';

export class WorkspaceTreeItem extends TreeItem {
  constructor(
    public readonly label: string,
    public readonly collapsibleState: TreeItemCollapsibleState,
    public readonly tooltip: string | MarkdownString,
    public readonly command?: Command
  ) {
    super(label, collapsibleState);
  }
  iconPath = new ThemeIcon('json', new ThemeColor('terminal.ansiYellow'));
  contextValue = 'workspaceFolder';
}
