import DiscordBasePlugin from './discord-base-plugin.js';

export default class DisconnectionLogger extends DiscordBasePlugin {
    static get description() {
        return "Disconnection Logger plugin";
    }

    static get defaultEnabled() {
        return true;
    }

    static get optionsSpecification() {
        return {
            ...DiscordBasePlugin.optionsSpecification,
            warnInGameAdmins: {
                required: false,
                default: false,
                description: ''
            }
        };
    }

    constructor(server, options, connectors) {
        super(server, options, connectors);

        this.onLogLine = this.onLogLine.bind(this);

        this.broadcast = (msg) => { this.server.rcon.broadcast(msg); };
        this.warn = (steamid, msg) => { this.server.rcon.warn(steamid, msg); };
    }

    async mount() {
        this.server.logParser.logReader.reader.on('line', this.onLogLine)
    }

    async onLogLine(line) {
        const regex = /LogOnlineGame: Display: Kicking player: (?<player>.+) ; Reason = (?<reason>.+)$/;
        const res = regex.exec(line)?.groups;
        const reasons = [ 'Host closed the connection.' ]

        if (reasons.includes(res.reason)) {
            const admins = await this.server.getAdminsWithPermission('canseeadminchat');
            for (const player of this.server.players) {
                if (!admins.includes(player.steamID)) continue;

                if (this.options.warnInGameAdmins)
                    await this.warn(player.steamID, `[${res.player}] - Disconnected with reason: ${res.reason}`);
            }

            await this.sendDiscordMessage({
                embed: {
                    title: `[${res.player}] Disconnection Bug`,
                    fields: [
                        {
                            name: 'Reason',
                            value: res.reason,
                            inline: false
                        }
                    ]
                },
                timestamp: (new Date()).toISOString()
            });
        }
    }
}