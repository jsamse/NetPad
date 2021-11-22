import {bindable, IEventAggregator, PLATFORM, watch} from "aurelia";
import {IScriptManager, ISession, ScriptEnvironment} from "@domain";
import * as monaco from "monaco-editor";
import {Util} from "@common";

export class ScriptEnvironmentView {
    @bindable public environment: ScriptEnvironment;
    public showResults = true;
    public get id(): string {
        return this.environment.script.id;
    }

    private disposables: (() => void)[] = [];
    private editor: monaco.editor.IStandaloneCodeEditor;
    private resultsEl: HTMLElement;

    constructor(
        @IScriptManager readonly scriptManager: IScriptManager,
        @ISession readonly session: ISession,
        @IEventAggregator readonly eventBus: IEventAggregator) {
    }

    private attached() {
        const token = this.eventBus.subscribe("script-results", (msg: {scriptId: string, output: string}) => {
            if (msg.scriptId === this.environment.script.id) {
                this.appendResults(msg?.output);
            }
        });

        this.disposables.push(() => token.dispose());

        PLATFORM.taskQueue.queueTask(() => {
            const el = document.querySelector(`[data-text-editor-id="${this.id}"]`) as HTMLElement;
            this.editor = monaco.editor.create(el, {
                value: this.environment.script.code,
                language: 'csharp',
                theme: "vs-dark"
            });

            const f = Util.debounce(this, async (ev) => {
                await this.scriptManager.updateCode(this.environment.script.id, this.editor.getValue());
            }, 500, true);

            this.editor.onDidChangeModelContent(ev => f(ev));

            window.addEventListener("resize", () => this.editor.layout());
            // const ob = new ResizeObserver(entries => {
            //     console.log(entries);
            //     this.editor.layout({
            //         width: document.scriptSelector(".window").clientWidth - document.scriptSelector("sidebar").clientWidth,
            //         height: document.scriptSelector(".text-editor").clientHeight
            //     });
            // });
            // ob.observe(document.scriptSelector("statusbar"));
        }, {delay: 100});
    }

    public detaching() {
        this.editor.dispose();
        for (const disposable of this.disposables) {
            disposable();
        }
    }

    public async run() {
        this.setResults(null);
        this.showResults = true;
        await this.scriptManager.run(this.environment.script.id);
    }

    private setResults(results: string | null) {
        this.resultsEl.innerHTML = results?.replaceAll("\n", "<br/>") ?? "";
    }

    private appendResults(results: string | null) {
        this.setResults(this.resultsEl.innerHTML + results);
    }

    @watch<ScriptEnvironmentView>(vm => vm.session.active)
    private adjustEditorLayout() {
        PLATFORM.taskQueue.queueTask(() => {
            this.editor.layout();
        }, {delay: 100});
    }
}