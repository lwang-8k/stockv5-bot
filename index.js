
const express = require('express');

const app = express();
const PORT = process.env.PORT || 3000;

app.get('/', (req, res) => res.send('Bot is running.'));
app.listen(PORT, () => console.log(`🌐 Web server running on port ${PORT}`)); // ADD THIS



const { Client, GatewayIntentBits, Partials, EmbedBuilder } = require('discord.js');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
  partials: [Partials.Message, Partials.Channel, Partials.GuildMember],
});

// Config IDs
const VERIFY_CHANNEL_ID = '1389377448231305306';
const SUDO_ROLE_ID = '1389378312564113468';      // Admin role
const VERIFIED_ROLE_ID = '1389378423733882981';  // Role to assign
const LOG_CHANNEL_ID = '1389394770924666930';    // Channel to send embed logs

client.once('ready', () => {
  console.log(`✅ Logged in as ${client.user.tag}`);
});
client.on('messageCreate', async (message) => {
  if (message.author.bot) return;
  if (message.channel.id !== VERIFY_CHANNEL_ID) return;
  if (message.content.trim().toLowerCase() !== 'verify') return;

  try {
    const sudoMember = await message.guild.members.fetch(message.author.id);
    if (!sudoMember.roles.cache.has(SUDO_ROLE_ID)) return;

    if (!message.reference?.messageId) {
      await message.react('❌');
      return;
    }

    const repliedTo = await message.channel.messages.fetch(message.reference.messageId);
    const targetMember = await message.guild.members.fetch(repliedTo.author.id);

    if (targetMember.roles.cache.has(VERIFIED_ROLE_ID)) {
      await message.react('⚠️'); // Already verified
      return;
    }

    await targetMember.roles.add(VERIFIED_ROLE_ID);

    const newNickname = repliedTo.content.slice(0, 32);
    await targetMember.setNickname(newNickname);

    await message.react('✅');

    const logChannel = await message.guild.channels.fetch(LOG_CHANNEL_ID);
    if (logChannel?.isTextBased()) {
      const embed = new EmbedBuilder()
        .setTitle('User Verified')
        .setColor('Green')
        .addFields(
          { name: 'User', value: `${targetMember}`, inline: false },
          { name: 'Verified by', value: `${sudoMember}`, inline: false },
        )
        .setTimestamp();

      await logChannel.send({ embeds: [embed] });
    }
  } catch (err) {
    console.error('❌ Error during verification:', err);
    try {
      await message.react('❌');
    } catch {}
  }
});

client.login("MTM4OTQ2MTk3MTM1ODg0NzAyNg.GMifq0.GADzZkyimrRYCAD2yRBBSzxA8wen6yWQKbtQqo");
