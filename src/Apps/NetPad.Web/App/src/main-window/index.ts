import {IHttpClient} from "aurelia";
import {IQueryManager, ISession, Query, SessionService, Settings} from "@domain";
import {Mapper} from "@common";
import * as path from "path";
import {QueriesService} from "@domain/api";

const {ipcRenderer} = require("electron");

export class Index {
    private queryList: string[] = [];

    constructor(
        @ISession readonly session: ISession,
        @IQueryManager readonly queryManager: IQueryManager,
        readonly sessionService: SessionService,
        @IHttpClient readonly httpClient: IHttpClient,
        readonly settings: Settings) {
    }

    public async binding() {

        ipcRenderer.on('session-query-added', (event, json) => {
            const queries = JSON.parse(json).map(q => Query.fromJS(q)) as Query[];
            this.session.add(...queries);
        });

        ipcRenderer.on('session-query-removed', (event, json) => {
            const queries = JSON.parse(json).map(q => Query.fromJS(q)) as Query[];
            this.session.remove(...queries);
        });

        const response = await this.httpClient.get("settings");
        return Mapper.toInstance(this.settings, await response.json());
    }

    public async openQuery(queryName: string) {
        await this.queryManager.open(path.join(this.settings.queriesDirectoryPath, queryName));
    }

    public async closeQuery(query: Query) {
        await this.queryManager.close(query.id);
    }

    public async attached() {
        const response = await this.httpClient.get("queries");
        this.queryList = (await response.json() as string[]);
        const openQueries = await this.sessionService.getOpenQueries();
        this.session.add(...openQueries);
    }
}
