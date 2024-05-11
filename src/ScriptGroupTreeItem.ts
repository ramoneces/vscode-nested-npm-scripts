import {
  ThemeColor,
  ThemeIcon,
  TreeItem,
  TreeItemCollapsibleState,
} from 'vscode';
import { ScriptTreeItem } from './ScriptTreeItem';

export class ScriptGroupTreeItem extends TreeItem {
  constructor(
    public readonly label: string,
    public readonly collapsibleState: TreeItemCollapsibleState,
    public readonly tooltip: string,
    public readonly children: (ScriptTreeItem | ScriptGroupTreeItem)[]
  ) {
    super(label, collapsibleState);
  }

  iconPath = new ThemeIcon('list-tree', new ThemeColor('terminal.ansiGrey'));

  contextValue = 'scriptGroup';
}
