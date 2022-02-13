import {HubConnection, HubConnectionBuilder} from "@microsoft/signalr";
import {ILogger, PLATFORM} from "aurelia";
import {IIpcGateway} from "@domain";
import {SubscriptionToken} from "@application";

export class SignalRIpcGateway implements IIpcGateway {
    private readonly connection: HubConnection
    private readonly logger: ILogger;

    constructor(@ILogger logger: ILogger) {
        this.logger = logger.scopeTo(nameof(SignalRIpcGateway));
        this.connection = new HubConnectionBuilder()
            .withUrl("/ipc-hub")
            .build();

        this.connection.onclose(error => {
            this.logger.warn("SignalR IPC Gateway connection was closed. Will try to reconnect in 2 seconds", error);
            PLATFORM.setTimeout(() => this.connection.start(), 2000);
        });

        this.connection.start();
    }

    public subscribe(channelName: string, callback: (message: any, channel: string) => void): SubscriptionToken {
        const handler = (...args: any[]) => {
            this.logger.debug(`SignalRIpcGateway: Got server message`, ...args);
            const arg = args.length > 0 ? args[0] : null;
            callback(arg, channelName);
        };

        this.connection.on(channelName, handler);
        return new SubscriptionToken(() => this.connection.off(channelName, handler));
    }

    public async send<TResult>(channelName: string, ...params: any[]): Promise<TResult> {
        return await this.connection.invoke(channelName, ...params);
    }
}