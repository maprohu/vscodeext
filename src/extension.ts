import * as vscode from 'vscode';

abstract class GotoParentDirection {
	abstract target(range: vscode.Range): vscode.Position;
	abstract isValidMove(source: vscode.Position, destination: vscode.Position): boolean;
	abstract frameOtherEnd(command: GotoParentCommand): string;
}
class GotoParentStart extends GotoParentDirection {
	frameOtherEnd(command: GotoParentCommand): string {
		return command.frameEnd;
	}
	isValidMove(source: vscode.Position, destination: vscode.Position) {
		return destination.isBefore(source);
	}
	target(range: vscode.Range): vscode.Position {
		return range.start;
	}
}
class GotoParentEnd extends GotoParentDirection {
	frameOtherEnd(command: GotoParentCommand): string {
		return command.frameStart;
	}
	isValidMove(source: vscode.Position, destination: vscode.Position): boolean {
		return destination.isAfter(source);
	}
	target(range: vscode.Range): vscode.Position {
		if (range.end.character === 0) {
			return range.end;
		} else {
			return range.end.translate(0,-1);
		}
	}
}
class GotoParentCommand {
	frameStart: string; 
	frameEnd: string;
	direction: GotoParentDirection;
	constructor(frameStart: string, frameEnd: string, direction: GotoParentDirection) {
		this.frameStart = frameStart;
		this.frameEnd = frameEnd;
		this.direction = direction;
	}
	 
	async run() {
		const editor = vscode.window.activeTextEditor;
		if (editor) {
			this.runEditor(editor);
		}
	}
	isSelectionFramed(editor: vscode.TextEditor): boolean {
		let text = editor.document.getText(editor.selection);
		return text.startsWith(this.frameStart) && text.endsWith(this.frameEnd);
	}

	async runEditor(editor: vscode.TextEditor) {
		let startSelect = editor.selection;

		let characterUnderCursor = editor.document.getText(
			new vscode.Range(startSelect.active, startSelect.active.translate(0, 1))
		);

		if (characterUnderCursor === this.direction.frameOtherEnd(this)) {
			await vscode.commands.executeCommand('editor.action.jumpToBracket');
			return;
		}

		await vscode.commands.executeCommand('toggleVim');

		var lastSelection;
		while (true) {
			lastSelection = editor.selection;
			await vscode.commands.executeCommand('editor.action.smartSelect.expand');
				
			if (editor.selection.isEqual(lastSelection)) {
				editor.selection = startSelect;
				break;
			}

			let target = this.direction.target(editor.selection);
			if (
				this.direction.isValidMove(startSelect.active, target) &&
				this.isSelectionFramed(editor) 
			) {
				editor.selection = new vscode.Selection(target, target);
				editor.revealRange(editor.selection);
				break;
			}
		}

		await vscode.commands.executeCommand('toggleVim');
		await vscode.commands.executeCommand('extension.vim_escape');
	}

	register(
		context: vscode.ExtensionContext,
		name: string
	) {
		context.subscriptions.push(
			vscode.commands.registerCommand(name, async () => {
				this.run();
			})
		);
	}

}

export function activate(context: vscode.ExtensionContext) {
	const Start = new GotoParentStart();
	const End = new GotoParentEnd();
 
	new GotoParentCommand('{', '}', Start).register(context, 'maprohu.gotoParentBracesStart');
	new GotoParentCommand('{', '}', End).register(context, 'maprohu.gotoParentBracesEnd');
	new GotoParentCommand('[', ']', Start).register(context, 'maprohu.gotoParentBracketsStart');
	new GotoParentCommand('[', ']', End).register(context, 'maprohu.gotoParentBracketsEnd');
	new GotoParentCommand('(', ')', Start).register(context, 'maprohu.gotoParentParenthesesStart');
	new GotoParentCommand('(', ')', End).register(context, 'maprohu.gotoParentParenthesesEnd');
}

export function deactivate() {}
