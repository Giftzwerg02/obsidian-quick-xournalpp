import { App, Editor, FileSystemAdapter, MarkdownView, Modal, Plugin, PluginSettingTab, Plugin_2, Setting } from "obsidian";
import { exec } from "child_process";


class XournalPPCreateModal extends Modal {
	result: string;
	plugin: ExamplePlugin;
	onSubmit: (result: string) => Promise<void>;

	constructor(app: App, plugin: ExamplePlugin, onSubmit: (result: string) => Promise<void>) {
		super(app);
		this.plugin = plugin;
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
			});

		let errorDiv: HTMLDivElement | null = null;

		new Setting(contentEl)
			.addButton((btn) => {
				btn
					.setButtonText("Submit")
					.setCta()
					.onClick(async () => {
						if (!this.result.endsWith(".xopp")) {
							this.result += ".xopp";
						}
						try {
							await this.onSubmit(this.result);
							this.close();
						}
						catch (e) {
							if(errorDiv === null) {
								errorDiv = contentEl.createDiv();
							}
							errorDiv.innerHTML = "";	
							errorDiv.createEl("h2", { text: "Error!" });

							if(e.code === "ENOENT" && e.syscall === "copyfile") {
								errorDiv.createEl("strong", { text: "Your resource-location probably does not exist, please set its value to a folder in your vault." })
								let p = errorDiv.createEl("p");
								p.innerHTML = `Currently set location: <strong>${this.plugin.settings.resourceLocation}</strong>`
							}

							errorDiv.createEl("pre", { attr: { style: "white-space: pre-wrap;" } }).createEl("p", { text: e });
						}
					})
			})
	}

	onClose(): void {
		let { contentEl } = this;
		contentEl.empty();
	}
}

export class ExampleSettingsTab extends PluginSettingTab {
	plugin: ExamplePlugin;

	constructor(app: App, plugin: ExamplePlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display() {
		let { containerEl } = this;

		containerEl.empty();

		new Setting(containerEl)
			.setName("Resource Location")
			.setDesc("The location where your generated xournal++ and pdf-files are saved to.")
			.addText((text) =>
				text
					.setPlaceholder("e.g. 'resources'")
					.setValue(this.plugin.settings.resourceLocation)
					.onChange(async (value) => {
						this.plugin.settings.resourceLocation = value;
						await this.plugin.saveSettings();
					})
			);
	}
}

interface ExamplePluginSettings {
	resourceLocation: string;
}

const DEFAULT_SETTINGS: ExamplePluginSettings = {
	resourceLocation: "resources"
}

export default class ExamplePlugin extends Plugin {
	settings: ExamplePluginSettings;

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}

	async onload() {
		await this.loadSettings();
		this.addSettingTab(new ExampleSettingsTab(this.app, this));

		this.addCommand({
			id: "create-and-link-xournalpp-file",
			name: "Create and Link Xournal++ file",
			editorCallback: (editor: Editor, view: MarkdownView) => {
				new XournalPPCreateModal(this.app, this, async (result) => {
					const fs = this.app.vault.adapter as FileSystemAdapter;
					const template_file = getPluginDir(this, "empty.xopp");
					const new_file = `${this.settings.resourceLocation}/${result}`;
					await fs.copy(
						template_file,
						new_file
					)

					const new_file_fullpath = fs.getFullPath(new_file);
					const cmd = `xournalpp -p "${new_file_fullpath}.pdf" "${new_file_fullpath}"`
					exec(cmd, (err, stdout, stderr) => {
						editor.replaceSelection(`![[${new_file}]]\n![[${new_file}.pdf]]`)
					});
				}).open();
			},
		});
	}
}

function getPluginDir(plug: Plugin_2, asset: string) {
	return `${plug.app.vault.configDir}/plugins/${plug.manifest.id}/${asset}`;
}
