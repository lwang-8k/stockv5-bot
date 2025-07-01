const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { setGuildConfig } = require('../configService');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('setverified')
    .setDescription('Set the verified role')
    .addRoleOption(option =>
      option.setName('role').setDescription('The verified role').setRequired(true)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  async execute(interaction) {
    const role = interaction.options.getRole('role');
    await setGuildConfig(interaction.guild.id, { verifiedRoleId: role.id });
    await interaction.reply(`✅ Verified role set to ${role}`);
  }
};
