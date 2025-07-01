const { SlashCommandBuilder } = require('discord.js');
const supabase = require('../supabase'); // adjust path as needed

module.exports = {
  data: new SlashCommandBuilder()
    .setName('logs')
    .setDescription('Configure logging channel and toggle logs on/off')
    .addChannelOption(option =>
      option.setName('channel')
        .setDescription('Channel for logs')
        .setRequired(false))
    .addStringOption(option =>
      option.setName('toggle')
        .setDescription('Turn logs on or off')
        .setRequired(false)
        .addChoices(
          { name: 'on', value: 'on' },
          { name: 'off', value: 'off' },
        )),
  async execute(interaction) {
    const guildId = interaction.guildId;
    const member = interaction.member;

    if (!guildId) {
      await interaction.reply({ content: 'This command can only be used in a server.', ephemeral: true });
      return;
    }

    // Get existing config
    const { data, error } = await supabase
      .from('guild_configs')
      .select('config')
      .eq('guild_id', guildId)
      .single();

    if (error && error.code !== 'PGRST116') {
      console.error(error);
      await interaction.reply({ content: 'Failed to fetch config.', ephemeral: true });
      return;
    }

    const config = data?.config ?? {};

    // Check sudo role
    if (!config.sudoRoleId || !member.roles.cache.has(config.sudoRoleId)) {
      await interaction.reply({ content: 'You do not have permission to use this command.', ephemeral: true });
      return;
    }

    let updated = false;
    const channel = interaction.options.getChannel('channel');
    const toggle = interaction.options.getString('toggle'); // 'on' or 'off'

    if (channel) {
      config.logChannelId = channel.id;
      updated = true;
    }

    if (toggle) {
      config.logsEnabled = toggle === 'on';
      updated = true;
    }

    // If neither provided, default logsEnabled to true
    if (!channel && !toggle) {
      config.logsEnabled = true;
      updated = true;
    }

    if (updated) {
      await supabase
        .from('guild_configs')
        .upsert({ guild_id: guildId, config });
      await interaction.reply({ content: `Logs configuration updated: ${config.logsEnabled ? 'Enabled' : 'Disabled'}${channel ? `, Channel set to <#${channel.id}>` : ''}`, ephemeral: true });
    } else {
      await interaction.reply({ content: 'No changes made. Provide a channel and/or toggle.', ephemeral: true });
    }
  },
};
