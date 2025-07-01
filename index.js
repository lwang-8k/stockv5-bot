let discordtoken = process.env.DISCORD_TOKEN
let clientId = process.env.CLIENT_ID


const express = require('express');
const { Client, GatewayIntentBits, Collection, EmbedBuilder, REST, Routes, Events, PermissionsBitField } = require('discord.js');
const supabase = require('./supabase');

// Replace this with your actual token


const app = express();
const PORT = process.env.PORT || 3000;
app.get('/', (req, res) => res.send('Bot is running.'));
app.listen(PORT, () => console.log(`🌐 Web server running on port ${PORT}`));

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent],
});

client.commands = new Collection();

// 🔧 MANUALLY load your commands here
const setverification = require('./commands/setverifychannel');
const setsudo = require('./commands/setsudo');
const setverified = require('./commands/setverified');
const logs = require('./commands/logs');

client.commands.set(setverification.data.name, setverification);
client.commands.set(setsudo.data.name, setsudo);
client.commands.set(setverified.data.name, setverified);
client.commands.set(logs.data.name, logs);

const commands = [
  setverification.data.toJSON(),
  setsudo.data.toJSON(),
  setverified.data.toJSON(),
  logs.data.toJSON(),
];

// ✅ Register slash commands globally (or per guild for faster update)
client.once('ready', async () => {
  console.log(`✅ Logged in as ${client.user.tag}`);

  const rest = new REST({ version: '10' }).setToken(discordtoken);

  try {
    console.log('🔁 Registering slash commands...');
    await rest.put(Routes.applicationCommands(clientId), { body: commands });
    console.log('✅ Slash commands registered.');
  } catch (err) {
    console.error('❌ Failed to register commands:', err);
  }
});

// 🧠 Slash command handler
client.on(Events.InteractionCreate, async interaction => {
  if (!interaction.isChatInputCommand()) return;

  const command = client.commands.get(interaction.commandName);
  if (!command) return;

  try {
    await command.execute(interaction, supabase, client);
  } catch (err) {
    console.error(`❌ Error executing command:`, err);
    if (!interaction.replied && !interaction.deferred) {
      await interaction.reply({ content: 'There was an error executing this command.', ephemeral: true });
    }
  }
});

// 🛠 Optional: handle per-guild registration when joining a new guild
client.on('guildCreate', async guild => {
  const rest = new REST({ version: '10' }).setToken(discordtoken);

  try {
    console.log(`📦 Registering commands for new guild: ${guild.name}`);
    await rest.put(
      Routes.applicationGuildCommands(clientId, guild.id),
      { body: commands }
    );
    console.log(`✅ Commands registered for ${guild.name}`);
  } catch (err) {
    console.error(`❌ Failed to register for ${guild.name}`, err);
  }

  // Create default config if missing
  const { data } = await supabase
    .from('guild_configs')
    .select('guild_id')
    .eq('guild_id', guild.id)
    .single();

  if (!data) {
    await supabase.from('guild_configs').insert([{
      guild_id: guild.id,
      config: {
        sudoRoleId: null,
        verifyChannelId: null,
        verifiedRoleId: null,
        logChannelId: null,
        logsEnabled: true,
      }
    }]);
    console.log(`📝 Default config created for ${guild.name}`);
  }
});

client.on('messageCreate', async (message) => {
  if (message.author.bot) return;
  if (!message.guild) return;

  const guildId = message.guild.id;

  const { data, error } = await supabase
    .from('guild_configs')
    .select('config')
    .eq('guild_id', guildId)
    .single();

  if (error && error.code !== 'PGRST116') {
    console.error('Supabase error:', error);
    return;
  }

  const config = data?.config ?? {};
  const {
    sudoRoleId,
    verifiedRoleId,
    verifyChannelId,
    logChannelId,
    logsEnabled = true,
  } = config;

  if (!sudoRoleId || !verifiedRoleId || !verifyChannelId) return;
  if (message.channel.id !== verifyChannelId) return;
  if (!message.member.roles.cache.has(sudoRoleId)) return;
  if (!message.content.toLowerCase().startsWith('verify')) return;

  const repliedMsgId = message.reference?.messageId;
  if (!repliedMsgId) {
    await message.react('❌');
    return;
  }

  let repliedMessage;
  try {
    repliedMessage = await message.channel.messages.fetch(repliedMsgId);
  } catch {
    await message.react('❌');
    return;
  }

  const args = message.content.split(' ').slice(1);
  let newNick = args.join(' ').trim();

  // If no nickname override provided, use the replied message's content as nickname
  if (!newNick) {
    newNick = repliedMessage.content.substring(0, 32); // Discord max nickname length is 32 chars
  }

  const memberToVerify = message.guild.members.cache.get(repliedMessage.author.id);
  if (!memberToVerify) {
    await message.react('❌');
    return;
  }

  const isAlreadyVerified = memberToVerify.roles.cache.has(verifiedRoleId);

  try {
    if (newNick) await memberToVerify.setNickname(newNick);

    if (isAlreadyVerified) {
      await message.react('🟩');

      if (newNick && logsEnabled && logChannelId) {
        const logChannel = await message.guild.channels.fetch(logChannelId).catch(() => null);
        if (logChannel) {
          const embed = new EmbedBuilder()
            .setTitle('User Name Changed')
            .addFields(
              { name: 'Username', value: memberToVerify.user.tag, inline: false },
              { name: 'User', value: `<@${memberToVerify.id}>`, inline: false },
              { name: 'Verified by', value: `<@${message.author.id}>`, inline: false },
            )
            .setColor('Yellow')
            .setTimestamp();

          await logChannel.send({ embeds: [embed] });
        }
      }
      return;
    }

    await memberToVerify.roles.add(verifiedRoleId);
    await message.react('✅');

    if (logsEnabled && logChannelId) {
      const logChannel = await message.guild.channels.fetch(logChannelId).catch(() => null);
      if (logChannel) {
        const embed = new EmbedBuilder()
          .setTitle('User Verified')
          .addFields(
            { name: 'Username', value: memberToVerify.user.tag, inline: false },
            { name: 'User', value: `<@${memberToVerify.id}>`, inline: false },
            { name: 'Verified by', value: `<@${message.author.id}>`, inline: false },
          )
          .setColor('Green')
          .setTimestamp();

        await logChannel.send({ embeds: [embed] });
      }
    }
  } catch (err) {
    console.error('Verification error:', err);
    await message.react('❌');
  }
});


client.login(discordtoken);
