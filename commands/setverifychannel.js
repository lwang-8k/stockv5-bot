const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { setGuildConfig } = require('../configService');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('setverifychannel')
    .setDescription('Set the verification channel')
    .addChannelOption(option =>
      option.setName('channel').setDescription('The verification channel').setRequired(true)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  async execute(interaction) {
    const channel = interaction.options.getChannel('channel');
    await setGuildConfig(interaction.guild.id, { verifyChannelId: channel.id });
    await interaction.reply(`✅ Verification channel set to ${channel}`);
  }
};
