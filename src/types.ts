import { EventEmitter, Terminal } from 'vscode';
import { ScriptTreeItem } from './ScriptTreeItem';

export type ITerminalMap = Map<string, Terminal>;

export type ScriptEventEmitter = EventEmitter<ScriptTreeItem | undefined>;
export type MaybeScript = ScriptTreeItem | undefined;
export type ScriptNode = {
  groupNameRemainder: string;
  name: string;
  command: string;
};
