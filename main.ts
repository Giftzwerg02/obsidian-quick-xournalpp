import { App, Editor, FileSystemAdapter, MarkdownView, Modal, Plugin, Plugin_2, Setting } from "obsidian";
import { exec } from "child_process";


class XournalPPCreateModal extends Modal {
	result: string;
	onSubmit: (result: string) => void;

	constructor(app: App, onSubmit: (result: string) => void) {
		super(app);
		this.onSubmit = onSubmit;
	}

	onOpen() {
		let { contentEl } = this;
		contentEl.createEl("h1", { text: "File name" });
		new Setting(contentEl)
			.setName("filename")
			.addText((text) => {
				text.onChange((value) => {
					this.result = value
				})
			})

		new Setting(contentEl)
			.addButton((btn) => {
				btn
					.setButtonText("Submit")
					.setCta()
					.onClick(() => {
						this.close();
						if (!this.result.endsWith(".xopp")) {
							this.result += ".xopp";
						}
						this.onSubmit(this.result);
					})
			})
	}

	onClose(): void {
		let { contentEl } = this;
		contentEl.empty(); 
	}
}

export default class ExamplePlugin extends Plugin {
  async onload() {
    this.addCommand({
      id: "create-and-link-xournalpp-file",
      name: "Create and Link Xournal++ file",
      editorCallback: (editor: Editor, view: MarkdownView) => {
		new XournalPPCreateModal(this.app, async (result) => {
			const fs = this.app.vault.adapter as FileSystemAdapter;
			try {
				const template_file = getPluginDir(this, "empty.xopp"); 
				const new_file = `resources/${result}`; 
				await fs.copy(
					template_file,
					new_file	
				)

				const new_file_fullpath = fs.getFullPath(new_file);
				const cmd = `xournalpp -p "${new_file_fullpath}.pdf" "${new_file_fullpath}"`
				exec(cmd, (err, stdout, stderr) => {					
					editor.replaceSelection(`![[${new_file}]]\n![[${new_file}.pdf]]`)
				});
			} catch (e) {
				console.log(e);
			}	
		}).open();
      },
    });
  }
}

function getPluginDir(plug: Plugin_2, asset: string) {
	return `${plug.app.vault.configDir}/plugins/${plug.manifest.id}/${asset}`;
}