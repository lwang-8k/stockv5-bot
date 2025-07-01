const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { setGuildConfig } = require('../configService');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('setsudo')
    .setDescription('Set the sudo (admin) role')
    .addRoleOption(option =>
      option.setName('role').setDescription('The sudo role').setRequired(true)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  async execute(interaction) {
    const role = interaction.options.getRole('role');
    await setGuildConfig(interaction.guild.id, { sudoRoleId: role.id });
    await interaction.reply(`✅ Sudo role set to ${role}`);
  }
};
