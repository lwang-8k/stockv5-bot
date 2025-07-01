// require('dotenv').config();
const { REST, Routes } = require('discord.js');
const fs = require('fs');
const path = require('path');

const token = "MTM4OTQ2MTk3MTM1ODg0NzAyNg.GRGhGK.3SsBxect-TGt3XXxsvWJoXe2B0wbnMraLYMP_c";
const clientId = '1389461971358847026';       // Replace with your bot’s client ID
const guildId = '1374956126742904952';         // Replace with your test server's guild ID

const commands = [];
const commandsPath = path.join(__dirname, 'commands');
const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));

for (const file of commandFiles) {
  const command = require(path.join(commandsPath, file));
  commands.push(command.data.toJSON());
}

const rest = new REST({ version: '10' }).setToken(token);

(async () => {
  try {
    console.log(`Started refreshing ${commands.length} application (slash) commands.`);

    // Register commands for a single guild (faster update)
    await rest.put(
      Routes.applicationGuildCommands(clientId, guildId),
      { body: commands }
    );

    console.log('Successfully reloaded application (slash) commands.');
  } catch (error) {
    console.error(error);
  }
})();
